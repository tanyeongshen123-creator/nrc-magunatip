// Magunatip Web Audio & Rhythm Simulator Logic

let audioCtx = null;
let isPlaying = false;
let isMuted = false;
let playMusicToggle = true;

// Metronome Scheduler variables
let bpm = 110;
let lookahead = 25.0; // ms
let scheduleAheadTime = 0.1; // seconds
let nextNoteTime = 0.0;
let currentBeat = 1; // 1, 2, 3
let currentMeasure = 0; // 0, 1, 2, 3
let schedulerTimer = null;
let scheduledBeats = [];

// Game state variables
let gameState = 'START_SCREEN'; // START_SCREEN, PLAYING, GAME_OVER
let score = 0;
let lives = 3;
let dancerPosition = 'outside'; // inside, outside
let collisionOccurredThisBeat = false;

// Hand Gesture Tracking state variables
let gestureActive = false;
let gestureTracker = null;
let cameraHelper = null;
let gestureModelLoaded = false;
let gestureVideoElement = null;
let gestureCanvasElement = null;
let gestureCanvasCtx = null;
let gestureLoadingOverlay = null;
let gestureIndicatorElement = null;

// 3/4 Magunatip rhythm chord progression (A minor, D minor, G major, C major)
const accompaniment = [
    // Measure 0: A minor (A2, C4+E4)
    { 1: [110.00], 2: [261.63, 329.63], 3: [261.63, 329.63] },
    // Measure 1: D minor (D3, F4+A4)
    { 1: [146.83], 2: [349.23, 440.00], 3: [349.23, 440.00] },
    // Measure 2: G major (G2, B3+D4)
    { 1: [98.00], 2: [246.94, 293.66], 3: [246.94, 293.66] },
    // Measure 3: C major (C3, E4+G4)
    { 1: [130.81], 2: [329.63, 392.00], 3: [329.63, 392.00] }
];

// DOM Elements
let scoreVal, livesVal, gameViewport, feetElement, btnDanceSlow, btnDanceFast, bpmVal, musicCheckbox, muteCheckbox, overlayElement, overlayTitle, overlayText, overlayBtn;
let indicator1, indicator2, indicator3;

// Initialize elements once DOM loads
window.addEventListener('DOMContentLoaded', () => {
    scoreVal = document.getElementById('score-val');
    livesVal = document.getElementById('lives-val');
    gameViewport = document.getElementById('game-viewport');
    feetElement = document.getElementById('feet');
    btnDanceSlow = document.getElementById('btn-dance-slow');
    btnDanceFast = document.getElementById('btn-dance-fast');
    bpmVal = document.getElementById('bpm-val');
    musicCheckbox = document.getElementById('music-toggle');
    muteCheckbox = document.getElementById('mute-toggle');
    overlayElement = document.getElementById('game-overlay');
    overlayTitle = document.getElementById('overlay-title');
    overlayText = document.getElementById('overlay-text');
    overlayBtn = document.getElementById('overlay-btn');

    indicator1 = document.getElementById('beat-ind-1');
    indicator2 = document.getElementById('beat-ind-2');
    indicator3 = document.getElementById('beat-ind-3');

    // Add Event Listeners
    if (btnDanceSlow) {
        btnDanceSlow.addEventListener('click', () => {
            setDanceSpeed('SLOW');
        });
    }

    if (btnDanceFast) {
        btnDanceFast.addEventListener('click', () => {
            setDanceSpeed('FAST');
        });
    }

    function setDanceSpeed(speed) {
        if (speed === 'SLOW') {
            bpm = 110;
            if (bpmVal) bpmVal.textContent = "110 (SLOW)";
            if (btnDanceSlow) btnDanceSlow.classList.add('active-speed');
            if (btnDanceFast) btnDanceFast.classList.remove('active-speed');
            setEspMode('SLOW');
        } else {
            bpm = 160;
            if (bpmVal) bpmVal.textContent = "160 (FAST)";
            if (btnDanceFast) btnDanceFast.classList.add('active-speed');
            if (btnDanceSlow) btnDanceSlow.classList.remove('active-speed');
            setEspMode('FAST');
        }
    }

    musicCheckbox.addEventListener('change', (e) => {
        playMusicToggle = e.target.checked;
    });

    muteCheckbox.addEventListener('change', (e) => {
        isMuted = e.target.checked;
    });

    // Gesture control toggle binding
    gestureVideoElement = document.getElementById('webcam-video');
    gestureCanvasElement = document.getElementById('gesture-canvas');
    if (gestureCanvasElement) {
        gestureCanvasCtx = gestureCanvasElement.getContext('2d');
    }
    gestureLoadingOverlay = document.getElementById('gesture-loading');
    gestureIndicatorElement = document.getElementById('gesture-indicator');
    const gestureToggle = document.getElementById('gesture-toggle');

    if (gestureToggle) {
        gestureToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                startGestureControl();
            } else {
                stopGestureControl();
            }
        });
    }

    overlayBtn.addEventListener('click', () => {
        if (gameState === 'START_SCREEN' || gameState === 'GAME_OVER') {
            startGame();
        }
    });

    // Control by Spacebar or Arrow keys
    window.addEventListener('keydown', (e) => {
        // Prevent keybinds from firing if the user is typing in form/input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        if (gestureActive) return; // Disable keyboard controls if gesture control is active

        if (e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
            e.preventDefault();
            toggleDancerPosition();
        }
    });

    // Click/Touch on Viewport to toggle position
    gameViewport.addEventListener('mousedown', (e) => {
        if (gestureActive) return; // Disable click controls if gesture control is active
        if (gameState === 'PLAYING') {
            toggleDancerPosition();
        }
    });

    // Start requestAnimationFrame loop
    requestAnimationFrame(animationLoop);
});

