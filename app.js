// Magunatip Web Audio & Rhythm Simulator Logic

let audioCtx = null;
let isPlaying = false;
let isMuted = false;
let playMusicToggle = false;

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
let streak = 0;
let highScore = 0;
let lives = 3;
let dancerPosition = 'center'; // left, center, right
let collisionOccurredThisBeat = false;
let polesOpen = true;

// Simulator View & Game Mode variables
let activeSimulatorView = 'avatar'; // 'feet' or 'avatar'
let blindfoldMode = false;
let autoAiHopMode = false;

// Avatar customization state
let avatarState = {
    clothing: 'pinongkolo',
    hair: 'bun',
    hairColor: 'black',
    eyes: 'chestnut',
    headwear: 'sugu',
    prop: 'none'
};

// Canvas animation variables
let canvasDancerX = 300; // center of 600px width canvas
let canvasDancerYOffset = 0;
let canvasPolesTransition = 1.0; // 0 = closed, 1 = open

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
let scoreVal, streakVal, livesVal, gameViewport, feetElement, btnDanceSlow, btnDanceFast, bpmVal, musicCheckbox, muteCheckbox, overlayElement, overlayTitle, overlayText, overlayBtn, overlayBtnCamera;
let indicator1, indicator2, indicator3;
let viewToggleFeet, viewToggleAvatar, avatarCanvas, avatarCtx, customizerCanvas, customizerCtx;
let clothingSelect, hairSelect, hairColorSelect, eyeSelect, headwearSelect, propSelect;
let blindfoldToggle, autohopToggle;

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
    overlayBtnCamera = document.getElementById('overlay-btn-camera');

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

    if (musicCheckbox) {
        musicCheckbox.addEventListener('change', (e) => {
            playMusicToggle = e.target.checked;
        });
    }

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

    if (overlayBtnCamera) {
        overlayBtnCamera.addEventListener('click', () => {
            startGestureControl();
        });
    }

    overlayBtn.addEventListener('click', () => {
        if (gameState === 'START_SCREEN' || gameState === 'GAME_OVER') {
            startGame();
        }
    });

    // Control by Spacebar shortcut for starting/restarting game overlays
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        if (e.code === 'Space') {
            e.preventDefault();
            // Trigger clicking overlay button to start/restart
            if (overlayElement && overlayElement.style.display !== 'none') {
                overlayBtn.click();
            }
        }
    });

    // Mouse click/touch movement controls are removed for strictly camera gesture control.

    // Extra elements and bindings for merged customizer and view states
    streakVal = document.getElementById('streak-val');
    viewToggleFeet = document.getElementById('btn-toggle-feet');
    viewToggleAvatar = document.getElementById('btn-toggle-avatar');
    avatarCanvas = document.getElementById('avatar-canvas');
    if (avatarCanvas) {
        avatarCtx = avatarCanvas.getContext('2d');
    }
    customizerCanvas = document.getElementById('customizer-preview-canvas');
    if (customizerCanvas) {
        customizerCtx = customizerCanvas.getContext('2d');
    }

    clothingSelect = document.getElementById('clothing-select');
    hairSelect = document.getElementById('hair-select');
    hairColorSelect = document.getElementById('hair-color-select');
    eyeSelect = document.getElementById('eye-select');
    headwearSelect = document.getElementById('headwear-select');
    propSelect = document.getElementById('prop-select');
    
    blindfoldToggle = document.getElementById('blindfold-toggle');
    autohopToggle = document.getElementById('autohop-toggle');

    // Binding dropdown selections to update avatar customizer state
    if (clothingSelect) {
        clothingSelect.addEventListener('change', (e) => { avatarState.clothing = e.target.value; });
    }
    if (hairSelect) {
        hairSelect.addEventListener('change', (e) => { avatarState.hair = e.target.value; });
    }
    if (hairColorSelect) {
        hairColorSelect.addEventListener('change', (e) => { avatarState.hairColor = e.target.value; });
    }
    if (eyeSelect) {
        eyeSelect.addEventListener('change', (e) => { avatarState.eyes = e.target.value; });
    }
    if (headwearSelect) {
        headwearSelect.addEventListener('change', (e) => { avatarState.headwear = e.target.value; });
    }
    if (propSelect) {
        propSelect.addEventListener('change', (e) => { avatarState.prop = e.target.value; });
    }

    // View toggles: Footprints vs. Canvas Avatar
    if (viewToggleFeet) {
        viewToggleFeet.addEventListener('click', () => {
            activeSimulatorView = 'feet';
            viewToggleFeet.classList.add('active-mode');
            if (viewToggleAvatar) viewToggleAvatar.classList.remove('active-mode');
            
            const feetStage = document.getElementById('classic-stage');
            const avatarStage = document.getElementById('avatar-stage');
            if (feetStage) feetStage.style.display = 'flex';
            if (avatarStage) avatarStage.style.display = 'none';
        });
    }

    if (viewToggleAvatar) {
        viewToggleAvatar.addEventListener('click', () => {
            activeSimulatorView = 'avatar';
            viewToggleAvatar.classList.add('active-mode');
            if (viewToggleFeet) viewToggleFeet.classList.remove('active-mode');
            
            const feetStage = document.getElementById('classic-stage');
            const avatarStage = document.getElementById('avatar-stage');
            if (feetStage) feetStage.style.display = 'none';
            if (avatarStage) avatarStage.style.display = 'flex';
        });
    }

    // Toggles for game modes
    if (blindfoldToggle) {
        blindfoldToggle.addEventListener('change', (e) => {
            blindfoldMode = e.target.checked;
            logTerminal(`[USER ACTION] Blindfold Mode turned ${blindfoldMode ? 'ON' : 'OFF'}`, 'info');
        });
    }

    if (autohopToggle) {
        autohopToggle.addEventListener('change', (e) => {
            autoAiHopMode = e.target.checked;
            logTerminal(`[USER ACTION] Auto-AI Hop Mode turned ${autoAiHopMode ? 'ON' : 'OFF'}`, 'info');
        });
    }

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
    streak = 0;
    lives = 3;
    dancerPosition = 'center';
    collisionOccurredThisBeat = false;
    canvasDancerX = 300;
    canvasDancerYOffset = 0;

    scoreVal.textContent = score;
    if (streakVal) streakVal.textContent = streak;
    livesVal.textContent = '❤️'.repeat(Math.max(0, lives));
    feetElement.className = 'game-dancer-feet center';
    overlayElement.style.display = 'none';

    isPlaying = true;
    nextNoteTime = audioCtx.currentTime + 0.1;
    currentBeat = 1;
    currentMeasure = 0;
    scheduledBeats = [];

    // Resume hand tracking when game starts
    gestureActive = true;
    const container = document.getElementById('gesture-webcam-container');
    if (container) container.style.display = 'block';

    startScheduler();
}

