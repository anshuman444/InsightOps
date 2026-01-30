
// --- Data Source Adapters ---

let replayState = {
  isPlaying: false,
  intervalId: null,
  currentTimeIndex: 0,
  startTime: 12 * 60, // 12:00
  endTime: 12 * 60 + 16, // 12:16
  speed: 1000 // ms per minute
}; // Moved here to fix ReferenceError

// --- Smart Memory Manager (Privacy Safe) ---
const MemoryManager = {
  get(key) {
    if (!this.isEnabled() && key !== 'memory_mode') return null;

    // Try LocalStorage first (easiest)
    try {
      const item = localStorage.getItem(`insightops_${key}`);
      if (item) return JSON.parse(item);
    } catch (e) { console.warn("LS Read Error", e); }

    // Fallback to Cookies
    const match = document.cookie.match(new RegExp('(^| )insightops_' + key + '=([^;]+)'));
    if (match) {
      try { return JSON.parse(decodeURIComponent(match[2])); } catch (e) { }
    }
    return null;
  },

  set(key, value) {
    // Always allow saving the preference itself
    if (key !== 'memory_mode' && !this.isEnabled()) return;

    const valStr = JSON.stringify(value);

    // 1. LocalStorage
    try { localStorage.setItem(`insightops_${key}`, valStr); } catch (e) { }

    // 2. Cookie (SameSite=Strict, Secure)
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year
    let expires = "expires=" + d.toUTCString();
    document.cookie = `insightops_${key}=${encodeURIComponent(valStr)};${expires};path=/;SameSite=Strict;Secure`;
  },

  clear() {
    // Clear all whylayer_ items
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('insightops_')) localStorage.removeItem(k);
    });

    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith('insightops_')) {
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;SameSite=Strict;Secure';
      }
    });

    // Reset internal state if needed
    this.set('memory_mode', false);
    showToast("Memory Cleared", "All preferences have been wiped.");
    setTimeout(() => window.location.reload(), 1000);
  },

  isEnabled() {
    try {
      const val = localStorage.getItem('insightops_memory_mode');
      // Check cookie as well if LS is missing
      if (!val) {
        const match = document.cookie.match(new RegExp('(^| )insightops_memory_mode=([^;]+)'));
        return match && match[2] === 'true';
      }
      return val === 'true';
    } catch (e) { return false; }
  },

  init() {
    // Restore State logic will go here
    if (this.isEnabled()) {
      const lastTab = this.get('tab');
      const lastService = this.get('service');

      // Service Restoration (Higher priority than tabs)
      if (lastService && !new URLSearchParams(window.location.search).get('service')) {
        // Check if we effectively want to go there
        showToast("Welcome Back", `Restoring ${lastService} view...`);
        renderServiceDetail(lastService);
        return;
      }

      if (lastTab && lastTab !== 'dashboard') {
        // Defer switch to allow UI load
        setTimeout(() => switchTab(lastTab), 100);
        showToast("Welcome Back", "Restored your previous session.");
      }
    }
  }
};

// --- Toast Notification ---
function showToast(title, msg) {
  const div = document.createElement('div');
  div.className = 'fixed bottom-8 right-8 z-[100] bg-zinc-900 border border-zinc-700 p-4 rounded-lg shadow-2xl flex items-center gap-4 animate-[slideIn_0.3s_ease-out_forwards]';
  div.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <i class="fas fa-memory"></i>
        </div>
        <div>
            <h4 class="text-sm font-bold text-white">${title}</h4>
            <p class="text-xs text-zinc-400">${msg}</p>
        </div>
    `;
  document.body.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 500);
  }, 3000);
}

function settingsView() {
  const isEnabled = MemoryManager.isEnabled();
  const toggleClass = isEnabled ? 'bg-indigo-600 justify-end' : 'bg-zinc-700 justify-start';

  return `
      <div class="animate-fade-in max-w-3xl mx-auto space-y-8">
         <div class="border-b border-white/5 pb-6">
            <h1 class="text-3xl font-bold font-display text-white">Settings</h1>
            <p class="text-zinc-400 mt-2">Manage preferences and privacy controls.</p>
         </div>

         <!-- Smart Memory Card -->
         <div class="saas-card p-8 border border-indigo-500/30 bg-indigo-500/5">
             <div class="flex items-start justify-between mb-6">
                 <div>
                     <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        <i class="fas fa-brain text-indigo-400"></i> Smart Memory Mode
                     </h3>
                     <p class="text-sm text-zinc-400 mt-2 max-w-lg leading-relaxed">
                        When enabled, InsightOps will use strictly-scoped cookies to remember your last active tab, selected service, and timeline position. 
                        No log data or personal information is ever stored.
                     </p>
                 </div>
                 
                 <!-- Toggle Switch -->
                 <button onclick="toggleMemoryMode()" class="w-14 h-7 rounded-full p-1 transition-colors duration-300 flex items-center ${toggleClass}">
                    <div class="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform"></div>
                 </button>
             </div>

             <div class="grid grid-cols-2 gap-4 mt-6">
                 <div class="p-4 rounded bg-black/40 border border-white/5">
                     <div class="text-[10px] uppercase font-bold text-zinc-500 mb-1">Status</div>
                     <div class="text-sm font-mono ${isEnabled ? 'text-emerald-400' : 'text-zinc-400'}">
                        ${isEnabled ? 'ACTIVE • PERSISTENT' : 'DISABLED • STATELESS'}
                     </div>
                 </div>
                 <div class="p-4 rounded bg-black/40 border border-white/5">
                     <div class="text-[10px] uppercase font-bold text-zinc-500 mb-1">Storage Method</div>
                     <div class="text-sm font-mono text-zinc-300">Cookie / LocalStorage</div>
                 </div>
             </div>
         </div>

         <!-- Danger Zone -->
         <div class="saas-card p-8 border border-red-500/20">
             <h3 class="text-sm font-bold text-red-400 uppercase tracking-widest mb-4">Privacy & Data</h3>
             <div class="flex items-center justify-between">
                 <p class="text-zinc-400 text-sm">Clear all locally stored preferences and reset application state.</p>
                 <button onclick="MemoryManager.clear()" class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-md text-sm font-medium transition-colors">
                    Clear Memory
                 </button>
             </div>
         </div>
      </div>
    `;
}


class DataSourceAdapter {
  async fetchLogs(url) { throw new Error("Not implemented"); }
  normalize(data) { throw new Error("Not implemented"); }
}

class FakeprodAdapter extends DataSourceAdapter {
  async fetchLogs(url) {
    const res = await fetch('https://fakeprod.vercel.app/logs.json');
    return this.normalize(await res.json());
  }
  normalize(data) {
    let logs = [];

    // Handle Object-based structure (Service -> Array)
    if (!Array.isArray(data) && typeof data === 'object') {
      Object.entries(data).forEach(([service, entries]) => {
        entries.forEach(e => {
          e.service = service; // Inject service name from key
          logs.push(e);
        });
      });
    } else if (Array.isArray(data)) {
      logs = data;
    }

    return logs.map(entry => {
      // Use provided level or fallback to heuristics
      let level = 'info';
      if (entry.level) {
        level = entry.level.toLowerCase();
      } else {
        const isError = (entry.cause && entry.cause !== 'Normal operation') ||
          entry.event.toLowerCase().includes('fail') ||
          entry.event.toLowerCase().includes('error') ||
          entry.event.toLowerCase().includes('timeout') ||
          entry.event.includes('502');
        level = isError ? 'error' : 'info';
      }

      return {
        timestamp: entry.time,
        service: entry.service,
        level: level,
        message: `[${entry.service}] ${entry.event}` + (entry.cause && entry.cause !== 'Normal operation' ? ` - ${entry.cause}` : ''),
        cause: (entry.cause === 'Normal operation') ? null : entry.cause
      };
    });
  }
}

class GitHubAdapter extends DataSourceAdapter {
  async fetchLogs(url) {
    // GitHub API supports CORS directly, so we don't need a proxy.
    // Proxies often get blocked by GitHub, causing 520 errors.
    const res = await fetch('https://api.github.com/events');
    if (!res.ok) throw new Error(`GitHub API Error: ${res.status}`);
    return this.normalize(await res.json());
  }
  normalize(data) {
    return data.slice(0, 30).map(event => ({
      timestamp: new Date(event.created_at).toISOString().substring(11, 19),
      service: event.type, // Group by Event Type (e.g. PushEvent) instead of Repo
      level: 'info',
      message: `[${event.repo.name}] ${event.actor.login}`, // Show Repo in the message
      cause: null
    }));
  }
}

class RedditAdapter extends DataSourceAdapter {
  constructor(subreddit = 'javascript') {
    super();
    this.subreddit = subreddit;
  }

  async fetchLogs(url) {
    // SOLUTION: We use Reddit's RSS feed converted to JSON.
    // This bypasses the strict API CORS blocks because rss2json is designed for this.
    const rss = `https://www.reddit.com/r/${this.subreddit}/.rss`;
    const target = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}`;

    const res = await fetch(target);

    if (!res.ok) throw new Error(`RSS Bridge Error: ${res.status}`);

    const json = await res.json();
    if (json.status !== 'ok' || !json.items) throw new Error("Invalid Reddit RSS Response");

    return this.normalize(json.items);
  }

  normalize(data) {
    return data.slice(0, 30).map(item => ({
      timestamp: item.pubDate.substring(11, 19),
      service: item.title.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '') || `r/${this.subreddit}`,
      level: 'info',
      message: `[${item.author}] ${item.title.substring(0, 60)}...`,
      cause: null
    }));
  }
}

class WikipediaAdapter extends DataSourceAdapter {
  async fetchLogs(url) {
    // Extract title from url: en.wikipedia.org/wiki/India -> India
    const match = url.match(/wiki\/([^#?\/]+)/);
    const title = match ? match[1] : 'Main_Page';
    this.title = title;

    // Fetch revision history as "logs"
    // origin=* is required for CORS support on MediaWiki API
    const api = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=revisions&titles=${title}&rvprop=timestamp|user|comment&limit=30&origin=*`;

    const res = await fetch(api);
    if (!res.ok) throw new Error(`Wiki API Error: ${res.status}`);

    const json = await res.json();
    const pages = json.query?.pages;
    if (!pages) throw new Error("Invalid Wiki Response");

    const pageId = Object.keys(pages)[0];
    if (pageId === "-1") throw new Error("Wiki Page Not Found");

    return this.normalize(pages[pageId].revisions);
  }

  normalize(data) {
    return data.map(rev => ({
      timestamp: new Date(rev.timestamp).toISOString().substring(11, 19),
      service: 'Wikipedia Edit',
      level: 'info',
      message: `[User: ${rev.user}] ${rev.comment ? rev.comment.substring(0, 80) : 'Minor edit'}`,
      cause: null
    }));
  }
}

