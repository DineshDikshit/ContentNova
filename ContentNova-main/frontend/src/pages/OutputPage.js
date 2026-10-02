import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import './OutputPage.css';

const PLATFORM_ICONS = {
  Instagram: '📸',
  LinkedIn: '💼',
  Twitter: '🐦',
  Facebook: '👥',
};

const TONE_LABELS = {
  Fun: { icon: '🎉', color: '#f59e0b' },
  Professional: { icon: '🎯', color: '#6366f1' },
  Casual: { icon: '😊', color: '#10b981' },
  Bold: { icon: '⚡', color: '#ef4444' },
};

const STYLE_VARIATIONS = [
  'minimalist and clean',
  'vibrant and colorful',
  'cinematic with dramatic lighting',
  'flat illustration style',
  'lifestyle photography',
];

function getToneGradient(tone) {
  switch (tone) {
    case 'Fun':
      // orange to pink
      return 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)';
    case 'Professional':
      // navy to blue
      return 'linear-gradient(135deg, #0f172a 0%, #1e40af 100%)';
    case 'Casual':
      // warm beige to peach
      return 'linear-gradient(135deg, #d4a373 0%, #faedcd 50%, #fbcfe8 100%)';
    case 'Bold':
      // black to red
      return 'linear-gradient(135deg, #000000 0%, #dc2626 100%)';
    default:
      return 'linear-gradient(135deg, #1e1e35 0%, #6366f1 100%)';
  }
}

function CaptionCard({ caption, index }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const el = document.createElement('textarea');
      el.value = caption.text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="caption-card" style={{ animationDelay: `${index * 0.1}s` }}>
      <div className="caption-header">
        <span className="caption-number">#{index + 1}</span>
        <div className="caption-meta">
          <span className="char-count">{caption.characterCount} chars</span>
        </div>
      </div>
      <p className="caption-text">{caption.text}</p>
      <button
        type="button"
        className={`copy-btn ${copied ? 'copied' : ''}`}
        onClick={handleCopy}
        title="Copy to clipboard"
      >
        {copied ? (
          <>
            <span>✅</span>
            Copied!
          </>
        ) : (
          <>
            <span>📋</span>
            Copy
          </>
        )}
      </button>
    </div>
  );
}

function HashtagChip({ tag, index }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`#${tag}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {}
  };

  return (
    <button
      type="button"
      className={`hashtag-chip ${copied ? 'chip-copied' : ''}`}
      onClick={handleCopy}
      style={{ animationDelay: `${index * 0.05}s` }}
      title={`Copy #${tag}`}
    >
      {copied ? '✅' : '#'}{tag}
    </button>
  );
}