// Audio initialization
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// SYNTH: Low Wood Slide/Floor Tap Sound (Beat 1)
function playPolesOpenSound(time) {
    if (!audioCtx || isMuted) return;

    let osc = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(70, time + 0.1);

    gainNode.gain.setValueAtTime(0.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.12);
}

// SYNTH: Sharp Bamboo Clack Sound (Beats 2 and 3)
function playPolesClosedSound(time) {
    if (!audioCtx || isMuted) return;

    // High wood strike sound
    let osc = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(750, time);
    osc.frequency.exponentialRampToValueAtTime(220, time + 0.07);

    gainNode.gain.setValueAtTime(0.35, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.08);

    // White noise impulse for sharp impact crack
    let bufferSize = audioCtx.sampleRate * 0.015; // 15ms buffer
    let buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    let data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    let noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    let filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;

    let noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.25, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.015);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    noise.start(time);
    noise.stop(time + 0.02);
}

// SYNTH: Folk instrument pluck chord note
function playMelodyNote(pitch, time, volume = 0.08) {
    if (!audioCtx || isMuted) return;

    let osc = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, time);

    // Plucked string envelope
    gainNode.gain.setValueAtTime(volume, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.4);
}

// SYNTH: High chime for scoring steps
function playScoreChime() {
    if (!audioCtx || isMuted) return;

    const time = audioCtx.currentTime;
    let osc = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, time);
    osc.frequency.linearRampToValueAtTime(1320, time + 0.08);

    gainNode.gain.setValueAtTime(0.12, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start(time);
    osc.stop(time + 0.2);
}

// SYNTH: Buzz/fail indicator sound
function playFailSound() {
    if (!audioCtx || isMuted) return;

    const time = audioCtx.currentTime;
    let osc1 = audioCtx.createOscillator();
    let osc2 = audioCtx.createOscillator();
    let gainNode = audioCtx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(110, time);
    osc1.frequency.linearRampToValueAtTime(70, time + 0.3);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(112, time);
    osc2.frequency.linearRampToValueAtTime(71, time + 0.3);

    gainNode.gain.setValueAtTime(0.2, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.35);
    osc2.stop(time + 0.35);
}

// Game Play Functions
function startGame() {
    initAudio();

    gameState = 'PLAYING';
    score = 0;
    lives = 3;
    dancerPosition = 'outside';
    collisionOccurredThisBeat = false;

    scoreVal.textContent = score;
    livesVal.textContent = '❤️'.repeat(lives);
    feetElement.className = 'game-dancer-feet outside';
    overlayElement.style.display = 'none';

    isPlaying = true;
    nextNoteTime = audioCtx.currentTime + 0.1;
    currentBeat = 1;
    currentMeasure = 0;
    scheduledBeats = [];

    startScheduler();
}