const SourceManager = {
  currentSource: 'Demo System',
  adapter: new FakeprodAdapter(),

  connect(url) {
    // Reddit Logic
    if (url.includes('reddit.com')) {
      // Extract subreddit
      const match = url.match(/r\/([^/]+)/);
      const sub = match ? match[1] : 'technology';

      this.currentSource = `Reddit (r/${sub})`;
      this.adapter = new RedditAdapter(sub);
      return `Connected to r/${sub}.`;
    }

    // Wikipedia Logic
    if (url.includes('wikipedia.org')) {
      const match = url.match(/wiki\/([^#?\/]+)/);
      const title = match ? match[1] : 'Page';
      this.currentSource = `Wiki: ${title}`;
      this.adapter = new WikipediaAdapter();
      return `Connected to Wikipedia: ${title}`;
    }

    // GitHub Logic
    if (url.includes('github.com')) {
      this.currentSource = 'GitHub Public API';
      this.adapter = new GitHubAdapter();
      return 'Connected to GitHub. Type "curl /logs" to fetch events.';
    }

    // Default / Demo
    if (url.includes('fakeprod') || url === '') {
      this.currentSource = 'Demo System';
      this.adapter = new FakeprodAdapter();
      return 'Connected to Demo System.';
    }

    return null; // Unknown
  },

  async fetchLogs(url) {
    return await this.adapter.fetchLogs(url);
  }
};

window.SourceManager = SourceManager;

// (Variable currentTab moved to top)

// --- Global State ---
window.fakeExplanation = {
  question: "System Log Analysis Report",
  stats: {
    'Database': { status: 'Critical', errors: 145 },
    'API Gateway': { status: 'Degraded', errors: 42 },
    'Auth': { status: 'Healthy', errors: 0 },
    'Payment': { status: 'Critical', errors: 89 },
    'Cards': { status: 'Healthy', errors: 0 }
  },
  actions: [
    {
      id: 1,
      title: "Scale Database Replicas",
      isRecommended: true,
      impact: "High",
      difficulty: "Medium",
      description: "Increase read replicas to reduce lock contention on the primary node. Current load indicates write-heavy traffic blocking reads.",
      reason: "Directly addresses the 145 connection errors observed in the Database tier.",
      steps: [
        { title: "Provision", desc: "Spin up 2x RDS Read Replicas", estTime: "5m", icon: "fa-server" },
        { title: "Sync", desc: "Wait for replication catch-up", estTime: "8m", icon: "fa-sync" },
        { title: "Switch", desc: "Update connection pool config", estTime: "1m", icon: "fa-toggle-on" }
      ]
    },
    {
      id: 2,
      title: "Restart Payment Gateway",
      isRecommended: false,
      impact: "Medium",
      difficulty: "Low",
      description: "Force restart the payment service pods to clear stuck threads.",
      reason: "May resolve temporary deadlocks but does not address root cause.",
      steps: []
    }
  ]
};

const app = document.getElementById("app");

// Initial Load Logic
const initialParams = new URLSearchParams(window.location.search);
const initialService = initialParams.get('service');
const initialTab = initialParams.get('tab');
const verifiedService = initialParams.get('verified');

// --- Global State ---
let currentTab = 'dashboard';
let isExecutiveView = false;


// Handle verified service redirect from Verify System Health button
if (verifiedService) {
  window.healthVerifiedService = verifiedService;
  console.log(`🩺 Health verified for: ${verifiedService}`);

  // Clear the URL params
  window.history.replaceState({}, document.title, window.location.pathname);

  // Set tab to impact and render
  // Set tab to impact and render
  currentTab = 'impact';

  // Clear stored service so MemoryManager doesn't try to go back
  if (MemoryManager.isEnabled()) {
    MemoryManager.set('service', null);
    MemoryManager.set('tab', 'impact');
  }

  render();
  // DO NOT call MemoryManager.init() here as it would try to restore previous state

} else if (initialTab) {
  currentTab = initialTab;
  render();
  MemoryManager.init();
} else if (initialService) {
  renderServiceDetail(initialService);
} else {
  render();
  MemoryManager.init(); // Check for saved state on fresh load
}

function render() {
  // Dynamic check to prevent overwriting if we are in "URL-driven" detail mode
  // AND we haven't explicitly navigated away via currentTab
  const isActiveService = new URLSearchParams(window.location.search).get('service');

  // If URL has service, but currentTab is NOT 'service-detail' (implied),
  // we might want to allow render() if we just cleared the URL in executeActionPlan.
  // Actually, if we clear URL in executeActionPlan, isActiveService will be null. Perfect.

  if (isActiveService) return;

  app.innerHTML = `
    ${sidebar()}
    <main class="flex-1 bg-background relative overflow-y-auto h-full">
      <!-- Top Header / Breadcrumbs could go here -->
      <header class="h-16 border-b border-border flex items-center px-8 justify-between bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div class="flex items-center text-sm text-muted-foreground">
           <span>InsightOps</span>
           <span class="mx-2">/</span>
           <span class="text-foreground font-medium capitalize">${currentTab}</span>
        </div>
        <div class="flex items-center space-x-4">
           <button class="text-muted-foreground hover:text-foreground transition-colors"><i class="fas fa-bell"></i></button>
           <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500"></div>
        </div>
      </header>

      <div class="p-8 max-w-7xl mx-auto">
        ${currentTab === 'dashboard' ? dashboardView() : (currentTab === 'impact' ? impactView() : (currentTab === 'explanation' ? explanationView() : (currentTab === 'health-map' ? healthMapView() : (currentTab === 'neural-interface' ? '<div id="neural-container" class="w-full h-[calc(100vh-8rem)] rounded-xl overflow-hidden bg-black/50 border border-indigo-500/20 shadow-2xl relative"></div>' : (currentTab === 'timeline-replay' ? timelineReplayView() : (currentTab === 'predictions' ? predictionView() : (currentTab === 'pricing' ? pricingView() : (currentTab === 'settings' ? settingsView() : consoleView()))))))))}
      </div>
    </main>
  `;
}

function sidebar() {
  return `
    <aside class="w-20 lg:w-64 bg-surface border-r border-border h-full flex flex-col justify-between z-50">
      <div>
        <!-- Logo -->
        <div class="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-border">
          <div class="w-8 h-8 bg-white text-black rounded flex items-center justify-center font-bold font-display">
            W
          </div>
          <h1 class="hidden lg:block ml-3 text-lg font-bold font-display tracking-tight text-white">
            InsightOps
          </h1>
        </div>

        <!-- Nav -->
        <nav class="mt-6 px-3 space-y-1">
          ${navItem('dashboard', 'fas fa-chart-pie', 'Overview')}
          ${navItem('impact', 'fas fa-chart-line', 'Impact Mode')}
          ${navItem('health-map', 'fas fa-network-wired', 'Health Map')}
          ${navItem('neural-interface', 'fas fa-cube', 'Neural Interface')}
          ${navItem('timeline-replay', 'fas fa-history', 'Timeline Replay')}
          ${navItem('predictions', 'fas fa-crystal-ball', 'Predictions', true)}
          ${navItem('explanation', 'fas fa-bolt', 'Analysis')}
          ${navItem('console', 'fas fa-terminal', 'Console')}
          ${navItem('pricing', 'fas fa-tag', 'Pricing')}
          ${navItem('settings', 'fas fa-cog', 'Settings', true)}
        </nav>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-border">
        <div class="flex items-center p-2 rounded hover:bg-white/5 cursor-pointer transition-colors">
          <div class="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">AD</div>
          <div class="hidden lg:block ml-3">
            <p class="text-sm font-medium text-white">Aditya</p>
            <p class="text-xs text-muted-foreground">Admin Workspace</p>
          </div>
        </div>
      </div>
    </aside>
  `;
}

function navItem(id, icon, label, click = true) {
  const isActive = currentTab === id;
  const clickHandler = click ? `onclick="switchTab('${id}')"` : '';

  // Professional, subtle active state
  const activeClass = isActive
    ? 'bg-white/10 text-white shadow-subtle'
    : 'text-muted-foreground hover:text-white hover:bg-white/5';

  return `
    <button 
      ${clickHandler}
      class="w-full flex items-center justify-center lg:justify-start px-3 py-2 rounded-md transition-all duration-200 group ${activeClass}"
    >
      <i class="${icon} text-sm w-5 text-center ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}"></i>
      <span class="hidden lg:block ml-3 font-medium text-sm">${label}</span>
    </button>
  `;
}

function settingsView() {
  const isEnabled = MemoryManager.isEnabled();
  const toggleClass = isEnabled ? 'bg-indigo-600 justify-end' : 'bg-zinc-700 justify-start';

  return `
      <div class="animate-fade-in max-w-3xl mx-auto space-y-8">
         <div class="border-b border-white/5 pb-6">
            <h1 class="text-3xl font-bold font-display text-white">Settings</h1>
            <p class="text-zinc-400 mt-2">Manage preferences and privacy controls.</p>
         </div>

         <!-- Smart Memory Card -->
         <div class="saas-card p-8 border border-indigo-500/30 bg-indigo-500/5">
             <div class="flex items-start justify-between mb-6">
                 <div>
                     <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        <i class="fas fa-brain text-indigo-400"></i> Smart Memory Mode
                     </h3>
                     <p class="text-sm text-zinc-400 mt-2 max-w-lg leading-relaxed">
                        When enabled, InsightOps will use strictly-scoped cookies to remember your last active tab, selected service, and timeline position. 
                        No log data or personal information is ever stored.
                     </p>
                 </div>
                 
                 <!-- Toggle Switch -->
                 <button onclick="toggleMemoryMode()" class="w-14 h-7 rounded-full p-1 transition-colors duration-300 flex items-center \${toggleClass}">
                    <div class="w-5 h-5 bg-white rounded-full shadow-md transform transition-transform"></div>
                 </button>
             </div>

             <div class="grid grid-cols-2 gap-4 mt-6">
                 <div class="p-4 rounded bg-black/40 border border-white/5">
                     <div class="text-[10px] uppercase font-bold text-zinc-500 mb-1">Status</div>
                     <div class="text-sm font-mono \${isEnabled ? 'text-emerald-400' : 'text-zinc-400'}">
                        \${isEnabled ? 'ACTIVE • PERSISTENT' : 'DISABLED • STATELESS'}
                     </div>
                 </div>
                 <div class="p-4 rounded bg-black/40 border border-white/5">
                     <div class="text-[10px] uppercase font-bold text-zinc-500 mb-1">Storage Method</div>
                     <div class="text-sm font-mono text-zinc-300">Cookie / LocalStorage</div>
                 </div>
             </div>
         </div>

         <!-- Danger Zone -->
         <div class="saas-card p-8 border border-red-500/20">
             <h3 class="text-sm font-bold text-red-400 uppercase tracking-widest mb-4">Privacy & Data</h3>
             <div class="flex items-center justify-between">
                 <p class="text-zinc-400 text-sm">Clear all locally stored preferences and reset application state.</p>
                 <button onclick="MemoryManager.clear()" class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-md text-sm font-medium transition-colors">
                    Clear Memory
                 </button>
             </div>
         </div>
      </div>
    `;
}

function pricingView() {
  return `
    <div class="animate-fade-in max-w-5xl mx-auto pb-12">
      <div class="text-center mb-16">
        <h1 class="text-4xl font-bold font-display text-white mb-4">Simple, Transparent Pricing</h1>
        <p class="text-lg text-zinc-400">Choose the perfect plan for your observability needs.</p>
        
        <!-- Toggle (Visual Only) -->
        <div class="mt-8 inline-flex items-center p-1 rounded-full bg-white/5 border border-white/5 relative">
          <div class="w-[90px] h-full absolute left-1 bg-indigo-600 rounded-full transition-all"></div>
          <button class="relative z-10 w-[90px] py-2 text-sm font-medium text-white">Monthly</button>
          <button class="relative z-10 w-[90px] py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Yearly <span class="text-[10px] text-emerald-400 ml-1">-20%</span></button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <!-- Free Plan -->
        <div class="saas-card p-8 flex flex-col items-center text-center border-t-4 border-t-zinc-700 hover:-translate-y-1 transition-transform duration-300">
          <h3 class="text-xl font-bold text-white mb-2">Starter</h3>
          <div class="text-4xl font-bold text-white mb-6">₹0<span class="text-base font-normal text-zinc-500">/mo</span></div>
          <p class="text-sm text-zinc-400 mb-8">Essential tools for side projects and hobbyists.</p>
          
          <ul class="space-y-4 text-left w-full mb-8">
            ${pricingFeature("View system health map")}
            ${pricingFeature("Timeline replay (read-only)")}
            ${pricingFeature("AI explanations (limited)")}
            ${pricingFeature("Smart Memory Mode")}
            <li class="flex items-center text-zinc-500 text-sm"><i class="fas fa-times mr-3 opacity-50 w-4 text-center"></i> 2D Dashboard Only</li>
            <li class="flex items-center text-zinc-500 text-sm"><i class="fas fa-times mr-3 opacity-50 w-4 text-center"></i> No Prediction</li>
            <li class="flex items-center text-zinc-500 text-sm"><i class="fas fa-times mr-3 opacity-50 w-4 text-center"></i> No Exports</li>
          </ul>
          
          <button class="w-full py-3 rounded-lg border border-white/10 hover:bg-white/5 text-white font-medium transition-colors">Start Free</button>
        </div>

        <!-- Pro Plan -->
        <div class="saas-card p-8 flex flex-col items-center text-center border-t-4 border-t-indigo-500 relative ring-1 ring-indigo-500/50 shadow-2xl shadow-indigo-500/10 hover:-translate-y-1 transition-transform duration-300">
           <div class="absolute -top-4 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-lg">Most Popular</div>
          
          <h3 class="text-xl font-bold text-white mb-2">Enterprise</h3>
          <div class="text-4xl font-bold text-white mb-6">₹499<span class="text-base font-normal text-zinc-500">/mo</span></div>
          <p class="text-sm text-zinc-400 mb-8">Advanced intelligence for scaling systems.</p>
          
          <ul class="space-y-4 text-left w-full mb-8">
            ${pricingFeature("Everything in Free")}
            ${pricingFeature("Failure prediction (10m)")}
            ${pricingFeature("Voice commands")}
            ${pricingFeature("Unlimited AI explanations")}
            ${pricingFeature("Auto incident report (PDF)")}
            ${pricingFeature("Root cause chain visualization")}
            ${pricingFeature("Smart Memory + Cloud Sync")}
          </ul>
          
          <button class="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors shadow-lg shadow-indigo-500/20">Upgrade to Pro</button>
        </div>
      </div>
    </div>
  `;
}

function pricingFeature(text) {
  return `<li class="flex items-center text-sm text-zinc-300"><i class="fas fa-check text-green-400 mr-3 w-4 text-center"></i> ${text}</li>`;
}

function toggleMemoryMode() {
  const current = MemoryManager.isEnabled();
  MemoryManager.set('memory_mode', !current);
  // Force re-render
  switchTab('settings');
  // Show feedback
  if (!current) showToast("Smart Memory Enabled", "Your preferences will now be saved.");
  else showToast("Smart Memory Disabled", "System is now running in stateless mode.");
}



function switchTab(tab) {
  MemoryManager.set('tab', tab);

  // Lifecycle Management for Neural Interface
  if (currentTab === 'neural-interface' && tab !== 'neural-interface') {
    if (window.NeuralInterface) window.NeuralInterface.dispose();
  }

  // If leaving settings, verify memory state logic (handled in toggle)
  if (tab !== 'settings' && tab !== 'service-detail') {
    MemoryManager.set('service', null);
  }

  currentTab = tab;
  render();

  // Post-Render Init
  if (tab === 'neural-interface') {
    setTimeout(() => {
      if (window.NeuralInterface) window.NeuralInterface.init('neural-container');
    }, 50);
  }

  if (tab === 'console') {
    // Small delay to ensure DOM is updated
    setTimeout(initTerminal, 50);
  }
  if (tab === 'health-map') {
    setTimeout(initHealthMap, 50);
  }
  if (tab === 'explanation') {
    setTimeout(() => {
      renderSparklines();
      initHealthMap(); // Initialize the embedded health map
    }, 50);
  }
  if (tab === 'timeline-replay') {
    setTimeout(initTimelineReplay, 50);
  }
}

// Event Delegation for Dynamic Elements
document.addEventListener('click', function (e) {
  const executeBtn = e.target.closest('[data-action="execute-plan"]');
  if (executeBtn) {
    window.executeActionPlan(executeBtn);
  }
});

// Make available globally
window.executeActionPlan = function (btn) {
  // Redirect Logic if already executed
  if (btn.getAttribute('data-status') === 'complete') {
    console.log("Redirecting to Analysis...");

    // Close Side Panel via multiple selectors just in case
    const panel = document.getElementById('health-side-panel');
    if (panel) {
      panel.classList.add('translate-x-full');
      console.log("Side panel closed.");
    }

    // Clear URL params so render() works
    window.history.pushState({}, '', window.location.pathname);

    // Force Re-render of Analysis to show new stats
    if (window.switchTab) {
      window.switchTab('explanation');
    } else {
      console.error("switchTab function missing!");
    }
    return;
  }

  console.log("Executing Action Plan...");
  if (btn.disabled) return;
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Executing Plan...';

  // Get number of steps based on DOM
  const steps = document.querySelectorAll('[id^="step-"]');
  let currentStep = 0;

  function runStep() {
    if (currentStep >= steps.length) {
      // All Done
      // All Done
      btn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Plan Success - View Health';
      btn.classList.add('bg-emerald-600', 'hover:bg-emerald-500', 'ring-2', 'ring-emerald-500/50');
      btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
      btn.setAttribute('data-status', 'complete');
      btn.disabled = false; // Enable for redirect click

      showToast("Action Plan Complete", "System stability restored. Click to verify.");

      // --- SIMULATE RESOLUTION ---
      const stats = window.fakeExplanation ? window.fakeExplanation.stats : null;

      if (stats) {
        // CRITICAL FIX: Ensure ALL services from fakeSystemLogs are present in stats
        // This prevents service cards from disappearing after fixing one service
        if (window.fakeSystemLogs) {
          const allServices = Object.keys(window.fakeSystemLogs);
          allServices.forEach(service => {
            // Only add missing services, don't overwrite existing ones
            if (!stats[service]) {
              // Calculate actual error count from logs
              const serviceLogs = window.fakeSystemLogs[service];
              const errorCount = serviceLogs.filter(l => l.level === 'error').length;
              const total = serviceLogs.length;

              // Determine status based on error count
              let status = 'Healthy';
              if (errorCount > 2) {
                status = 'Critical';
              } else if (errorCount > 0) {
                status = 'Degraded';
              }

              stats[service] = {
                name: service,
                status: status,
                errors: errorCount,
                total: total
              };
            }
          });
        }

        // 1. TARGETED FIX: Fix the service the user is currently viewing
        const target = MemoryManager.get('service') || 'Database'; // Fallback to Database if not on a service page

        if (stats[target]) {
          stats[target].errors = 0;
          stats[target].status = 'Healthy';

          // DOM Update (Immediate Feedback)
          const errEl = document.getElementById(`service-errors-${target.replace(/\s+/g, '-')}`);
          if (errEl) {
            errEl.innerText = "0";
            errEl.className = "font-mono text-emerald-400 font-bold transition-colors";
          }
          const badgeEl = document.getElementById(`service-badge-${target.replace(/\s+/g, '-')}`);
          if (badgeEl) {
            badgeEl.innerHTML = `<span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Healthy</span>`;
          }
        }

        // 2. Recalculate Totals (Preserve other services)
        let totalErr = 0;
        let impacted = 0;
        Object.keys(stats).forEach(k => {
          totalErr += stats[k].errors;
          if (stats[k].status !== 'Healthy') impacted++;
        });

        // 3. Update System Logs for Health Map (Only the fixed service)
        if (window.fakeSystemLogs && window.fakeSystemLogs[target]) {
          window.fakeSystemLogs[target] = window.fakeSystemLogs[target].map(l => {
            if (l.level === 'error') {
              const eventText = l.event || l.message || 'Issue';
              return { ...l, level: 'info', event: eventText + ' (Resolved)', cause: 'Resolved via Action Plan' };
            }
            return l;
          });
          window.fakeSystemLogs[target].push({
            time: new Date().toLocaleTimeString('en-US', { hour12: false }).substring(0, 5),
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            level: 'info',
            event: 'Service recovered. Stability verified.',
            cause: 'Action Plan Execution'
          });
        }

        // Update Top Metrics DOM
        const totalEl = document.getElementById('total-errors-count');
        if (totalEl) totalEl.innerText = totalErr;

        const impactedEl = document.getElementById('services-impacted-count');
        if (impactedEl) impactedEl.innerText = impacted;

        // Force a Neural Interface Refresh if active
        if (window.NeuralInterface && window.NeuralInterface.isRunning) {
          window.NeuralInterface.refresh();
        }
      }

      return;
    }

    const stepIdx = currentStep;

    // 1. Mark as Running
    const iconBox = document.getElementById(`icon-box-${stepIdx}`);
    const icon = document.getElementById(`icon-${stepIdx}`);
    const content = document.getElementById(`content-${stepIdx}`);
    const title = document.getElementById(`title-${stepIdx}`);

    // Set Running State
    if (iconBox) {
      iconBox.className = "w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500 text-indigo-400 flex items-center justify-center text-xs relative z-10 transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.3)]";
    }
    if (icon) {
      icon.className = "fas fa-spinner fa-spin";
    }
    if (content) {
      content.className = "bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 transition-all duration-300";
    }
    if (title) {
      title.className = "text-sm font-bold text-indigo-300 transition-colors";
    }

    // 2. Wait (Simulate Work)
    setTimeout(() => {
      // 3. Mark as Complete
      if (iconBox) {
        iconBox.className = "w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-400 flex items-center justify-center text-xs relative z-10 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
      }
      if (icon) {
        icon.className = "fas fa-check";
      }
      if (content) {
        content.className = "bg-zinc-900/40 border border-emerald-500/30 rounded-lg p-3 transition-all duration-300 opacity-60"; // Dim finished steps slightly
      }
      if (title) {
        title.className = "text-sm font-bold text-emerald-400 transition-colors line-through decoration-emerald-500/50";
      }

      // Update connecting line if exists
      const line = document.getElementById(`line-${stepIdx}`);
      if (line) {
        line.className = "absolute top-9 bottom-[-32px] w-px bg-emerald-500/50 transition-colors duration-500";
      }

      currentStep++;
      runStep(); // Next
    }, 1500 + (Math.random() * 1000)); // Random delay between 1.5s and 2.5s per step
  }

  runStep();
}

function dashboardView() {
  return `
    <div class="space-y-12 animate-fade-in pb-12">
      ${heroSection()}
      
      <div class="space-y-6 opacity-0 animate-[slideIn_0.5s_ease-out_forwards_0.2s]">
        <div class="flex items-center justify-between">
           <h3 class="text-sm font-medium text-muted-foreground uppercase tracking-wider">System Overview</h3>
           <div class="h-px bg-border flex-1 ml-4"></div>
        </div>
        ${metricsGrid()}
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 opacity-0 animate-[slideIn_0.5s_ease-out_forwards_0.4s]">
        <div class="lg:col-span-2">
           ${recentActivity()}
        </div>
        <div>
           ${quickActions()}
        </div>
      </div>
    </div>
  `;
}

function heroSection() {
  return `
    <div class="relative py-20 text-center border-b border-border/50 bg-grid rounded-xl mb-8">
      
      <!-- New Badge -->
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-indigo-300 mb-8 hover:bg-white/10 transition-colors cursor-pointer">
        <span class="flex h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
        <span>New: AI Root Cause Analysis 2.0</span>
        <i class="fas fa-chevron-right text-[10px] opacity-50"></i>
      </div>

      <h1 class="text-4xl sm:text-6xl font-bold font-display tracking-tight text-white mb-6">
        System Intelligence, <br />
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Reimagined.</span>
      </h1>
      
      <p class="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-light">
        A command center that speaks your language. 
        Detect anomalies, diagnose failures, and resolve incidents in seconds.
      </p>

      <!-- Connection Status Bubble -->
      <div id="connection-status" class="mb-6 opacity-0 transition-opacity duration-500">
         <span class="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <i class="fas fa-link mr-2"></i>Connected to: <span id="source-name" class="font-bold">Demo System</span>
         </span>
      </div>

      <div class="max-w-2xl mx-auto relative group z-20">
        <!-- Glow/Blur Effect behind input -->
        <div class="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
        
        <div class="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden focus-within:ring-1 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/50 transition-all">
          <div class="pl-4 text-zinc-500">
            <i class="fas fa-globe text-lg"></i>
          </div>
          <input 
            id="source-input"
            class="w-full bg-transparent border-none focus:ring-0 text-white placeholder-zinc-600 text-lg px-4 py-4 font-light"
            placeholder="Enter system URL (e.g. github.com, fakeprod...)"
            onkeypress="if(event.key === 'Enter') connectSource()"
            autocomplete="off"
          />
          <div class="pr-2">
            <button 
              id="connect-btn"
              onclick="connectSource()"
              class="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function metricsGrid() {
  return `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      ${metricCard("Incidents", "247", "+12%", true, 0)}
      ${metricCard("Uptime", "99.99%", "+0.01%", true, 100)}
      ${metricCard("Latency P99", "142ms", "-14ms", false, 200)}
      ${metricCard("Services", "12/12", "All Healthy", true, 300)}
    </div>
  `;
}

function metricCard(label, value, delta, isGood, delay) {
  const deltaColor = isGood ? 'text-green-500' : 'text-red-500';

  return `
    <div class="saas-card p-5 group flex flex-col justify-between opacity-0 animate-[slideIn_0.5s_ease-out_forwards]" style="animation-delay: ${delay}ms">
      <div class="flex justify-between items-start mb-4">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">${label}</p>
        <span class="text-xs font-medium ${deltaColor} bg-white/5 px-2 py-0.5 rounded border border-white/5 group-hover:bg-white/10 transition-colors">
           ${delta}
        </span>
      </div>
      <div>
        <h3 class="text-3xl font-bold text-white font-display tracking-tight">${value}</h3>
        <!-- Mini Sparkline visualization (fake) -->
        <div class="h-1 w-full bg-white/5 mt-4 rounded-full overflow-hidden">
           <div class="h-full bg-indigo-500/50 w-2/3"></div>
        </div>
      </div>
    </div>
  `;
}

function recentActivity() {
  return `
    <div class="saas-card h-full flex flex-col">
      <div class="px-4 py-3 border-b border-border flex justify-between items-center">
        <h3 class="text-sm font-semibold text-white">Live Activity</h3>
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      </div>
      <ul class="divide-y divide-border">
        ${activityItem("API Gateway Timeout", "2m ago", "error")}
        ${activityItem("Database Connection Pool", "15m ago", "warn")}
        ${activityItem("Cache Miss Rate Spike", "1h ago", "info")}
        ${activityItem("Service Health Check", "2h ago", "success")}
      </ul>
    </div>
  `;
}

function activityItem(title, time, type) {
  const icons = {
    error: { icon: "fa-times-circle", color: "text-red-500" },
    warn: { icon: "fa-exclamation-triangle", color: "text-amber-500" },
    info: { icon: "fa-info-circle", color: "text-blue-500" },
    success: { icon: "fa-check-circle", color: "text-green-500" }
  };

  const s = icons[type] || icons.info;

  return `
    <li class="px-4 py-3 hover:bg-white/5 transition-colors flex items-center justify-between">
      <div class="flex items-center">
        <i class="fas ${s.icon} ${s.color} mr-3 text-sm"></i>
        <span class="text-sm text-zinc-300">${title}</span>
      </div>
      <span class="text-xs text-zinc-500 font-mono">${time}</span>
    </li>
  `;
}

function quickActions() {
  return `
    <div class="space-y-4">
       ${actionCard("Deep Diagnostics", "Run a full system scan", "fas fa-search")}
       ${actionCard("Log Stream", "View live tails", "fas fa-terminal")}
       ${actionCard("Alert Rules", "Configure thresholds", "fas fa-bell")}
    </div>
  `;
}

function actionCard(title, desc, icon) {
  return `
    <button class="w-full saas-card p-4 flex items-center hover:border-indigo-500/50 transition-colors group text-left">
      <div class="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400group-hover:bg-indigo-500/10 transition-colors">
        <i class="${icon} text-sm"></i>
      </div>
      <div class="ml-3">
        <h4 class="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">${title}</h4>
        <p class="text-xs text-zinc-500">${desc}</p>
      </div>
      <i class="fas fa-arrow-right ml-auto text-xs text-zinc-600 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0"></i>
    </button>
  `;
}

function explanationView() {
  const e = window.fakeExplanation;
  const stats = e.stats;

  // Helper for Status Badge
  const getStatusBadge = (status) => {
    const map = {
      'Healthy': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      'Degraded': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      'Critical': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return `<span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${map[status] || map['Healthy']}">${status}</span>`;
  };

  // Helper for Service Card
  // Helper for Service Card
  const serviceCard = (name, data) => `
    <div onclick="window.open('?service=${encodeURIComponent(name)}', '_blank')" 
         class="saas-card p-4 flex flex-col justify-between group hover:border-indigo-500/30 transition-colors cursor-pointer relative overflow-hidden">
       <!-- Hover Effect Background -->
       <div class="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors"></div>
       
       <div class="flex justify-between items-start mb-2 relative z-10">
           <h4 class="font-medium text-sm text-zinc-200 group-hover:text-indigo-300 transition-colors">${name}</h4>
           <div id="service-badge-${name.replace(/\s+/g, '-')}" class="contents">
              ${getStatusBadge(data.status)}
           </div>
       </div>
       <div class="space-y-1 relative z-10">
           <div class="flex justify-between text-xs">
               <span class="text-zinc-500">Errors</span>
               <span id="service-errors-${name.replace(/\s+/g, '-')}" class="font-mono text-zinc-300 group-hover:text-white transition-colors">${data.errors}</span>
           </div>
           
           <!-- Sparkline Container -->
           <div class="h-8 w-full mt-2">
              <canvas id="spark-${name.replace(/\s+/g, '')}"></canvas>
           </div>
       </div>
    </div>
  `;

  return `
    <div class="animate-fade-in max-w-7xl mx-auto pb-12">
      <!-- Breadcrumbs & Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <button onclick="switchTab('dashboard')" class="text-sm text-muted-foreground hover:text-white transition-colors flex items-center group w-fit">
          <i class="fas fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i> 
          Back to Dashboard
        </button>
        
        <div class="flex items-center space-x-3">
           <span class="text-xs text-zinc-500 hidden sm:inline">Reference: INC-2409</span>
           <div class="h-4 w-px bg-zinc-800 hidden sm:block"></div>
           <button class="px-3 py-1.5 rounded-md bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 flex items-center">
            <i class="fas fa-file-pdf mr-2"></i> Export Report
          </button>
        </div>
      </div>

      <!-- Report Header -->
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-2">
            <h1 class="text-3xl font-bold font-display text-white tracking-tight">${e.question}</h1>
            <span class="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase">Critical Incident</span>
        </div>
        <p class="text-zinc-400 max-w-3xl text-lg font-light leading-relaxed">
            Automated root cause analysis generated from system logs. 
            Identified primary failure point and downstream cascading effects.
        </p>
      </div>

      <!-- Gemini AI Q&A Section -->
      <div class="mb-8 p-6 rounded-lg border border-indigo-500/30 bg-indigo-500/5 relative overflow-hidden group">
         <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full group-hover:bg-indigo-500/20 transition-all duration-700"></div>
         
         <h3 class="flex items-center text-lg font-bold text-white mb-4 relative z-10">
            <i class="fas fa-sparkles text-indigo-400 mr-2"></i> Ask InsightOps
         </h3>
         
         <div class="relative z-10">
            <div class="flex gap-2 mb-4">
               <input id="gemini-input" type="text" 
                 class="flex-1 bg-black/50 border border-zinc-700 rounded-md px-4 py-2 text-white placeholder-zinc-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                 placeholder="Ask a question about these logs (e.g. 'What is the root cause?')"
                 onkeypress="if(event.key === 'Enter') handleGeminiAsk()"
               />
                <button onclick="handleGeminiAsk()" id="gemini-btn" 
                  class="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-md font-medium transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center">
                  <i class="fas fa-paper-plane mr-2"></i> Ask
                </button>
                
                <button onclick="startVoiceParams()" id="gemini-talk-btn" 
                  class="ml-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-md font-medium transition-all shadow-lg flex items-center justify-center gap-2 group">
                  <i class="fas fa-microphone group-hover:scale-110 transition-transform"></i> Talk
                </button>
            </div>
            
            <div id="gemini-response" class="hidden p-4 rounded bg-black/40 border border-zinc-800 text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap animate-fade-in"></div>
         </div>
      </div>

      <!-- Impact Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         <div class="saas-card p-4 border-l-2 border-l-red-500">
             <div class="text-xs text-zinc-500 uppercase font-bold mb-1">Total Errors</div>
             <div class="text-2xl font-mono text-white" id="total-errors-count">${Object.values(stats).reduce((a, b) => a + b.errors, 0)}</div>
         </div>
         <div class="saas-card p-4 border-l-2 border-l-amber-500">
             <div class="text-xs text-zinc-500 uppercase font-bold mb-1">Services Impacted</div>
             <div class="text-2xl font-mono text-white" id="services-impacted-count">${Object.values(stats).filter(s => s.status !== 'Healthy').length}</div>
         </div>
         <div class="saas-card p-4 border-l-2 border-l-indigo-500">
             <div class="text-xs text-zinc-500 uppercase font-bold mb-1">Duration</div>
             <div class="text-2xl font-mono text-white">14m 23s</div>
         </div>
         <div class="saas-card p-4 border-l-2 border-l-emerald-500">
             <div class="text-xs text-zinc-500 uppercase font-bold mb-1">Recovery Status</div>
             <div class="text-2xl font-mono text-white">Monitoring</div>
         </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        <!-- Left Column: Health & Diagnosis -->
        <div class="lg:col-span-2 space-y-8">
          
          <!-- Service Health Grid -->
          <section>
              <h3 class="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Service Health Status</h3>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  ${Object.entries(stats).map(([k, v]) => serviceCard(k, v)).join('')}
              </div>
          </section>





          <!-- Circular Health Map Integration -->
          <section>
              <h3 class="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Real Time Architecture View</h3>
              <div class="h-[600px] relative border border-zinc-800 rounded-lg bg-surface/50 overflow-hidden">
                  <!-- Embed Health Map here by calling init directly after render or using the same container ID logic -->
                  ${healthMapView().replace('h-[calc(100vh-8rem)]', 'h-full')}
              </div>
          </section>
      

          <!-- Log Evidence -->
        
        </div>

        <!-- Right: Timeline Sidebar -->
        <div class="lg:col-span-1" id="timeline-container">
           ${timelineSection()}
        </div>

      </div>
    </div>
  `;
}

function recommendedActions() {
  const actions = window.fakeExplanation.actions || [];
  if (!actions.length) return '';

  return `
    <section class="mt-8 animate-[slideIn_0.5s_ease-out_forwards_0.2s] opacity-0">
       <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-zinc-400 uppercase tracking-wider">Recommended Resolution</h3>
          <span class="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors">
            <i class="fas fa-magic mr-1"></i> Auto-generated
          </span>
       </div>
       <div class="space-y-6">
          ${actions.map(action => {
    const isBest = action.isRecommended;
    // Best Action Styling
    const borderClass = isBest
      ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] bg-indigo-500/5'
      : 'border-border hover:border-zinc-700 bg-surface/50 opacity-80 hover:opacity-100';

    return `
             <div class="saas-card p-6 ${borderClass} transition-all duration-300 relative overflow-hidden group">
                ${isBest ? `
                   <!-- Best Match Badge -->
                   <div class="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl shadow-lg">
                      <i class="fas fa-star mr-1 text-yellow-300"></i> BEST MATCH
                   </div>
                   <!-- Glow Effect -->
                   <div class="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
                ` : ''}
                
                <div class="flex justify-between items-start mb-3 relative z-10">
                   <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg ${isBest ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-400'} flex items-center justify-center font-bold text-lg border border-white/5">
                         ${isBest ? '1' : action.id}
                      </div>
                      <div>
                         <h4 class="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">${action.title}</h4>
                         <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-xs text-zinc-500">${action.impact} Impact</span>
                            <span class="w-1 h-1 rounded-full bg-zinc-700"></span>
                            <span class="text-xs text-zinc-500">${action.difficulty} Effort</span>
                         </div>
                      </div>
                   </div>
                </div>
                
                <p class="text-zinc-400 text-sm mb-5 leading-relaxed pl-[3.25rem]">${action.description}</p>
                
                ${isBest ? `
                   <div class="pl-[3.25rem] relative z-10">
                      <!-- Why Section -->
                      <div class="mb-5 bg-indigo-900/20 border border-indigo-500/20 rounded-md p-3">
                         <h5 class="text-xs font-bold text-indigo-300 uppercase mb-1 flex items-center">
                            <i class="fas fa-info-circle mr-2"></i> Why this action?
                         </h5>
                         <p class="text-sm text-indigo-100/80">${action.reason}</p>
                      </div>

                      <!-- Timeline Execution Plan -->
                      <div class="bg-black/40 rounded-lg p-5 border border-white/5 backdrop-blur-sm">
                         <h5 class="text-xs font-bold text-zinc-500 uppercase mb-6 tracking-wider">Execution Timeline</h5>
                         <div class="space-y-0" id="execution-timeline">
                            ${action.steps.map((s, idx) => `
                               <div class="flex gap-4 group/step relative transition-all duration-500" id="step-${idx}">
                                  <!-- Left: Time -->
                                  <div class="w-16 pt-1 flex flex-col items-end shrink-0">
                                      <span class="px-2 py-1 rounded bg-zinc-800 border border-white/5 text-[10px] font-mono text-zinc-500 transition-colors">
                                         ${s.estTime || 'Pending'}
                                      </span>
                                  </div>

                                  <!-- Middle: Line & Icon -->
                                  <div class="flex flex-col items-center relative px-2">
                                      <!-- Vertical Line -->
                                      ${idx < action.steps.length - 1 ? `<div class="absolute top-9 bottom-[-32px] w-px bg-zinc-800 transition-colors duration-500" id="line-${idx}"></div>` : ''}
                                      
                                      <!-- Icon Circle -->
                                      <div class="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-500 flex items-center justify-center text-xs relative z-10 transition-all duration-500" id="icon-box-${idx}">
                                         <i class="fas ${s.icon || 'fa-circle'}" id="icon-${idx}"></i>
                                      </div>
                                  </div>

                                  <!-- Right: Content -->
                                  <div class="flex-1 pb-8">
                                      <div class="bg-zinc-900/40 border border-white/5 rounded-lg p-3 transition-all duration-500" id="content-${idx}">
                                          <div class="text-sm font-bold text-zinc-200 transition-colors" id="title-${idx}">${s.title}</div>
                                          <div class="text-xs text-zinc-500 mt-1 leading-relaxed">${s.desc}</div>
                                      </div>
                                  </div>
                               </div>
                            `).join('')}
                         </div>
                         
                         
                          <button onclick="executeActionPlan()" data-action="execute-plan" class="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-md shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center group/btn">
                             <i class="fas fa-play mr-2 text-xs group-hover/btn:animate-pulse"></i> Execute Action Plan
                          </button>
                          
                          <!-- Verify System Health Button (Hidden initially) -->
                          <button id="verify-health-btn" onclick="verifySystemHealth()" class="hidden w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 rounded-md shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center group/btn">
                             <i class="fas fa-check-circle mr-2 text-xs"></i> Verify System Health
                          </button>
                       </div>
                   </div>
                ` : `
                   <!-- Apply Button for Secondary Actions -->
                   <div class="pl-[3.25rem]">
                      <button class="text-xs font-medium text-zinc-500 hover:text-white transition-colors flex items-center">
                         View Details <i class="fas fa-chevron-right ml-1 text-[10px]"></i>
                      </button>
                   </div>
                `}
             </div>
             `;
  }).join('')}
       </div>
    </section>
  `;
}

function explanationSection(e) {
  // Deprecated in favor of inline for layout control, keeping blank to satisfy potential refs if any
  return '';
}

function timelineSection() {
  return `
    <div class="saas-card p-5 sticky top-24">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-sm font-bold text-white flex items-center">
          <i class="fas fa-history text-muted-foreground mr-2"></i> Timeline
        </h3>
        <span class="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">LIVE</span>
      </div>
      
      <div class="relative space-y-0">
        <!-- Vertical Line -->
        <div class="absolute left-[19px] top-2 bottom-2 w-px bg-border"></div>
        ${window.fakeTimeline.map(timelineItem).join('')}
      </div>
    </div>
  `;
}

function timelineItem(item, index) {
  const colors = {
    error: { dot: "bg-red-500", text: "text-red-400" },
    warn: { dot: "bg-amber-500", text: "text-amber-400" },
    info: { dot: "bg-blue-500", text: "text-blue-400" },
    success: { dot: "bg-green-500", text: "text-green-400" }
  };
  const s = colors[item.type] || colors.info;

  return `
    <div class="relative pl-10 py-3 group">
      <!-- Dot -->
      <div class="absolute left-[15px] top-[18px] w-2.5 h-2.5 rounded-full z-10 border-2 border-surface ${s.dot} group-hover:scale-125 transition-transform duration-200"></div>
      
      <!-- Card -->
      <div class="flex flex-col">
        <span class="text-xs font-mono text-zinc-500 mb-0.5">${item.time}</span>
        <span class="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">${item.title}</span>
      </div>
    </div>
  `;
}

// --- Connection Logic ---
// --- Connection Logic ---
function connectSource() {
  const input = document.getElementById('source-input');
  const btn = document.getElementById('connect-btn');
  const statusDiv = document.getElementById('connection-status');
  const statusName = document.getElementById('source-name');

  if (!input) return;

  const url = input.value.trim().toLowerCase();

  // Loading State
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  setTimeout(() => {
    try {
      if (!window.SourceManager) {
        throw new Error("SourceManager not loaded. Please refresh.");
      }

      const result = window.SourceManager.connect(url);

      if (result) {
        statusName.innerText = window.SourceManager.currentSource;
        statusDiv.classList.remove('opacity-0');

        // Show success toast (simulated with terminal if open, or just visual)
        if (window.$ && $('#terminal').length) {
          const term = $('#terminal').terminal();
          if (term) term.echo(`[[;green;]System Connected:] ${result}`);
        }
      } else {
        alert("This system does not expose logs publicly. Please connect via InsightOps Agent or Webhook.");
      }
    } catch (e) {
      alert(`Connection Error: ${e.message}`);
      console.error(e);
    } finally {
      btn.innerHTML = 'Connect';
    }
  }, 800);
}

// Make functions globally available
window.switchTab = switchTab;
window.askWhy = handleGeminiAsk; // Alias to existing function
window.connectSource = connectSource;

// --- Data Source Adapters ---
// function renderDashboard & renderCharts removed in favor of Analysis Tab redirect

// --- Gemini UI Handler ---
async function handleGeminiAsk() {
  const input = document.getElementById('gemini-input');
  const btn = document.getElementById('gemini-btn');
  const responseDiv = document.getElementById('gemini-response');

  if (!input.value.trim()) return;

  const question = input.value.trim();

  // Loading State
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;
  responseDiv.innerHTML = '';
  responseDiv.classList.add('hidden');

  const answer = await askGemini(question);

  btn.innerHTML = 'Ask';
  btn.disabled = false;

  // Markdown-like bolding for aesthetics
  const formattedAnswer = answer.replace(/\*\*(.*?)\*\*/g, '<span class="text-indigo-300 font-bold">$1</span>');

  responseDiv.innerHTML = formattedAnswer;
  responseDiv.classList.remove('hidden');
}

window.handleGeminiAsk = handleGeminiAsk;

// --- Recommendation Logic (2nd API Key) ---


// --- Analysis Logic ---

function performLogAnalysis(logs) {
  // Dynamic Service Discovery
  const services = [...new Set(logs.map(l => l.service))];

  const stats = {};
  const timelineData = {};
  let firstFailure = null;

  // Initialize stats for discovered services
  services.forEach(s => {
    stats[s] = { name: s, total: 0, errors: 0, info: 0, causes: new Set(), status: 'Healthy' };
  });

  logs.forEach(log => {
    const serviceName = log.service;

    if (stats[serviceName]) {
      stats[serviceName].total++;
      if (log.level === 'error') {
        stats[serviceName].errors++;
        if (log.cause) stats[serviceName].causes.add(log.cause);

        // Timeline data
        const hourMin = log.timestamp.substring(0, 5);
        timelineData[hourMin] = (timelineData[hourMin] || 0) + 1;

        if (!firstFailure) firstFailure = { service: serviceName, time: log.timestamp, cause: log.message };
      } else {
        stats[serviceName].info++;
      }
    }
  });

  // Auto-Determine Status based on error rates
  Object.values(stats).forEach(s => {
    const errorRate = s.total > 0 ? s.errors / s.total : 0;
    if (s.errors === 0) s.status = 'Healthy';
    else if (errorRate > 0.1) s.status = 'Critical'; // Lower threshold for realism
    else s.status = 'Degraded';
  });

  // Sort status to put Critical first (helpful for UI)
  const sortedStats = Object.fromEntries(
    Object.entries(stats).sort(([, a], [, b]) => b.errors - a.errors)
  );

  return { stats: sortedStats, firstFailure, timelineData };
}

// --- Gemini API Logic ---
async function askGemini(question) {
  if (!window.ENV || !window.ENV.GEMINI_API_KEY || window.ENV.GEMINI_API_KEY.includes('PASTE_YOUR')) {
    alert("Please configure your Gemini API Key in env.js first!");
    return "API Key not configured. Check env.js";
  }

  const logs = window.cachedLogs ? window.cachedLogs.slice(0, 30) : [];
  if (logs.length === 0) return "No logs found to analyze. Connect to a source first.";

  const context = JSON.stringify(logs);
  const prompt = `
You are an expert Site Reliability Engineer (SRE) performing an AI-driven Root Cause Analysis.

Analyze the system logs below and produce a response in the following format:

1. AI Root Cause Analysis  
- Clearly identify the primary failure.  
- Explain why it happened in simple but technical terms.

2. System Impact  
- Describe how this failure affected the system or users.

3. Technical Analogy  
- Give a short, human-friendly analogy to explain the issue.


Rules:
- Use ONLY the information present in the logs.
- Do NOT assume or invent missing details.
- If something cannot be determined, explicitly say "Not enough information in logs".

System Logs:
${context}

User Question:
"${question}"

Response:
`;


  const safeFetch = async (model) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${window.ENV.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return data.candidates[0].content.parts[0].text;
  };

  try {
    // Try Flash first
    return await safeFetch('gemini-1.5-flash');
  } catch (e1) {
    console.warn("Gemini 1.5 Flash failed, trying Pro:", e1);
    try {
      // Fallback to Pro
      return await safeFetch('gemini-pro');
    } catch (e2) {
      console.error("Gemini API Failed:", e2);
      return `AI Error: ${e2.message}. (Checked Flash & Pro)`;
    }
  }
}

// function renderDashboard & renderCharts removed in favor of Analysis Tab redirect

function renderSparklines() {
  const e = window.fakeExplanation;
  // IMPORTANT: Always use fakeSystemLogs to reflect current state (including any fixes)
  // This ensures sparklines show accurate data after action plan execution
  const sourceLogs = window.fakeSystemLogs ? Object.values(window.fakeSystemLogs).flat() : [];

  const stats = e.stats || {
    'Database': { status: 'Critical', errors: 145 },
    'API Gateway': { status: 'Degraded', errors: 42 },
    'Auth': { status: 'Healthy', errors: 0 },
    'Payment': { status: 'Critical', errors: 89 },
    'Cards': { status: 'Healthy', errors: 0 }
  };

  Object.entries(stats).forEach(([name, data]) => {
    const id = `spark-${name.replace(/\s+/g, '')}`;
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy old if exists
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    // --- REAL DATA MAPPING ---
    // Filter logs for this service
    const serviceLogs = sourceLogs.filter(l => l.service === name);

    // Group by Minute (or arbitrary buckets if time range varies)
    // We want ~12 points to match the visual style
    const buckets = new Array(12).fill(0);

    if (serviceLogs.length > 0) {
      // Find time range
      // timestamps are HH:MM or HH:MM:SS. Simple sort.
      const times = serviceLogs.map(l => l.timestamp).sort();
      const start = times[0];
      const end = times[times.length - 1];

      // Simple logic: mapping distinct timestamps to buckets is hard without Date parsing.
      // But the logs provided are 12:00 to 12:14 (15 mins).
      // Let's just Map 12:00 -> index 0, 12:11 -> index 11.

      serviceLogs.forEach(l => {
        if (l.level === 'error') {
          // extract minute
          // format "12:04" or "12:04:00"
          const parts = l.timestamp.split(':');
          const minute = parseInt(parts[1]);
          // Normalize to 0-11 range roughly?
          // Let's assume the window starts at minute 00.
          // Ideally finding min/max minute.

          // Fallback robust logic:
          // Map bucket based on relative position in global log array? No.
          // Let's stick to parsing minute modulo 12 or relative to start.

          // If we assume the demo data is 12:00-12:15
          const bucketIndex = minute % 12;
          if (bucketIndex >= 0 && bucketIndex < 12) {
            buckets[bucketIndex]++;
          }
        }
      });
    } else {
      // Fallback to random if absolutely no logs found for service (shouldn't happen if stat exists)
      // Keep flat if healthy
      if (data.status === 'Healthy') {
        // flat line
        buckets.fill(0);
      }
    }

    const isCritical = data.status === 'Critical' || (data.errors > 0);
    const color = data.status === 'Critical' ? '#ef4444' : (data.status === 'Degraded' ? '#f59e0b' : '#10b981');

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: 15 }, () => ''),
        datasets: [{
          data: buckets,
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false, min: 0 }
        },
        animation: {
          duration: 1500,
          easing: 'easeOutQuart'
        }
      }
    });
  });
}

