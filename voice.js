
// --- Voice & LiveKit Manager ---

class VoiceManager {
    constructor() {
        this.room = null;
        this.recognition = null;
        this.isListening = false;
        this.synth = window.speechSynthesis;
        this.lastTranscript = ''; // Store transcript for processing

        // UI Elements
        this.btn = null;
        this.input = null; // Defer until start or updateUI

        this.initSTT();
    }

    initSTT() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateUI('LISTENING');
                console.log("🎤 Voice: Started listening...");
                this.lastTranscript = ''; // Reset

                // Show JARVIS-style voice overlay
                this.showVoiceOverlay();
            };

            this.recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    transcript += event.results[i][0].transcript;
                }

                console.log("🎤 Voice: Captured transcript:", transcript);

                // Store transcript
                this.lastTranscript = transcript;

                // Update JARVIS overlay with live transcription
                this.updateVoiceTranscript(transcript);

                // Also update input if it exists (for other views)
                if (!this.input) this.input = document.getElementById('gemini-input');
                if (this.input) {
                    this.input.value = transcript;
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                console.log("🎤 Voice: Recognition ended");

                // Process stored transcript
                if (this.lastTranscript && this.lastTranscript.trim().length > 0) {
                    console.log("🎤 Voice: Processing command:", this.lastTranscript);
                    // Hide overlay and add to command history
                    this.hideVoiceOverlay(this.lastTranscript);
                    this.handleVoiceCommand(this.lastTranscript);
                } else {
                    console.log("🎤 Voice: No text captured, returning to idle");
                    this.hideVoiceOverlay();
                    this.updateUI('IDLE');
                }
            };

            this.recognition.onerror = (event) => {
                console.error("🎤 Voice: Speech Error", event.error);
                this.updateUI('IDLE');
            };
        } else {
            console.warn("Web Speech API not supported");
        }
    }

    async start() {
        if (!this.recognition) return alert("Browser does not support Voice.");

        // If already listening or speaking, STOP
        if (this.isListening || this.synth.speaking) {
            this.stop();
            return;
        }

        // 1. Start STT
        try {
            this.recognition.start();
        } catch (e) {
            console.warn("Recognition already started", e);
            // If it was already effectively started but state desync, force stop
            this.stop();
        }

        // 2. Connect LiveKit (Fire & Forget for Demo responsiveness)
        this.connectLiveKit().catch(e => console.error("LiveKit Error:", e));
    }

    stop() {
        // Stop Transcription
        if (this.recognition) {
            this.recognition.stop();
        }
        this.isListening = false;

        // Stop Speaking
        if (this.synth) {
            this.synth.cancel();
        }

        this.updateUI('IDLE');
    }

    async connectLiveKit() {
        if (this.room && this.room.state === 'connected') return;

        const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = window.ENV;
        if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
            console.warn("LiveKit keys missing in env.js");
            return;
        }

        // Generate Token Client-Side (Demo Only)
        const token = this.generateToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, "user-" + Math.floor(Math.random() * 1000));

        try {
            this.room = new LivekitClient.Room({
                adaptiveStream: true,
                dynacast: true
            });

            await this.room.connect(LIVEKIT_URL, token);
            console.log("Connected to LiveKit Room:", this.room.name);

            // Publish Mic
            await this.room.localParticipant.setMicrophoneEnabled(true);
            console.log("Microphone published to LiveKit");

        } catch (e) {
            console.error("Failed to connect LiveKit", e);
        }
    }

    generateToken(apiKey, apiSecret, identity) {
        // Basic JWT Generation using jsrsasign
        const header = { alg: "HS256", typ: "JWT" };
        // LiveKit specific claims
        const claim = {
            iss: apiKey,
            exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
            sub: identity,
            nbf: Math.floor(Date.now() / 1000),
            video: {
                room: "insightops-voice",
                roomJoin: true,
                canPublish: true,
                canSubscribe: true
            }
        };

        return KJUR.jws.JWS.sign("HS256", JSON.stringify(header), JSON.stringify(claim), apiSecret);
    }

    async handleVoiceCommand(text) {
        const lowerText = text.toLowerCase().trim();
        console.log("Voice Command Received:", text);

        // --- CATEGORY 1: Navigation Commands ---
        const focusMatch = lowerText.match(/(?:focus on|go to|show me|navigate to|take me to|zoom to)\s+(.+)/i);
        if (focusMatch) {
            const serviceName = focusMatch[1].trim();
            console.log("Voice Navigation:", serviceName);

            this.updateUI('SPEAKING');
            this.speak(`Focusing on ${serviceName} sector.`);

            // Check if Neural Interface is already running (user is on that tab)
            if (window.NeuralInterface && window.NeuralInterface.isRunning) {
                // Already on neural interface - fly directly!
                console.log("NeuralInterface is running, flying directly...");
                window.NeuralInterface.flyTo(serviceName);
            } else {
                // Switch to neural interface first
                console.log("Switching to Neural Interface tab...");
                if (window.switchTab) window.switchTab('neural-interface');

                // Wait for Neural Interface to initialize
                setTimeout(() => {
                    if (window.NeuralInterface && window.NeuralInterface.isRunning) {
                        window.NeuralInterface.flyTo(serviceName);
                    }
                }, 1500);
            }

            return;
        }

        // --- CATEGORY 2: Filter Commands ---
        if (lowerText.match(/show\s+(only\s+)?(critical|error|failed|problem)\s*(nodes|services)?/i)) {
            this.updateUI('SPEAKING');
            this.speak("Highlighting critical nodes.");

            // Execute directly if on neural interface
            if (window.NeuralInterface) {
                window.NeuralInterface.highlightCriticalNodes();
            }

            return;
        }

        if (lowerText.match(/show\s+(only\s+)?(healthy|normal|good)\s*(nodes|services)?/i)) {
            this.updateUI('SPEAKING');
            this.speak("Highlighting healthy nodes.");

            if (window.NeuralInterface) {
                window.NeuralInterface.highlightHealthyNodes();
            }

            return;
        }

        if (lowerText.match(/show\s+all\s*(nodes|services)?/i)) {
            this.updateUI('SPEAKING');
            this.speak("Showing all nodes.");

            if (window.NeuralInterface) {
                window.NeuralInterface.resetNodeVisibility();
            }

            return;
        }

        // --- CATEGORY 3: Camera Control Commands ---
        if (lowerText.match(/reset\s+(view|camera|position)/i) || lowerText === 'reset') {
            this.updateUI('SPEAKING');
            this.speak("Resetting view.");

            if (window.NeuralInterface) {
                window.NeuralInterface.resetCamera();
            }

            return;
        }

        if (lowerText.match(/zoom\s+in/i)) {
            this.updateUI('SPEAKING');
            this.speak("Zooming in.");

            setTimeout(() => {
                if (window.NeuralInterface) window.NeuralInterface.zoomCamera('in');
            }, 500);

            return;
        }

        if (lowerText.match(/zoom\s+out/i)) {
            this.updateUI('SPEAKING');
            this.speak("Zooming out.");

            setTimeout(() => {
                if (window.NeuralInterface) window.NeuralInterface.zoomCamera('out');
            }, 500);

            return;
        }

        if (lowerText.match(/rotate\s+(left|counterclockwise)/i)) {
            this.updateUI('SPEAKING');
            this.speak("Rotating left.");

            setTimeout(() => {
                if (window.NeuralInterface) window.NeuralInterface.rotateCamera('left');
            }, 500);

            return;
        }

        if (lowerText.match(/rotate\s+(right|clockwise)/i)) {
            this.updateUI('SPEAKING');
            this.speak("Rotating right.");

            setTimeout(() => {
                if (window.NeuralInterface) window.NeuralInterface.rotateCamera('right');
            }, 500);

            return;
        }

        if (lowerText.match(/stop\s+(rotation|rotating|spinning)/i)) {
            this.updateUI('SPEAKING');
            this.speak("Stopping rotation.");

            setTimeout(() => {
                if (window.NeuralInterface) window.NeuralInterface.toggleAutoRotate(false);
            }, 500);

            return;
        }

        if (lowerText.match(/start\s+(rotation|rotating|spinning)/i) || lowerText.match(/auto\s*rotate/i)) {
            this.updateUI('SPEAKING');
            this.speak("Starting rotation.");

            setTimeout(() => {
                if (window.NeuralInterface) window.NeuralInterface.toggleAutoRotate(true);
            }, 500);

            return;
        }

        // --- CATEGORY 4: Status Commands ---
        if (lowerText.match(/what.*status|system.*status|health.*check/i)) {
            this.updateUI('SPEAKING');

            const stats = window.fakeExplanation?.stats || {};
            const criticalCount = Object.values(stats).filter(s => s.status === 'Critical').length;
            const degradedCount = Object.values(stats).filter(s => s.status === 'Degraded').length;

            let statusMsg = `System status: ${criticalCount} critical, ${degradedCount} degraded services.`;
            if (criticalCount === 0 && degradedCount === 0) {
                statusMsg = "All systems operational.";
            }

            this.speak(statusMsg);
            return;
        }

        // --- CATEGORY 5: AI Analysis Commands ---
        if (lowerText.match(/analyze|analysis|diagnose|what.*wrong|recommendations?/i)) {
            this.updateUI('SPEAKING');

            const stats = window.fakeExplanation?.stats || {};
            const critical = Object.entries(stats).filter(([k, v]) => v.status === 'Critical');
            const degraded = Object.entries(stats).filter(([k, v]) => v.status === 'Degraded');

            let analysis = "";
            if (critical.length > 0) {
                const [name, data] = critical[0];
                analysis = `Analysis complete. Critical issue detected in ${name} with ${data.errors} errors. `;
                analysis += `Recommended action: Scale ${name} replicas and check connection pool limits. `;
                analysis += `This could reduce error rate by 80% within 5 minutes.`;

                // Focus on the critical node
                if (window.NeuralInterface && window.NeuralInterface.isRunning) {
                    window.NeuralInterface.flyTo(name);
                }
            } else if (degraded.length > 0) {
                const [name, data] = degraded[0];
                analysis = `System is stable but ${name} shows degraded performance with ${data.errors} warnings. `;
                analysis += `Consider reviewing logs and scaling resources.`;
            } else {
                analysis = "All systems healthy. No immediate actions required.";
            }

            // Show analysis on HUD
            if (window.NeuralInterface) {
                window.NeuralInterface.showCommandFeedback("AI ANALYSIS COMPLETE");
            }

            this.speak(analysis);
            return;
        }

        // --- CATEGORY 6: Root Cause Analysis ---
        const whyMatch = lowerText.match(/why.*(?:is|are)?\s+(\w+)\s+(?:failing|down|broken|slow|critical)/i);
        if (whyMatch) {
            this.updateUI('SPEAKING');
            const service = whyMatch[1];

            const rootCauses = {
                'database': "Database is failing due to connection pool exhaustion. 145 connections are blocked by long-running queries. The primary fix is to scale read replicas.",
                'payment': "Payment service is critical due to upstream API Gateway errors cascading down. The 89 errors are caused by timeout retries.",
                'api': "API Gateway is degraded because of high latency from the Database tier. This is a cascading failure.",
                'default': `Root cause analysis for ${service}: Check the service logs and upstream dependencies.`
            };

            const cause = rootCauses[service.toLowerCase()] || rootCauses['default'];

            // Focus on the service
            if (window.NeuralInterface && window.NeuralInterface.isRunning) {
                window.NeuralInterface.flyTo(service);
            }

            this.speak(cause);
            return;
        }

        // --- CATEGORY 7: Quick Fix Commands ---
        const fixMatch = lowerText.match(/fix\s+(\w+)|scale\s+(\w+)|restart\s+(\w+)/i);
        if (fixMatch) {
            const service = fixMatch[1] || fixMatch[2] || fixMatch[3];
            this.updateUI('SPEAKING');

            // Simulate fix action
            this.speak(`Initiating remediation for ${service}. Scaling replicas and clearing connection pool. This will take approximately 30 seconds.`);

            // Visual feedback
            if (window.NeuralInterface) {
                window.NeuralInterface.showCommandFeedback(`FIXING: ${service.toUpperCase()}`);
                window.NeuralInterface.flyTo(service);
            }

            // Simulate status change after delay
            setTimeout(() => {
                if (window.fakeExplanation?.stats) {
                    // Change status to healthy (for demo)
                    const key = Object.keys(window.fakeExplanation.stats).find(k =>
                        k.toLowerCase().includes(service.toLowerCase())
                    );
                    if (key && window.NeuralInterface) {
                        window.NeuralInterface.setNodeStatus(key, 'Healthy');
                        window.NeuralInterface.showCommandFeedback(`${key.toUpperCase()} FIXED!`);
                    }
                }
                this.speak(`${service} remediation complete. Service is now healthy.`);
            }, 3000);

            return;
        }

        // --- CATEGORY 8: Attack Simulation ---
        if (lowerText.match(/simulate.*attack|start.*load.*test|red.*alert/i)) {
            this.updateUI('SPEAKING');
            this.speak("WARNING. Simulating massive DDoS attack. Systems critical.");

            if (window.NeuralInterface) {
                window.NeuralInterface.simulateAttack();
            }
            return;
        }

        if (lowerText.match(/activate.*defen[cs]e|mitigate|fix.*attack|restore.*system|shields.*up/i)) {
            this.updateUI('SPEAKING');
            this.speak("Defence systems activated. Mitigating threat. Restoring normal operations.");

            if (window.NeuralInterface) {
                window.NeuralInterface.activateDefense();
            }
            return;
        }

        // --- CATEGORY 9: Help Command ---
        if (lowerText.match(/help|what.*can.*do|commands/i)) {
            this.updateUI('SPEAKING');
            this.speak("You can say: Analyze system, Why is database failing, Fix database, Focus on payment, Show critical nodes, or Reset view.");
            return;
        }

        // --- FALLBACK: Use Gemini for general questions ---
        this.updateUI('THINKING');

        if (window.askGemini) {
            try {
                const answer = await window.askGemini(text);

                const responseDiv = document.getElementById('gemini-response');
                if (responseDiv) {
                    responseDiv.innerHTML = answer.replace(/\*\*(.*?)\*\*/g, '<span class="text-indigo-300 font-bold">$1</span>');
                    responseDiv.classList.remove('hidden');
                }

                this.speak(answer);
            } catch (e) {
                console.error("Gemini Error:", e);
                this.updateUI('IDLE');
                this.speak("I didn't understand that command. Say help for available commands.");
            }
        } else {
            this.updateUI('IDLE');
            this.speak("I didn't understand that command. Say help for available commands.");
        }
    }

    speak(text) {
        if (!this.synth) return;
        this.updateUI('SPEAKING');

        // Strip markdown for speech
        const cleanText = text.replace(/[*#`]/g, '');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.volume = 1;
        utterance.rate = 1.1;
        utterance.pitch = 1;

        utterance.onend = () => {
            if (!this.synth.speaking) {
                this.updateUI('IDLE');
            }
        };

        this.synth.speak(utterance);
    }

    updateUI(state) {
        const btn = document.getElementById('gemini-talk-btn');
        const neuralBtn = document.getElementById('neural-voice-btn');

        // Update main button if it exists
        if (btn) {
            // Reset styles first
            btn.className = "ml-2 px-4 py-2 rounded-md font-medium transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer";

            switch (state) {
                case 'IDLE':
                    btn.innerHTML = '<i class="fas fa-microphone"></i> Talk';
                    btn.classList.add('bg-zinc-800', 'text-white', 'hover:bg-zinc-700');
                    break;
                case 'LISTENING':
                    btn.innerHTML = '<i class="fas fa-stop text-white"></i> Stop';
                    btn.classList.add('bg-red-500', 'text-white', 'animate-pulse');
                    break;
                case 'THINKING':
                    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Stop';
                    btn.classList.add('bg-indigo-600', 'text-white');
                    break;
                case 'SPEAKING':
                    btn.innerHTML = '<i class="fas fa-stop text-white"></i> Stop';
                    btn.classList.add('bg-indigo-500', 'text-white');
                    break;
            }
        }

        // Update neural button if it exists
        if (neuralBtn) {
            neuralBtn.className = "px-3 py-1.5 rounded text-xs text-white transition-colors flex items-center gap-2 border";

            switch (state) {
                case 'IDLE':
                    neuralBtn.innerHTML = '<i class="fas fa-microphone"></i> Voice';
                    neuralBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-500', 'border-indigo-400');
                    break;
                case 'LISTENING':
                    neuralBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
                    neuralBtn.classList.add('bg-red-500', 'hover:bg-red-400', 'border-red-400', 'animate-pulse');
                    break;
                case 'THINKING':
                    neuralBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Thinking';
                    neuralBtn.classList.add('bg-indigo-600', 'border-indigo-400');
                    break;
                case 'SPEAKING':
                    neuralBtn.innerHTML = '<i class="fas fa-volume-up"></i> Speaking';
                    neuralBtn.classList.add('bg-indigo-500', 'border-indigo-400');
                    break;
            }
        }
    }

    // === JARVIS-Style Voice Overlay Methods ===

    showVoiceOverlay() {
        const overlay = document.getElementById('voice-overlay');
        const transcript = document.getElementById('voice-transcript');
        if (overlay) {
            overlay.classList.remove('opacity-0');
            overlay.classList.add('opacity-100');
        }
        if (transcript) {
            transcript.innerHTML = '<span class="text-zinc-500 animate-pulse">Listening...</span>';
        }
    }

    updateVoiceTranscript(text) {
        const transcript = document.getElementById('voice-transcript');
        if (transcript) {
            // Typewriter-style update
            transcript.innerHTML = `<span class="text-cyan-400">"</span>${text}<span class="text-cyan-400">"</span>`;
        }
    }

    hideVoiceOverlay(command = '') {
        const overlay = document.getElementById('voice-overlay');
        if (overlay) {
            // Fade out
            overlay.classList.remove('opacity-100');
            overlay.classList.add('opacity-0');
        }

        // Add to command history
        if (command) {
            const history = document.getElementById('command-history');
            if (history) {
                const entry = document.createElement('div');
                entry.className = 'text-indigo-400/50 mb-1 animate-fade-in';
                entry.innerHTML = `<i class="fas fa-chevron-right text-xs mr-1"></i>${command}`;
                history.insertBefore(entry, history.firstChild);

                // Keep only last 5 commands
                while (history.children.length > 5) {
                    history.removeChild(history.lastChild);
                }
            }
        }
    }
}

// Initialize Global Instance safely
try {
    const initVoice = () => {
        if (!window.Voice) {
            window.Voice = new VoiceManager();
            window.startVoiceParams = () => window.Voice.start();
            console.log("Voice Manager Initialized Successfully");
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVoice);
    } else {
        initVoice();
    }
} catch (e) {
    console.error("CRITICAL: Failed to initialize Voice Manager", e);
}