function stopGame(isWin = false) {
    isPlaying = false;
    stopScheduler();

    gameState = 'GAME_OVER';
    overlayElement.style.display = 'flex';

    // Stop webcam hand gesture tracking when game ends
    stopGestureControl();

    // Reset hardware to currently selected dashboard mode
    sendEspCommand(espMode);

    if (score > highScore) {
        highScore = score;
    }

    if (lives <= 0) {
        overlayTitle.textContent = 'Oops! Caught!';
        overlayText.innerHTML = `Your feet got caught in the bamboo poles!<br><br><strong style="font-size: 1.25rem; color: var(--accent);">Score: ${score} | High Score: ${highScore}</strong>`;
        overlayBtn.textContent = 'Try Again';
        
        // Since camera is already running in background, keep start button enabled
        overlayBtn.removeAttribute('disabled');
        overlayBtn.style.opacity = '1';
        overlayBtn.style.pointerEvents = 'auto';
    }
}

function toggleDancerPosition() {
    if (gameState !== 'PLAYING') return;

    if (dancerPosition === 'center') {
        setDancerPosition('left');
    } else {
        setDancerPosition('center');
    }
}

function setDancerPosition(position) {
    if (gameState !== 'PLAYING') return;
    if (dancerPosition !== position) {
        dancerPosition = position;
        feetElement.className = `game-dancer-feet ${position}`;
        // Hop trigger for 2D Chibi Canvas Dancer
        canvasDancerYOffset = -25;
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

    // Render the standalone Avatar Studio preview canvas (always active)
    renderCustomizerPreview();

    // Canvas Chibi rendering loop inside gameplay simulator
    if (activeSimulatorView === 'avatar') {
        renderCanvasAvatar();
    }

    requestAnimationFrame(animationLoop);
}

// Render beat UI updates and evaluate collision game logic
function triggerVisualBeat(beat) {
    polesOpen = (beat === 1);

    // Auto-AI Hop Mode actions
    if (autoAiHopMode && gameState === 'PLAYING') {
        if (beat === 1) {
            setDancerPosition('center');
        } else if (beat === 2) {
            const side = Math.random() > 0.5 ? 'left' : 'right';
            setDancerPosition(side);
        }
    }

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
            // Open state: dancer should be CENTER (inside)
            if (dancerPosition === 'center') {
                streak++;
                score += 10 + Math.floor(streak / 5);
                scoreVal.textContent = score;
                if (streakVal) streakVal.textContent = streak;
                playScoreChime();
            } else {
                // If they stayed outside during open state, no penalty but break streak
                streak = 0;
                if (streakVal) streakVal.textContent = streak;
            }
        } else {
            // Closed state (beat 2 or 3): dancer should be LEFT or RIGHT (outside)
            if (dancerPosition === 'center') {
                // Caught! Deduct life and break streak
                lives--;
                streak = 0;
                livesVal.textContent = '❤️'.repeat(Math.max(0, lives));
                if (streakVal) streakVal.textContent = streak;

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
                streak++;
                score += 5 + Math.floor(streak / 5);
                scoreVal.textContent = score;
                if (streakVal) streakVal.textContent = streak;
            }
        }
    }
}