function consoleView() {
  return `
    <div class="h-[calc(100vh-10rem)] w-full rounded-lg overflow-hidden border border-zinc-800 bg-black shadow-2xl animate-fade-in relative group">
       <div id="terminal" class="h-full w-full text-left"></div>
    </div>
  `;
}

// Terminal State
let cachedLogs = null;
let commandHistory = [];

async function initTerminal() {
  if ($('#terminal').length === 0) return;
  if ($('#terminal').data('terminal')) return; // Already initialized

  $('#terminal').terminal(async function (command, term) {
    command = command.trim();
    if (!command) return;

    const args = command.split(' ');
    const cmd = args[0];

    switch (cmd) {
      case 'help':
        term.echo(`
[[b;#a855f7;]Available Commands:]
  [[b;#fff;]curl <url>]     [[;gray;]Fetch data from a URL (try /logs)]
  [[b;#fff;]logs]           [[;gray;]View system logs (supports filtering)]
  [[b;#fff;]why <service>]  [[;gray;]Analyze a specific service]
  [[b;#fff;]health]         [[;gray;]Open Real Time Health Map]
  [[b;#fff;]timeline]       [[;gray;]View incident timeline]
  [[b;#fff;]clear]          [[;gray;]Clear the terminal]
              `);
        break;

      case 'curl':
        if (args[1] === '/logs' || args[1] === 'logs') {
          term.echo(`[[;gray;]Fetching logs from ${window.SourceManager.currentSource}...]`);
          term.pause();
          try {
            // Updated to use SourceManager
            window.cachedLogs = await window.SourceManager.fetchLogs(args[1]);

            term.echo(`[[;green;]Success!] Fetched ${window.cachedLogs.length} events from ${window.SourceManager.currentSource}.`);
            term.echo('[[;gray;]Type "logs" to view them.]');
          } catch (e) {
            term.error(`Failed to fetch logs: ${e.message}`);
          }
          term.resume();
        } else {
          term.error('Only /logs endpoint is simulated in this demo.');
        }
        break;

      case 'logs':
        if (!window.cachedLogs) {
          term.error('No logs in memory. Run [[b;#fff;]curl /logs] first.');
        } else {
          const filter = args[1] ? args[1].toLowerCase() : null;
          let count = 0;
          window.cachedLogs.forEach(log => {
            if (!filter || JSON.stringify(log).toLowerCase().includes(filter)) {
              const color = log.level === 'error' ? 'red' : (log.level === 'warn' ? 'orange' : 'white');
              term.echo(`[[;${color};][${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}]`);
              count++;
            }
          });
          if (count === 0) {
            term.echo('[[;gray;]No logs matched your filter.]');
          } else {
            // Auto-trigger analysis
            term.echo('[[;gray;]Generated System Analysis Report based on these logs.]');

            const analysis = performLogAnalysis(window.cachedLogs);

            // Update Global State for Analysis View
            window.fakeExplanation.question = "System Log Analysis Report";
            window.fakeExplanation.reason = analysis.firstFailure
              ? `System outage triggered by ${analysis.firstFailure.service}. High error rates detected across multiple services.`
              : "Intermittent stability issues detected in system logs.";
            window.fakeExplanation.rootCause = analysis.firstFailure
              ? `${analysis.firstFailure.cause}`
              : "Unknown / Distributed Tracing Incomplete";
            window.fakeExplanation.analogy = "It's like a traffic jam caused by a single broken traffic light.";
            window.fakeExplanation.stats = analysis.stats; // Pass stats for enhanced view

            // Update Timeline
            window.fakeTimeline = window.cachedLogs.filter(l => l.level === 'error').slice(0, 8).map(l => ({
              time: l.timestamp,
              title: l.message,
              type: 'error'
            }));

            // Provide Link
            term.echo('<button onclick="switchTab(\'explanation\')" class="bg-indigo-600 text-white px-3 py-1 mt-2 rounded hover:bg-indigo-500 transition-colors cursor-pointer text-xs font-sans">View Analysis Report -> </button>', { raw: true });
          }
        }
        break;

      case 'why':
        const service = args[1];
        if (!service) {
          term.error('Usage: why <service_name>');
        } else {
          term.echo(`[[;gray;]Analyzing dependencies for ${service}...]`);
          await new Promise(r => setTimeout(r, 800));
          term.echo(`[[;gray;]Querying AI root cause engine...]`);
          await new Promise(r => setTimeout(r, 1200));
          term.echo(`[[b;yellow;]Insight:] ${service} is experiencing high latency due to [[b;red;]Database Lock Contention].`);
          term.echo(`[[;gray;]Recommendation: Check long-running transactions in the payment module.]`);
        }
        break;

      case 'timeline':
        term.echo('[[b;#fff;]Recent Incident Timeline:]');
        window.fakeTimeline.forEach(item => {
          term.echo(`  [[;gray;]${item.time}] [[;${item.type === 'error' ? 'red' : 'white'};]${item.title}]`);
        });
        break;

      case 'health':
        term.echo('[[;gray;]Opening Health Map...]');
        switchTab('health-map');
        break;



      default:
        term.echo(`[[;red;]Command not found:] ${cmd}`);
    }
  }, {
    greetings: `
[[b;#a855f7;]InsightOps Terminal v1.0.2]
[[;gray;]Connected to instance: i-0f9a8b7c6d5e4f3a2]
[[;gray;]Type [[b;#fff;]help] to list commands.]
`,
    height: '100%',
    prompt: '[[b;#a855f7;]admin@insightops:~$] ',
    onInit: function (term) {
      // Custom init styles if needed
    }
  });
}