function stopGame(isWin = false) {
    isPlaying = false;
    stopScheduler();

    gameState = 'GAME_OVER';
    overlayElement.style.display = 'flex';

    // Reset hardware to currently selected dashboard mode
    sendEspCommand(espMode);

    if (lives <= 0) {
        overlayTitle.textContent = 'Oops! Caught!';
        overlayText.innerHTML = `Your feet got caught in the bamboo poles!<br><br><strong style="font-size: 1.25rem; color: var(--accent);">Final Score: ${score}</strong>`;
        overlayBtn.textContent = 'Try Again';
    }
}

function toggleDancerPosition() {
    if (gameState !== 'PLAYING') return;

    if (dancerPosition === 'outside') {
        dancerPosition = 'inside';
        feetElement.className = 'game-dancer-feet inside';
    } else {
        dancerPosition = 'outside';
        feetElement.className = 'game-dancer-feet outside';
    }
}

function setDancerPosition(position) {
    if (gameState !== 'PLAYING') return;
    if (dancerPosition !== position) {
        dancerPosition = position;
        feetElement.className = `game-dancer-feet ${position}`;
    }
}

// Metronome engine scheduler logic
function startScheduler() {
    if (schedulerTimer) return;
    schedulerTimer = setInterval(scheduler, lookahead);
}

function stopScheduler() {
    if (schedulerTimer) {
        clearInterval(schedulerTimer);
        schedulerTimer = null;
    }
}

function nextNote() {
    const secondsPerBeat = 60.0 / bpm;
    nextNoteTime += secondsPerBeat;

    currentBeat++;
    if (currentBeat > 3) {
        currentBeat = 1;
        currentMeasure = (currentMeasure + 1) % 4;
    }
}

function scheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleNote(currentBeat, nextNoteTime, currentMeasure);
        nextNote();
    }
}

function scheduleNote(beat, time, measure) {
    // Sound FX trigger
    if (beat === 1) {
        playPolesOpenSound(time);
    } else {
        playPolesClosedSound(time);
    }

    // Music accompaniment track trigger
    if (playMusicToggle) {
        const chordInfo = accompaniment[measure];
        if (beat === 1) {
            // Bass Root Note
            playMelodyNote(chordInfo[1][0], time, 0.16);
        } else {
            // Waltz strum chords
            playMelodyNote(chordInfo[beat][0], time, 0.05);
            playMelodyNote(chordInfo[beat][1], time, 0.05);
        }
    }

    // Queue visual update event
    scheduledBeats.push({ beat: beat, time: time });
}

// The requestAnimationFrame loop for rendering visual changes and collision checks
function animationLoop() {
    const now = audioCtx ? audioCtx.currentTime : 0;

    while (scheduledBeats.length > 0 && scheduledBeats[0].time <= now) {
        const currentScheduledEvent = scheduledBeats.shift();
        triggerVisualBeat(currentScheduledEvent.beat);
    }

    requestAnimationFrame(animationLoop);
}

// Render beat UI updates and evaluate collision game logic
function triggerVisualBeat(beat) {
    // Reset indicators
    indicator1.classList.remove('active');
    indicator2.classList.remove('active');
    indicator3.classList.remove('active');

    // Activate current indicator and sync with hardware in real time
    if (beat === 1) {
        indicator1.classList.add('active');
        gameViewport.classList.remove('poles-closed');
        if (gameState === 'PLAYING') {
            sendEspCommand('OPEN');
        }
    } else if (beat === 2) {
        indicator2.classList.add('active');
        gameViewport.classList.add('poles-closed');
        if (gameState === 'PLAYING') {
            sendEspCommand('CLOSED');
        }
    } else if (beat === 3) {
        indicator3.classList.add('active');
        gameViewport.classList.add('poles-closed');
        // No need to send CLOSED again for beat 3 as it's already closed
    }

    // Collision detection & scoring evaluation logic
    if (gameState === 'PLAYING') {
        if (beat === 1) {
            // Open state: dancer should be INSIDE the poles
            if (dancerPosition === 'inside') {
                score += 10;
                scoreVal.textContent = score;
                playScoreChime();
            }
        } else {
            // Closed state (beat 2 or 3): dancer should be OUTSIDE the poles
            if (dancerPosition === 'inside') {
                // Caught! Deduct life
                lives--;
                livesVal.textContent = '❤️'.repeat(lives);

                gameViewport.classList.add('hit');
                playFailSound();

                setTimeout(() => {
                    gameViewport.classList.remove('hit');
                }, 200);

                if (lives <= 0) {
                    stopGame();
                }
            } else {
                // Safely outside!
                score += 5;
                scoreVal.textContent = score;
            }
        }


    }
}