function OutputPage({ results, formData, onReset }) {
  const navigate = useNavigate();
  const [allCopied, setAllCopied] = useState(false);

  // Image and Style States
  const [currentImageUrl, setCurrentImageUrl] = useState(results.imageUrl || null);
  const [currentImagePrompt, setCurrentImagePrompt] = useState(results.imagePrompt || '');
  const [styleIndex, setStyleIndex] = useState(0);
  const [currentStyle, setCurrentStyle] = useState(results.styleVariation || 'best fit for the brand and tone');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Loading and Fallback States (Part 4)
  const [imgLoaded, setImgLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Transparency State (Part 5)
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const fallbackRef = useRef(null);
  const imgRef = useRef(null);

  const { captions = [], hashtags = [] } = results;
  const firstCaption = captions[0]?.text || formData?.description || 'Crafted for excellence';
  const imgLoadedRef = useRef(false);
  const hasRetriedRef = useRef(false);
  const [retryKey, setRetryKey] = useState(0);

  // 35-second timeout for image load (Part 2, requirement 1)
  useEffect(() => {
    imgLoadedRef.current = false;
    hasRetriedRef.current = false;
    setImgLoaded(false);
    setUseFallback(false);

    if (!currentImageUrl) {
      setUseFallback(true);
      return;
    }

    const timer = setTimeout(() => {
      // If after 35 seconds the image still hasn't loaded, show HTML/CSS fallback poster
      if (!imgLoadedRef.current) {
        console.warn('Image generation timed out after 35s, activating fallback poster');
        setUseFallback(true);
      }
    }, 35000);

    return () => clearTimeout(timer);
  }, [currentImageUrl, retryKey]);

  // Handle image load error with 2-second automatic retry (Part 2, requirement 2)
  const handleImageError = () => {
    if (!hasRetriedRef.current) {
      hasRetriedRef.current = true;
      console.log('Image failed to load, automatically retrying once in 2 seconds...');
      setTimeout(() => {
        if (!imgLoadedRef.current) {
          setRetryKey((prev) => prev + 1);
        }
      }, 2000);
    } else {
      console.warn('Image retry also failed, displaying HTML/CSS fallback poster');
      setUseFallback(true);
    }
  };

  const handleCopyAllHashtags = async () => {
    const text = hashtags.map((t) => `#${t}`).join(' ');
    try {
      await navigator.clipboard.writeText(text);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    } catch (err) {}
  };

  // Part 3: New Style Button
  const handleNewStyle = async () => {
    const nextStyle = STYLE_VARIATIONS[styleIndex % STYLE_VARIATIONS.length];
    setStyleIndex((prev) => prev + 1);
    setCurrentStyle(nextStyle);
    setIsRegenerating(true);
    setImgLoaded(false);
    setUseFallback(false);

    try {
      const response = await axios.post('/generate-image', {
        brandName: formData?.brandName,
        description: formData?.description,
        targetAudience: formData?.targetAudience,
        tone: formData?.tone,
        platform: formData?.platform,
        styleVariation: nextStyle,
      });

      if (response.data && response.data.success) {
        setCurrentImageUrl(response.data.imageUrl);
        setCurrentImagePrompt(response.data.imagePrompt);
      } else {
        setUseFallback(true);
      }
    } catch (err) {
      console.error('Error in New Style generation:', err);
      setUseFallback(true);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Part 4: Download Poster (handles both normal image and HTML/CSS fallback)
  const handleDownload = async () => {
    setIsDownloading(true);
    const cleanBrand = (formData?.brandName || 'contentnova').replace(/\s+/g, '_');

    try {
      if (useFallback && fallbackRef.current) {
        // Download HTML/CSS fallback poster via html2canvas
        const canvas = await html2canvas(fallbackRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false,
        });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${cleanBrand}_poster.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (currentImageUrl) {
        // Download normal generated image
        let blobUrl;
        try {
          const res = await fetch(currentImageUrl);
          const blob = await res.blob();
          blobUrl = URL.createObjectURL(blob);
        } catch {
          // If cross-origin fetch is blocked, download through backend proxy
          const proxyRes = await fetch(`/proxy-image?url=${encodeURIComponent(currentImageUrl)}`);
          const blob = await proxyRes.blob();
          blobUrl = URL.createObjectURL(blob);
        }
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${cleanBrand}_poster.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      console.error('Download error:', err);
      if (currentImageUrl && !useFallback) {
        window.open(currentImageUrl, '_blank');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Part 5: Copy prompt
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(currentImagePrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {}
  };

  const handleReset = () => {
    onReset();
    navigate('/');
  };

  const toneInfo = TONE_LABELS[formData?.tone] || { icon: '✨', color: '#6366f1' };
  const fallbackGradient = getToneGradient(formData?.tone);

  return (
    <div className="output-page">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />

      <div className="output-container">
        {/* Header */}
        <div className="output-header">
          <div className="output-brand-info">
            <div className="brand-badge">
              <span>{PLATFORM_ICONS[formData?.platform]}</span>
              <span>{formData?.platform}</span>
            </div>
            <div className="tone-badge" style={{ '--tone-color': toneInfo.color }}>
              <span>{toneInfo.icon}</span>
              <span>{formData?.tone}</span>
            </div>
          </div>
          <h1 className="output-title">
            <span className="title-gradient">Your Content</span> is Ready!
          </h1>
          <p className="output-subtitle">
            Tailored social media campaign for <strong>{formData?.brandName}</strong>
          </p>
        </div>

        <div className="output-grid">
          {/* Left Column: Captions + Hashtags */}
          <div className="output-left">
            {/* Captions Section */}
            <section className="output-section">
              <div className="section-header">
                <h2 className="section-title">
                  <span>✍️</span> Caption Variations
                </h2>
                <span className="section-badge">{captions.length} options</span>
              </div>
              <div className="captions-list">
                {captions.map((caption, i) => (
                  <CaptionCard key={caption.id || i} caption={caption} index={i} />
                ))}
              </div>
            </section>

            {/* Hashtags Section */}
            <section className="output-section">
              <div className="section-header">
                <h2 className="section-title">
                  <span>#️⃣</span> Suggested Hashtags
                </h2>
                <button
                  type="button"
                  className={`copy-all-btn ${allCopied ? 'copied' : ''}`}
                  onClick={handleCopyAllHashtags}
                >
                  {allCopied ? '✅ Copied All!' : '📋 Copy All'}
                </button>
              </div>
              <div className="hashtags-container">
                {hashtags.map((tag, i) => (
                  <HashtagChip key={i} tag={tag} index={i} />
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Poster Image + Transparency (Parts 2, 3, 4, 5) */}
          <div className="output-right">
            <section className="output-section image-section">
              <div className="section-header">
                <h2 className="section-title">
                  <span>🎨</span> Generated Poster
                </h2>
                {/* Part 3: New Style Button */}
                <button
                  type="button"
                  className="new-style-btn"
                  onClick={handleNewStyle}
                  disabled={isRegenerating}
                  title="Cycle to next style variation"
                >
                  {isRegenerating ? (
                    <>
                      <span className="btn-spinner-sm" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      New Style
                    </>
                  )}
                </button>
              </div>

              {/* Poster Display Area */}
              <div className="image-wrapper">
                {/* Spinner when generating/loading */}
                {(!imgLoaded && !useFallback) || isRegenerating ? (
                  <div className="image-loading">
                    <div className="image-spinner" />
                    <p className="loading-label">
                      {isRegenerating ? `Rendering style: "${currentStyle}"...` : 'Rendering AI product poster...'}
                    </p>
                    <span className="loading-sublabel">Model: Flux (photorealistic product composition)</span>
                  </div>
                ) : null}

                {/* Part 4: HTML/CSS Fallback Poster */}
                {useFallback ? (
                  <div
                    ref={fallbackRef}
                    className="fallback-poster-card"
                    style={{ background: fallbackGradient }}
                  >
                    <div className="fallback-inner">
                      <div className="fallback-badge-chip">
                        <span>{PLATFORM_ICONS[formData?.platform]}</span>
                        <span>{formData?.platform} Official Showcase</span>
                      </div>
                      <h2 className="fallback-brand-title">{formData?.brandName}</h2>
                      <div className="fallback-divider-line" />
                      <p className="fallback-tagline-text">{firstCaption}</p>
                      <div className="fallback-footer-tag">
                        <span>✨ Powered by ContentNova</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Normal AI Generated Image */
                  currentImageUrl && (
                    <img
                      key={retryKey}
                      ref={imgRef}
                      src={currentImageUrl}
                      alt={`${formData?.brandName} product poster`}
                      className={`poster-image ${imgLoaded && !isRegenerating ? 'loaded' : ''}`}
                      onLoad={() => {
                        imgLoadedRef.current = true;
                        setImgLoaded(true);
                        setUseFallback(false);
                      }}
                      onError={handleImageError}
                    />
                  )
                )}
              </div>

              {/* Download Button */}
              {(imgLoaded || useFallback) && !isRegenerating && (
                <div className="image-action-buttons">
                  <button
                    type="button"
                    className="download-btn"
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <span className="btn-spinner-sm" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <span>⬇️</span>
                        Download {useFallback ? 'Fallback Poster (PNG)' : 'Poster Image'}
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Part 5: Transparency - Collapsible Prompt Used section */}
              <div className="prompt-transparency-card">
                <button
                  type="button"
                  className="prompt-toggle-btn"
                  onClick={() => setShowPrompt((prev) => !prev)}
                >
                  <div className="prompt-header-left">
                    <span className="prompt-header-icon">🔍</span>
                    <span className="prompt-header-title">Prompt used</span>
                    <span className="prompt-style-pill">{currentStyle}</span>
                  </div>
                  <span className="prompt-chevron">{showPrompt ? '▲' : '▼'}</span>
                </button>

                {showPrompt && (
                  <div className="prompt-body-dropdown">
                    <p className="prompt-text-display">{currentImagePrompt}</p>
                    <button
                      type="button"
                      className={`copy-prompt-btn ${promptCopied ? 'copied' : ''}`}
                      onClick={handleCopyPrompt}
                    >
                      {promptCopied ? '✅ Copied to Clipboard' : '📋 Copy Image Prompt'}
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Actions */}
        <div className="output-actions">
          <button type="button" className="reset-btn" onClick={handleReset}>
            <span>← </span>
            Create New Content
          </button>
        </div>
      </div>
    </div>
  );
}

export default OutputPage;