// --- Service Detail View ---

async function renderServiceDetail(serviceName) {
  MemoryManager.set('service', serviceName);
  // Ensure basic layout
  app.innerHTML = `
    <div class="h-screen bg-background relative flex flex-col overflow-hidden">
       <!-- Header -->
       <!-- Header -->
       <header id="service-header" class="h-16 border-b border-white/5 flex items-center px-8 justify-between bg-black/50 backdrop-blur-xl sticky top-0 z-50 shrink-0 transition-colors duration-500">
         <div class="flex items-center text-sm text-zinc-400 group cursor-pointer hover:text-white transition-colors" onclick="window.location.href = window.location.pathname">
            <div class="w-8 h-8 mr-3 bg-white/5 text-zinc-400 rounded-lg flex items-center justify-center font-bold font-display group-hover:bg-white/10 group-hover:text-white transition-all duration-300 ring-1 ring-white/5">
              <i class="fas fa-arrow-left text-xs"></i>
            </div>
            <span class="font-medium tracking-wide">Back to Dashboard</span>
         </div>
         
         <div class="flex flex-col items-center">
            <div class="font-bold text-white text-lg tracking-tight font-display drop-shadow-md">${serviceName}</div>
            <div class="flex items-center space-x-2">
               <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <div class="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Live Monitoring</div>
            </div>
         </div>
         
         <div class="flex items-center space-x-3">
             <div class="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <i class="fas fa-exclamation-triangle"></i> Incident Active
             </div>
         </div>
       </header>

       <!-- Main Content (Scrollable) -->
       <main class="flex-1 overflow-y-auto custom-scrollbar p-8 w-full">
          <div class="max-w-7xl mx-auto space-y-8 pb-20">
          
              <!-- Loading State -->
              <div id="service-loading" class="text-center py-20">
                 <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mb-6 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                 <p class="text-zinc-400 font-light tracking-wide animate-pulse">Running diagnostics & AI analysis...</p>
              </div>

              <!-- Content (Hidden initially) -->
              <!-- Content (Hidden initially) -->
              <div id="service-content" class="hidden space-y-8 animate-fade-in">

                 <!-- Hero Metrics -->
                 <div class="grid grid-cols-4 gap-4">
                    <div class="saas-card p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/5 backdrop-blur-sm">
                       <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Health Score</div>
                       <div class="text-3xl font-display font-bold text-white flex items-end gap-2">
                          82% <span class="text-emerald-400 text-xs font-mono mb-1.5">▲ 2%</span>
                       </div>
                    </div>
                     <div class="saas-card p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/5 backdrop-blur-sm">
                       <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Avg Latency</div>
                       <div class="text-3xl font-display font-bold text-zinc-200 flex items-end gap-2">
                          142<span class="text-sm text-zinc-500 font-normal mb-1">ms</span>
                       </div>
                    </div>
                     <div class="saas-card p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/5 backdrop-blur-sm">
                       <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Error Rate</div>
                       <div class="text-3xl font-display font-bold text-red-400 flex items-end gap-2">
                          4.2% <span class="text-red-500/50 text-xs font-mono mb-1.5">▲</span>
                       </div>
                    </div>
                     <div class="saas-card p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/5 backdrop-blur-sm">
                       <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Active Threads</div>
                       <div class="text-3xl font-display font-bold text-indigo-300 flex items-end gap-2">
                          892
                       </div>
                    </div>
                 </div>
                 
                 <!-- Top: Metrics & Timeline -->
                 <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                    
                    <!-- Log Table (Left - Scrollable vertically) -->
                    <div class="lg:col-span-2 saas-card flex flex-col h-full overflow-hidden border border-white/5 bg-black/40 backdrop-blur-sm">
                       <div class="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                          <h3 class="font-bold text-zinc-200 text-sm flex items-center">
                            <i class="fas fa-list-ul text-indigo-400 mr-2"></i> Live Logs
                          </h3>
                          <span id="log-count" class="text-[10px] font-mono text-zinc-500 bg-black/50 border border-white/5 px-2 py-1 rounded">0 events</span>
                       </div>
                       <div class="flex-1 overflow-auto p-0 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                          <table class="w-full text-left text-xs font-mono">
                             <thead class="bg-black/50 text-zinc-500 sticky top-0 z-10 backdrop-blur-md border-b border-white/5">
                                <tr>
                                   <th class="px-4 py-3 font-medium w-24">Time</th>
                                   <th class="px-4 py-3 font-medium w-20">Level</th>
                                   <th class="px-4 py-3 font-medium">Event</th>
                                   <th class="px-4 py-3 font-medium w-48">Cause</th>
                                </tr>
                             </thead>
                             <tbody id="logs-body" class="divide-y divide-white/5">
                               <!-- Logs injected here -->
                             </tbody>
                          </table>
                       </div>
                    </div>

                    <!-- Right: Error Chart & Summary -->
                    <div class="flex flex-col gap-6 h-full">
                       <!-- Error Chart -->
                       <div class="saas-card p-5 h-1/3 flex flex-col border border-white/5 bg-black/40 backdrop-blur-sm">
                          <div class="flex justify-between items-center mb-4">
                             <h3 class="text-xs font-bold text-zinc-500 uppercase tracking-wider">Error Frequency</h3>
                             <i class="fas fa-chart-bar text-zinc-700"></i>
                          </div>
                          <div class="flex-1 relative w-full min-h-0">
                             <canvas id="error-chart"></canvas>
                          </div>
                       </div>

                       <!-- AI Summary Skeleton (Replaced by real content later) -->
                       <div id="ai-summary-container" class="saas-card p-6 border-indigo-500/30 flex-1 flex flex-col relative overflow-hidden bg-gradient-to-b from-indigo-900/10 to-transparent">
                           <!-- Decorator -->
                           <div class="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none"></div>

                           <h3 class="text-sm font-bold text-indigo-300 uppercase mb-4 flex items-center gap-2">
                               <i class="fas fa-sparkles text-indigo-400"></i> AI Diagnosis
                           </h3>
                           <div class="space-y-3 animate-pulse">
                              <div class="h-2 bg-indigo-400/10 rounded w-full"></div>
                              <div class="h-2 bg-indigo-400/10 rounded w-5/6"></div>
                              <div class="h-2 bg-indigo-400/10 rounded w-4/6"></div>
                           </div>
                       </div>
                    </div>
                 </div>

                 <!-- AI Detailed Analysis -->
                 <div id="rca-container" class="hidden"></div>
                 
                 <!-- Actions -->
                 <div id="actions-container">
                    ${recommendedActions()}
                 </div>

              </div>
          </div>
       </main>
    </div>
  `;

  // Fetch Data Logic
  try {
    // 1. Connect/Fetch logs (Simulated)
    const logs = await window.SourceManager.fetchLogs('https://fakeprod.vercel.app/logs.json');

    // 2. Filter for specific service
    const serviceLogs = logs.filter(l => l.service === serviceName);

    if (serviceLogs.length === 0) throw new Error(`No logs found for ${serviceName}`);

    // 3. Render Logs
    renderLogsTable(serviceLogs);

    // 4. Render Chart
    renderErrorChart(serviceLogs);

    // 5. Hero Metrics & Header Logic
    const errorCount = serviceLogs.filter(l => l.level === 'error').length;
    const isCritical = errorCount > 0;

    // Dynamic Header Gradient
    const header = document.getElementById('service-header');
    if (isCritical) {
      header.className = header.className.replace('bg-black/50', 'bg-red-950/30');
      header.classList.add('shadow-[0_10px_40px_-10px_rgba(239,68,68,0.2)]');
    }

    // Dynamic Metrics (Mocked for Demo purposes based on logs)
    const latency = isCritical ? Math.floor(Math.random() * 200) + 300 : Math.floor(Math.random() * 50) + 20;
    const score = isCritical ? 60 + Math.floor(Math.random() * 20) : 98 + Math.floor(Math.random() * 2);

    // Inject Metrics
    document.getElementById('service-content').querySelector('.grid').innerHTML = `
        <div class="saas-card p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/5 backdrop-blur-sm group hover:border-white/10 transition-colors">
           <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Health Score</div>
           <div class="text-3xl font-display font-bold ${isCritical ? 'text-amber-400' : 'text-emerald-400'} flex items-end gap-2">
              ${score}% <span class="text-zinc-500 text-xs font-mono mb-1.5 opacity-50">${isCritical ? '▼' : '▲'}</span>
           </div>
        </div>
         <div class="saas-card p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/5 backdrop-blur-sm group hover:border-white/10 transition-colors">
           <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Avg Latency</div>
           <div class="text-3xl font-display font-bold text-zinc-200 flex items-end gap-2">
              ${latency}<span class="text-sm text-zinc-500 font-normal mb-1">ms</span>
           </div>
        </div>
         <div class="saas-card p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/5 backdrop-blur-sm group hover:border-white/10 transition-colors">
           <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Error Rate</div>
           <div class="text-3xl font-display font-bold ${isCritical ? 'text-red-400' : 'text-zinc-300'} flex items-end gap-2">
              ${(errorCount / serviceLogs.length * 100).toFixed(1)}%
           </div>
        </div>
         <div class="saas-card p-4 bg-gradient-to-br from-white/5 to-transparent border border-white/5 backdrop-blur-sm group hover:border-white/10 transition-colors">
           <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Active Threads</div>
           <div class="text-3xl font-display font-bold text-indigo-300 flex items-end gap-2">
              ${Math.floor(Math.random() * 500) + 100}
           </div>
        </div>
    `;

    // 6. Show Content
    document.getElementById('service-loading').classList.add('hidden');
    document.getElementById('service-content').classList.remove('hidden');

    // 7. Trigger AI Analysis (Async)
    performServiceAnalysis(serviceName, serviceLogs);

    // 8. Update Timeline to match logs
    updateTimelineFromLogs(serviceLogs);

  } catch (e) {
    document.getElementById('service-loading').innerHTML = `
      <div class="text-red-500 font-medium">Failed to load service data</div>
      <div class="text-zinc-500 text-sm mt-2">${e.message}</div>
    `;
  }
}