/* ====================================================
   ESP32/ESP8266 HARDWARE COMMUNICATION & LED CONTROLLER
   ==================================================== */

let espIp = '192.168.4.1';
let espProtocol = 'HTTP'; // 'HTTP', 'WEBSOCKET', 'SERIAL'
let espMode = 'SLOW';     // 'FAST', 'SLOW'

let webSocketConn = null;
let serialPort = null;
let serialWriter = null;

// ESP DOM Elements
let btnFastMode, btnSlowMode, btnMediumMode;
let espIpInput, espProtocolSelect, btnTestEsp;
let terminalLog, btnClearLog, statusPill, statusText;
let lightbulbGlow, virtualLightbulb, lightbulbStatusMode, lightbulbStatusState;
let codeModal, btnOpenCodeModal, btnCloseCodeModal, btnCopyCode;

// Initialize ESP32/ESP8266 controls when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    btnFastMode = document.getElementById('btn-mode-fast');
    btnSlowMode = document.getElementById('btn-mode-slow');
    btnMediumMode = document.getElementById('btn-mode-medium');
    espIpInput = document.getElementById('esp-ip-input');
    espProtocolSelect = document.getElementById('esp-protocol-select');
    btnTestEsp = document.getElementById('btn-test-esp');
    terminalLog = document.getElementById('terminal-log');
    btnClearLog = document.getElementById('btn-clear-log');
    statusPill = document.getElementById('esp-status-pill');
    statusText = document.getElementById('esp-status-text');

    lightbulbGlow = document.getElementById('lightbulb-glow');
    virtualLightbulb = document.getElementById('virtual-lightbulb');
    lightbulbStatusMode = document.getElementById('lightbulb-status-mode');
    lightbulbStatusState = document.getElementById('lightbulb-status-state');

    codeModal = document.getElementById('code-modal');
    btnOpenCodeModal = document.getElementById('btn-open-code-modal');
    btnCloseCodeModal = document.getElementById('btn-close-code-modal');
    btnCopyCode = document.getElementById('btn-copy-code');

    // Event Listener: FAST Mode Button
    if (btnFastMode) {
        btnFastMode.addEventListener('click', () => {
            setEspMode('FAST');
        });
    }

    // Event Listener: SLOW Mode Button
    if (btnSlowMode) {
        btnSlowMode.addEventListener('click', () => {
            setEspMode('SLOW');
        });
    }

    // Event Listener: MEDIUM Mode Button
    if (btnMediumMode) {
        btnMediumMode.addEventListener('click', () => {
            setEspMode('MEDIUM');
        });
    }

    // Event Listener: IP Address Input
    if (espIpInput) {
        espIpInput.addEventListener('change', (e) => {
            espIp = e.target.value.trim();
            logTerminal(`[CONFIG] Target IP updated to: ${espIp}`, 'info');
        });
    }

    // Event Listener: Protocol Selector
    if (espProtocolSelect) {
        espProtocolSelect.addEventListener('change', (e) => {
            espProtocol = e.target.value;
            logTerminal(`[CONFIG] Protocol changed to: ${espProtocol}`, 'info');

            if (espProtocol === 'WEBSOCKET') {
                initWebSocket();
            } else if (espProtocol === 'SERIAL') {
                initWebSerial();
            }
        });
    }

    // Event Listener: Ping Test Button
    if (btnTestEsp) {
        btnTestEsp.addEventListener('click', () => {
            pingEsp8266();
        });
    }

    // Event Listener: Clear Terminal Log
    if (btnClearLog) {
        btnClearLog.addEventListener('click', () => {
            terminalLog.innerHTML = '<div class="log-line log-info">> Log cleared. Ready for commands...</div>';
        });
    }

    // Modal Control Event Listeners
    if (btnOpenCodeModal && codeModal) {
        btnOpenCodeModal.addEventListener('click', () => {
            codeModal.style.display = 'flex';
        });
    }
    if (btnCloseCodeModal && codeModal) {
        btnCloseCodeModal.addEventListener('click', () => {
            codeModal.style.display = 'none';
        });
    }
    if (btnCopyCode) {
        btnCopyCode.addEventListener('click', () => {
            const codeText = document.getElementById('code-modal-content').innerText;
            navigator.clipboard.writeText(codeText).then(() => {
                btnCopyCode.textContent = '✅ Copied to Clipboard!';
                setTimeout(() => { btnCopyCode.textContent = '📋 Copy Full Code'; }, 2000);
            });
        });
    }

    // Initial visual setup
    updateLightbulbVisualizer(espMode);
});

