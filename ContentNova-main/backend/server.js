const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');
const axios = require('axios');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));

// Helper: platform dimensions as required by Part 2
function getPlatformDimensions(platform) {
  const p = (platform || '').toLowerCase();
  switch (p) {
    case 'instagram':
      return { width: 1024, height: 1024 };
    case 'linkedin':
      return { width: 1200, height: 675 };
    case 'twitter':
      return { width: 1200, height: 675 };
    case 'facebook':
      return { width: 1200, height: 630 };
    default:
      return { width: 1024, height: 1024 };
  }
}

// Helper: platform instructions for captions
function getPlatformInstructions(platform, tone) {
  const toneGuide = {
    Fun: 'playful, energetic, high-vibe, and witty',
    Professional: 'authoritative, insightful, polished, and business-focused',
    Casual: 'relaxed, friendly, relatable, and authentic',
    Bold: 'daring, punchy, confident, and direct',
  };

  const platformGuide = {
    Instagram: 'Instagram post captions (rich with fitting emojis, engaging hook, visual flair, strong call-to-action)',
    LinkedIn: 'LinkedIn thought-leadership post (professional spacing, structured insights, valuable takeaway, minimal emojis)',
    Twitter: 'Twitter/X post (STRICTLY under 280 characters total including any hashtags, snappy and viral)',
    Facebook: 'Facebook community post (conversational, relatable story angle, asks an engaging question to drive comments)',
  };

  return {
    toneDescription: toneGuide[tone] || 'engaging',
    platformDescription: platformGuide[platform] || 'social media posts',
  };
}