function renderLogsTable(logs) {
  const tbody = document.getElementById('logs-body');
  document.getElementById('log-count').innerText = `${logs.length} events`;

  tbody.innerHTML = logs.map(log => {
    const isError = log.level === 'error';
    const rowClass = isError ? 'bg-red-500/5 text-red-100 hover:bg-red-500/10' : 'text-zinc-400 hover:bg-white/5';
    const causeClass = isError ? 'text-red-400 font-semibold' : 'text-zinc-600 italic';

    return `
       <tr class="transition-colors border-b border-white/5 hover:bg-white/5 group">
          <td class="px-4 py-2.5 whitespace-nowrap opacity-60 font-mono text-[10px] text-zinc-400 group-hover:opacity-100 transition-opacity">${log.timestamp}</td>
          <td class="px-4 py-2.5">
             <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full ${isError ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500/50'}"></span>
                <span class="text-[10px] uppercase font-bold tracking-wider ${isError ? 'text-red-400' : 'text-zinc-500'}">
                   ${log.level}
                </span>
             </div>
          </td>
          <td class="px-4 py-2.5 text-zinc-300 group-hover:text-white transition-colors">${log.message.split(' - ')[0].replace(/^\[.*?\]\s*/, '')}</td>
          <td class="px-4 py-2.5 ${causeClass} text-[11px]">${log.cause || '-'}</td>
       </tr >
      `;

  }).join('');
}

function renderErrorChart(logs) {
  const ctx = document.getElementById('error-chart').getContext('2d');

  // Group errors by minute (simple for demo)
  const timeMap = {};
  logs.forEach(l => {
    if (l.level === 'error') {
      // rough time bucket
      const time = l.timestamp.substring(0, 5); // HH:MM
      timeMap[time] = (timeMap[time] || 0) + 1;
    }
  });

  const labels = Object.keys(timeMap).sort();
  const data = labels.map(t => timeMap[t]);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Errors',
        data: data,
        backgroundColor: '#ef4444',
        borderRadius: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
}

async function performServiceAnalysis(name, logs) {
  // Store the current service being analyzed globally
  window.currentAnalyzingService = name;

  // Placeholder for AI step
  const container = document.getElementById('ai-summary-container');

  if (!window.ENV?.GEMINI_API_KEY) {
    container.innerHTML = `< div class="text-zinc-500 text-sm" > AI Analysis unavailable(Missing Key).</div > `;
    return;
  }

  const prompt = `
     You are a Site Reliability Engineer.Validate the health of the ${name} service based on these logs.
     
     Generate a JSON response(AND ONLY JSON) with this structure:
    {
      "summary": "Status summary",
      "rootCause": "Primary issue or 'None' if healthy",
      "impact": "User impact or 'None'",
      "analogy": "Simple analogy",
      "actions": [
        { 
          "title": "Action Title", 
          "desc": "Action description", 
          "impact": "High/Med/Low", 
          "difficulty": "Low/Med/High",
          "reason": "Why this is the best action (only for top action)",
          "steps": [
             { "title": "Step Title", "desc": "Step details", "estTime": "10m", "icon": "fa-code" }
          ]
        }
      ]
    }

    Rules:
    1. If errors exist, suggest fixes.
     2. If NO errors exist, suggest 2 - 3 PREVENTATIVE maintenance actions(e.g.Rotate keys, Optimization).
     3. Ensure 'actions' array is NEVER empty.

      Logs: ${JSON.stringify(logs.slice(0, 30))}
    `;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${window.ENV.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const json = await res.json();
    const text = json.candidates[0].content.parts[0].text;

    // Robust JSON Extraction
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const cleanJson = jsonMatch ? jsonMatch[0] : text;

    const analysis = JSON.parse(cleanJson);

    // Render AI Results
    renderAIResults(analysis);

  } catch (e) {
    console.error(e);
    // Fallback UI on failure
    container.innerHTML = `
         <div class="p-4 border border-red-500/30 bg-red-500/10 rounded">
            <h3 class="text-red-400 font-bold mb-1">Analysis Failed</h3>
            <p class="text-xs text-red-300">${e.message}</p>
         </div>
      `;
  }
}

// --- Impact Mode Logic ---

// --- Impact Mode Logic ---
// Updated with Hackathon-grade logic
// (Variable isExecutiveView moved to top)

function toggleExecutiveMode() {
  isExecutiveView = !isExecutiveView;
  // Re-render current view if it is Impact Mode
  if (currentTab === 'impact') {
    const container = document.getElementById('impact-view-container');
    if (container) container.innerHTML = impactViewContent();
  }
}

function calculateImpactMetrics(logs) {
  let revenueLoss = 0;
  let usersAffected = 0;
  let slaRisk = 0;
  let trustScore = 100;

  // Advanced Metric: Revenue Velocity (Loss per second)
  let revenueVelocity = 0;

  // Check if a service was verified healthy - exclude its errors
  const verifiedService = window.healthVerifiedService || null;

  // Filter for relevant errors (excluding verified service)
  const paymentErrors = logs.filter(l => l.service === 'Payment' && l.level === 'error' && l.service !== verifiedService).length;
  const authErrors = logs.filter(l => l.service === 'Auth' && l.level === 'error' && l.service !== verifiedService).length;
  const dbErrors = logs.filter(l => l.service === 'Database' && l.level === 'error' && l.service !== verifiedService).length;
  const gatewayErrors = logs.filter(l => l.service === 'API Gateway' && l.level === 'error' && l.service !== verifiedService).length;

  // 1. Revenue Impact (Est. ₹ per payment failure)
  // Weighted: Payment errors are direct loss, Gateway/DB are potential loss
  revenueLoss = paymentErrors * 2500; // Direct: ₹2500 avg ticket
  revenueLoss += (gatewayErrors * 0.3) * 2500; // Indirect: 30% conversion impact
  revenueLoss += (dbErrors * 0.1) * 2500; // Backend: 10% timeout drop-off

  // Velocity Calculation (Simulated based on error density)
  if (paymentErrors > 0) revenueVelocity += 420; // ₹420/sec
  if (gatewayErrors > 5) revenueVelocity += 150;

  // 2. User Impact
  // Auth errors = 1 user. Gateway = 0.5 user (partial). DB = 0.1 (slow)
  usersAffected = (authErrors * 1) + (gatewayErrors * 0.5) + (dbErrors * 0.1);
  usersAffected = Math.ceil(usersAffected);

  // 3. Operational Risk (0-10)
  // Base risk from total error volume + spread across services
  const totalErrors = paymentErrors + authErrors + dbErrors + gatewayErrors;
  const servicesAffected = [paymentErrors, authErrors, dbErrors, gatewayErrors].filter(e => e > 0).length;

  slaRisk = Math.min(10, (totalErrors / 5) + (servicesAffected * 1.5));

  // 4. Trust Score (Starts at 100, decays with duration and severity)
  // Decay harder for User visible errors (Auth, Payment)
  let decay = (authErrors * 2) + (paymentErrors * 3) + (gatewayErrors * 0.5);
  trustScore = Math.max(0, 100 - decay);

  return {
    revenueLoss: Math.floor(revenueLoss),
    revenueVelocity: revenueVelocity,
    usersAffected: usersAffected,
    slaRisk: slaRisk.toFixed(1),
    trustScore: Math.floor(trustScore),
    breakdown: { paymentErrors, authErrors, dbErrors, gatewayErrors }
  };
}