// Set Active Mode (FAST, MEDIUM or SLOW) and transmit to ESP board
function setEspMode(mode) {
    espMode = mode;

    if (btnFastMode) btnFastMode.classList.remove('active');
    if (btnMediumMode) btnMediumMode.classList.remove('active');
    if (btnSlowMode) btnSlowMode.classList.remove('active');

    if (mode === 'FAST') {
        if (btnFastMode) btnFastMode.classList.add('active');

        // Sync dance settings buttons to Fast speed
        if (btnDanceFast && !btnDanceFast.classList.contains('active-speed')) {
            bpm = 160;
            if (bpmVal) bpmVal.textContent = "160 (FAST)";
            btnDanceFast.classList.add('active-speed');
            if (btnDanceSlow) btnDanceSlow.classList.remove('active-speed');
        }
        logTerminal(`[USER ACTION] Selected ⚡ FAST MODE (LED 255, Sensor Active)`, 'sent');
    } else if (mode === 'MEDIUM') {
        if (btnMediumMode) btnMediumMode.classList.add('active');

        // Sync dance settings buttons to Medium speed (130 BPM)
        bpm = 130;
        if (bpmVal) bpmVal.textContent = "130 (MEDIUM)";
        if (btnDanceSlow) btnDanceSlow.classList.remove('active-speed');
        if (btnDanceFast) btnDanceFast.classList.remove('active-speed');
        logTerminal(`[USER ACTION] Selected 🔆 MEDIUM MODE (LED 48, Sensor Active)`, 'sent');
    } else if (mode === 'SLOW') {
        if (btnSlowMode) btnSlowMode.classList.add('active');

        // Sync dance settings buttons to Slow speed
        if (btnDanceSlow && !btnDanceSlow.classList.contains('active-speed')) {
            bpm = 110;
            if (bpmVal) bpmVal.textContent = "110 (SLOW)";
            btnDanceSlow.classList.add('active-speed');
            if (btnDanceFast) btnDanceFast.classList.remove('active-speed');
        }
        logTerminal(`[USER ACTION] Selected 🌙 SLOW MODE (LED OFF, Sensor Active)`, 'sent');
    }

    updateLightbulbVisualizer(espMode);
    sendEspCommand(espMode);
}

// Transmit Command to ESP board
function sendEspCommand(mode) {
    const payloadStr = `MODE=${mode}`;

    // Keep visualizer in sync with the sent command
    updateLightbulbVisualizer(mode);

    if (espProtocol === 'HTTP') {
        // Send via HTTP REST API
        const targetUrl = `http://${espIp}/led?mode=${mode}`;
        logTerminal(`[HTTP GET] -> Sending to http://${espIp}/led?mode=${mode}`, 'sent');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        fetch(targetUrl, { method: 'GET', signal: controller.signal, mode: 'cors' })
            .then(response => {
                clearTimeout(timeoutId);
                updateConnectionStatus(true, 'HTTP Connected');
                logTerminal(`[HTTP 200] ESP acknowledged mode=${mode}`, 'success');
            })
            .catch(err => {
                clearTimeout(timeoutId);
                // Simulated execution message if hardware offline
                logTerminal(`[HTTP FETCH SIMULATION] Outgoing Packet: ${payloadStr}`, 'info');
                updateConnectionStatus(false, 'Disconnected (Offline)');
            });
    }
    else if (espProtocol === 'WEBSOCKET') {
        if (webSocketConn && webSocketConn.readyState === WebSocket.OPEN) {
            const data = JSON.stringify({ mode: mode });
            webSocketConn.send(data);
            logTerminal(`[WEBSOCKET SENT] ${data}`, 'sent');
        } else {
            logTerminal(`[WEBSOCKET SIMULATION] ReadyState != OPEN. Payload queued: ${payloadStr}`, 'info');
            initWebSocket();
        }
    }
    else if (espProtocol === 'SERIAL') {
        if (serialWriter) {
            const command = `MODE_${mode}\n`;
            serialWriter.write(new TextEncoder().encode(command));
            logTerminal(`[USB SERIAL SENT] ${command.trim()}`, 'sent');
        } else {
            logTerminal(`[SERIAL USB SIMULATION] TX Buffer: MODE_${mode}`, 'info');
        }
    }
}

