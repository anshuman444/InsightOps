// Neural Interface - The "Iron Man" Holographic View
// Powered by Three.js & TWEEN.js

window.NeuralInterface = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    nodes: {},
    isRunning: false,
    activeParticles: [],
    raycaster: null,
    mouse: null,
    hudElement: null,
    audioContext: null,
    audioListener: null,
    ambientSound: null,
    nodeAudioSources: {},

    init: function (containerId) {
        if (this.isRunning) return;
        const container = document.getElementById(containerId);
        if (!container) {
            console.error("NeuralInterface: Container not found");
            return;
        }

        // Dependency Check
        if (typeof THREE === 'undefined') {
            container.innerHTML = '<div class="text-red-500 p-10 text-center"><i class="fas fa-exclamation-triangle text-4xl mb-4"></i><br>Error: Three.js not loaded.<br>Check Internet Connection.</div>';
            console.error("NeuralInterface: THREE is undefined");
            return;
        }

        console.log("NeuralInterface: Initializing...");

        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.003);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 80, 200);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x0a0a1a, 1);
        container.innerHTML = '';
        container.appendChild(this.renderer.domElement);

        // Controls
        if (THREE.OrbitControls) {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 0.3;
            this.controls.maxDistance = 400;
            this.controls.minDistance = 50;
        }

        // Raycaster for Click Detection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Build
        this.buildArchitecture();
        this.createTrafficSystem(); // Live traffic visualization
        this.createHoloPanel(container);
        this.createHUD(container);
        this.initSpatialAudio();

        // Event Listeners
        this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
        window.addEventListener('resize', () => this.onResize(container));

        // Keyboard shortcuts for demo
        document.addEventListener('keydown', (e) => this.onKeyPress(e));

        // Start Loop
        this.isRunning = true;
        this.animate();

        console.log("NeuralInterface: Ready (Press SPACE for voice)");
    },

    buildArchitecture: function () {
        this.createStarfield();
        this.createGrid();

        // Get real stats from app
        const stats = window.fakeExplanation?.stats || {};

        // All 8 services with circular layout for visual appeal
        const serviceDefinitions = [
            { name: 'Database', color: 0xf59e0b, icon: 'database' },          // Amber
            { name: 'API Gateway', color: 0x6366f1, icon: 'server' },         // Indigo
            { name: 'Auth', color: 0x10b981, icon: 'shield' },                // Green
            { name: 'Payment', color: 0xef4444, icon: 'credit-card' },        // Red
            { name: 'Cards', color: 0x8b5cf6, icon: 'id-card' },              // Purple
            { name: 'Notifications', color: 0xa855f7, icon: 'bell' },         // Magenta
            { name: 'Analytics', color: 0x3b82f6, icon: 'chart-line' },       // Blue
            { name: 'Storage', color: 0x14b8a6, icon: 'hdd' }                 // Teal
        ];

        // Circular layout - evenly distribute services around a circle
        const radius = 85;
        const angleStep = (2 * Math.PI) / serviceDefinitions.length;

        const topology = {};
        serviceDefinitions.forEach((service, index) => {
            const angle = index * angleStep - Math.PI / 2; // Start from top
            const x = radius * Math.cos(angle);
            const z = radius * Math.sin(angle);
            // Alternate heights for visual depth
            const y = (index % 3 === 0) ? 30 : (index % 3 === 1) ? 0 : -20;

            topology[service.name] = {
                x: x,
                y: y,
                z: z,
                color: service.color,
                status: stats[service.name]?.status || 'Healthy'
            };
        });

        // Create Nodes
        Object.keys(topology).forEach(key => {
            const data = topology[key];
            const node = this.createNode(key, data.color, data.x, data.y, data.z, data.status);
            this.nodes[key] = node;
            this.scene.add(node);
        });

        // Enhanced Links - showing service dependencies and data flow
        const links = [
            // Core infrastructure
            { src: 'API Gateway', dst: 'Auth', intensity: 2 },
            { src: 'API Gateway', dst: 'Payment', intensity: 3 },
            { src: 'API Gateway', dst: 'Storage', intensity: 1 },
            { src: 'API Gateway', dst: 'Notifications', intensity: 2 },

            // Database connections
            { src: 'Auth', dst: 'Database', intensity: 2 },
            { src: 'Payment', dst: 'Database', intensity: 3 },
            { src: 'Analytics', dst: 'Database', intensity: 2 },
            { src: 'Storage', dst: 'Database', intensity: 1 },

            // Service to service
            { src: 'Payment', dst: 'Cards', intensity: 2 },
            { src: 'Payment', dst: 'Notifications', intensity: 1 },
        ];

        links.forEach(link => {
            if (this.nodes[link.src] && this.nodes[link.dst]) {
                this.createPipe(this.nodes[link.src].position, this.nodes[link.dst].position, link.intensity);
            }
        });

        console.log("NeuralInterface: Universe Built with", Object.keys(this.nodes).length, "nodes");
    },

    createNode: function (name, color, x, y, z, status) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.userData = { name: name, status: status, baseColor: color };

        // Determine color based on status
        let nodeColor = color;
        if (status === 'Critical') nodeColor = 0xff0000;
        else if (status === 'Degraded') nodeColor = 0xffa500;

        // Outer Ring
        const ringGeo = new THREE.TorusGeometry(12, 0.5, 8, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: nodeColor, transparent: true, opacity: 0.4 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        // Core Sphere (Clickable)
        const coreGeo = new THREE.IcosahedronGeometry(6, 1);
        const coreMat = new THREE.MeshBasicMaterial({
            color: nodeColor,
            wireframe: true,
            transparent: true,
            opacity: status === 'Critical' ? 0.9 : 0.6
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.userData = { isNode: true, nodeName: name };
        group.add(core);

        // Inner Glow
        const innerGeo = new THREE.SphereGeometry(3, 16, 16);
        const innerMat = new THREE.MeshBasicMaterial({ color: nodeColor, transparent: true, opacity: 0.8 });
        const inner = new THREE.Mesh(innerGeo, innerMat);
        group.add(inner);

        // Label Sprite
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        ctx.font = 'Bold 28px Arial';
        ctx.fillStyle = status === 'Critical' ? '#ff4444' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(name.toUpperCase(), 128, 40);

        const tex = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.y = 20;
        sprite.scale.set(40, 10, 1);
        group.add(sprite);

        // Status Indicator
        if (status === 'Critical') {
            group.userData.isPulsing = true;
        }

        return group;
    },

    createPipe: function (start, end, intensity = 1) {
        // Line instead of cylinder for cleaner look
        const points = [start.clone(), end.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x4f46e5,
            transparent: true,
            opacity: 0.3 + (intensity * 0.1)
        });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        // Particles based on intensity
        for (let i = 0; i < intensity; i++) {
            const particleGeo = new THREE.SphereGeometry(0.8, 8, 8);
            const particleMat = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.9
            });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.userData = {
                start: start.clone(),
                end: end.clone(),
                t: Math.random(),
                speed: 0.005 + (Math.random() * 0.005)
            };
            this.scene.add(particle);
            this.activeParticles.push(particle);
        }
    },


    // === ATTACK SIMULATION ===
    simulateAttack: function () {
        console.log("🚨 SIMULATING ATTACK MODE 🚨");

        // Change HUD status
        const hudStatus = document.getElementById('hud-status');
        if (hudStatus) {
            hudStatus.innerHTML = '<span class="animate-pulse">DDoS DETECTED</span>';
            hudStatus.className = 'text-red-500 font-bold';
        }

        // Make traffic RED and CHAOTIC
        this.trafficRoutes.forEach(route => {
            route.originalColor = route.color;
            route.originalSpeed = route.speed;
            route.originalSpawnRate = route.spawnRate;

            route.color = 0xff0000; // RED
            route.speed = route.speed * 3; // Fast
            route.spawnRate = route.spawnRate * 0.4; // Frequent
        });

        // Flash screen red effect
        const flash = document.createElement('div');
        flash.className = 'absolute inset-0 bg-red-500/20 pointer-events-none z-50 animate-pulse';
        flash.id = 'attack-flash';
        document.body.appendChild(flash);

        // Continuous camera shake
        this.isUnderAttack = true;
        this.shakeInterval = setInterval(() => {
            this.cameraShake(0.5, 100);
        }, 200);

        this.showCommandFeedback("⚠️ SYSTEM UNDER ATTACK");
    },

    activateDefense: function () {
        console.log("🛡️ DEFENSE ACTIVATED");

        // Remove flash
        const flash = document.getElementById('attack-flash');
        if (flash) flash.remove();

        // Stop shake
        this.isUnderAttack = false;
        if (this.shakeInterval) clearInterval(this.shakeInterval);

        // Restore HUD
        const hudStatus = document.getElementById('hud-status');
        if (hudStatus) {
            hudStatus.textContent = 'MITIGATED';
            hudStatus.className = 'text-green-400';

            setTimeout(() => {
                hudStatus.textContent = 'MONITORING';
                hudStatus.className = 'text-white';
            }, 3000);
        }

        // Restore Traffic
        this.trafficRoutes.forEach(route => {
            route.color = route.originalColor || route.color;
            route.speed = route.originalSpeed || route.speed;
            route.spawnRate = route.originalSpawnRate || route.spawnRate;
        });

        this.showCommandFeedback("🛡️ THREAT MITIGATED");
        this.cameraShake(1, 400); // Relief shake
    },

    // === LIVE TRAFFIC VISUALIZATION ===
    createTrafficSystem: function () {
        this.trafficParticles = [];
        this.trafficRoutes = [];

        // Define dependency routes (realistic flow patterns)
        const routes = [
            // User Flow: Auth -> API -> Database
            { from: 'Auth', to: 'API Gateway', color: 0x10b981, speed: 0.01, spawnRate: 0.05 },
            { from: 'API Gateway', to: 'Database', color: 0x6366f1, speed: 0.012, spawnRate: 0.08 },

            // Payment Flow: Payment -> API -> Database
            { from: 'Payment', to: 'API Gateway', color: 0xef4444, speed: 0.015, spawnRate: 0.06 },
            { from: 'API Gateway', to: 'Payment', color: 0xf59e0b, speed: 0.01, spawnRate: 0.04 },

            // Analytics: Database -> Analytics
            { from: 'Database', to: 'Analytics', color: 0x3b82f6, speed: 0.008, spawnRate: 0.03 },

            // Cache Layer
            { from: 'API Gateway', to: 'Cache', color: 0xa855f7, speed: 0.02, spawnRate: 0.07 },
            { from: 'Cache', to: 'API Gateway', color: 0x8b5cf6, speed: 0.018, spawnRate: 0.05 },

            // Notifications
            { from: 'API Gateway', to: 'Notifications', color: 0xa855f7, speed: 0.01, spawnRate: 0.02 },
        ];

        routes.forEach(route => {
            const fromNode = this.nodes[route.from];
            const toNode = this.nodes[route.to];

            if (fromNode && toNode) {
                this.trafficRoutes.push({
                    start: fromNode.position.clone(),
                    end: toNode.position.clone(),
                    color: route.color,
                    speed: route.speed,
                    spawnRate: route.spawnRate,
                    lastSpawn: 0
                });
            }
        });

        console.log(`Traffic System: ${this.trafficRoutes.length} routes initialized`);
    },

    // Spawn a traffic particle
    spawnTrafficParticle: function (route) {
        const geometry = new THREE.SphereGeometry(1.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: route.color,
            transparent: true,
            opacity: 0.9
        });

        const particle = new THREE.Mesh(geometry, material);

        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(2, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: route.color,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        particle.add(glow);

        // Calculate curved path using quadratic bezier
        const start = route.start;
        const end = route.end;
        const mid = new THREE.Vector3(
            (start.x + end.x) / 2 + (Math.random() - 0.5) * 20,
            (start.y + end.y) / 2 + 15, // Arc upward
            (start.z + end.z) / 2 + (Math.random() - 0.5) * 20
        );

        particle.userData = {
            start: start,
            mid: mid,
            end: end,
            progress: 0,
            speed: route.speed,
            isTrafficParticle: true
        };

        // Set initial position
        particle.position.copy(start);

        this.scene.add(particle);
        this.trafficParticles.push(particle);
    },

    // Update traffic particles (called in animate loop)
    updateTraffic: function () {
        const time = Date.now() * 0.001;

        // Spawn new particles based on spawn rate
        this.trafficRoutes.forEach((route, idx) => {
            if (time - route.lastSpawn > route.spawnRate) {
                this.spawnTrafficParticle(route);
                route.lastSpawn = time;
            }
        });

        // Update existing particles
        for (let i = this.trafficParticles.length - 1; i >= 0; i--) {
            const particle = this.trafficParticles[i];
            const data = particle.userData;

            // Move along bezier curve
            data.progress += data.speed;

            if (data.progress >= 1) {
                // Remove particle
                this.scene.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                if (particle.children[0]) {
                    particle.children[0].geometry.dispose();
                    particle.children[0].material.dispose();
                }
                this.trafficParticles.splice(i, 1);
            } else {
                // Quadratic bezier interpolation
                const t = data.progress;
                const mt = 1 - t;
                const mt2 = mt * mt;
                const t2 = t * t;

                particle.position.x = mt2 * data.start.x + 2 * mt * t * data.mid.x + t2 * data.end.x;
                particle.position.y = mt2 * data.start.y + 2 * mt * t * data.mid.y + t2 * data.end.y;
                particle.position.z = mt2 * data.start.z + 2 * mt * t * data.mid.z + t2 * data.end.z;

                // Fade out near end
                if (t > 0.8) {
                    const fadeProgress = (t - 0.8) / 0.2;
                    particle.material.opacity = 0.9 * (1 - fadeProgress);
                    if (particle.children[0]) {
                        particle.children[0].material.opacity = 0.3 * (1 - fadeProgress);
                    }
                }
            }
        }
    },

    createStarfield: function () {
        const geo = new THREE.BufferGeometry();
        const count = 2000;
        const pos = new Float32Array(count * 3);

        for (let i = 0; i < count * 3; i++) {
            pos[i] = (Math.random() - 0.5) * 600;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ size: 0.8, color: 0xffffff, transparent: true, opacity: 0.6 });
        const stars = new THREE.Points(geo, mat);
        this.scene.add(stars);
    },

    createGrid: function () {
        const gridHelper = new THREE.GridHelper(300, 30, 0x1a1a3a, 0x1a1a3a);
        gridHelper.position.y = -80;
        this.scene.add(gridHelper);
    },

    createHUD: function (container) {
        // Create HUD Overlay
        const hud = document.createElement('div');
        hud.id = 'neural-hud';
        hud.innerHTML = `
            <div class="absolute top-4 left-4 text-xs font-mono text-indigo-400 opacity-80">
                <div class="flex items-center gap-2 mb-2">
                    <span class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    NEURAL INTERFACE v2.0 • VOICE ENABLED
                </div>
                <div class="text-zinc-500">SYSTEM STATUS: <span id="hud-status" class="text-white">MONITORING</span></div>
            </div>
            
            <div class="absolute top-4 right-4 text-right text-xs font-mono">
                <div class="text-zinc-500 mb-1">ACTIVE NODES</div>
                <div class="text-2xl font-bold text-white" id="hud-nodes">0</div>
            </div>
            
            <!-- JARVIS-Style Voice UI -->
            <div id="voice-overlay" class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-0 transition-all duration-300">
                <!-- Central Waveform Circle -->
                <div id="voice-circle" class="w-32 h-32 mx-auto mb-4 rounded-full border-2 border-indigo-500/50 flex items-center justify-center relative">
                    <div class="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-20"></div>
                    <div class="absolute inset-2 rounded-full border border-cyan-400 animate-spin" style="animation-duration: 3s;"></div>
                    <i class="fas fa-microphone text-3xl text-indigo-400"></i>
                </div>
                
                <!-- Live Transcription -->
                <div class="bg-black/80 backdrop-blur-md border border-indigo-500/50 rounded-lg px-6 py-3 inline-block">
                    <div class="text-xs text-indigo-400 uppercase tracking-wider mb-1">VOICE COMMAND</div>
                    <div id="voice-transcript" class="text-xl font-mono text-white min-w-[200px]">
                        <span class="text-zinc-500">Listening...</span>
                    </div>
                </div>
            </div>
            
            <!-- Command History -->
            <div id="command-history" class="absolute top-20 left-4 text-xs font-mono text-zinc-600 max-w-xs">
                <!-- Command history appears here -->
            </div>
            
            <div class="absolute bottom-4 left-4 text-xs font-mono text-zinc-500">
                <div class="mb-1 text-indigo-400">KEYBOARD SHORTCUTS</div>
                <div class="text-zinc-400">SPACE: Voice | 1-8: Focus Service</div>
                <div class="text-zinc-400">R: Reset | A: AI Analyze</div>
                <div class="text-zinc-600 mt-2">MOUSE: Drag to rotate, scroll to zoom</div>
            </div>
            
            <div class="absolute bottom-4 right-4 flex gap-2">
                <button onclick="if(window.startVoiceParams) window.startVoiceParams()" id="neural-voice-btn" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 rounded text-xs text-white transition-colors flex items-center gap-2">
                    <i class="fas fa-microphone"></i> Voice
                </button>
                <button onclick="window.NeuralInterface.resetCamera()" class="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white hover:bg-white/10 transition-colors">
                    <i class="fas fa-sync-alt mr-1"></i> Reset View
                </button>
            </div>
            

        `;
        hud.className = 'absolute inset-0 pointer-events-none z-10';
        hud.querySelectorAll('button').forEach(btn => btn.classList.add('pointer-events-auto'));
        container.style.position = 'relative';
        container.appendChild(hud);
        this.hudElement = hud;

        // Check for critical status
        const stats = window.fakeExplanation?.stats || {};
        const hasCritical = Object.values(stats).some(s => s.status === 'Critical');
        if (hasCritical) {
            document.getElementById('hud-status').textContent = 'CRITICAL';
            document.getElementById('hud-status').className = 'text-red-400';
        }

        // Update node count dynamically
        const nodeCountEl = document.getElementById('hud-nodes');
        if (nodeCountEl) {
            nodeCountEl.textContent = Object.keys(this.nodes).length;
        }
    },

    animate: function () {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        if (typeof TWEEN !== 'undefined') TWEEN.update();
        if (this.controls) this.controls.update();

        const time = Date.now() * 0.001;

        // Animate Nodes
        Object.values(this.nodes).forEach(group => {
            group.rotation.y += 0.003;

            // Pulse critical nodes
            if (group.userData.isPulsing) {
                const scale = 1 + Math.sin(time * 4) * 0.1;
                group.children[1].scale.set(scale, scale, scale);
                group.children[2].material.opacity = 0.5 + Math.sin(time * 4) * 0.3;
            }
        });

        // Animate Particles
        this.activeParticles.forEach(p => {
            p.userData.t += p.userData.speed;
            if (p.userData.t > 1) p.userData.t = 0;
            p.position.lerpVectors(p.userData.start, p.userData.end, p.userData.t);
        });

        // Update live traffic visualization
        if (this.trafficRoutes && this.trafficRoutes.length > 0) {
            this.updateTraffic();
        }

        this.renderer.render(this.scene, this.camera);
    },

    // Keyboard shortcuts for quick demo
    onKeyPress: function (event) {
        // Skip if typing in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

        const serviceKeys = {
            '1': 'Database',
            '2': 'API Gateway',
            '3': 'Auth',
            '4': 'Payment',
            '5': 'Cards',
            '6': 'Notifications',
            '7': 'Analytics',
            '8': 'Cache'
        };

        switch (event.code) {
            case 'Space':
                // Activate voice
                event.preventDefault();
                if (window.startVoiceParams) {
                    window.startVoiceParams();
                }
                break;

            case 'KeyR':
                // Reset view
                this.resetCamera();
                break;

            case 'KeyA':
                // Quick analyze - triggers voice analysis
                if (window.Voice) {
                    window.Voice.handleVoiceCommand('analyze system');
                }
                break;

            case 'KeyD': // D for DDOS
                this.simulateAttack();
                break;

            case 'KeyS': // S for Shields/Safety
                this.activateDefense();
                break;

            case 'Digit1':
            case 'Digit2':
            case 'Digit3':
            case 'Digit4':
            case 'Digit5':
            case 'Digit6':
            case 'Digit7':
            case 'Digit8':
                const digit = event.code.replace('Digit', '');
                const service = serviceKeys[digit];
                if (service) {
                    this.flyTo(service);
                }
                break;
        }
    },

    onCanvasClick: function (event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Get all node cores (meshes with isNode flag)
        const clickables = [];
        Object.values(this.nodes).forEach(group => {
            group.children.forEach(child => {
                if (child.userData.isNode) clickables.push(child);
            });
        });

        const intersects = this.raycaster.intersectObjects(clickables);

        if (intersects.length > 0) {
            const nodeName = intersects[0].object.userData.nodeName;
            console.log("Clicked node:", nodeName);
            this.flyTo(nodeName);
            this.showNodeDetails(nodeName);
        }
    },

    createHoloPanel: function (container) {
        const panel = document.createElement('div');
        panel.id = 'holo-panel';
        panel.className = 'absolute top-20 right-20 w-96 bg-black/60 backdrop-blur-md border border-cyan-500/30 text-cyan-50 p-6 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.15)] transform translate-x-10 opacity-0 transition-all duration-500 hidden z-20 overflow-hidden';

        // Cyberpunk decorations
        panel.innerHTML = `
            <!-- Top Deco -->
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
            <div class="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500"></div>
            
            <!-- Scanning Line -->
            <div class="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent animate-[scan_3s_linear_infinite] pointer-events-none"></div>

            <!-- Content -->
            <div class="relative z-10">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <div class="text-[10px] font-mono text-cyan-400 opacity-70 mb-1">TARGET IDENTIFIED</div>
                        <h2 id="holo-title" class="text-3xl font-bold font-display uppercase tracking-wider text-white drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">SERVICE</h2>
                    </div>
                    <div id="holo-icon" class="w-12 h-12 rounded bg-cyan-900/40 border border-cyan-500/50 flex items-center justify-center text-xl text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                        <i class="fas fa-server"></i>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 gap-3 mb-6">
                    <div class="bg-cyan-950/30 border border-cyan-500/20 p-3 rounded">
                        <div class="text-[9px] font-bold text-cyan-500 uppercase mb-1">Status</div>
                        <div id="holo-status" class="text-lg font-mono font-bold text-emerald-400">HEALTHY</div>
                    </div>
                    <div class="bg-cyan-950/30 border border-cyan-500/20 p-3 rounded">
                        <div class="text-[9px] font-bold text-cyan-500 uppercase mb-1">Errors / Min</div>
                        <div id="holo-errors" class="text-lg font-mono font-bold text-white">0</div>
                    </div>
                    <div class="bg-cyan-950/30 border border-cyan-500/20 p-3 rounded">
                        <div class="text-[9px] font-bold text-cyan-500 uppercase mb-1">Latency</div>
                        <div class="text-lg font-mono text-white">24ms</div>
                    </div>
                    <div class="bg-cyan-950/30 border border-cyan-500/20 p-3 rounded">
                        <div class="text-[9px] font-bold text-cyan-500 uppercase mb-1">Uptime</div>
                        <div class="text-lg font-mono text-white">99.99%</div>
                    </div>
                </div>

                <!-- Analysis Log -->
                <div class="border-t border-cyan-500/30 pt-4">
                    <div class="text-[10px] font-bold text-cyan-500 uppercase mb-2">System Diagnostics</div>
                    <div id="holo-log" class="text-xs font-mono text-cyan-100/80 leading-relaxed h-20 overflow-hidden relative">
                        <!-- Typewriter text inserted here -->
                    </div>
                </div>

                <div class="mt-6 flex gap-2">
                    <button id="holo-action-btn" class="flex-1 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500 text-cyan-300 text-xs font-bold py-2 rounded transition-all uppercase tracking-wide">
                        <i class="fas fa-terminal mr-2"></i> Fix Issue
                    </button>
                    <button onclick="window.NeuralInterface.resetCamera()" class="px-3 bg-red-500/10 hover:bg-red-500/30 border border-red-500/40 text-red-400 rounded transition-all">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(panel);
    },

    showNodeDetails: function (name) {
        const stats = window.fakeExplanation?.stats?.[name] || { status: 'Unknown', errors: 0 };
        const panel = document.getElementById('holo-panel');
        if (!panel) return;

        // Populate
        document.getElementById('holo-title').innerText = name;

        const statusEl = document.getElementById('holo-status');
        statusEl.innerText = stats.status.toUpperCase();
        statusEl.className = `text-lg font-mono font-bold ${stats.status === 'Critical' ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : (stats.status === 'Degraded' ? 'text-amber-400' : 'text-emerald-400')}`;

        document.getElementById('holo-errors').innerText = stats.errors;

        // Log generation logic
        const logs = [
            `> Initiating deep scan...`,
            `> Connection pool stability: ${stats.status === 'Critical' ? 'UNSTABLE' : 'OPTIMAL'}`,
            `> Threat level analysis: ${stats.status === 'Critical' ? 'HIGH' : 'LOW'}`,
        ];
        if (stats.status === 'Critical') logs.push(`> ROOT CAUSE: Connection Timeout`);
        else logs.push(`> No anomalies detected.`);

        document.getElementById('holo-log').innerHTML = logs.join('<br>');

        // Action Button Logic
        const btn = document.getElementById('holo-action-btn');
        if (stats.status === 'Healthy') {
            btn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Diagnostics OK';
            btn.classList.add('opacity-50', 'cursor-default');
            btn.onclick = null;
        } else {
            btn.innerHTML = '<i class="fas fa-wrench mr-2"></i> Execute Fix';
            btn.classList.remove('opacity-50', 'cursor-default');
            btn.classList.add('animate-pulse');
            btn.onclick = () => {
                window.location.href = '?service=' + encodeURIComponent(name); // Deep link to 2D
                // Or handle internally
            };
        }

        // Show Animation
        panel.classList.remove('hidden');
        setTimeout(() => {
            panel.classList.remove('translate-x-10', 'opacity-0');
            panel.classList.add('translate-x-0', 'opacity-100');
        }, 50);
    },

    flyTo: function (serviceName) {
        const key = Object.keys(this.nodes).find(k => k.toLowerCase() === serviceName.toLowerCase());
        if (!key) {
            console.warn("Service not found:", serviceName);
            return;
        }

        const target = this.nodes[key];
        console.log("Flying to:", key, "at position:", target.position);

        // Play sound effect
        this.playWhoosh();

        // Stop auto-rotate for manual control
        if (this.controls) {
            this.controls.autoRotate = false;
            console.log("Auto-rotate disabled");
        }

        // Calculate camera position (further back for better view)
        const camPos = target.position.clone().add(new THREE.Vector3(50, 40, 80));
        console.log("Moving camera from", this.camera.position, "to", camPos);
        console.log("Setting controls target to:", target.position);

        if (typeof TWEEN !== 'undefined') {
            // Camera position animation
            new TWEEN.Tween(this.camera.position)
                .to({ x: camPos.x, y: camPos.y, z: camPos.z }, 2000)
                .easing(TWEEN.Easing.Cubic.InOut)
                .onUpdate(() => {
                    // Update controls during animation
                    if (this.controls) this.controls.update();
                })
                .onComplete(() => {
                    console.log("Camera animation complete at:", this.camera.position);
                    // Force final update
                    if (this.controls) this.controls.update();
                    // Cinematic impact shake!
                    this.cameraShake(3, 400);
                })
                .start();

            // Controls target animation
            new TWEEN.Tween(this.controls.target)
                .to({ x: target.position.x, y: target.position.y, z: target.position.z }, 2000)
                .easing(TWEEN.Easing.Cubic.InOut)
                .onUpdate(() => {
                    if (this.controls) this.controls.update();
                })
                .onComplete(() => {
                    console.log("Controls target set to:", this.controls.target);
                })
                .start();
        } else {
            console.warn("TWEEN.js not available, using instant positioning");
            this.camera.position.copy(camPos);
            this.controls.target.copy(target.position);
            if (this.controls) this.controls.update();
        }

        // Create particle burst effect
        this.createFocusParticles(target.position);

        // Update HUD
        const hudStatus = document.getElementById('hud-status');
        if (hudStatus) {
            hudStatus.textContent = `FOCUSING: ${key.toUpperCase()}`;
            hudStatus.className = 'text-indigo-400';
        }

        // Show command feedback
        this.showCommandFeedback(`FOCUSING: ${key.toUpperCase()}`);

        // Show node details panel
        this.showNodeDetails(key);
    },

    createFocusParticles: function (position) {
        // Create burst of particles at target position
        const particleCount = 30;
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.5, 8, 8);
            const material = new THREE.MeshBasicMaterial({
                color: 0x6366f1,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(geometry, material);

            particle.position.copy(position);

            // Random direction
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 2 + Math.random() * 3;

            particle.userData = {
                velocity: new THREE.Vector3(
                    Math.sin(phi) * Math.cos(theta) * speed,
                    Math.sin(phi) * Math.sin(theta) * speed,
                    Math.cos(phi) * speed
                ),
                life: 1.0
            };

            this.scene.add(particle);
            particles.push(particle);
        }

        // Animate particles
        const animateParticles = () => {
            particles.forEach((p, idx) => {
                if (p.userData.life <= 0) {
                    this.scene.remove(p);
                    p.geometry.dispose();
                    p.material.dispose();
                    particles.splice(idx, 1);
                    return;
                }

                p.position.add(p.userData.velocity.clone().multiplyScalar(0.1));
                p.userData.life -= 0.02;
                p.material.opacity = p.userData.life * 0.8;
                p.scale.multiplyScalar(0.98);
            });

            if (particles.length > 0) {
                requestAnimationFrame(animateParticles);
            }
        };

        animateParticles();
    },

    // Cinematic camera shake effect
    cameraShake: function (intensity = 2, duration = 300) {
        if (!this.camera) return;

        const startPos = this.camera.position.clone();
        const startTime = Date.now();

        const shake = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;

            if (progress < 1) {
                // Decreasing intensity over time
                const currentIntensity = intensity * (1 - progress);

                // Apply random offset
                this.camera.position.x = startPos.x + (Math.random() - 0.5) * currentIntensity;
                this.camera.position.y = startPos.y + (Math.random() - 0.5) * currentIntensity;
                this.camera.position.z = startPos.z + (Math.random() - 0.5) * currentIntensity;

                requestAnimationFrame(shake);
            } else {
                // Reset to start position
                this.camera.position.copy(startPos);
            }
        };

        shake();
    },

    playWhoosh: function () {
        // Simple audio cue using Web Audio API
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.setValueAtTime(400, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            // Audio not supported, ignore
        }
    },

    resetCamera: function () {
        if (typeof TWEEN !== 'undefined') {
            new TWEEN.Tween(this.camera.position)
                .to({ x: 0, y: 80, z: 200 }, 1500)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start();

            new TWEEN.Tween(this.controls.target)
                .to({ x: 0, y: 0, z: 0 }, 1500)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start();
        }

        if (this.controls) this.controls.autoRotate = true;

        const hudStatus = document.getElementById('hud-status');
        if (hudStatus) {
            hudStatus.textContent = 'MONITORING';
            hudStatus.className = 'text-white';
        }

        const panel = document.getElementById('holo-panel');
        if (panel) {
            panel.classList.add('translate-x-10', 'opacity-0');
            setTimeout(() => panel.classList.add('hidden'), 500);
        }
    },

    // --- Dynamic Updates ---
    refresh: function () {
        const stats = window.fakeExplanation?.stats || {};
        const hasCritical = Object.values(stats).some(s => s.status === 'Critical');

        // Update Logs / HUD
        const hudStatus = document.getElementById('hud-status');

        if (hudStatus) {
            if (hasCritical) {
                hudStatus.textContent = 'CRITICAL';
                hudStatus.className = 'text-red-400';
            } else {
                hudStatus.textContent = 'OPTIMAL';
                hudStatus.className = 'text-emerald-400';
            }
        }

        // Update Nodes
        Object.keys(stats).forEach(key => {
            this.setNodeStatus(key, stats[key].status);
        });
    },

    setNodeStatus: function (serviceName, status) {
        const node = this.nodes[serviceName];
        if (!node) return;

        // Determine color based on status
        let nodeColor;
        if (status === 'Critical') nodeColor = 0xff0000;
        else if (status === 'Degraded') nodeColor = 0xffa500;
        else nodeColor = node.userData.baseColor;

        // Update ring, core, and inner sphere colors
        if (node.children[0]) node.children[0].material.color.setHex(nodeColor);
        if (node.children[1]) node.children[1].material.color.setHex(nodeColor);
        if (node.children[2]) node.children[2].material.color.setHex(nodeColor);

        // Update pulsing
        node.userData.isPulsing = (status === 'Critical');
        node.userData.status = status;

        // Update spatial audio
        this.updateNodeAudio(serviceName, status);
    },

    onResize: function (container) {
        if (container && this.camera && this.renderer) {
            this.camera.aspect = container.clientWidth / container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(container.clientWidth, container.clientHeight);
        }
    },

    // --- Spatial Audio System ---

    initSpatialAudio: function () {
        try {
            // Create Audio Listener (attached to camera)
            this.audioListener = new THREE.AudioListener();
            this.camera.add(this.audioListener);

            // Use the AudioListener's context (Three.js manages this)
            this.audioContext = this.audioListener.context;

            // NOTE: Continuous audio disabled - was causing annoying beeps
            // Only using audioContext for sound effects (whoosh, etc.)

            console.log("Spatial Audio System Initialized (effects only)");
        } catch (e) {
            console.warn("Spatial Audio not supported:", e);
        }
    },

    createAmbientSound: function () {
        if (!this.audioContext || !this.audioListener) return;

        try {
            // Create oscillator for ambient sound using the shared context
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime); // Deep hum
            gainNode.gain.setValueAtTime(0.03, this.audioContext.currentTime); // Very subtle

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.start();

            this.ambientSound = { oscillator, gainNode };
        } catch (e) {
            console.warn("Could not create ambient sound:", e);
        }
    },

    createNodeAudio: function (serviceName) {
        if (!this.audioContext || !this.audioListener) return;

        try {
            const node = this.nodes[serviceName];
            const stats = window.fakeExplanation?.stats || {};
            const status = stats[serviceName]?.status || 'Healthy';

            // Create positional audio using the shared listener
            const sound = new THREE.PositionalAudio(this.audioListener);

            // Create oscillator based on status using the SAME context
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            // Different frequencies for different statuses
            let frequency = 200; // Healthy - calm tone
            let volume = 0.01;

            if (status === 'Critical') {
                frequency = 800; // High pitched alarm
                volume = 0.08;
                oscillator.type = 'square'; // Harsh sound
            } else if (status === 'Degraded') {
                frequency = 400; // Medium warning
                volume = 0.04;
                oscillator.type = 'triangle';
            } else {
                oscillator.type = 'sine'; // Smooth sound
            }

            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

            // Connect to the PositionalAudio's gain node (which is part of the same context)
            oscillator.connect(gainNode);
            gainNode.connect(sound.getOutput());

            // Configure spatial audio
            sound.setRefDistance(20);
            sound.setRolloffFactor(2);

            // Add to node
            node.add(sound);

            oscillator.start();

            // Store reference
            this.nodeAudioSources[serviceName] = { oscillator, gainNode, sound };
        } catch (e) {
            console.warn(`Could not create audio for ${serviceName}:`, e);
        }
    },

    updateNodeAudio: function (serviceName, status) {
        const audioSource = this.nodeAudioSources[serviceName];
        if (!audioSource || !this.audioContext) return;

        try {
            const { oscillator, gainNode } = audioSource;
            const currentTime = this.audioContext.currentTime;

            let frequency = 200;
            let volume = 0.01;

            if (status === 'Critical') {
                frequency = 800;
                volume = 0.08;
            } else if (status === 'Degraded') {
                frequency = 400;
                volume = 0.04;
            }

            // Smooth transition
            oscillator.frequency.exponentialRampToValueAtTime(frequency, currentTime + 0.5);
            gainNode.gain.exponentialRampToValueAtTime(volume, currentTime + 0.5);
        } catch (e) {
            console.warn(`Could not update audio for ${serviceName}:`, e);
        }
    },

    // --- Voice Command Methods ---

    highlightCriticalNodes: function () {
        console.log("Highlighting critical nodes...");
        const stats = window.fakeExplanation?.stats || {};

        Object.keys(this.nodes).forEach(serviceName => {
            const node = this.nodes[serviceName];
            const status = stats[serviceName]?.status || 'Healthy';

            if (status === 'Critical') {
                // Make critical nodes brighter and larger
                node.children.forEach((child, idx) => {
                    if (idx === 0) child.material.opacity = 0.9; // Ring
                    if (idx === 1) child.material.opacity = 1.0; // Core
                    if (idx === 2) child.material.opacity = 1.0; // Inner
                });
                node.scale.set(1.3, 1.3, 1.3);
                node.userData.isHighlighted = true;
            } else {
                // Dim non-critical nodes
                node.children.forEach((child, idx) => {
                    if (idx === 0) child.material.opacity = 0.1;
                    if (idx === 1) child.material.opacity = 0.15;
                    if (idx === 2) child.material.opacity = 0.1;
                });
                node.scale.set(0.7, 0.7, 0.7);
                node.userData.isHighlighted = false;
            }
        });

        this.showCommandFeedback("CRITICAL NODES HIGHLIGHTED");
    },

    highlightHealthyNodes: function () {
        console.log("Highlighting healthy nodes...");
        const stats = window.fakeExplanation?.stats || {};

        Object.keys(this.nodes).forEach(serviceName => {
            const node = this.nodes[serviceName];
            const status = stats[serviceName]?.status || 'Healthy';

            if (status === 'Healthy') {
                // Make healthy nodes brighter
                node.children.forEach((child, idx) => {
                    if (idx === 0) child.material.opacity = 0.8;
                    if (idx === 1) child.material.opacity = 0.9;
                    if (idx === 2) child.material.opacity = 0.9;
                });
                node.scale.set(1.2, 1.2, 1.2);
                node.userData.isHighlighted = true;
            } else {
                // Dim unhealthy nodes
                node.children.forEach((child, idx) => {
                    if (idx === 0) child.material.opacity = 0.1;
                    if (idx === 1) child.material.opacity = 0.15;
                    if (idx === 2) child.material.opacity = 0.1;
                });
                node.scale.set(0.7, 0.7, 0.7);
                node.userData.isHighlighted = false;
            }
        });

        this.showCommandFeedback("HEALTHY NODES HIGHLIGHTED");
    },

    resetNodeVisibility: function () {
        console.log("Resetting node visibility...");

        Object.keys(this.nodes).forEach(serviceName => {
            const node = this.nodes[serviceName];
            const stats = window.fakeExplanation?.stats || {};
            const status = stats[serviceName]?.status || 'Healthy';

            // Restore original opacity based on status
            if (status === 'Critical') {
                node.children.forEach((child, idx) => {
                    if (idx === 0) child.material.opacity = 0.4;
                    if (idx === 1) child.material.opacity = 0.9;
                    if (idx === 2) child.material.opacity = 0.8;
                });
            } else {
                node.children.forEach((child, idx) => {
                    if (idx === 0) child.material.opacity = 0.4;
                    if (idx === 1) child.material.opacity = 0.6;
                    if (idx === 2) child.material.opacity = 0.8;
                });
            }

            node.scale.set(1, 1, 1);
            node.userData.isHighlighted = false;
        });

        this.showCommandFeedback("ALL NODES VISIBLE");
    },

    zoomCamera: function (direction) {
        if (!this.camera || !this.controls) return;

        const currentDistance = this.camera.position.distanceTo(this.controls.target);
        const zoomAmount = direction === 'in' ? -30 : 30;
        const newDistance = Math.max(50, Math.min(400, currentDistance + zoomAmount));

        // Calculate new position maintaining direction
        const dir = this.camera.position.clone().sub(this.controls.target).normalize();
        const newPos = this.controls.target.clone().add(dir.multiplyScalar(newDistance));

        if (typeof TWEEN !== 'undefined') {
            new TWEEN.Tween(this.camera.position)
                .to({ x: newPos.x, y: newPos.y, z: newPos.z }, 800)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }

        this.showCommandFeedback(direction === 'in' ? "ZOOM IN" : "ZOOM OUT");
    },

    rotateCamera: function (direction) {
        if (!this.camera || !this.controls) return;

        const angle = direction === 'left' ? Math.PI / 4 : -Math.PI / 4; // 45 degrees
        const currentPos = this.camera.position.clone();
        const target = this.controls.target.clone();

        // Rotate around Y axis
        const offset = currentPos.sub(target);
        const x = offset.x * Math.cos(angle) - offset.z * Math.sin(angle);
        const z = offset.x * Math.sin(angle) + offset.z * Math.cos(angle);

        const newPos = target.clone().add(new THREE.Vector3(x, offset.y, z));

        if (typeof TWEEN !== 'undefined') {
            new TWEEN.Tween(this.camera.position)
                .to({ x: newPos.x, y: newPos.y, z: newPos.z }, 1000)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start();
        }

        this.showCommandFeedback(direction === 'left' ? "ROTATE LEFT" : "ROTATE RIGHT");
    },

    toggleAutoRotate: function (enable) {
        if (!this.controls) return;

        if (enable === undefined) {
            this.controls.autoRotate = !this.controls.autoRotate;
        } else {
            this.controls.autoRotate = enable;
        }

        const status = this.controls.autoRotate ? "ROTATION ENABLED" : "ROTATION DISABLED";
        this.showCommandFeedback(status);

        const hudStatus = document.getElementById('hud-status');
        if (hudStatus && this.controls.autoRotate) {
            hudStatus.textContent = 'AUTO-ROTATING';
        }
    },

    showCommandFeedback: function (text) {
        // Create floating 3D text feedback
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        // Background
        ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Border
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        // Text
        ctx.font = 'Bold 36px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(text, 256, 75);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);

        sprite.position.set(0, 50, 0);
        sprite.scale.set(80, 20, 1);

        this.scene.add(sprite);

        // Animate and remove
        if (typeof TWEEN !== 'undefined') {
            new TWEEN.Tween(sprite.position)
                .to({ y: 80 }, 2000)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();

            new TWEEN.Tween(sprite.material)
                .to({ opacity: 0 }, 2000)
                .easing(TWEEN.Easing.Cubic.Out)
                .onComplete(() => {
                    this.scene.remove(sprite);
                    texture.dispose();
                    spriteMat.dispose();
                })
                .start();
        }
    },

    dispose: function () {
        this.isRunning = false;
        this.activeParticles = [];
        if (this.hudElement) {
            this.hudElement.remove();
            this.hudElement = null;
        }
        if (this.renderer) {
            this.renderer.dispose();
            const container = this.renderer.domElement.parentNode;
            if (container) container.innerHTML = '';
        }
    }
};