function renderAIResults(data) {
  const summaryContainer = document.getElementById('ai-summary-container');
  const rcaContainer = document.getElementById('rca-container');
  const actionsContainer = document.getElementById('actions-container');

  // Update Summary Card
  summaryContainer.innerHTML = `
      <h3 class="text-sm font-bold text-indigo-300 uppercase mb-3 flex items-center">
         <i class="fas fa-robot mr-2"></i> AI Diagnosis
      </h3>
      <p class="text-white font-medium text-sm leading-relaxed mb-4">
         "${data.summary}"
      </p>
      <div class="p-3 bg-red-500/10 border border-red-500/20 rounded">
         <div class="text-xs text-red-300 uppercase font-bold mb-1">Root Cause</div>
         <div class="text-red-100 text-sm font-mono">${data.rootCause}</div>
      </div>
   `;

  // Render Detailed Sections
  rcaContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
         <!-- Impact -->
         <div class="saas-card p-6">
            <h3 class="text-sm font-bold text-zinc-400 uppercase mb-4">User Impact</h3>
            <p class="text-zinc-300 leading-relaxed">${data.impact}</p>
         </div>
         <!-- Analogy -->
         <div class="saas-card p-6 border-l-2 border-l-purple-500">
            <h3 class="text-sm font-bold text-purple-400 uppercase mb-4">In Plain English</h3>
            <p class="text-zinc-300 italic text-lg leading-relaxed">"${data.analogy}"</p>
         </div>
      </div>
   `;
  rcaContainer.classList.remove('hidden');

  // Render Actions with Best Match & Timeline Logic
  actionsContainer.innerHTML = `
      <h3 class="text-xl font-bold text-white font-display mb-6">Recommended Fixes</h3>
      <div class="space-y-6">
         ${(data.actions || []).slice(0, 3).map((a, idx) => {
    const isBest = idx === 0;
    // Ensure steps exist
    const steps = a.steps || [
      { title: "Analyze", desc: "Deep dive into logs", estTime: "5m", icon: "fa-search" },
      { title: "Patch", desc: "Apply recommended fix", estTime: a.time || "15m", icon: "fa-wrench" },
      { title: "Verify", desc: "Confirm service health", estTime: "5m", icon: "fa-check-circle" }
    ];

    const borderClass = isBest
      ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)] bg-indigo-500/5'
      : 'border-border hover:border-zinc-700 bg-surface/50 opacity-80 hover:opacity-100';

    return `
            <div class="saas-card p-6 ${borderClass} transition-all duration-300 relative overflow-hidden group">
               ${isBest ? `
                  <div class="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl shadow-lg">
                     <i class="fas fa-star mr-1 text-yellow-300"></i> BEST MATCH
                  </div>
                  <div class="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
               ` : ''}
               
               <div class="flex justify-between items-start mb-3 relative z-10">
                  <div class="flex items-center gap-3">
                     <div class="w-10 h-10 rounded-lg ${isBest ? 'bg-indigo-500/20 text-indigo-300' : 'bg-zinc-800 text-zinc-400'} flex items-center justify-center font-bold text-lg border border-white/5">
                        ${idx + 1}
                     </div>
                     <div>
                        <h4 class="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">${a.title}</h4>
                        <div class="flex items-center gap-2 mt-0.5">
                           <span class="text-xs text-zinc-500">${a.impact} Impact</span>
                           <span class="w-1 h-1 rounded-full bg-zinc-700"></span>
                           <span class="text-xs text-zinc-500">${a.difficulty || 'Medium'} Effort</span>
                        </div>
                     </div>
                  </div>
               </div>
               
               <p class="text-zinc-400 text-sm mb-5 leading-relaxed pl-[3.25rem]">${a.desc}</p>
               
               ${isBest ? `
                  <div class="pl-[3.25rem] relative z-10">
                     <div class="mb-5 bg-indigo-900/20 border border-indigo-500/20 rounded-md p-3">
                        <h5 class="text-xs font-bold text-indigo-300 uppercase mb-1 flex items-center">
                           <i class="fas fa-info-circle mr-2"></i> Why this action?
                        </h5>
                        <p class="text-sm text-indigo-100/80">${a.reason || 'This directly addresses the identified root cause with highest confidence.'}</p>
                     </div>

                     <div class="bg-black/40 rounded-lg p-5 border border-white/5 backdrop-blur-sm">
                        <h5 class="text-xs font-bold text-zinc-500 uppercase mb-6 tracking-wider">Execution Timeline</h5>
                        <div class="space-y-0" id="ai-execution-timeline">
                           ${steps.map((s, stepIdx) => `
                              <div class="flex gap-4 group/step relative transition-all duration-500" id="step-ai-${stepIdx}">
                                 <div class="w-16 pt-1 flex flex-col items-end shrink-0">
                                     <span class="px-2 py-1 rounded bg-zinc-800 border border-white/5 text-[10px] font-mono text-zinc-500 transition-colors">
                                        ${s.estTime || 'Pending'}
                                     </span>
                                 </div>
                                 <div class="flex flex-col items-center relative px-2">
                                     ${stepIdx < steps.length - 1 ? `<div class="absolute top-9 bottom-[-32px] w-px bg-zinc-800 transition-colors duration-500" id="line-ai-${stepIdx}"></div>` : ''}
                                     <div class="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-500 flex items-center justify-center text-xs relative z-10 transition-all duration-500" id="icon-box-ai-${stepIdx}">
                                        <i class="fas ${s.icon || 'fa-circle'}" id="icon-ai-${stepIdx}"></i>
                                     </div>
                                 </div>
                                 <div class="flex-1 pb-8">
                                     <div class="bg-zinc-900/40 border border-white/5 rounded-lg p-3 transition-all duration-500" id="content-ai-${stepIdx}">
                                         <div class="text-sm font-bold text-zinc-200 transition-colors" id="title-ai-${stepIdx}">${s.title}</div>
                                         <div class="text-xs text-zinc-500 mt-1 leading-relaxed">${s.desc}</div>
                                     </div>
                                 </div>
                              </div>
                           `).join('')}
                        </div>
                        
                        <button onclick="executeAIActionPlan()" data-action="execute-ai-plan" class="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium py-2 rounded-md shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center group/btn">
                           <i class="fas fa-play mr-2 text-xs group-hover/btn:animate-pulse"></i> Execute Action Plan
                        </button>
                        
                        <!-- Verify System Health Button (Hidden initially) -->
                        <button id="verify-health-btn-ai" onclick="verifySystemHealth()" class="hidden w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2 rounded-md shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center group/btn">
                           <i class="fas fa-check-circle mr-2 text-xs"></i> Verify System Health
                        </button>
                     </div>
                  </div>
               ` : `
                  <div class="pl-[3.25rem]">
                     <button class="text-xs font-medium text-zinc-500 hover:text-white transition-colors flex items-center">
                        View Details <i class="fas fa-chevron-right ml-1 text-[10px]"></i>
                     </button>
                  </div>
               `}
            </div>
           `;
  }).join('')}
      </div>
   `;
  actionsContainer.classList.remove('hidden');
}

function healthMapView() {
  return `
    <div class="h-[calc(100vh-8rem)] relative overflow-hidden flex items-center justify-center animate-fade-in">
        
        <!-- Background Elements -->
        <div class="absolute inset-0 pointer-events-none">
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-zinc-800/50"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-zinc-800"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-zinc-800/50"></div>
            
            <!-- Radial Gradients -->
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 blur-3xl rounded-full"></div>
        </div>

        <!-- Center Hub -->
        <div class="relative z-10 w-32 h-32 rounded-full bg-surface border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.1)] flex flex-col items-center justify-center animate-[pulse_3s_infinite]">
            <div class="text-2xl font-bold text-white mb-1">99.9%</div>
            <div class="text-xs text-zinc-500 uppercase tracking-widest">Uptime</div>
            <div class="absolute inset-0 rounded-full border border-indigo-500/20 animate-[spin_10s_linear_infinite]"></div>
        </div>

        <!-- Nodes Container -->
        <div id="health-map-container" class="absolute inset-0 pointer-events-none">
           <!-- Nodes injected via JS -->
        </div>

        <!-- Legend -->
        <div class="absolute bottom-8 left-8 p-4 rounded-lg bg-surface/80 backdrop-blur border border-zinc-800 pointer-events-auto">
            <h4 class="text-xs font-bold text-zinc-500 uppercase mb-3">System Health</h4>
            <div class="space-y-2">
                <div class="flex items-center text-xs text-zinc-300">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span> Healthy (0 Err)
                </div>
                <div class="flex items-center text-xs text-zinc-300">
                    <span class="w-2 h-2 rounded-full bg-amber-500 mr-2 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></span> Degraded (1-2 Err)
                </div>
                <div class="flex items-center text-xs text-zinc-300">
                    <span class="w-2 h-2 rounded-full bg-red-500 mr-2 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span> Failing (>2 Err)
                </div>
            </div>
        </div>

        <!-- Side Panel -->
        <div id="health-side-panel" class="absolute top-0 right-0 w-96 h-full bg-surface border-l border-zinc-800 transform translate-x-full transition-transform duration-300 z-50 shadow-2xl overflow-y-auto">
            <!-- Dynamic Content -->
        </div>
    </div>
  `;
}

function initHealthMap() {
  const container = document.getElementById('health-map-container');
  const logs = window.fakeSystemLogs;
  if (!logs || !container) return; // Guard clause

  const services = Object.keys(logs);
  const radius = 250; // Distance from center

  // Clear container
  container.innerHTML = '';

  services.forEach((service, index) => {
    const angle = (index / services.length) * 2 * Math.PI - (Math.PI / 2); // Start from top
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    // Calculate Status
    const errorCount = logs[service].filter(l => l.level === 'error').length;
    let status = 'healthy';
    let colorClass = 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-emerald-400/50';
    let glowClass = 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]';

    if (errorCount > 2) {
      status = 'failing';
      colorClass = 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-400/50 animate-pulse';
      glowClass = 'group-hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]';
    } else if (errorCount > 0) {
      status = 'degraded';
      colorClass = 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] border-amber-400/50';
      glowClass = 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]';
    }

    // Create Node
    const node = document.createElement('div');
    node.className = `absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-300 hover:scale-110`;
    node.style.left = `calc(50% + ${x}px)`;
    node.style.top = `calc(50% + ${y}px)`;
    node.onclick = () => openServiceDetails(service, logs[service], status, errorCount);

    node.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="w-16 h-16 rounded-full border-4 border-surface/50 ${colorClass} ${glowClass} flex items-center justify-center text-white backdrop-blur-md transition-shadow duration-300">
                    <i class="fas fa-server text-lg drop-shadow-md"></i>
                </div>
                <div class="mt-3 px-3 py-1 rounded-full bg-surface/80 border border-zinc-800 backdrop-blur text-xs font-medium text-zinc-300 group-hover:text-white group-hover:border-indigo-500/50 transition-colors whitespace-nowrap">
                    ${service}
                </div>
            </div>
        `;

    container.appendChild(node);
  });
}

function openServiceDetails(name, logs, status, errorCount) {
  const panel = document.getElementById('health-side-panel');
  if (!panel) return;

  // Close first to reset if needed (for animation)
  panel.classList.add('translate-x-full');

  setTimeout(() => {
    // AI Summary Logic (Mock)
    let summary = "System is operating normally. No significant anomalies detected in the last hour.";
    if (status === 'failing') summary = "Critical failures detected. Logs indicate timeout issues and connection pool exhaustion. Immediate investigation recommended.";
    else if (status === 'degraded') summary = "Intermittent errors observed. High latency or rate limiting may be affecting service quality.";

    const statusColors = {
      healthy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      degraded: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      failing: 'text-red-400 bg-red-500/10 border-red-500/20'
    };

    panel.innerHTML = `
            <div class="p-6">
                <!-- Header -->
                <div class="flex items-center justify-between mb-8">
                    <button onclick="document.getElementById('health-side-panel').classList.add('translate-x-full')" class="text-zinc-500 hover:text-white transition-colors">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                    <div class="text-xs font-mono text-zinc-600">ID: ${name.toUpperCase().slice(0, 3)}-882</div>
                </div>

                <div class="mb-6">
                    <h2 class="text-2xl font-bold text-white mb-2 font-display">${name}</h2>
                    <span class="px-2 py-0.5 rounded text-xs font-bold uppercase border ${statusColors[status]}">
                        ${status}
                    </span>
                </div>

                <!-- Metrics -->
                <div class="grid grid-cols-2 gap-3 mb-8">
                    <div class="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                        <div class="text-zinc-500 text-[10px] uppercase font-bold">Errors</div>
                        <div class="text-xl font-mono ${errorCount > 0 ? 'text-white' : 'text-zinc-400'}">${errorCount}</div>
                    </div>
                    <div class="bg-zinc-900/50 p-3 rounded border border-zinc-800">
                        <div class="text-zinc-500 text-[10px] uppercase font-bold">Latency</div>
                        <div class="text-xl font-mono text-zinc-400">24ms</div>
                    </div>
                </div>

                <!-- AI Summary -->
                <div class="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-4 mb-8">
                    <h3 class="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center">
                        <i class="fas fa-robot mr-2"></i> AI Diagnosis
                    </h3>
                    <p class="text-sm text-indigo-100/80 leading-relaxed">
                        ${summary}
                    </p>
                </div>

                <!-- Recommended Actions (Moved from Main View) -->
                ${recommendedActions()}

                <!-- Logs -->
                <div>
                    <h3 class="text-sm font-bold text-white mb-4">Recent Logs</h3>
                    <div class="space-y-2">
                        ${logs.map(log => `
                            <div class="p-3 rounded bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                <div class="flex items-start gap-3">
                                    <i class="fas ${log.level === 'error' ? 'fa-times-circle text-red-500' : (log.level === 'warn' ? 'fa-exclamation-triangle text-amber-500' : 'fa-info-circle text-blue-500')} mt-0.5 text-xs"></i>
                                    <code class="text-xs text-zinc-400 break-all font-mono">${log.message}</code>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    panel.classList.remove('translate-x-full');
  }, 100);
}

// --- Timeline Replay Logic ---

// Moved to top of file to avoid ReferenceError
// let replayState = { ... };

function timelineReplayView() {
  return `
   <div class="h-[calc(100vh-8rem)] flex flex-col animate-fade-in relative">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div>
               <h1 class="text-2xl font-bold font-display text-white">Timeline Replay – System Failure Time Machine</h1>
               <p class="text-zinc-400 text-sm">Rewind and understand how incidents unfold.</p>
            </div>
            <div class="flex items-center gap-2 px-3 py-1 rounded bg-zinc-900 border border-zinc-700 font-mono text-xl text-indigo-400">
               <i class="fas fa-clock"></i> <span id="replay-clock">12:00</span>
            </div>
        </div>

        <!-- Main Content (Split View) -->
        <div class="flex-1 grid grid-cols-3 gap-6 min-h-0">
            <!-- Left: Visual Map (Reused/Adapted) -->
            <div class="col-span-2 bg-black rounded-xl border border-white/5 relative overflow-hidden shadow-inner" id="replay-visual-container">
                 <!-- Map injected here -->
            </div>

            <!-- Right: Context Panel -->
            <div class="col-span-1 bg-surface border border-zinc-800 rounded-xl p-5 flex flex-col">
                <h3 class="text-xs font-bold text-zinc-500 uppercase mb-4 tracking-wider">Incident Narrative</h3>
                <div id="replay-narrative" class="flex-1 overflow-y-auto space-y-4 pr-2">
                    <div class="text-zinc-500 italic text-sm text-center mt-10">Start the timeline to see events...</div>
                </div>
            </div>
        </div>

        <!-- Bottom Controls -->
        <div class="mt-6 h-24 bg-surface border-t border-zinc-800 flex items-center px-8 gap-8 -mx-8 -mb-8">
            <!-- Controls -->
            <div class="flex items-center gap-4">
                <button onclick="toggleReplay()" id="replay-toggle-btn" class="w-12 h-12 rounded-full bg-white text-black hover:scale-105 transition-transform flex items-center justify-center text-lg active:scale-95 shadow-lg shadow-white/10">
                    <i class="fas fa-play ml-1"></i>
                </button>
                <button onclick="resetReplay()" class="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors flex items-center justify-center">
                    <i class="fas fa-undo"></i>
                </button>
            </div>

            <!-- Slider -->
            <div class="flex-1 relative group">
                <input 
                  type="range" 
                  min="0" 
                  max="16" 
                  value="0" 
                  step="1"
                  id="replay-slider"
                  class="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                  oninput="updateReplayManual(this.value)"
                >
                <!-- Markers -->
                <div class="flex justify-between px-1 mt-2 text-[10px] font-mono text-zinc-600 select-none">
                   <span>12:00</span>
                   <span>12:04</span>
                   <span>12:08</span>
                   <span>12:12</span>
                   <span>12:16</span>
                </div>
            </div>
        </div>
   </div>
   `;
}