// Ping ESP board test
function pingEsp8266() {
    updateConnectionStatus('connecting', 'Pinging...');
    logTerminal(`[PING] Contacting ESP at ${espIp}...`, 'info');

    fetch(`http://${espIp}/`, { method: 'GET', mode: 'cors' })
        .then(res => res.json())
        .then(data => {
            updateConnectionStatus(true, 'Online');
            logTerminal(`[PING SUCCESS] ESP Online! Response: ${JSON.stringify(data)}`, 'success');
        })
        .catch(err => {
            updateConnectionStatus(false, 'Offline');
            logTerminal(`[PING FAILED] Could not reach ${espIp}. Make sure your PC is on the ESP Wi-Fi network.`, 'error');
        });
}

// Initialize WebSocket Connection
function initWebSocket() {
    try {
        if (webSocketConn) webSocketConn.close();
        logTerminal(`[WEBSOCKET] Connecting to ws://${espIp}:81...`, 'info');
        webSocketConn = new WebSocket(`ws://${espIp}:81`);

        webSocketConn.onopen = () => {
            updateConnectionStatus(true, 'WebSocket Active');
            logTerminal(`[WEBSOCKET] Socket connected successfully!`, 'success');
        };
        webSocketConn.onclose = () => {
            updateConnectionStatus(false, 'WS Disconnected');
            logTerminal(`[WEBSOCKET] Connection closed.`, 'info');
        };
        webSocketConn.onerror = (err) => {
            logTerminal(`[WEBSOCKET ERROR] Could not connect to ws://${espIp}:81`, 'error');
        };
    } catch (e) {
        logTerminal(`[WEBSOCKET] Setup note: WebSocket server requires WebSocketsServer.h on ESP.`, 'info');
    }
}

// Initialize Web Serial USB Connection (Chrome/Edge API)
async function initWebSerial() {
    if (!('serial' in navigator)) {
        logTerminal(`[WEB SERIAL] Web Serial API is supported in Chrome, Edge, and Opera browsers.`, 'error');
        return;
    }
    try {
        logTerminal(`[WEB SERIAL] Requesting USB COM Port access...`, 'info');
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 115200 });
        serialWriter = serialPort.writable.getWriter();
        updateConnectionStatus(true, 'USB Connected');
        logTerminal(`[WEB SERIAL] Connected to ESP via USB Serial (115200 baud)!`, 'success');
    } catch (err) {
        logTerminal(`[WEB SERIAL ERROR] ${err.message}`, 'error');
    }
}