/* ====================================================
   ESP32/ESP8266 HARDWARE COMMUNICATION & LED CONTROLLER
   ==================================================== */

let espIp = '192.168.0.110';
let espProtocol = 'HTTP'; // 'HTTP', 'WEBSOCKET', 'SERIAL'
let espMode = 'SLOW';     // 'FAST', 'SLOW'

let webSocketConn = null;
let serialPort = null;
let serialWriter = null;

// ESP DOM Elements
let btnFastMode, btnSlowMode;
let espIpInput, espProtocolSelect, btnTestEsp;
let terminalLog, btnClearLog, statusPill, statusText;
let lightbulbGlow, virtualLightbulb, lightbulbStatusMode, lightbulbStatusState;
let codeModal, btnOpenCodeModal, btnCloseCodeModal, btnCopyCode;

// Initialize ESP32/ESP8266 controls when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    btnFastMode = document.getElementById('btn-mode-fast');
    btnSlowMode = document.getElementById('btn-mode-slow');
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

// Set Active Mode (FAST or SLOW) and transmit to ESP board
function setEspMode(mode) {
    espMode = mode;

    if (btnFastMode) btnFastMode.classList.remove('active');
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

    // If camera stream is already running, avoid renegotiating device access
    if (gestureVideoElement && gestureVideoElement.srcObject && cameraHelper) {
        if (gestureLoadingOverlay) {
            gestureLoadingOverlay.style.display = 'none';
        }
        // Enable Start button once camera is ready
        if (overlayBtn) {
            overlayBtn.removeAttribute('disabled');
            overlayBtn.style.opacity = '1';
            overlayBtn.style.pointerEvents = 'auto';
        }
        if (overlayBtnCamera) {
            overlayBtnCamera.innerHTML = '✅ Camera Active';
            overlayBtnCamera.setAttribute('disabled', 'true');
            overlayBtnCamera.style.opacity = '0.7';
            overlayBtnCamera.style.pointerEvents = 'none';
        }
        logTerminal('[GESTURE] Re-attached to active background camera stream.', 'success');
        return;
    }

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

            // Enable Start button once camera is ready
            if (overlayBtn) {
                overlayBtn.removeAttribute('disabled');
                overlayBtn.style.opacity = '1';
                overlayBtn.style.pointerEvents = 'auto';
            }
            if (overlayBtnCamera) {
                overlayBtnCamera.innerHTML = '✅ Camera Active';
                overlayBtnCamera.setAttribute('disabled', 'true');
                overlayBtnCamera.style.opacity = '0.7';
                overlayBtnCamera.style.pointerEvents = 'none';
            }
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
    logTerminal('[GESTURE] Hand gesture tracking paused (camera remains active in background).', 'info');
    
    // Hide video container overlay
    const container = document.getElementById('gesture-webcam-container');
    if (container) container.style.display = 'none';

    // NOTE: We keep the camera stream active in the background to avoid 
    // browser renegotiation and device warm-up lag on game retries.
    
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

    // Clear and draw video frame (mirrored visually for natural interface)
    gestureCanvasCtx.save();
    gestureCanvasCtx.clearRect(0, 0, gestureCanvasElement.width, gestureCanvasElement.height);
    gestureCanvasCtx.translate(gestureCanvasElement.width, 0);
    gestureCanvasCtx.scale(-1, 1);
    gestureCanvasCtx.drawImage(results.image, 0, 0, gestureCanvasElement.width, gestureCanvasElement.height);

    let gestureText = 'NO HAND DETECTED';
    let gestureClass = 'gesture-indicator';

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Draw custom skeleton lines and dots (will also be mirrored automatically)
        drawHandSkeleton(gestureCanvasCtx, landmarks, gestureCanvasElement.width, gestureCanvasElement.height);

        // Vector from Index Knuckle (5) to Index Tip (8)
        const diffX = landmarks[8].x - landmarks[5].x;
        const diffY = landmarks[8].y - landmarks[5].y;
        const indexDist = Math.sqrt(diffX * diffX + diffY * diffY);

        const isPointing = indexDist > 0.06; // Index finger is extended

        if (isPointing && Math.abs(diffX) > Math.abs(diffY) * 1.1) {
            // Swapped mapping to match physical hand directions with the mirrored canvas view
            if (diffX < -0.03) {
                gestureText = '👉 POINT RIGHT (RIGHT)';
                gestureClass = 'gesture-indicator detected-outside';
                if (gameState === 'PLAYING') {
                    setDancerPosition('right');
                }
            } else if (diffX > 0.03) {
                gestureText = '👈 POINT LEFT (LEFT)';
                gestureClass = 'gesture-indicator detected-outside';
                if (gameState === 'PLAYING') {
                    setDancerPosition('left');
                }
            } else {
                gestureText = '👇 CENTER (INSIDE)';
                gestureClass = 'gesture-indicator detected-inside';
                if (gameState === 'PLAYING') {
                    setDancerPosition('center');
                }
            }
        } else {
            // Open palm or fist or pointing up/down -> CENTER
            gestureText = '👇 CENTER (INSIDE)';
            gestureClass = 'gesture-indicator detected-inside';
            if (gameState === 'PLAYING') {
                setDancerPosition('center');
            }
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

// Render Chibi Avatar on HTML5 Canvas
function renderCanvasAvatar() {
    if (!avatarCtx || !avatarCanvas) return;

    const w = avatarCanvas.width;
    const h = avatarCanvas.height;

    // Smooth horizontal position interpolation
    let targetX = w / 2; // center
    if (dancerPosition === 'left') {
        targetX = w / 2 - 160;
    } else if (dancerPosition === 'right') {
        targetX = w / 2 + 160;
    }
    canvasDancerX += (targetX - canvasDancerX) * 0.18;

    // Smooth gravity for jumps
    if (canvasDancerYOffset < 0) {
        canvasDancerYOffset += 1.5;
    } else {
        canvasDancerYOffset = 0;
    }

    // Smooth bamboo poles sliding transition
    const targetPolesVal = polesOpen ? 1.0 : 0.0;
    canvasPolesTransition += (targetPolesVal - canvasPolesTransition) * 0.25;

    // 1. Clear & Stage Background
    const bgGrad = avatarCtx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0f0a06');
    bgGrad.addColorStop(0.5, '#120c08');
    bgGrad.addColorStop(1, '#1c120c');
    avatarCtx.fillStyle = bgGrad;
    avatarCtx.fillRect(0, 0, w, h);

    // Stage Radial Glow
    const glowGrad = avatarCtx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 280);
    glowGrad.addColorStop(0, polesOpen ? 'rgba(46, 204, 113, 0.15)' : 'rgba(211, 84, 0, 0.2)');
    glowGrad.addColorStop(1, 'transparent');
    avatarCtx.fillStyle = glowGrad;
    avatarCtx.fillRect(0, 0, w, h);

    // Floor Line
    avatarCtx.strokeStyle = 'rgba(211, 84, 0, 0.25)';
    avatarCtx.lineWidth = 2;
    avatarCtx.beginPath();
    avatarCtx.moveTo(40, h - 80);
    avatarCtx.lineTo(w - 40, h - 80);
    avatarCtx.stroke();

    // 2. Draw Two Vertical Bamboo Poles (Sliding Horizontally)
    const poleWidth = 24;
    const poleHeight = h - 100;
    const poleY = 20;

    const leftPoleX = (w / 2 - poleWidth) - (canvasPolesTransition * 80);
    const rightPoleX = (w / 2) + (canvasPolesTransition * 80);

    drawVerticalBambooPole(avatarCtx, leftPoleX, poleY, poleWidth, poleHeight, polesOpen);
    drawVerticalBambooPole(avatarCtx, rightPoleX, poleY, poleWidth, poleHeight, polesOpen);

    // 3. Draw Chibi Dancer Avatar
    if (!blindfoldMode) {
        const isInside = (dancerPosition === 'center');
        const dancerY = h - 115 + canvasDancerYOffset;
        drawDancerAvatar(avatarCtx, canvasDancerX, dancerY, isInside, polesOpen);
    } else {
        // Blindfold Mode Overlay inside canvas
        avatarCtx.fillStyle = 'rgba(10, 8, 7, 0.95)';
        avatarCtx.fillRect(20, 20, w - 40, h - 40);

        avatarCtx.strokeStyle = 'var(--primary)';
        avatarCtx.lineWidth = 3;
        avatarCtx.strokeRect(20, 20, w - 40, h - 40);

        avatarCtx.fillStyle = 'var(--text-main)';
        avatarCtx.font = 'bold 22px "Outfit", sans-serif';
        avatarCtx.textAlign = 'center';
        avatarCtx.fillText('🙈 BLINDFOLD MODE ACTIVE', w / 2, h / 2 - 20);

        avatarCtx.fillStyle = 'var(--accent)';
        avatarCtx.font = '14px "Plus Jakarta Sans", sans-serif';
        avatarCtx.fillText('Listen to the gongs & clack rhythm. Press SPACE to hop!', w / 2, h / 2 + 15);
    }

    // Game Over Overlay inside canvas
    if (gameState === 'GAME_OVER') {
        avatarCtx.fillStyle = 'rgba(10, 8, 7, 0.85)';
        avatarCtx.fillRect(0, 0, w, h);

        avatarCtx.fillStyle = '#e74c3c';
        avatarCtx.font = 'bold 36px "Outfit", sans-serif';
        avatarCtx.textAlign = 'center';
        avatarCtx.fillText('💥 caught! GAME OVER', w / 2, h / 2 - 20);

        avatarCtx.fillStyle = 'var(--text-main)';
        avatarCtx.font = '16px "Plus Jakarta Sans", sans-serif';
        avatarCtx.fillText(`Final Score: ${score}  |  Click "Start Dancing" to Retry`, w / 2, h / 2 + 25);
    }
}

// Draw Vertical 3D Bamboo Pole Helper
function drawVerticalBambooPole(ctx, x, y, width, height, isOpen) {
    const grad = ctx.createLinearGradient(x, y, x + width, y);
    grad.addColorStop(0, '#a3e635');
    grad.addColorStop(0.5, '#65a30d');
    grad.addColorStop(1, '#365314');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 10);
    ctx.fill();

    ctx.strokeStyle = '#4d7c0f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Node markings (horizontal lines on the vertical pole)
    ctx.fillStyle = '#365314';
    for (let i = 1; i <= 6; i++) {
        const nodeY = y + (height / 7) * i;
        ctx.fillRect(x, nodeY, width, 4);
    }
}