function initTimelineReplay() {
  const savedTime = MemoryManager.get('timeline_time');
  replayState.currentTimeIndex = (savedTime !== null && savedTime !== undefined) ? parseInt(savedTime) : 0;

  replayState.isPlaying = false;
  // Update slider UI
  setTimeout(() => {
    const slider = document.getElementById('replay-slider');
    if (slider) slider.value = replayState.currentTimeIndex;
    updateReplayVisuals(replayState.currentTimeIndex);
  }, 100);
}

function toggleReplay() {
  const btn = document.getElementById('replay-toggle-btn');
  const icon = btn.querySelector('i');

  if (replayState.isPlaying) {
    clearInterval(replayState.intervalId);
    replayState.isPlaying = false;
    icon.className = 'fas fa-play ml-1';
  } else {
    replayState.isPlaying = true;
    icon.className = 'fas fa-pause';

    replayState.intervalId = setInterval(() => {
      let nextVal = parseInt(document.getElementById('replay-slider').value) + 1;
      if (nextVal > 16) {
        clearInterval(replayState.intervalId);
        replayState.isPlaying = false;
        icon.className = 'fas fa-play ml-1';
        return;
      }
      document.getElementById('replay-slider').value = nextVal;
      updateReplayVisuals(nextVal);
    }, replayState.speed);
  }
}

function resetReplay() {
  if (replayState.isPlaying) toggleReplay();
  document.getElementById('replay-slider').value = 0;
  updateReplayVisuals(0);
}

function updateReplayManual(val) {
  if (replayState.isPlaying) toggleReplay(); // Pause if dragging
  updateReplayVisuals(parseInt(val));
}

function updateReplayVisuals(minuteOffset) {
  MemoryManager.set('timeline_time', minuteOffset);

  const minutes = replayState.startTime + minuteOffset; // Total minutes
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  const timeStr = `${hh}:${mm.toString().padStart(2, '0')}`;

  // Update Clock
  document.getElementById('replay-clock').innerText = timeStr;

  // Filter Logs
  const currentLogs = window.timelineReplayData.filter(l => {
    const logTime = parseInt(l.time.replace(':', ''));
    const currentTime = parseInt(timeStr.replace(':', ''));
    return logTime <= currentTime;
  });

  // 1. Identify Service Health at this exact minute
  const services = ["Database", "API Gateway", "Auth", "Payment", "Cards", "Notifications", "Analytics", "Storage"];
  const serviceHealth = {};

  services.forEach(s => {
    // Find errors specifically within the last 3 minutes window for persistent visual state
    // But highlighting "new" errors specially.
    const recentErrors = currentLogs.filter(l => l.service === s && l.level === 'error');
    // Simple heuristic for replay: if >0 errors total so far, check if recovered?
    // Let's rely on the latest log message for status or just cumulative errors for this incident

    // Better logic: Find the LAST log for this service up to this time.
    const lastLog = currentLogs.filter(l => l.service === s).pop();

    if (lastLog && (lastLog.level === 'error' || lastLog.cause === 'Recovery')) {
      if (lastLog.message.includes('Recover') || lastLog.message.includes('OK')) {
        serviceHealth[s] = 'healthy';
      } else {
        serviceHealth[s] = 'failing';
      }
    } else if (lastLog && lastLog.level === 'warn') {
      serviceHealth[s] = 'degraded';
    } else {
      serviceHealth[s] = 'healthy';
    }
  });

  // 2. Render Map (simplified version of healthMapView)
  renderReplayMap(serviceHealth, services);

  // 3. Update Narrative
  updateReplayNarrative(currentLogs, timeStr);
}

function renderReplayMap(healthStatus, services) {
  const container = document.getElementById('replay-visual-container');
  if (!container) return;

  // Reduced size to fit in container
  const radius = 130;
  container.innerHTML = `
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border border-white/5 animate-[spin_60s_linear_infinite]"></div>
        ${services.map((service, index) => {
    const angle = (index / services.length) * 2 * Math.PI - (Math.PI / 2);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    const status = healthStatus[service];
    const colorClass = status === 'failing' ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse' :
      (status === 'degraded' ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]' :
        'bg-emerald-500/20 text-emerald-500 border-emerald-500/30');

    return `
                <div class="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
                     style="left: calc(50% + ${x}px); top: calc(50% + ${y}px)">
                     <div class="flex flex-col items-center">
                        <div class="w-10 h-10 rounded-full border border-white/10 ${colorClass} flex items-center justify-center text-white font-bold backdrop-blur-md transition-all duration-500">
                             <i class="fas fa-server text-xs"></i>
                        </div>
                        <div class="mt-2 text-[9px] uppercase font-bold tracking-wider ${status === 'failing' ? 'text-red-400' : 'text-zinc-500'}">${service}</div>
                     </div>
                </div>
             `;
  }).join('')}
    `;
}

function updateReplayNarrative(logs, currentTime) {
  const div = document.getElementById('replay-narrative');
  // Filter logs for just this minute to show what just happened
  const recentLogs = logs.filter(l => l.time === currentTime);

  if (recentLogs.length === 0 && logs.length > 0 && currentTime === '12:00') {
    div.innerHTML = `<div class="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">System operating normally.</div>`;
    return;
  }

  const html = recentLogs.map(l => {
    let border = 'border-zinc-800';
    let bg = 'bg-zinc-900/50';
    if (l.level === 'error') { border = 'border-red-500/30'; bg = 'bg-red-900/20'; }
    if (l.level === 'warn') { border = 'border-amber-500/30'; bg = 'bg-amber-900/20'; }
    if (l.message.includes('Recover')) { border = 'border-green-500/30'; bg = 'bg-green-900/20'; }

    return `
            <div class="p-3 rounded ${bg} border ${border} animate-[slideIn_0.3s_ease-out_forwards]">
                <div class="flex justify-between items-center mb-1">
                   <span class="text-[10px] font-mono opacity-70">${l.time}</span>
                   <span class="text-[10px] uppercase font-bold text-white">${l.service}</span>
                </div>
                <div class="text-xs text-zinc-300 font-medium">${l.message}</div>
                ${l.cause ? `<div class="mt-1 text-[10px] text-zinc-500 italic">Cause: ${l.cause}</div>` : ''}
            </div>
        `;
  }).join('');

  // Only update if there's new content to avoid clearing history unnecessarily, 
  // BUT for a "replay" slider, usually user expects to see the state AT that moment.
  // So distinct messages for that minute is better than a growing list for this UI.
  // Let's show the accumulation of the last 3 minutes maybe?

  // For this specific request "Side panel: Show: At 12:02 Database failed...", it suggests a narrative.
  // Let's just show logs from CURRENT minute and maybe Previous minute.

  if (recentLogs.length > 0) {
    div.innerHTML = html;
  }
}

function updateTimelineFromLogs(logs) {
  const container = document.getElementById('timeline-container');
  if (!container) return;

  // Filter interesting events (errors/warns or start/end)
  const events = logs.filter(l => l.level === 'error' || l.level === 'warn')
    .slice(0, 8); // Max 8 items

  // Fallback if no errors
  if (events.length === 0) {
    events.push(...logs.slice(0, 5));
  }

  const timelineHTML = `
    <div class="saas-card p-5 sticky top-24 animate-fade-in">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-sm font-bold text-white flex items-center">
          <i class="fas fa-history text-muted-foreground mr-2"></i> Timeline
        </h3>
        <span class="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">LIVE</span>
      </div>
      
      <div class="relative space-y-0">
        <!-- Vertical Line -->
        <div class="absolute left-[19px] top-2 bottom-2 w-px bg-border"></div>
        ${events.map(event => {
    let type = 'info';
    if (event.level === 'error') type = 'error';
    if (event.level === 'warn') type = 'warn';

    // Adapt log to timeline item format
    return timelineItem({
      time: event.timestamp || '00:00:00',
      title: event.message.split(' - ')[0], // Shorten message
      type: type
    });
  }).join('')}
      </div>
    </div>
    `;

  container.innerHTML = timelineHTML;
}

// --- Failure Prediction Logic ---

function predictionView() {
  // 1. Calculate Risks
  const services = Object.keys(window.fakeSystemLogs);
  const risks = services.map(s => calculateServiceRisk(s, window.fakeSystemLogs[s]));

  // 2. Sort by Risk (High to Low)
  risks.sort((a, b) => b.score - a.score);

  return `
      <div class="animate-fade-in relative min-h-full pb-12">
         <!-- Background Effects -->
         <div class="absolute inset-0 pointer-events-none overflow-hidden">
             <div class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 blur-[100px] rounded-full mix-blend-screen"></div>
             <div class="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 blur-[100px] rounded-full mix-blend-screen"></div>
         </div>

         <!-- Header -->
         <div class="relative z-10 mb-10 text-center">
            <h1 class="text-4xl md:text-5xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-purple-300 tracking-tight mb-3 drop-shadow-[0_0_15px_rgba(165,180,252,0.3)]">
               <i class="fas fa-crystal-ball mr-3 text-indigo-400"></i>SYSTEM FAILURE FORECAST
            </h1>
            <p class="text-indigo-200/60 text-lg font-light tracking-wide uppercase">Predicting incidents before they happen</p>
         </div>

         <!-- Cards Grid -->
         <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            ${risks.map(renderPredictionCard).join('')}
         </div>

         <!-- AI Insight Panel (Hidden by default, shown via modal logic if simple) -->
         <!-- For this demo, we can just embed the insight IN the card or use a modal placeholder -->
         <div id="prediction-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300">
             <div class="bg-surface border border-zinc-700 w-full max-w-2xl rounded-2xl p-0 shadow-2xl transform scale-95 transition-transform duration-300" id="prediction-modal-content">
                <!-- Content injected here -->
             </div>
         </div>
      </div>
    `;
}

// --- Impact Mode View ---

function impactView() {
  return `
    <div id="impact-view-container" class="animate-fade-in h-[calc(100vh-8rem)]">
       ${impactViewContent()}
    </div>
  `;
}

function impactViewContent() {
  // Get Logs
  const sourceLogs = window.cachedLogs || (window.fakeSystemLogs ? Object.values(window.fakeSystemLogs).flat() : []);
  const metrics = calculateImpactMetrics(sourceLogs);

  // Executive Text Generation
  const getTitle = (tech, exec) => isExecutiveView ? exec : tech;
  const isCritical = metrics.slaRisk > 6;

  // Narratives
  const techNarrative = `System analysis indicates <strong class="text-white">cascading failures</strong> originating in the Database layer, propagating to Payment and Auth services. Error velocity is <strong class="${metrics.revenueVelocity > 0 ? 'text-red-400' : 'text-emerald-400'}">${metrics.revenueVelocity > 0 ? 'increasing' : 'stable'}</strong>. Recommendation: Immediate scaling of Read Replicas to mitigate connection saturation.`;

  const execNarrative = `Financial exposure is currently <strong class="text-white">₹${metrics.revenueLoss.toLocaleString()}</strong> with a projected burn rate of ₹${metrics.revenueVelocity}/sec. Customer trust is degrading. <strong class="text-amber-400">Action Required:</strong> Authorize emergency infrastructure expansion to protect remaining revenue pipeline.`;

  // Dynamic Styles
  const pulseColor = isCritical ? 'red' : 'emerald';
  const pulseAnimation = isCritical ? 'animate-[pulse_1s_ease-in-out_infinite]' : 'animate-[pulse_3s_ease-in-out_infinite]';

  return `
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
         <div class="flex items-center gap-6">
            <div class="relative w-16 h-16 flex items-center justify-center">
                <!-- System Heartbeat -->
                <div class="absolute inset-0 rounded-full border-2 border-${pulseColor}-500/30 ${pulseAnimation}"></div>
                <div class="absolute inset-2 rounded-full border border-${pulseColor}-500/50 ${pulseAnimation}" style="animation-delay: 0.2s"></div>
                <div class="w-8 h-8 rounded-full bg-${pulseColor}-500/20 flex items-center justify-center text-${pulseColor}-400 text-lg shadow-[0_0_20px_rgba(var(--color-${pulseColor}),0.3)]">
                    <i class="fas fa-heartbeat"></i>
                </div>
            </div>
            <div>
                <h1 class="text-4xl font-black font-display text-white tracking-tight flex items-center gap-3">
                   ${getTitle('Technical Impact Analysis', 'Executive Business Review')}
                </h1>
                <p class="text-zinc-400 mt-1 text-lg font-light flex items-center gap-2">
                   ${getTitle('<i class="fas fa-terminal text-xs"></i> Translating logs into business risk.', '<i class="fas fa-chart-line text-xs"></i> Real-time financial and brand assessment.')}
                </p>
            </div>
         </div>

         <!-- Mode Toggle -->
         <div class="flex flex-col items-end gap-2">
             <div class="flex items-center gap-3 bg-black/40 border border-white/10 rounded-full px-1.5 py-1.5 pr-5 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md" onclick="toggleExecutiveMode()">
                 <div class="relative w-14 h-8 rounded-full ${isExecutiveView ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-zinc-700'} transition-all duration-300 shadow-inner">
                    <div class="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${isExecutiveView ? 'translate-x-6' : 'translate-x-0'} flex items-center justify-center">
                        <i class="fas ${isExecutiveView ? 'fa-tie' : 'fa-code'} text-[10px] ${isExecutiveView ? 'text-orange-600' : 'text-zinc-600'}"></i>
                    </div>
                 </div>
                 <div class="flex flex-col">
                    <span class="text-[10px] font-bold uppercase tracking-wider leading-none ${isExecutiveView ? 'text-amber-400' : 'text-zinc-400'}">View Mode</span>
                    <span class="text-xs font-bold text-white leading-none">${isExecutiveView ? 'Executive / CFO' : 'Engineering / SRE'}</span>
                 </div>
             </div>
         </div>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 h-auto">
      
         <!-- Revenue Card -->
         <div class="saas-card p-8 border-l-4 border-l-emerald-500 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] transition-all duration-300">
             <div class="absolute right-0 top-0 p-32 bg-emerald-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-emerald-500/10 transition-colors"></div>
             <div class="absolute right-8 top-8 text-emerald-500/20 text-7xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500"><i class="fas fa-coins"></i></div>
             
             <h3 class="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                ${getTitle('Revenue At Risk', 'Financial Exposure')}
                ${metrics.revenueVelocity > 0 ? '<span class="animate-pulse w-2 h-2 rounded-full bg-red-500"></span>' : ''}
             </h3>
             
             <div class="flex items-baseline gap-1 mb-2">
                <span class="text-6xl font-black text-white font-display tracking-tight">₹${metrics.revenueLoss.toLocaleString()}</span>
             </div>
             
             <!-- Velocity Ticker -->
             <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-900/20 rounded border border-emerald-500/20 mb-4">
                 <i class="fas fa-fire text-orange-500 animate-pulse text-xs"></i>
                 <span class="text-xs font-mono text-emerald-200">Burn Rate: <span class="text-white font-bold">₹${metrics.revenueVelocity}/sec</span></span>
             </div>

             <div class="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 w-[${Math.min(100, metrics.revenueLoss / 100)}]%"></div>
             </div>
             <p class="text-zinc-400 text-sm mt-3 flex justify-between">
                <span>${getTitle('Cumulative transaction failure value', 'Projected quarterly impact')}</span>
                <span class="text-emerald-500 font-mono">+12% vs avg</span>
             </p>
         </div>

         <!-- Users Card -->
         <div class="saas-card p-8 border-l-4 border-l-indigo-500 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all duration-300">
             <div class="absolute right-0 top-0 p-32 bg-indigo-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-indigo-500/10 transition-colors"></div>
             <div class="absolute right-8 top-8 text-indigo-500/20 text-7xl group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500"><i class="fas fa-users"></i></div>
             
             <h3 class="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                ${getTitle('User Friction', 'Customer Churn Risk')}
             </h3>
             
             <div class="flex items-baseline gap-1 mb-2">
                <span class="text-6xl font-black text-white font-display tracking-tight">${metrics.usersAffected.toLocaleString()}</span>
                <span class="text-xl text-zinc-500 font-medium">users</span>
             </div>
             
             <div class="flex items-center gap-2 mb-4 text-xs">
                <span class="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Auth: ${metrics.breakdown?.authErrors || 0}</span>
                <span class="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Checkout: ${metrics.breakdown?.paymentErrors || 0}</span>
             </div>

             <div class="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 w-[${Math.min(100, metrics.usersAffected * 2)}]%"></div>
             </div>
             <p class="text-zinc-400 text-sm mt-3">
                ${getTitle('Active sessions encountering errors', 'High-value accounts at risk')}
             </p>
         </div>

         <!-- Operational Risk -->
         <div class="saas-card p-8 border-l-4 border-l-red-500 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(239,68,68,0.1)] transition-all duration-300">
             <div class="absolute right-0 top-0 p-32 bg-red-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-red-500/10 transition-colors"></div>
             <div class="absolute right-8 top-8 text-red-500/20 text-7xl group-hover:scale-110 transition-transform duration-500"><i class="fas fa-exclamation-triangle"></i></div>
             
             <h3 class="text-sm font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                ${getTitle('Operational Risk', 'Business Continuity')}
             </h3>
             
             <div class="flex items-baseline gap-1 mb-2">
                <span class="text-6xl font-black text-white font-display tracking-tight">${metrics.slaRisk}</span>
                <span class="text-xl text-zinc-500 font-medium">/ 10</span>
             </div>
             
             <div class="mb-4">
                 <span class="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${metrics.slaRisk > 6 ? 'bg-red-500 text-black' : 'bg-red-500/10 text-red-400'}">
                    ${metrics.slaRisk > 8 ? 'CRITICAL' : (metrics.slaRisk > 5 ? 'ELEVATED' : 'NOMINAL')}
                 </span>
             </div>

             <div class="w-full bg-zinc-800 h-2 rounded-full mt-2 overflow-hidden flex">
                <div class="bg-green-500 w-[30%] h-full opacity-20"></div>
                <div class="bg-amber-500 w-[40%] h-full opacity-20"></div>
                <div class="bg-red-500 w-[30%] h-full opacity-20"></div>
                <!-- Indicator -->
             </div>
             <!-- Actual Bar -->
             <div class="w-full h-1 mt-1 relative">
                  <div class="absolute top-0 bottom-0 bg-red-500 h-full transition-all duration-1000" style="width: ${metrics.slaRisk * 10}%"></div>
             </div>
             
             <p class="text-zinc-400 text-sm mt-3">
                ${getTitle('Composite score of error volume & spread', 'Operational stability index')}
             </p>
         </div>

         <!-- Brand Trust -->
         <div class="saas-card p-8 border-l-4 border-l-amber-500 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] transition-all duration-300">
             <div class="absolute right-0 top-0 p-32 bg-amber-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-amber-500/10 transition-colors"></div>
             <div class="absolute right-8 top-8 text-amber-500/20 text-7xl group-hover:scale-110 transition-transform duration-500"><i class="fas fa-shield-alt"></i></div>
             
             <h3 class="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                ${getTitle('Trust Score', 'Brand Heath')}
             </h3>
             
             <div class="flex items-baseline gap-1 mb-2">
                <span class="text-6xl font-black text-white font-display tracking-tight">${metrics.trustScore}</span>
             </div>
             
             <div class="mb-4 flex items-center gap-2">
                 <div class="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div class="h-full bg-amber-500 w-[${metrics.trustScore}%] transition-all duration-1000"></div>
                 </div>
             </div>

             <div class="flex gap-1">
                ${Array(5).fill(0).map((_, i) => `<i class="fas fa-star text-xs ${i * 20 < metrics.trustScore ? 'text-amber-400' : 'text-zinc-700'}"></i>`).join('')}
             </div>
             
             <p class="text-zinc-400 text-sm mt-3">
                ${getTitle('Calculated from failure visibility', 'Market perception index')}
             </p>
         </div>

      </div>

      <!-- AI Narrative Panel -->
      <div class="saas-card p-8 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-white/10 relative overflow-hidden">
          <div class="absolute -left-10 -bottom-20 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none animate-pulse"></div>
          
          <div class="flex items-start gap-6 relative z-10">
             <div class="w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-2xl border border-white/5 shrink-0 shadow-lg shadow-indigo-500/10">
                <i class="fas fa-robot"></i>
             </div>
             <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-bold text-white uppercase tracking-wide opacity-80 flex items-center gap-2">
                        AI Generated Insight
                        <span class="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-zinc-300 font-mono">GPT-4o</span>
                    </h3>
                    <div class="flex gap-2">
                        <button class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 transition-colors"><i class="fas fa-copy text-xs"></i></button>
                        <button class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 transition-colors"><i class="fas fa-share-alt text-xs"></i></button>
                    </div>
                </div>
                <p class="text-lg text-zinc-200 leading-relaxed font-light font-display">
                    "${isExecutiveView ? execNarrative : techNarrative}"
                </p>
                
                ${isExecutiveView ? `
                    <div class="mt-4 flex gap-3">
                        <button class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20" onclick="switchTab('explanation')">
                            View Remediation Plan <i class="fas fa-arrow-right ml-2 opacity-70"></i>
                        </button>
                        <button class="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors border border-white/5">
                            Download PDF Report
                        </button>
                    </div>
                ` : ''}
             </div>
          </div>
      </div>
   `;
}