// Update On-Screen Virtual Lightbulb Visualizer
function updateLightbulbVisualizer(mode) {
    if (!lightbulbGlow || !virtualLightbulb) return;

    if (mode === 'FAST') {
        lightbulbGlow.style.opacity = 1.0;
        lightbulbGlow.className = 'lightbulb-glow mode-fast-glow';
        virtualLightbulb.className = 'virtual-lightbulb mode-fast';
        if (lightbulbStatusMode) lightbulbStatusMode.textContent = 'MODE: FAST (🌈)';
        if (lightbulbStatusState) lightbulbStatusState.textContent = 'STATUS: FULL ON';
    } else if (mode === 'MEDIUM') {
        lightbulbGlow.style.opacity = 0.65;
        lightbulbGlow.className = 'lightbulb-glow mode-medium-glow';
        virtualLightbulb.className = 'virtual-lightbulb mode-medium';
        if (lightbulbStatusMode) lightbulbStatusMode.textContent = 'MODE: MEDIUM (🔆)';
        if (lightbulbStatusState) lightbulbStatusState.textContent = 'STATUS: DIM MED';
    } else if (mode === 'SLOW') {
        lightbulbGlow.style.opacity = 0.1;
        lightbulbGlow.className = 'lightbulb-glow mode-slow-glow';
        virtualLightbulb.className = 'virtual-lightbulb mode-slow';
        if (lightbulbStatusMode) lightbulbStatusMode.textContent = 'MODE: SLOW (🌙)';
        if (lightbulbStatusState) lightbulbStatusState.textContent = 'STATUS: OFF';
    } else if (mode === 'OPEN') {
        lightbulbGlow.style.opacity = 1.0;
        lightbulbGlow.className = 'lightbulb-glow mode-open-glow';
        virtualLightbulb.className = 'virtual-lightbulb mode-open';
        if (lightbulbStatusMode) lightbulbStatusMode.textContent = 'BAMBOO: OPEN (🎋)';
        if (lightbulbStatusState) lightbulbStatusState.textContent = 'NEOPIXEL: GREEN';
    } else if (mode === 'CLOSED') {
        lightbulbGlow.style.opacity = 0.15;
        lightbulbGlow.className = 'lightbulb-glow mode-closed-glow';
        virtualLightbulb.className = 'virtual-lightbulb mode-closed';
        if (lightbulbStatusMode) lightbulbStatusMode.textContent = 'BAMBOO: CLOSED (🛑)';
        if (lightbulbStatusState) lightbulbStatusState.textContent = 'NEOPIXEL: OFF';
    } else if (mode === 'SENSOR') {
        lightbulbGlow.style.opacity = 0.9;
        lightbulbGlow.className = 'lightbulb-glow mode-sensor-glow';
        virtualLightbulb.className = 'virtual-lightbulb mode-sensor';
        if (lightbulbStatusMode) lightbulbStatusMode.textContent = 'MODE: SENSOR (📡)';
        if (lightbulbStatusState) lightbulbStatusState.textContent = 'STATUS: SCANNING';
    }
}

// Update Status Pill UI
function updateConnectionStatus(state, text) {
    if (!statusPill || !statusText) return;

    if (state === true) {
        statusPill.className = 'status-pill status-connected';
    } else if (state === 'connecting') {
        statusPill.className = 'status-pill status-connecting';
    } else {
        statusPill.className = 'status-pill status-disconnected';
    }
    statusText.textContent = text;
}

// Append line to Terminal Log
function logTerminal(message, type = 'info') {
    if (!terminalLog) return;
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    const timestamp = new Date().toLocaleTimeString();
    line.textContent = `[${timestamp}] ${message}`;
    terminalLog.appendChild(line);
    terminalLog.scrollTop = terminalLog.scrollHeight;
}

/* ====================================================
   HAND GESTURE TRACKING & COMPUTER VISION CONTROLS
   ==================================================== */

function startGestureControl() {
    gestureActive = true;
    const container = document.getElementById('gesture-webcam-container');
    if (container) container.style.display = 'block';

    if (gestureLoadingOverlay) {
        gestureLoadingOverlay.style.display = 'flex';
        gestureLoadingOverlay.style.opacity = '1';
    }

    if (!gestureTracker) {
        // Initialize MediaPipe Hands
        gestureTracker = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        gestureTracker.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        gestureTracker.onResults(onGestureResults);
    }

    // Access Webcam
    const constraints = {
        video: { width: 320, height: 240 }
    };

    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            if (!gestureActive) {
                // User toggled off before camera opened
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            gestureVideoElement.srcObject = stream;
            gestureVideoElement.play();

            cameraHelper = new Camera(gestureVideoElement, {
                onFrame: async () => {
                    if (gestureActive && gestureTracker) {
                        await gestureTracker.send({ image: gestureVideoElement });
                    }
                },
                width: 320,
                height: 240
            });
            cameraHelper.start();
            logTerminal('[GESTURE] Webcam activated and hand tracker started.', 'success');
        })
        .catch(err => {
            console.error('Webcam access failed for gestures:', err);
            logTerminal('[GESTURE ERROR] Webcam access failed: ' + err.message, 'error');
            if (gestureIndicatorElement) {
                gestureIndicatorElement.textContent = '❌ CAMERA ERROR';
            }
            if (gestureLoadingOverlay) {
                const span = gestureLoadingOverlay.querySelector('span');
                if (span) span.textContent = 'Camera Access Denied!';
                const spinner = gestureLoadingOverlay.querySelector('.gesture-spinner');
                if (spinner) spinner.style.display = 'none';
            }
        });
}

