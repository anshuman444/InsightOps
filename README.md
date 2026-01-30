# InsightOps 🔮
**Intelligent Observability. Zero Guesswork.**

![InsightOps Dashboard Concept](https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop)

> **"Don't just see *what* broke. Understand *why*."**

InsightOps is an AI-powered SRE (Site Reliability Engineering) command center designed for the modern distributed era. It transforms raw, chaotic system logs into clear, actionable intelligence. By combining a "Time Machine" replay engine with predictive AI, InsightOps doesn't just help you fix incidents—it helps you see the future of your infrastructure.

---

## 🚀 Key Features

### 1. 🤖 AI Root Cause Analysis (RCA)
Stop hunting through thousands of log lines.
- **Instant Diagnosis**: Our Gemini-powered engine analyzes log streams in real-time to identify the *exact* root cause of a failure (e.g., "Database Connection Pool Exhausted").
- **Human-Readable Insights**: Get simple explanations and analogies instead of cryptic error codes.
- **Actionable Fixes**: Receive concrete, step-by-step remediation plans.

### 2. ⏪ Timeline Replay ("Time Machine")
Rewind the chaos and see the cascade.
- **Interactive Playback**: Scrub through an incident second-by-second to watch how a failure cascaded from one service to another.
- **Visual Map**: Watch services turn from Green (Healthy) to Red (Critical) on a dynamic topology map as the incident unfolds.

### 3. 🔮 Proactive Failure Prediction
See it coming before it hits.
- **Risk Forecasting**: Proprietary heuristic algorithms analyze error trends to predict *when* a service is likely to fail in the next 15 minutes.
- **NASA-Grade UI**: A high-fidelity dashboard that highlights critical risks with immersive animations and scanning effects.

### 4. 🗺️ Real-Time Health Map
- **Live Topology**: Visualize your entire microservices architecture (Database, API Gateway, Auth, Payment) in a 3D-style orbit view.
- **Status at a Glance**: Instantly spot degraded or failing services with pulsing visual cues.

---

## 🛠️ Tech Stack

Built for speed, aesthetics, and mission-critical performance.

- **Core**: Vanilla JavaScript (ES6+) for zero-dependency speed.
- **Styling**: TailwindCSS for a premium, glassmorphism-inspired "Future UI".
- **AI Engine**: Google Gemini 1.5 Pro/Flash via API.
- **Charts**: Chart.js for real-time trend visualization.
- **3D Engine**: Three.js for neural interface rendering.

---

## ⚡ Quick Start

1.  **Clone the Repo**
    ```bash
    git clone https://github.com/anshuman444/InsightOps.git
    cd InsightOps
    ```

2.  **Configure Environment**
    Create an `env.js` file (auto-ignored for security):
    ```javascript
    window.ENV = {
      GEMINI_API_KEY: "YOUR_GEMINI_API_KEY_HERE"
    };
    ```

3.  **Run It**
    Simply open `index.html` in any modern browser! No build step required.

4.  **Deployment**
    For instructions on how to deploy InsightOps to a live environment, see [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🏆 Why InsightOps?

Modern distributed systems are complex. When they break, standard monitoring tools give you *graphs*. InsightOps gives you **answers**.

- **Innovation**: First-of-its-kind "Time Machine" for incidents.
- **Impact**: Reduces Mean Time to Resolution (MTTR) from hours to minutes.
- **Design**: A UI designed to make SRE work feel like piloting a spacecraft.