function calculateServiceRisk(name, logs) {
  const errorCount = logs.filter(l => l.level === 'error').length;
  let score, level, timeToFail, reason, status;

  if (errorCount > 2) {
    score = 92 + Math.floor(Math.random() * 5); // 92-97%
    level = 'CRITICAL';
    timeToFail = Math.floor(Math.random() * 3) + 2; // 2-5 mins
    reason = "Exponential error rate detected. Connection pool saturation imminent.";
    status = "Escalating rapidly";
  } else if (errorCount > 0) {
    score = 65 + Math.floor(Math.random() * 10); // 65-75%
    level = 'WARNING';
    timeToFail = Math.floor(Math.random() * 10) + 8; // 8-18 mins
    reason = "Intermittent latency spikes observed. Trend indicates degradation.";
    status = "Instability detected";
  } else {
    score = Math.floor(Math.random() * 15) + 5; // 5-20%
    level = 'STABLE';
    timeToFail = 'NA';
    reason = "Operating within normal parameters. No significant anomalies.";
    status = "Optimal";
  }

  return { name, score, level, timeToFail, reason, status };
}

function renderPredictionCard(risk) {
  const colors = {
    'CRITICAL': {
      border: 'border-red-500/50',
      shadow: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]',
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      glow: 'group-hover:shadow-[0_0_50px_rgba(239,68,68,0.4)]',
      icon: 'fa-exclamation-triangle'
    },
    'WARNING': {
      border: 'border-amber-500/50',
      shadow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      glow: 'group-hover:shadow-[0_0_50px_rgba(245,158,11,0.4)]',
      icon: 'fa-radiation'
    },
    'STABLE': {
      border: 'border-emerald-500/30',
      shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.1)]',
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/5',
      glow: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
      icon: 'fa-shield-alt'
    }
  };

  const style = colors[risk.level];

  return `
      <div onclick="openPredictionModal('${risk.name}', '${risk.reason}', '${risk.level}')"
           class="group relative bg-surface/40 backdrop-blur-md rounded-xl p-6 border ${style.border} ${style.shadow} ${style.glow} transition-all duration-500 cursor-pointer overflow-hidden hover:-translate-y-1">
           
           <!-- Scanning Line Animation for Critical/Warning -->
           ${risk.level !== 'STABLE' ? '<div class="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/50 to-transparent top-0 animate-[scan_3s_linear_infinite] opacity-30"></div>' : ''}
           
           <div class="flex justify-between items-start mb-6">
              <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-lg ${style.bg} border border-white/5 flex items-center justify-center text-xl ${style.text}">
                      <i class="fas ${style.icon}"></i>
                  </div>
                  <div>
                      <h3 class="text-xl font-bold text-white font-display tracking-wide">${risk.name.toUpperCase()}</h3>
                      <div class="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">${risk.status}</div>
                  </div>
              </div>
              <div class="text-right">
                  <div class="text-3xl font-black ${style.text} font-display">${risk.score}%</div>
                  <div class="text-[9px] uppercase font-bold text-zinc-500">Risk Prob.</div>
              </div>
           </div>

           <!-- Progress Bar -->
           <div class="relative h-2 w-full bg-black/50 rounded-full overflow-hidden mb-6 border border-white/5">
               <div class="absolute top-0 left-0 h-full ${style.bg} ${risk.level === 'CRITICAL' ? 'bg-red-500' : (risk.level === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500')} transition-all duration-1000" style="width: ${risk.score}%"></div>
               <!-- Animated Shine -->
               <div class="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"></div>
           </div>

           <!-- Footer Metrics -->
           <div class="flex items-center justify-between border-t border-white/5 pt-4">
               <div>
                   <div class="text-[10px] text-zinc-500 uppercase font-bold mb-1">Predicted Failure</div>
                   <div class="flex items-center gap-2 ${risk.level === 'STABLE' ? 'text-zinc-600' : 'text-white'}">
                       <i class="fas fa-stopwatch"></i>
                       <span class="font-mono font-bold">${risk.level === 'STABLE' ? '---' : risk.timeToFail + ' MINUTES'}</span>
                   </div>
               </div>
               
               <button class="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 transition-colors border border-white/5">
                   Analyze <i class="fas fa-arrow-right ml-1 opacity-50"></i>
               </button>
           </div>
      </div>
    `;
}

function openPredictionModal(name, reason, level) {
  const modal = document.getElementById('prediction-modal');
  const content = document.getElementById('prediction-modal-content');

  // Theme
  let accent = level === 'CRITICAL' ? 'red' : (level === 'WARNING' ? 'amber' : 'emerald');
  let accentHex = level === 'CRITICAL' ? '#ef4444' : (level === 'WARNING' ? '#f59e0b' : '#10b981');

  content.innerHTML = `
        <div class="relative overflow-hidden rounded-2xl">
             <!-- Top Stripe -->
             <div class="h-2 w-full bg-${accent}-500"></div>
             
             <div class="p-8">
                 <button onclick="closePredictionModal()" class="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                    <i class="fas fa-times text-xl"></i>
                 </button>

                 <div class="flex items-center gap-3 mb-6">
                    <i class="fas fa-brain text-${accent}-500 text-2xl"></i>
                    <h2 class="text-2xl font-bold text-white font-display">AI Insight: ${name}</h2>
                 </div>

                 <div class="bg-black/40 border border-white/5 rounded-xl p-6 mb-6">
                     <h3 class="text-xs font-bold text-zinc-500 uppercase mb-3 tracking-wider">Reasoning Engine</h3>
                     <p class="text-lg text-zinc-200 leading-relaxed font-light">
                        "${reason}"
                     </p>
                 </div>

                 <div class="grid grid-cols-2 gap-4">
                     <div class="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                         <div class="text-xs text-zinc-500 uppercase font-bold mb-1">Confidence Score</div>
                         <div class="text-2xl font-mono text-white">99.2%</div>
                     </div>
                     <div class="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                         <div class="text-xs text-zinc-500 uppercase font-bold mb-1">Data Points</div>
                         <div class="text-2xl font-mono text-white">1,420</div>
                     </div>
                 </div>
                 
                 <button onclick="closePredictionModal()" class="w-full mt-6 py-3 rounded-lg bg-${accent}-500 hover:bg-${accent}-600 text-black font-bold uppercase tracking-wider transition-colors">
                     Acknowledge Risk
                 </button>
             </div>
        </div>
    `;

  modal.classList.remove('pointer-events-none', 'opacity-0');
  content.classList.remove('scale-95');
  content.classList.add('scale-100');
}

function closePredictionModal() {
  const modal = document.getElementById('prediction-modal');
  const content = document.getElementById('prediction-modal-content');

  modal.classList.add('pointer-events-none', 'opacity-0');
  content.classList.remove('scale-100');
  content.classList.add('scale-95');
}

// === ACTION EXECUTION ANIMATION ===

function executeActionPlan() {
  const button = document.querySelector('[data-action="execute-plan"]');
  const steps = document.querySelectorAll('[id^="step-"]');

  // Disable button
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Executing...';
  button.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
  button.classList.add('bg-zinc-700', 'cursor-not-allowed');

  // Animate each step
  steps.forEach((step, idx) => {
    setTimeout(() => {
      animateStep(idx, steps.length);

      // Show verify button after last step
      if (idx === steps.length - 1) {
        setTimeout(() => {
          button.classList.add('hidden');
          const verifyBtn = document.getElementById('verify-health-btn');
          if (verifyBtn) {
            verifyBtn.classList.remove('hidden');
            verifyBtn.classList.add('animate-fade-in');
          }
        }, 1000);
      }
    }, idx * 800); // Delay between steps
  });
}

function animateStep(idx, totalSteps) {
  // Get elements
  const iconBox = document.getElementById(`icon-box-${idx}`);
  const icon = document.getElementById(`icon-${idx}`);
  const content = document.getElementById(`content-${idx}`);
  const title = document.getElementById(`title-${idx}`);
  const line = document.getElementById(`line-${idx}`);

  if (!iconBox) return;

  // Animate icon box
  iconBox.classList.remove('bg-zinc-900', 'border-zinc-700', 'text-zinc-500');
  iconBox.classList.add('bg-indigo-500', 'border-indigo-400', 'text-white', 'shadow-lg', 'shadow-indigo-500/50');

  // Change icon to spinner
  icon.className = 'fas fa-spinner fa-spin';

  // Highlight content
  content.classList.remove('bg-zinc-900/40');
  content.classList.add('bg-indigo-900/30', 'border-indigo-500/30');

  // After completion delay
  setTimeout(() => {
    // Change to checkmark
    icon.className = 'fas fa-check';
    iconBox.classList.remove('bg-indigo-500');
    iconBox.classList.add('bg-emerald-500', 'border-emerald-400', 'shadow-emerald-500/50');

    // Update content
    content.classList.remove('bg-indigo-900/30', 'border-indigo-500/30');
    content.classList.add('bg-emerald-900/20', 'border-emerald-500/20');
    title.classList.add('text-emerald-300');

    // Animate line
    if (line) {
      line.classList.remove('bg-zinc-800');
      line.classList.add('bg-emerald-500/50');
    }
  }, 600);
}

function verifySystemHealth() {
  // Get service name - from MemoryManager OR from global (for AI-generated panel)
  const serviceName = MemoryManager.get('service') || window.currentAnalyzingService;

  if (!serviceName) {
    console.error('No service name found!');
    alert('Error: No service name found. Please try again.');
    return;
  }

  console.log(`🩺 Verifying health for: ${serviceName}`);

  // Store the verified service GLOBALLY
  window.healthVerifiedService = serviceName;
  localStorage.setItem('healthVerifiedService', serviceName);

  // Clear errors for this service
  if (window.fakeExplanation && window.fakeExplanation.stats && window.fakeExplanation.stats[serviceName]) {
    window.fakeExplanation.stats[serviceName].errors = 0;
    window.fakeExplanation.stats[serviceName].status = 'Healthy';
    console.log(`✅ Cleared errors for ${serviceName}`);
  }

  // Force redirect to main page with impact tab
  // Use window.location to ensure full navigation from service detail page
  const currentUrl = window.location.href.split('?')[0].split('#')[0];
  window.location.href = currentUrl + '?tab=impact&verified=' + encodeURIComponent(serviceName);
}

// Execute AI-generated action plan (uses ai-specific IDs)
function executeAIActionPlan() {
  const button = document.querySelector('[data-action="execute-ai-plan"]');
  const steps = document.querySelectorAll('[id^="step-ai-"]');

  // Disable button
  button.disabled = true;
  button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Executing...';
  button.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
  button.classList.add('bg-zinc-700', 'cursor-not-allowed');

  // Animate each step
  steps.forEach((step, idx) => {
    setTimeout(() => {
      animateAIStep(idx, steps.length);

      // Show verify button after last step
      if (idx === steps.length - 1) {
        setTimeout(() => {
          button.classList.add('hidden');
          const verifyBtn = document.getElementById('verify-health-btn-ai');
          if (verifyBtn) {
            verifyBtn.classList.remove('hidden');
            verifyBtn.classList.add('animate-fade-in');
          }
        }, 1000);
      }
    }, idx * 800); // Delay between steps
  });
}

function animateAIStep(idx, totalSteps) {
  // Get elements using ai-specific IDs
  const iconBox = document.getElementById(`icon-box-ai-${idx}`);
  const icon = document.getElementById(`icon-ai-${idx}`);
  const content = document.getElementById(`content-ai-${idx}`);
  const title = document.getElementById(`title-ai-${idx}`);
  const line = document.getElementById(`line-ai-${idx}`);

  if (!iconBox) return;

  // Animate icon box
  iconBox.classList.remove('bg-zinc-900', 'border-zinc-700', 'text-zinc-500');
  iconBox.classList.add('bg-indigo-500', 'border-indigo-400', 'text-white', 'shadow-lg', 'shadow-indigo-500/50');

  // Change icon to spinner
  icon.className = 'fas fa-spinner fa-spin';

  // Highlight content
  content.classList.remove('bg-zinc-900/40');
  content.classList.add('bg-indigo-900/30', 'border-indigo-500/30');

  // After completion delay
  setTimeout(() => {
    // Change to checkmark
    icon.className = 'fas fa-check';
    iconBox.classList.remove('bg-indigo-500');
    iconBox.classList.add('bg-emerald-500', 'border-emerald-400', 'shadow-emerald-500/50');

    // Update content
    content.classList.remove('bg-indigo-900/30', 'border-indigo-500/30');
    content.classList.add('bg-emerald-900/20', 'border-emerald-500/20');
    title.classList.add('text-emerald-300');

    // Animate line
    if (line) {
      line.classList.remove('bg-zinc-800');
      line.classList.add('bg-emerald-500/50');
    }
  }, 600);
}
