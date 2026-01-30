# Deployment Guide - InsightOps

This guide outlines the process for deploying InsightOps to a live environment. Since this is a static web application, you have several easy and free options.

## Option 1: Vercel (Recommended)
Vercel provides a seamless experience for static sites.

1.  **Install Vercel CLI**: `npm i -g vercel`
2.  **Deploy**: Run `vercel` from the project root.
3.  **Configure**: Follow the prompts to link your project.
4.  **Environment Variables**: In the Vercel dashboard, add `GEMINI_API_KEY` to your project settings if you plan to move the configuration out of `env.js`.

## Option 2: Netlify
Netlify is another excellent choice with a simple drag-and-drop interface.

1.  Go to [Netlify](https://www.netlify.com/).
2.  **Drag & Drop**: Zip the project folder (excluding `.git` and `node_modules`) and drop it into the Netlify deploy area.
3.  **Git Integration**: Alternatively, connect your GitHub/GitLab repository for automatic deploys on every push.

## Option 3: GitHub Pages
If your code is hosted on GitHub, you can use GitHub Pages for free.

1.  Push your code to a GitHub repository.
2.  Go to **Settings** > **Pages**.
3.  Select the branch to deploy from (usually `main`).
4.  Your site will be live at `https://<username>.github.io/<repo-name>/`.

---

### Important Considerations

- **API Key Security**: Storing your `GEMINI_API_KEY` in `env.js` is fine for local development and demos. However, for a production app, consider using a backend proxy or serverless functions to hide your key, as any client-side key can be seen by users inspect-element.
- **Base URL**: If deploying to a subfolder (like GitHub Pages), ensure any internal links in `index.html` or `app.js` are relative.
