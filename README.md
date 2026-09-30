# Multi-Hazard Disaster Command & Emergency Operations System

An industrial-grade, skeuomorphic tactical command console for multi-hazard disaster monitoring, real-time meteorological chronology, explainable AI risk prediction, evacuation route management, resource planning, and emergency public alert broadcasting.

---

## 🚀 Deploying to Vercel

This repository is pre-configured for seamless zero-config deployment to **[Vercel](https://vercel.com)** with full Progressive Web App (PWA) compliance, static Vite frontend asset optimization, and Vercel Serverless Functions.

### Method 1: Deploy via GitHub (Recommended)
1. Push this repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com/new), click **"Add New Project"** and import this repository.
3. Vercel automatically detects the **Vite** framework from `vercel.json` and `package.json`.
4. Configure **Environment Variables** in the project settings:
   - `GEMINI_API_KEY`: *(Required)* Your Google Gemini API key from [Google AI Studio](https://aistudio.google.com/).
   - `VITE_GOOGLE_MAPS_API_KEY`: *(Optional)* Your Google Maps Platform API key. If omitted, the tactical console uses an embedded fallback demo key.
5. Click **Deploy**. Vercel will build the frontend assets into `dist/` and automatically wire serverless functions from `/api/` (`/api/health`, `/api/gemini/chat`).

### Method 2: Deploy via Vercel CLI
```bash
# Install Vercel CLI globally
npm i -g vercel

# Log in to your Vercel account
vercel login

# Deploy to preview
vercel

# Deploy directly to production
vercel --prod
```

---

## 🛠️ Local Development & Full-Stack Node Mode

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY

# 3. Start local development server (port 3000)
npm run dev

# 4. Run production build
npm run build

# 5. Start full-stack Node server
npm start
```

---

## 📋 Vercel Architecture Overview

- **Frontend**: Vite 8 + React 19 + Tailwind CSS + PWA Service Worker precaching. Output directory is `dist/`.
- **Serverless API Routes**:
  - `GET /api/health`: Health status and Gemini API key availability check.
  - `POST /api/gemini/chat`: Tactical Crisis Copilot with dual-model fallback (`gemini-3.8-flash` with automatic failover to `gemini-2.5-flash`).
- **PWA Installation**: Works out of the box with Android/Chromium 1-tap installation and iOS Safari guided home screen addition.
- **Routing**: `vercel.json` provides clean SPA rewrites so direct navigation, deep links, and client-side tab switching never return 404 errors.