function stopGestureControl() {
    gestureActive = false;
    logTerminal('[GESTURE] Hand gesture control disabled.', 'info');
    
    // Hide container
    const container = document.getElementById('gesture-webcam-container');
    if (container) container.style.display = 'none';

    // Stop camera
    if (cameraHelper) {
        cameraHelper.stop();
        cameraHelper = null;
    }

    if (gestureVideoElement && gestureVideoElement.srcObject) {
        gestureVideoElement.srcObject.getTracks().forEach(track => track.stop());
        gestureVideoElement.srcObject = null;
    }

    if (gestureIndicatorElement) {
        gestureIndicatorElement.textContent = 'NO HAND DETECTED';
        gestureIndicatorElement.className = 'gesture-indicator';
    }
}

function onGestureResults(results) {
    if (!gestureActive) return;

    if (!gestureModelLoaded) {
        gestureModelLoaded = true;
        if (gestureLoadingOverlay) {
            gestureLoadingOverlay.style.opacity = '0';
            setTimeout(() => {
                if (gestureLoadingOverlay) gestureLoadingOverlay.style.display = 'none';
            }, 300);
        }
    }

    // Clear and draw video frame
    gestureCanvasCtx.save();
    gestureCanvasCtx.clearRect(0, 0, gestureCanvasElement.width, gestureCanvasElement.height);
    gestureCanvasCtx.drawImage(results.image, 0, 0, gestureCanvasElement.width, gestureCanvasElement.height);

    let gestureText = 'NO HAND DETECTED';
    let gestureClass = 'gesture-indicator';

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Draw custom skeleton lines and dots
        drawHandSkeleton(gestureCanvasCtx, landmarks, gestureCanvasElement.width, gestureCanvasElement.height);

        // Count extended fingers
        // Tips: Index (8), Middle (12), Ring (16), Pinky (20)
        // Joints: Index (6), Middle (10), Ring (14), Pinky (18)
        let extendedFingers = 0;
        if (landmarks[8].y < landmarks[6].y) extendedFingers++;
        if (landmarks[12].y < landmarks[10].y) extendedFingers++;
        if (landmarks[16].y < landmarks[14].y) extendedFingers++;
        if (landmarks[20].y < landmarks[18].y) extendedFingers++;
        // Thumb (checking relative height)
        if (landmarks[4].y < landmarks[2].y) extendedFingers++;

        // Classify Gesture
        if (extendedFingers >= 3) {
            gestureText = '🖐️ OPEN PALM (IN)';
            gestureClass = 'gesture-indicator detected-inside';
            if (gameState === 'PLAYING') {
                setDancerPosition('inside');
            }
        } else if (extendedFingers <= 1) {
            gestureText = '✊ CLOSED FIST (OUT)';
            gestureClass = 'gesture-indicator detected-outside';
            if (gameState === 'PLAYING') {
                setDancerPosition('outside');
            }
        } else {
            gestureText = '✋ TRANSITION';
            gestureClass = 'gesture-indicator';
        }
    }

    if (gestureIndicatorElement) {
        gestureIndicatorElement.textContent = gestureText;
        gestureIndicatorElement.className = gestureClass;
    }

    gestureCanvasCtx.restore();
}

function drawHandSkeleton(ctx, landmarks, w, h) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e67e22'; // primary light orange
    ctx.fillStyle = '#f1c40f'; // accent yellow

    const drawLine = (p1, p2) => {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
    };

    // Fingers connections
    const fingers = [
        [0, 1, 2, 3, 4],       // Thumb
        [0, 5, 6, 7, 8],       // Index
        [5, 9, 10, 11, 12],    // Middle
        [9, 13, 14, 15, 16],   // Ring
        [13, 17, 18, 19, 20]   // Pinky
    ];

    // Wrist to Pinky root connection to close palm base
    drawLine(landmarks[0], landmarks[17]);

    fingers.forEach(chain => {
        for (let i = 0; i < chain.length - 1; i++) {
            drawLine(landmarks[chain[i]], landmarks[chain[i + 1]]);
        }
    });

    // Draw joints
    for (let i = 0; i < landmarks.length; i++) {
        const pt = landmarks[i];
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
}