// Draw Chibi Dancer Avatar helper
function drawDancerAvatar(ctx, x, y, isInside, isOpen) {
    ctx.save();
    ctx.translate(x, y);

    // Chibi Head Base
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.ellipse(0, -35, 24, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eye Color Selection
    let eyeHex = '#78350f';
    if (avatarState.eyes === 'blue') eyeHex = '#2563eb';
    if (avatarState.eyes === 'black') eyeHex = '#18181b';
    if (avatarState.eyes === 'amber') eyeHex = '#d97706';

    // Eyes
    ctx.fillStyle = eyeHex;
    ctx.beginPath();
    ctx.ellipse(-8, -36, 4, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(8, -36, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-9, -38, 1.5, 0, Math.PI * 2);
    ctx.arc(7, -38, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Blush Cheeks
    ctx.fillStyle = 'rgba(244, 114, 182, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-14, -30, 4, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(14, -30, 4, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair Style Choice
    let hairColorHex = '#18181b';
    if (avatarState.hairColor === 'chocolate') hairColorHex = '#451a03';
    if (avatarState.hairColor === 'gold') hairColorHex = '#f59e0b';
    if (avatarState.hairColor === 'white') hairColorHex = '#ffffff';

    ctx.fillStyle = hairColorHex;
    if (avatarState.hair === 'bun') {
        ctx.beginPath();
        ctx.arc(0, -42, 22, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -56, 10, 0, Math.PI * 2);
        ctx.fill();
    } else if (avatarState.hair === 'hime') {
        ctx.beginPath();
        ctx.arc(0, -42, 22, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-22, -42, 6, 30);
        ctx.fillRect(16, -42, 6, 30);
    } else if (avatarState.hair === 'spiky') {
        ctx.beginPath();
        ctx.moveTo(-22, -40); ctx.lineTo(-14, -58); ctx.lineTo(-4, -45);
        ctx.lineTo(4, -62); ctx.lineTo(14, -45); ctx.lineTo(22, -40);
        ctx.fill();
    } else if (avatarState.hair === 'braids') {
        ctx.beginPath();
        ctx.arc(0, -42, 22, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-22, -42, 5, 40);
        ctx.fillRect(17, -42, 5, 40);
    } else {
        // Bald or No Hair
    }

    // Headwear Feathers / Crown
    if (avatarState.headwear === 'sugu') {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-5, -55); ctx.lineTo(-15, -78);
        ctx.moveTo(0, -55); ctx.lineTo(0, -84);
        ctx.moveTo(5, -55); ctx.lineTo(15, -78);
        ctx.stroke();
    } else if (avatarState.headwear === 'sinakapan') {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-18, -48, 36, 6);
    } else if (avatarState.headwear === 'togung') {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -55); ctx.lineTo(12, -82);
        ctx.stroke();
    }

    // Outfit Clothing Selection
    let outfitColor = '#1e1b4b'; // Pinongkolo
    let beadColor = '#ef4444';
    if (avatarState.clothing === 'warrior') { outfitColor = '#18181b'; beadColor = '#2563eb'; }
    if (avatarState.clothing === 'bark') { outfitColor = '#78350f'; beadColor = '#d97706'; }
    if (avatarState.clothing === 'harvest') { outfitColor = '#991b1b'; beadColor = '#f59e0b'; }

    ctx.fillStyle = outfitColor;
    ctx.beginPath();
    ctx.roundRect(-14, -12, 28, 24, 6);
    ctx.fill();

    // Rarik Bead Accent
    ctx.fillStyle = beadColor;
    ctx.fillRect(-10, -6, 20, 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-10, 2, 20, 4);

    // Silver Coin Belt
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-12, 8, 24, 3);

    // Arms
    ctx.strokeStyle = '#ffedd5';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, -10);
    ctx.lineTo(-24, isInside ? -25 : -5);
    ctx.moveTo(14, -10);
    ctx.lineTo(24, isInside ? -25 : -5);
    ctx.stroke();

    // Feet
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(-8, 16, 5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(8, 16, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Prop Weapon / Shield
    if (avatarState.prop === 'kliau') {
        ctx.fillStyle = '#991b1b';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(18, -10);
        ctx.lineTo(32, -28);
        ctx.lineTo(26, 12);
        ctx.lineTo(12, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    ctx.restore();
}

// Render Chibi Avatar on the standalone Customizer Preview Canvas
function renderCustomizerPreview() {
    if (!customizerCtx || !customizerCanvas) return;

    const w = customizerCanvas.width;
    const h = customizerCanvas.height;

    // Clear background with a subtle dark gradient
    const bgGrad = customizerCtx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#120c08');
    bgGrad.addColorStop(1, '#0c0704');
    customizerCtx.fillStyle = bgGrad;
    customizerCtx.fillRect(0, 0, w, h);

    // Decorative grid circles / stage light
    const glowGrad = customizerCtx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, 180);
    glowGrad.addColorStop(0, 'rgba(211, 84, 0, 0.15)');
    glowGrad.addColorStop(1, 'transparent');
    customizerCtx.fillStyle = glowGrad;
    customizerCtx.fillRect(0, 0, w, h);

    // Platform base / floor line
    customizerCtx.fillStyle = 'rgba(211, 84, 0, 0.1)';
    customizerCtx.beginPath();
    customizerCtx.ellipse(w / 2, h - 100, 80, 20, 0, 0, Math.PI * 2);
    customizerCtx.fill();
    customizerCtx.strokeStyle = 'rgba(211, 84, 0, 0.4)';
    customizerCtx.lineWidth = 1.5;
    customizerCtx.stroke();

    // Idle breathing offset: bob up and down smoothly over time
    const breathingOffset = Math.sin(Date.now() / 280) * 4;

    // Draw Chibi Dancer in center
    const dancerY = h - 145 + breathingOffset;
    drawDancerAvatar(customizerCtx, w / 2, dancerY, true, true);
}

