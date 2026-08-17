// Magunatip AI Chatbot Logic

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatToggleBtn = document.getElementById('chatbot-toggle-btn');
    const chatContainer = document.getElementById('chatbot-container');
    const chatCloseBtn = document.getElementById('chatbot-close-btn');
    const chatSettingsBtn = document.getElementById('chatbot-settings-btn');
    const settingsPanel = document.getElementById('chatbot-settings-panel');
    const saveSettingsBtn = document.getElementById('btn-save-settings');
    const clearSettingsBtn = document.getElementById('btn-clear-settings');
    const apiKeyInput = document.getElementById('gemini-api-key');
    const chatMessages = document.getElementById('chatbot-messages');
    const chatInput = document.getElementById('chatbot-input');
    const chatSendBtn = document.getElementById('chatbot-send-btn');
    const typingIndicator = document.getElementById('chatbot-typing');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');

    // Chat History in memory
    let conversationHistory = [];

    // System instruction for Gemini API
    const systemPrompt = `You are a helpful, premium AI cultural ambassador for the Magunatip bamboo dance of the Murut people of Sabah, Malaysia. 
Your goal is to answer user queries about the dance, its history, steps, attire, music, the website simulator, and the ESP32 microcontroller bridge.
Be polite, engaging, and rich with cultural details. If asked about programming, Arduino, or electronics, explain the ESP32 code structure clearly.

Here is the key context to base your answers on:
- Magunatip is a traditional Sabahan bamboo dance. "atip" means "to pinch" in Murut. Dancers leap between opening/closing bamboo poles.
- Historically, it welcomed victorious Murut warriors, served in spirit healing rituals, and warded off evil spirits. Today, it is cultural pride.
- Steps: Beat 1 is OPEN (poles apart, tap floor; step left foot INSIDE). Beat 2 & 3 are CLOSED (poles clack together; step right foot INSIDE then leap OUTSIDE).
- Attire: Women wear Limpur (hand-beaded black dress). Men wear Kupuo (bark vest) and Pinongkol (feathered headgear). Danced barefoot.
- Music/Instruments: clashing bamboo poles (9-12 ft), Sansaring (small gongs), and Jarang (drums).
- ESP32 Hardware: Pin 23 drives the LED dimmer, Pin 4 & 18 control NeoPixels, Pin 14 (Trig) & 27 (Echo) interface the HC-SR04 ultrasonic distance sensor, I2C SDA is Pin 21 and SCL is Pin 22.
- ESP32 Protocols: Supports HTTP REST GET/POST (endpoint: /led?mode=FAST|SLOW|MEDIUM), WebSockets (port 81), and Web Serial (USB cable, 115200 baud).
- Simulator: Playable in the browser. Space or Arrow keys to jump. Slow speed (110 BPM), Medium (130 BPM), Fast (160 BPM). Match the ESP32 mode.`;

    // Local QA Knowledge Base (for offline/no-API fallback)
    const localKnowledgeBase = [
        {
            keywords: ['what is magunatip', 'about magunatip', 'define magunatip', 'meaning of magunatip', 'what is the dance', 'tell me about magunatip', 'introduce', 'introduction', 'overview', 'summary', 'concept', 'what is it', 'what is this'],
            answer: `<strong>Magunatip</strong> is a traditional bamboo dance of the <strong>Murut people</strong>, one of the major indigenous communities in Sabah, Malaysia. The name comes from the Murut word <em>"atip"</em>, which means "to pinch". This refers to the rhythmic opening and closing of 9-to-12-foot-long bamboo poles. Dancers move gracefully between the clashing poles, requiring excellent agility, footwork, concentration, and timing.`
        },
        {
            keywords: ['history', 'origin', 'past', 'warrior', 'headhunt', 'heal', 'spirit', 'ritual', 'beginning'],
            answer: `Magunatip began as a playful game in paddy fields, but historically grew to be associated with <strong>welcoming victorious warriors</strong> returning from headhunting expeditions, <strong>healing rituals</strong>, and cultural celebrations. The clashing sound of the bamboo poles was believed to scare away evil spirits causing illness and bad luck.`
        },
        {
            keywords: ['step', 'how to dance', 'how do i dance', 'beat', 'feet', 'inside', 'outside', 'open', 'close', 'clack', 'slide'],
            answer: `The Magunatip rhythm is in a 3/4 waltz pattern:<br>
            - <strong>Beat 1 (OPEN):</strong> The poles slide apart and tap the ground. The dancer steps <strong>inside</strong> the poles (usually with the left foot).<br>
            - <strong>Beat 2 (CLOSED):</strong> The poles strike together in the air. The dancer steps <strong>inside</strong> with the right foot and prepares to jump out.<br>
            - <strong>Beat 3 (CLOSED):</strong> The poles remain closed. The dancer must leap <strong>outside</strong> the poles to the left or right to avoid getting their feet caught.`
        },
        {
            keywords: ['attire', 'costume', 'wear', 'clothe', 'dress', 'limpur', 'kupuo', 'pinongkol', 'feather', 'bead'],
            answer: `Dancers wear beautiful traditional Murut garments:<br>
            - <strong>Women:</strong> Wear the <strong>Limpur</strong>, a black dress adorned with colorful, hand-crafted beadwork and embroidery.<br>
            - <strong>Men:</strong> Wear the <strong>Kupuo</strong> (a black bark vest with red/yellow accents), a loincloth, and the <strong>Pinongkol</strong> (feathered headgear).<br>
            Dancers perform completely barefoot to stay agile and avoid slipping on the bamboo.`
        },
        {
            keywords: ['music', 'instrument', 'instruments', 'gong', 'gongs', 'drum', 'drums', 'sansaring', 'jarang', 'bamboo'],
            answer: `Magunatip music is fast-paced and consists of:<br>
            - <strong>Bamboo Clashing:</strong> The core rhythmic beat produced by striking the poles together.<br>
            - <strong>Sansaring:</strong> A set of small traditional brass gongs of different pitches playing a melody.<br>
            - <strong>Jarang:</strong> A single-headed skin drum that sets the deep bass tempo.`
        },
        {
            keywords: ['esp32', 'esp8266', 'led', 'hardware', 'arduino', 'firmware', 'ip', 'pin', 'wifi', 'serial', 'websocket', 'http', 'connection'],
            answer: `The project includes an <strong>ESP32/ESP8266 LED Lightbulb Bridge</strong> firmware:<br>
            - <strong>Pins:</strong> LED dimmer uses <strong>GPIO 23</strong>; NeoPixel strips use <strong>GPIO 4 & 18</strong>; Ultrasonic Sensor uses <strong>GPIO 14 (Trig) & 27 (Echo)</strong>; I2C is set on <strong>GPIO 21 (SDA) & 22 (SCL)</strong>.<br>
            - <strong>Protocols:</strong> Commands are sent via HTTP REST API (port 80 GET requests to <code>/led?mode=MODE</code>), WebSockets (port 81), or Web Serial (USB cable at 115200 baud).<br>
            - <strong>Default IP:</strong> <code>192.168.4.1</code> in Access Point mode.`
        },
        {
            keywords: ['simulator', 'game', 'play', 'control', 'key', 'spacebar', 'arrow', 'lives', 'score', 'bpm', 'speed'],
            answer: `You can play the <strong>Magunatip Dance Simulator</strong> right on this website!<br>
            - <strong>Controls:</strong> Press the <strong>Spacebar</strong>, <strong>Left Arrow</strong>, or <strong>Right Arrow</strong> keys (or click directly on the game screen) to jump inside and outside the bamboo poles.<br>
            - <strong>Gameplay:</strong> You must be <strong>inside</strong> on Beat 1, and <strong>outside</strong> on Beats 2 and 3. You start with 3 lives. Scoring a successful step gives points, while getting caught loses a life.<br>
            - <strong>Tempo:</strong> Adjust between <strong>Slow (110 BPM)</strong>, <strong>Medium (130 BPM)</strong>, and <strong>Fast (160 BPM)</strong>.`
        },
        {
            keywords: ['similar', 'other dance', 'tinikling', 'cheraw', 'bamboo dance', 'compare', 'philippines', 'india', 'difference'],
            answer: `Yes, there are several traditional bamboo dances similar to Magunatip across Southeast Asia and beyond:<br>
            - <strong>Tinikling (Philippines):</strong> The national dance of the Philippines, where dancers imitate the tikling bird stepping over bamboo traps. It shares the same basic clashing rhythm but has different attire and footwork.<br>
            - <strong>Cheraw Dance (Mizoram, India):</strong> A traditional Indian bamboo dance performed during festivals.<br>
            While they look similar, Magunatip is unique to the <strong>Murut people of Sabah</strong>, historically performed to welcome warriors and heal the sick.`
        },
        {
            keywords: ['hello', 'hi', 'hey', 'greetings', 'yo'],
            answer: `Selamat Datang! Hello there! I am the Murut Cultural Bot. How can I help you discover the magic of the Magunatip dance today?`
        }
    ];

    // Load API Key from localStorage
    let apiKey = localStorage.getItem('gemini_api_key') || '';
    let apiModel = localStorage.getItem('gemini_api_model') || 'gemini-3-flash-preview';
    let apiVersion = localStorage.getItem('gemini_api_version') || 'v1beta';

    const apiModelInput = document.getElementById('gemini-api-model');
    const apiVersionInput = document.getElementById('gemini-api-version');

    if (apiKey && apiKeyInput) {
        apiKeyInput.value = apiKey;
    }
    if (apiModel && apiModelInput) {
        apiModelInput.value = apiModel;
    }
    if (apiVersion && apiVersionInput) {
        apiVersionInput.value = apiVersion;
    }

    // Toggle Chat Panel visibility
    chatToggleBtn.addEventListener('click', () => {
        if (chatContainer.style.display === 'none') {
            chatContainer.style.display = 'flex';
            chatInput.focus();
            scrollToBottom();
        } else {
            chatContainer.style.display = 'none';
        }
    });

    chatCloseBtn.addEventListener('click', () => {
        chatContainer.style.display = 'none';
    });

    // Toggle Settings Panel
    chatSettingsBtn.addEventListener('click', () => {
        if (settingsPanel.style.display === 'none') {
            settingsPanel.style.display = 'flex';
            apiKeyInput.focus();
        } else {
            settingsPanel.style.display = 'none';
        }
    });

    // Save Settings
    saveSettingsBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        const model = apiModelInput ? apiModelInput.value : 'gemini-3-flash-preview';
        const version = apiVersionInput ? apiVersionInput.value : 'v1beta';

        if (key) {
            apiKey = key;
            apiModel = model;
            apiVersion = version;
            localStorage.setItem('gemini_api_key', key);
            localStorage.setItem('gemini_api_model', model);
            localStorage.setItem('gemini_api_version', version);
            addMessage('System', `Settings saved successfully. Model set to <strong>${model}</strong> (${version}).`, 'bot-message');
            settingsPanel.style.display = 'none';
        } else {
            addMessage('System', 'Please enter a valid API key.', 'bot-message');
        }
    });

    // Clear Settings
    clearSettingsBtn.addEventListener('click', () => {
        apiKey = '';
        apiModel = 'gemini-3-flash-preview';
        apiVersion = 'v1beta';
        apiKeyInput.value = '';
        if (apiModelInput) apiModelInput.value = 'gemini-3-flash-preview';
        if (apiVersionInput) apiVersionInput.value = 'v1beta';
        localStorage.removeItem('gemini_api_key');
        localStorage.removeItem('gemini_api_model');
        localStorage.removeItem('gemini_api_version');
        addMessage('System', 'API Key and settings cleared. The bot has reverted back to the local smart response engine.', 'bot-message');
        settingsPanel.style.display = 'none';
    });

    // Send Message on click
    chatSendBtn.addEventListener('click', () => {
        handleUserMessage();
    });

    // Send Message on Enter key
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleUserMessage();
        }
    });

    // Suggestion chips handler
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const queryText = chip.textContent;
            chatInput.value = queryText;
            handleUserMessage();
        });
    });

    // Handle incoming user messages
    function handleUserMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Render user message on screen
        addMessage('You', text, 'user-message');
        chatInput.value = '';

        // Add to history
        conversationHistory.push({ role: 'user', content: text });

        // Show typing indicator
        showTyping(true);

        // Determine AI response engine
        if (apiKey) {
            getGeminiResponse(text);
        } else {
            getLocalResponse(text);
        }
    }

    // Local smart Q&A search matching engine
    function getLocalResponse(queryText) {
        setTimeout(() => {
            const normalizedText = queryText.toLowerCase().replace(/[^\w\s]/g, '');
            let matchedAnswer = null;
            let highestScore = 0;

            // Smart keyword matching with phrase-length scaling and word boundary safety checks
            localKnowledgeBase.forEach(item => {
                let score = 0;
                item.keywords.forEach(keyword => {
                    // Match using word boundaries to prevent substring collisions (like "ip" in "magunatip")
                    const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const regex = new RegExp('\\b' + escapedKeyword + '\\b', 'i');
                    if (regex.test(queryText)) {
                        score += keyword.split(' ').length;
                    }
                });
                if (score > highestScore) {
                    highestScore = score;
                    matchedAnswer = item.answer;
                }
            });

            // Fallback search if no specific keyword matches: check if it's general query about magunatip/dance
            if (highestScore === 0) {
                if (normalizedText.includes('magunatip') || normalizedText.includes('dance')) {
                    matchedAnswer = localKnowledgeBase[0].answer;
                    highestScore = 1;
                }
            }

            let finalReply = '';
            if (highestScore >= 0.5 && matchedAnswer) {
                finalReply = matchedAnswer;
            } else {
                finalReply = `I am not sure I understand that query fully. Since I am in offline local mode, I only know specific topics. Ask me about:<br>
                - <strong>The History:</strong> the origins, Murut warrior rituals, healing.<br>
                - <strong>The Dance Steps:</strong> beats, how to jump in/out.<br>
                - <strong>Attire:</strong> traditional Limpur dress or Kupuo vest.<br>
                - <strong>Music & Instruments:</strong> gongs (Sansaring), drums (Jarang).<br>
                - <strong>ESP32 Hardware:</strong> pin configurations or web REST API settings.<br>
                - <strong>Simulator Game:</strong> keyboard controls and rules.<br><br>
                <em>Tip: You can add your Gemini API Key in the chat settings (⚙️) to unlock full natural language AI capability!</em>`;
            }

            // Render Bot Message
            addMessage('Bot', finalReply, 'bot-message');
            conversationHistory.push({ role: 'assistant', content: finalReply });
            showTyping(false);
        }, 1000 + Math.random() * 500); // 1 to 1.5s typing delay simulation
    }

    // Live Gemini API request handler
    async function getGeminiResponse(queryText) {
        const endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${apiModel}:generateContent?key=${apiKey}`;
        
        // Build contents array using conversational history (limit to last 6 messages to stay fast)
        const recentHistory = conversationHistory.slice(-6);
        const contents = recentHistory.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        const requestBody = {
            contents: contents,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 250
            }
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || `HTTP ${response.status}`);
            }

            const responseData = await response.json();
            let aiText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            
            if (!aiText) {
                throw new Error('Received empty response from Gemini API.');
            }

            // Convert simple markdown styling from Gemini back to HTML
            aiText = formatMarkdown(aiText);

            addMessage('Bot', aiText, 'bot-message');
            conversationHistory.push({ role: 'assistant', content: aiText });
        } catch (error) {
            console.error('Gemini API Error:', error);
            const errReply = `⚠️ <strong>Gemini API Error:</strong> ${error.message}<br><br>
            Please check that your API key is correct and you have an active internet connection. Falling back to the offline response:<br><br>` + 
            getOfflineFallbackAnswer(queryText);
            
            addMessage('Bot', errReply, 'bot-message');
        } finally {
            showTyping(false);
        }
    }

    // Simple markdown formatting helper
    function formatMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    // Synchronous fallback text extraction for when API errors out
    function getOfflineFallbackAnswer(queryText) {
        const normalizedText = queryText.toLowerCase().replace(/[^\w\s]/g, '');
        let matchedAnswer = null;
        let highestScore = 0;

        localKnowledgeBase.forEach(item => {
            let score = 0;
            item.keywords.forEach(keyword => {
                const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp('\\b' + escapedKeyword + '\\b', 'i');
                if (regex.test(queryText)) {
                    score += keyword.split(' ').length;
                }
            });
            if (score > highestScore) {
                highestScore = score;
                matchedAnswer = item.answer;
            }
        });

        if (highestScore === 0) {
            if (normalizedText.includes('magunatip') || normalizedText.includes('dance')) {
                return localKnowledgeBase[0].answer;
            }
        }

        if (highestScore >= 0.5 && matchedAnswer) {
            return matchedAnswer;
        }
        return `I couldn't generate a local answer for that. Please ask about Magunatip's history, steps, attire, music instruments, or ESP32 pins.`;
    }

    // Toggle typing indicator visibility
    function showTyping(visible) {
        if (visible) {
            typingIndicator.style.display = 'flex';
        } else {
            typingIndicator.style.display = 'none';
        }
        scrollToBottom();
    }

    // Render message in chat messages window
    function addMessage(sender, text, className) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${className}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = text;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        scrollToBottom();
    }

    // Smooth scroll to the bottom of the message container
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
