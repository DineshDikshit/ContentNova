# ContentNova 🚀

> AI-Powered Social Media Content Generator — Generate platform-specific captions, hashtags, and branded poster images that accurately showcase your real product and brand.

![ContentNova](https://img.shields.io/badge/ContentNova-AI%20Powered-6366f1?style=for-the-badge&logo=sparkles)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs)
![Claude](https://img.shields.io/badge/Claude-Anthropic-orange?style=flat-square)
![Flux](https://img.shields.io/badge/Flux-Image%20Gen-blue?style=flat-square)

---

## ✨ Features

- **Smart Art Director Prompting** — Calls Claude API / Art Director to generate a 60–80 word prompt focused strictly on the actual product/scene matching the user's description (no random abstract magazine covers or gradients).
- **5 Platform-Optimized Captions** — Platform-specific caption variations (Instagram with emojis & CTAs, LinkedIn professional value posts, Twitter under 280 chars, Facebook community posts) with 1-click copy.
- **15 Relevant Hashtags** — Clickable tag chips you can copy individually or all with a single click.
- **Platform-Specific Image Sizing** — Automatically sets optimal resolutions:
  - **Instagram**: 1024x1024 (1:1 square)
  - **LinkedIn**: 1200x675 (16:9 banner)
  - **Twitter / X**: 1200x675 (16:9 landscape)
  - **Facebook**: 1200x630 (1.91:1 banner)
- **New Style Button** — Cycle through 5 distinct creative variations:
  1. *minimalist and clean*
  2. *vibrant and colorful*
  3. *cinematic with dramatic lighting*
  4. *flat illustration style*
  5. *lifestyle photography*
- **Designed Fallback Poster (HTML/CSS)** — If an image takes longer than 20 seconds, errors out, or fails to load, a designed poster built with HTML/CSS automatically displays with a tone-based gradient:
  - **Fun**: Orange to pink gradient
  - **Professional**: Navy to blue gradient
  - **Casual**: Warm beige to peach gradient
  - **Bold**: Black to red gradient
  - Features the brand name in bold typography and the generated caption as the tagline.
  - Downloadable as PNG using `html2canvas`.
- **Prompt Transparency** — Collapsible *"Prompt used"* drawer displaying the exact art direction prompt fed to the image generator with 1-click copy.
- **Form Validation & Resilient Error Handling** — Real-time inline field validation and server error cards with an instant *"Try again"* button.

---

## 🤖 AI Tools Used

- **Google Antigravity (Gemini)**: Full-stack architecture, prompt engineering, system design, responsive UI implementation, and testing automation.
- **Claude API (Anthropic)**: High-quality social copy generation (captions & hashtags) and expert Art Director image prompting.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, React Router v6, Axios, html2canvas, Modern CSS (Variables & Dark Theme) |
| **Backend** | Node.js, Express, Anthropic SDK, Axios, CORS, Dotenv |
| **AI Models** | Claude (Copy & Art Direction) + Flux (Photorealistic Poster Generation via Pollinations) |
| **Typography** | Inter + Space Grotesk via Google Fonts |

---

## 🏗️ Project Structure

```
Content-Nova/
├── backend/
│   ├── server.js          # Express API with Art Director & Flux settings
│   ├── .env               # Private environment keys (git-ignored)
│   ├── .env.example       # Template with placeholders
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── FormPage.js      # Form with inline validation & error handling
│   │   │   ├── FormPage.css
│   │   │   ├── OutputPage.js    # Posters, Fallback, New Style & Transparency
│   │   │   └── OutputPage.css
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   └── package.json
│
├── .gitignore             # Includes .env and node_modules
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ — [Download Node.js](https://nodejs.org/)

### 1. Clone & Setup Backend

```bash
cd Content-Nova/backend

# Install dependencies
npm install

# Copy example environment configuration
copy .env.example .env

# Optional: Add your Anthropic API key in .env (or run in free community mode)
# ANTHROPIC_API_KEY=your_key_here
# PORT=5000

# Start backend server
npm start
```

Backend will start at **http://localhost:5000**.

### 2. Setup Frontend

In a second terminal window:

```bash
cd Content-Nova/frontend

# Install dependencies
npm install

# Start React app
npm start
```

Frontend will launch at **http://localhost:3000**.

---

## 🔒 GitHub & Security Best Practices

- `backend/.env` is strictly listed in `.gitignore` to prevent any credential leaks.
- `backend/.env.example` provides clean reference placeholders:
  ```env
  ANTHROPIC_API_KEY=your_key_here
  PORT=5000
  ```

---

## 🧪 Testing Verification

The application is thoroughly verified against:
1. **FitFuel Nutrition** (protein bars) → Bold tone, Twitter (1200x675) → unwrapped protein bars on gym bench beside dumbbells.
2. **BrewBuddy Cafe** (cold brew coffee) → Professional tone, LinkedIn (1200x675) → iced cold brew in glass on cafe table.
3. **GreenLeaf Organic Store** (organic vegetables) → Casual tone, Facebook (1200x630) → rustic crate overflowing with fresh vegetables.
4. **Empty Form Validation** → Inline warnings appear on all missing inputs.
5. **New Style Cycling** → Sequentially renders Minimalist, Vibrant, Cinematic, Flat Illustration, and Lifestyle Photography.