// Helper: Groq Chat Completion with llama-3.3-70b-versatile and fallback
async function callGroq(messages, jsonMode = false) {
  if (!process.env.GROQ_API_KEY || !process.env.GROQ_API_KEY.startsWith('gsk_')) {
    throw new Error('Valid Groq API key (starting with gsk_) not configured in .env');
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const models = ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

  for (const model of models) {
    try {
      const params = {
        model,
        messages,
        temperature: 0.7,
        max_tokens: jsonMode ? 1500 : 300,
      };
      if (jsonMode) {
        params.response_format = { type: 'json_object' };
      }
      const completion = await groq.chat.completions.create(params);
      const content = completion.choices[0]?.message?.content?.trim();
      if (content) {
        console.log(`[Groq] Successfully generated with model: ${model}`);
        return content;
      }
    } catch (err) {
      console.warn(`[Groq] Model "${model}" failed (${err.message}). Trying fallback model...`);
    }
  }

  throw new Error('All Groq model attempts failed.');
}

// Rule-based Art Director Image Prompt Builder (safety net fallback)
function buildRuleBasedArtDirectorPrompt(brandName, description, targetAudience, tone, platform, styleVariation) {
  const desc = (description || '').trim();
  let subject = '';

  // Extract core physical subject based on user input
  if (/protein\s*bar/i.test(desc) || /nutrition/i.test(brandName)) {
    subject = 'A stack of unwrapped rich chocolate peanut butter protein bars resting on a dark gym bench beside heavy dumbbells';
  } else if (/cold\s*brew|coffee|cafe/i.test(desc) || /cafe|brew/i.test(brandName)) {
    subject = 'A tall condensation-beaded glass of iced cold brew coffee on a polished rustic cafe table with scattered roasted beans';
  } else if (/vegetable|organic|produce/i.test(desc) || /organic|green/i.test(brandName)) {
    subject = 'A rustic wooden crate brimming with freshly harvested crisp organic vegetables including carrots, ripe tomatoes, and leafy greens';
  } else if (/curry|spice|indian|restaurant|food/i.test(desc) || /kitchen|spice/i.test(brandName)) {
    subject = 'A steaming hot bowl of rich aromatic Indian curry garnished with fresh cilantro and toasted garlic naan bread on a rustic wooden dining table';
  } else {
    const cleanDesc = desc.replace(/[^\w\s]/g, '').slice(0, 60);
    subject = `A beautifully arranged commercial display of ${cleanDesc || 'product'}`;
  }

  // Visual style and 2 to 3 color palette matching tone
  let toneStyle = '';
  let palette = '';
  if (tone === 'Bold') {
    toneStyle = 'High contrast dramatic lighting with deep shadows';
    palette = 'rich obsidian black, fiery crimson red, and electric neon amber';
  } else if (tone === 'Professional') {
    toneStyle = 'Clean minimal aesthetic with soft diffused studio lighting';
    palette = 'deep corporate navy, slate grey, and crisp cool white';
  } else if (tone === 'Fun') {
    toneStyle = 'Bright energetic pop lighting with playful dynamic angles';
    palette = 'sunshine yellow, vibrant coral pink, and electric teal';
  } else {
    toneStyle = 'Warm natural golden hour light with an inviting lifestyle photography feel';
    palette = 'warm terracotta, soft honey beige, and sage green';
  }

  let styleNote = '';
  if (styleVariation === 'minimalist and clean') {
    styleNote = 'Clean geometric lines and uncluttered minimalist composition.';
  } else if (styleVariation === 'vibrant and colorful') {
    styleNote = 'Intense vibrant color saturation with radiant highlights.';
  } else if (styleVariation === 'cinematic with dramatic lighting') {
    styleNote = 'Cinematic atmosphere with dramatic chiaroscuro illumination.';
  } else if (styleVariation === 'flat illustration style') {
    styleNote = 'Modern flat graphic illustration aesthetic with clean vector shapes.';
  } else if (styleVariation === 'lifestyle photography') {
    styleNote = 'Authentic environmental lifestyle photography with natural depth.';
  } else {
    styleNote = 'Contemporary commercial aesthetic.';
  }

  const fullPrompt = `${subject}. ${toneStyle} in a color palette of ${palette}. ${styleNote} Subject positioned in the lower half of the frame with clean empty space at the top. Professional product photography, sharp focus, studio lighting, high detail, commercial advertisement style. no text, no letters, no words, no watermark, no logo.`;

  return fullPrompt.trim();
}

// Generate smart image prompt via Groq API (llama-3.3-70b-versatile) or Art Director fallback
async function generateSmartImagePrompt(brandName, description, targetAudience, tone, platform, styleVariation = 'best fit for the brand and tone') {
  const systemPrompt = "You are an expert art director who writes prompts for AI image generators. Your prompts must produce a poster that clearly shows the actual product or business, not random or abstract imagery.";

  const userPrompt = `Write ONE image generation prompt (60 to 80 words) for a social media poster.

Brand: ${brandName}
What they sell: ${description}
Target audience: ${targetAudience}
Tone: ${tone}
Platform: ${platform}
Style variation: ${styleVariation}

Rules:
1. Start with the main subject: the actual product or scene that matches the description (for example, protein bars on a gym bench, cold brew in a glass on a cafe table).
2. Match the visual style to the tone:
   - Fun: bright colors, playful, energetic
   - Professional: clean, minimal, soft lighting, neutral or blue tones
   - Casual: warm, natural light, lifestyle photography feel
   - Bold: high contrast, dark background, strong neon or red accents
3. Add a color palette (2 to 3 colors) that suits the brand.
4. Add composition: subject in the center or lower half, clean empty space at the top for text later.
5. Add quality words: professional product photography, sharp focus, studio lighting, high detail, commercial advertisement style.
6. End with exactly: 'no text, no letters, no words, no watermark, no logo'.
7. Do not mention the brand name inside the image.

Return ONLY the final prompt as plain text. No quotes, no explanation.`;

  // Check for Groq API key
  const hasGroqKey = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_');

  if (hasGroqKey) {
    try {
      const responseText = await callGroq([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], false);

      let text = responseText.replace(/^["']|["']$/g, '').trim();
      if (text.length > 20) {
        return text;
      }
    } catch (err) {
      console.warn('Groq API prompt generation failed, using art director fallback:', err.message);
    }
  }

  // Safety net fallback
  return buildRuleBasedArtDirectorPrompt(brandName, description, targetAudience, tone, platform, styleVariation);
}

// Built-in safety net contextual generator for captions & hashtags
function generateLocalContent(brandName, description, targetAudience, tone, platform) {
  const cleanBrand = brandName.trim();
  const cleanDesc = description.trim();
  const cleanAudience = targetAudience.trim();

  let captions = [];
  if (platform === 'Twitter') {
    captions = [
      {
        id: 1,
        text: `Stop scrolling. ${cleanBrand} is here to change how you experience ${cleanDesc.slice(0, 70)}. Are you ready? 🚀`,
        characterCount: 0
      },
      {
        id: 2,
        text: `Big news for ${cleanAudience}: ${cleanBrand} just dropped. Built for those who demand the best. 👇`,
        characterCount: 0
      },
      {
        id: 3,
        text: `Why settle when ${cleanBrand} exists? Simple, effective, and made for you. Link in bio! ⚡`,
        characterCount: 0
      },
      {
        id: 4,
        text: `The secret is out. ${cleanBrand} is redefining everything you know about ${cleanDesc.slice(0, 60)}. Try it today. ✨`,
        characterCount: 0
      },
      {
        id: 5,
        text: `Level up your daily routine with ${cleanBrand}. Built specifically for ${cleanAudience}. Don't miss out! 🔥`,
        characterCount: 0
      }
    ];
  } else if (platform === 'LinkedIn') {
    captions = [
      {
        id: 1,
        text: `The modern landscape is shifting rapidly, and ${cleanAudience} need solutions that actually deliver results.\n\nIntroducing ${cleanBrand}: ${cleanDesc}.\n\nHere is what makes this a game changer:\n1. Purpose-built efficiency\n2. Designed with the user at the core\n3. Delivering tangible value from day one\n\nHow is your organization approaching this shift? Let's connect in the comments below.`,
        characterCount: 0
      },
      {
        id: 2,
        text: `Innovation isn't about reinventing the wheel—it's about removing friction.\n\nWith ${cleanBrand}, we set out to solve a core challenge for ${cleanAudience}: ${cleanDesc}.\n\nWhen you prioritize excellence, outcomes speak for themselves. Discover how ${cleanBrand} is setting a new standard in the industry today.`,
        characterCount: 0
      },
      {
        id: 3,
        text: `3 key takeaways from launching ${cleanBrand} for ${cleanAudience}:\n\n• Simplicity wins every time\n• Quality is never negotiable\n• Listening to your community drives true innovation\n\n${cleanDesc}.\n\nWhat has been your biggest growth lesson this quarter?`,
        characterCount: 0
      },
      {
        id: 4,
        text: `We are thrilled to unveil ${cleanBrand}!\n\nCrafted specifically for ${cleanAudience}, ${cleanBrand} brings you ${cleanDesc}.\n\nWhether you're looking to streamline your workflow or elevate your standards, this was built for you. Explore more today.`,
        characterCount: 0
      },
      {
        id: 5,
        text: `Behind every great milestone is relentless dedication to craft.\n\n${cleanBrand} represents our commitment to providing ${cleanAudience} with ${cleanDesc}.\n\nThank you to everyone supporting our journey. Here's to raising the bar together.`,
        characterCount: 0
      }
    ];
  } else if (platform === 'Instagram') {
    captions = [
      {
        id: 1,
        text: `Meet your new obsession: ${cleanBrand} ✨\n\n${cleanDesc}.\n\nDesigned with love for ${cleanAudience}, because you deserve nothing less than perfection. Double tap if you need this in your life! 💕\n\n👉 Tap the link in bio to explore more!`,
        characterCount: 0
      },
      {
        id: 2,
        text: `Main character energy only with ${cleanBrand} 🌟\n\nSay goodbye to average and hello to ${cleanDesc}.\n\nTag a friend who needs this right now! 👇`,
        characterCount: 0
      },
      {
        id: 3,
        text: `Vibes on point with ${cleanBrand} 💫\n\nSpecially crafted for ${cleanAudience} who value style, substance, and good energy.\n\n${cleanDesc}.\n\nDrop a ❤️ in the comments if you love this!`,
        characterCount: 0
      },
      {
        id: 4,
        text: `Unboxing magic with ${cleanBrand} 📦✨\n\nHere's why everyone is talking about it: ${cleanDesc}.\n\nReady to elevate your game? Hit our bio link to grab yours! 🔥`,
        characterCount: 0
      },
      {
        id: 5,
        text: `Ready, set, glow! ✨ ${cleanBrand} is officially here to make waves.\n\n${cleanDesc}.\n\nSave this post so you don't forget to check it out! 📌`,
        characterCount: 0
      }
    ];
  } else {
    // Facebook
    captions = [
      {
        id: 1,
        text: `We have some exciting news to share! 🎉 Meet ${cleanBrand} — ${cleanDesc}.\n\nWe created this with ${cleanAudience} in mind, ensuring top-tier quality and an unforgettable experience.\n\nWhat do you think? Let us know in the comments below! 👇`,
        characterCount: 0
      },
      {
        id: 2,
        text: `Looking for something that truly makes a difference? Say hello to ${cleanBrand}! ✨\n\n${cleanDesc}.\n\nJoin hundreds of happy ${cleanAudience} who are already loving it. Share this post with someone who would love this!`,
        characterCount: 0
      },
      {
        id: 3,
        text: `Community spotlight: ${cleanBrand} is here! 💫\n\n${cleanDesc}. Built for ${cleanAudience} who want quality without compromise.\n\nClick the link to learn more and see what the buzz is all about!`,
        characterCount: 0
      },
      {
        id: 4,
        text: `Your daily dose of inspiration powered by ${cleanBrand}! 🚀\n\n${cleanDesc}.\n\nTell us in the comments: what is the #1 thing you look for when choosing your favorite brands?`,
        characterCount: 0
      },
      {
        id: 5,
        text: `Big things are happening at ${cleanBrand}! 🌟\n\nWe are on a mission to bring ${cleanDesc} directly to ${cleanAudience}.\n\nLike and follow our page to stay updated on new releases and exclusive offers!`,
        characterCount: 0
      }
    ];
  }

  // Calculate character counts
  captions = captions.map(c => ({
    ...c,
    characterCount: c.text.length
  }));

  const brandTag = cleanBrand.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const audienceTag = cleanAudience.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  const hashtags = [
    brandTag,
    `${brandTag}Official`,
    'NewLaunch',
    'Trending',
    'Innovation',
    'MustHave',
    'BrandSpotlight',
    'QualityFirst',
    platform.toLowerCase(),
    `${tone.toLowerCase()}vibes`,
    audienceTag || 'community',
    'creators',
    'lifestyle',
    'discover',
    'growth'
  ];

  return { captions, hashtags };
}

// Helper: Part 2 - Build reliable Pollinations image URL with flux -> flux-realism -> turbo fallback
async function buildReliablePollinationsUrl(imagePrompt, width, height, seed) {
  const encoded = encodeURIComponent(imagePrompt);
  const fluxUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux&nologo=true&seed=${seed}`;
  const realismUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=flux-realism&nologo=true&seed=${seed}`;
  const turboUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=turbo&nologo=true&seed=${seed}`;

  // Try flux first
  try {
    const res = await axios.head(fluxUrl, { timeout: 6000 });
    if (res.status === 200) {
      console.log(`[ImageGen] Verified flux model (HTTP 200)`);
      return fluxUrl;
    }
  } catch (fluxErr) {
    console.warn(`[ImageGen] Model "flux" check failed (${fluxErr.message}). Testing "flux-realism"...`);
    // Try flux-realism fallback
    try {
      const resRealism = await axios.head(realismUrl, { timeout: 5000 });
      if (resRealism.status === 200) {
        console.log(`[ImageGen] Verified flux-realism model (HTTP 200)`);
        return realismUrl;
      }
    } catch (realismErr) {
      console.warn(`[ImageGen] Model "flux-realism" check failed (${realismErr.message}). Regenerating with model=turbo...`);
    }
  }

  // Regenerate URL with model=turbo (faster and more reliable)
  console.log(`[ImageGen] Using fast and reliable turbo model`);
  return turboUrl;
}

// POST /generate-content
app.post('/generate-content', async (req, res) => {
  try {
    const { brandName, description, targetAudience, tone, platform } = req.body;

    if (!brandName || !description || !targetAudience || !tone || !platform) {
      return res.status(400).json({
        error: 'Missing required fields: brandName, description, targetAudience, tone, platform',
      });
    }

    const { toneDescription, platformDescription } = getPlatformInstructions(platform, tone);

    let captions = [];
    let hashtags = [];

    // Attempt Groq API for captions & hashtags
    const hasGroqKey = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_');

    if (hasGroqKey) {
      try {
        const prompt = `You are a world-class social media copywriter. Generate content for:
Brand/Product Name: ${brandName}
Description: ${description}
Target Audience: ${targetAudience}
Tone: ${tone} (${toneDescription})
Platform: ${platform} (${platformDescription})

Return ONLY valid JSON in this exact structure:
{
  "captions": [
    {"id": 1, "text": "...", "characterCount": 0},
    {"id": 2, "text": "...", "characterCount": 0},
    {"id": 3, "text": "...", "characterCount": 0},
    {"id": 4, "text": "...", "characterCount": 0},
    {"id": 5, "text": "...", "characterCount": 0}
  ],
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12", "tag13", "tag14", "tag15"]
}`;

        const responseText = await callGroq([
          {
            role: 'system',
            content: 'You are a world-class social media copywriter. You must output valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ], true);

        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, responseText];
        const parsed = JSON.parse(jsonMatch[1] || responseText);
        if (Array.isArray(parsed.captions) && parsed.captions.length >= 3) {
          captions = parsed.captions.map((c, i) => ({
            id: i + 1,
            text: c.text || c,
            characterCount: (c.text || c).length,
          }));
          hashtags = (parsed.hashtags || []).map(t => t.replace(/^#/, ''));
        }
      } catch (err) {
        console.warn('Groq API captions generation failed, using fallback generator:', err.message);
      }
    }

    // Fallback if Groq is not used or failed
    if (captions.length === 0) {
      console.log('[ContentGen] Using local safety net generator');
      const local = generateLocalContent(brandName, description, targetAudience, tone, platform);
      captions = local.captions;
      hashtags = local.hashtags;
    }

    // Generate Smart Image Prompt using Groq / Art Director
    const initialStyleVariation = 'best fit for the brand and tone';
    const imagePrompt = await generateSmartImagePrompt(
      brandName,
      description,
      targetAudience,
      tone,
      platform,
      initialStyleVariation
    );

    // Build reliable Pollinations URL with flux -> flux-realism -> turbo fallback
    const { width, height } = getPlatformDimensions(platform);
    const randomNumber = Math.floor(Math.random() * 9999999) + 1;
    const imageUrl = await buildReliablePollinationsUrl(imagePrompt, width, height, randomNumber);

    // Console logging for debugging (Part 2, requirement 4)
    console.log('\n========================================');
    console.log('🎨 [ImageGen Request - Initial]');
    console.log('Brand:', brandName);
    console.log('Platform:', platform, `(${width}x${height})`);
    console.log('Prompt:', imagePrompt);
    console.log('URL:', imageUrl);
    console.log('========================================\n');

    res.json({
      success: true,
      data: {
        captions,
        hashtags,
        imagePrompt,
        imageUrl,
        styleVariation: initialStyleVariation,
        platformDimensions: { width, height }
      }
    });
  } catch (error) {
    console.error('Error in /generate-content:', error);
    res.status(500).json({
      error: error.message || 'Internal server error while generating content',
    });
  }
});

// POST /generate-image
// Generates image with requested style variation and platform dimensions
app.post('/generate-image', async (req, res) => {
  try {
    const { brandName, description, targetAudience, tone, platform, styleVariation } = req.body;

    if (!brandName || !description) {
      return res.status(400).json({ error: 'Brand name and description are required' });
    }

    const currentStyle = styleVariation || 'best fit for the brand and tone';

    // Generate smart image prompt via Groq / Art Director
    const imagePrompt = await generateSmartImagePrompt(
      brandName,
      description,
      targetAudience || 'customers',
      tone || 'Professional',
      platform || 'Instagram',
      currentStyle
    );

    // Build reliable Pollinations URL (flux -> flux-realism -> turbo)
    const { width, height } = getPlatformDimensions(platform);
    const randomNumber = Math.floor(Math.random() * 9999999) + 1;
    const imageUrl = await buildReliablePollinationsUrl(imagePrompt, width, height, randomNumber);

    // Console logging for debugging (Part 2, requirement 4)
    console.log('\n========================================');
    console.log('🎨 [ImageGen Request - New Style]');
    console.log('Brand:', brandName);
    console.log('Style:', currentStyle);
    console.log('Platform:', platform, `(${width}x${height})`);
    console.log('Prompt:', imagePrompt);
    console.log('URL:', imageUrl);
    console.log('========================================\n');

    res.json({
      success: true,
      imageUrl,
      imagePrompt,
      styleVariation: currentStyle,
      seed: randomNumber,
      width,
      height
    });
  } catch (error) {
    console.error('Error in /generate-image:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate image',
    });
  }
});

// GET /proxy-image
// Allows frontend to safely download external images without CORS issues
app.get('/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).send('Image URL required');

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'Accept': 'image/*,*/*'
      }
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="poster.jpg"');
    res.send(response.data);
  } catch (err) {
    console.error('Proxy image error:', err.message);
    res.status(500).send('Failed to proxy image');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiEngine: 'Groq (llama-3.3-70b-versatile) + Pollinations Engine',
    groqConfigured: !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'))
  });
});

// Start server
// ---- Serve the built React frontend (production deployment) ----
const path = require('path');
const frontendBuild = path.join(__dirname, '..', 'frontend', 'build');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 ContentNova Backend running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Groq API Key: ${process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_') ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🎨 Smart Art Director & Image Reliability: ACTIVE\n`);
});
