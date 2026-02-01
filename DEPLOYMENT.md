# Deployment Guide - InsightOps 🚀

InsightOps is a pure static web application. This means you can host it for free on almost any modern web platform without needing a server.

## 🏆 Recommended: Vercel (Fastest & Easiest)

Vercel is the gold standard for static site hosting. It provides automatic SSL, a global CDN, and a very simple CLI.

### 1. Install Vercel CLI
If you have Node.js installed, run:
```bash
npm i -g vercel
```

### 2. Configure Vercel Dashboard (Browser)
If you are deploying via the Vercel website (as shown in your screenshot):

1.  **Framework Preset**: Select **Other**.
2.  **Build Command**: Enter `npm run build`. This runs the `inject-env.js` script to set your API key.
3.  **Output Directory**: Keep it as `./` (or blank).
4.  **Environment Variables**:
    - **Key**: `GEMINI_API_KEY`
    - **Value**: Your Google Gemini API Key.
5.  **Click Deploy**.

### 3. Alternative: Vercel CLI
If you prefer the terminal:
```bash
vercel -e GEMINI_API_KEY=your_key_here
```

---

## ☁️ Option 2: GitHub Pages (Integrated)

If your code is on GitHub, this is a great "set it and forget it" option.

1.  Push your code to your GitHub repository.
2.  Go to **Settings** > **Pages**.
3.  Under **Build and deployment**, set Source to **Deploy from a branch**.
4.  Select `main` (or your primary branch) and the `/ (root)` folder.
5.  Click **Save**. Your site will be live in a few minutes at `https://<username>.github.io/<repo-name>/`.

---

## 🛡️ Important: API Key Security

> [!WARNING]
> Since this is a client-side application, your `GEMINI_API_KEY` in `env.js` is technically visible to anyone who uses "Inspect Element" on your site.
> 
> **For Demos**: This is usually acceptable as long as you monitor your usage.
> **For Production**: You should ideally wrap the AI calls in a small backend proxy (like a Vercel Serverless Function) to keep the key hidden.

---

## 🛠️ Post-Deployment Checklist

- [ ] **Check Links**: Ensure all assets (CSS, JS, Images) load correctly.
- [ ] **Test AI**: Run a diagnostic scan to confirm the Gemini API connection.
- [ ] **Responsive Test**: Check the dashboard on different screen sizes.
