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
- Origins & Identity: Magunatip (also known as the Bamboo Dance) is a highly energetic traditional dance of the Murut ethnic group, an indigenous community from the interior districts of Sabah, Malaysia (such as Tenom and Keningau). The name derives from the Murut word "atip", which means "to press between two surfaces" or "to pinch," referring to the clapping bamboo poles that dancers must navigate.
- History & Original Purpose: Historically, Magunatip was a warrior dance performed to celebrate the victorious return of Murut headhunters. The loud smacking of the bamboo was also believed to ward off evil spirits (Rogh) and was used in healing rituals like the Mansilad or Angkalatung ceremonies (historically led by priestesses/Babalian). According to oral tradition, however, the concept actually began as a prank among farmers who would try to trip each other with bamboo poles during breaks from pounding paddy.
- Performance & Mechanics: The dance requires extreme agility, precision, and timing. Dancers must jump in and out of the clapping bamboo poles as the tempo steadily increases. If they miscalculate, they risk having their ankles severely bruised or clipped. The dance actually generates its own rhythm from the thumping of the bamboo, but it is typically accompanied by a drum (tambor or Jarang) and gongs (Sansaring). Often, a performance features women performing the graceful Anggalang dance before the men execute the intense Mahihialang sequence.
- Costumes & Props: Male dancers wear a bark vest and loincloth made from the Aputul (Artocarpus Kunstleri) tree, elaborate feathered headgear (Lalandau), and often carry a wooden shield (Kolid or Kliau) and a machete (Hayang) or spear to symbolize their warrior heritage. Female dancers wear a beautiful, heavily embroidered and beaded traditional dress called Pinongkolo, paired with a waist accessory called a Pipirot. Dancers perform barefoot.
- Modern Day Context: Today, Magunatip is no longer associated with headhunting or pagan rituals. It is proudly preserved as a cultural heritage and is performed during major social occasions, weddings, and especially during the Kaamatan (Harvest) Festival in May. It is also a popular highlight in cultural villages and tourism shows across Sabah.
- Simulator: Playable in the browser. Controls are strictly restricted to webcam hand gestures (pointing left, right, or down) to change positions. Keyboard arrow/click movements are disabled. Separate "Enable Camera" and "Start Dancing" buttons are used on the start overlay to avoid warmup lag.
- ESP32 Hardware & Protocols: LED dimmer uses GPIO 23, NeoPixel strips use GPIO 4 & 18. Supports REST API HTTP /led?mode=FAST|SLOW, WebSockets (port 81), and USB Web Serial.`;

    // Local QA Knowledge Base (for offline/no-API fallback)
    const localKnowledgeBase = [
        {
            keywords: ['what is magunatip', 'about magunatip', 'define magunatip', 'meaning of magunatip', 'what is the dance', 'ethnic group', 'origin', 'where does it originate', 'sabah', 'murut', 'tenom', 'keningau'],
            answer: `<strong>Magunatip</strong> (also known as the Bamboo Dance) is a highly energetic traditional dance of the <strong>Murut ethnic group</strong>, an indigenous community from the interior districts of Sabah, Malaysia (such as Tenom and Keningau). The name derives from the Murut word <em>"atip"</em>, which means "to press between two surfaces" or "to pinch," referring to the clapping bamboo poles that dancers must navigate.`
        },
        {
            keywords: ['why was it performed', 'warrior', 'headhunter', 'spirit', 'heal', 'ritual', 'mansilad', 'angkalatung', 'paddy', 'farmers', 'prank', 'history', 'origin', 'past', 'how did it start'],
            answer: `Historically, Magunatip was a warrior dance performed to celebrate the <strong>victorious return of Murut headhunters</strong>. The loud smacking of the bamboo was also believed to ward off evil spirits and was used in healing rituals like the <em>Mansilad</em> or <em>Angkalatung</em> ceremonies. According to oral tradition, however, the concept actually began as a <strong>prank among farmers</strong> who would try to trip each other with bamboo poles during breaks from pounding paddy.`
        },
        {
            keywords: ['hurt', 'get hurt', 'dangerous', 'danger', 'music', 'instrument', 'instruments', 'drum', 'gong', 'sansaring', 'jarang', 'tambor', 'men and women', 'anggalang', 'mahihialang', 'role', 'how to dance', 'timing', 'clash'],
            answer: `The dance requires <strong>extreme agility, precision, and timing</strong>. Dancers must jump in and out of the clapping bamboo poles as the tempo steadily increases. If they miscalculate, they risk having their ankles severely bruised or clipped. The dance actually generates its own rhythm from the thumping of the bamboo, but it is typically accompanied by a drum (<em>tambor</em> or <em>Jarang</em>) and gongs (<em>Sansaring</em>). Often, a performance features women performing the graceful <strong>Anggalang</strong> dance before the men execute the intense <strong>Mahihialang</strong> sequence.`
        },
        {
            keywords: ['costume', 'wear', 'clothe', 'dress', 'men wear', 'women wear', 'shield', 'sword', 'aputul', 'bark', 'vest', 'loincloth', 'lalandau', 'feather', 'kolid', 'machete', 'hayang', 'pinongkolo', 'pipirot', 'bead', 'embroidery'],
            answer: `Dancers wear striking traditional regalia:<br>
            - <strong>Men:</strong> Wear a bark vest and loincloth made from the <strong>Aputul</strong> (Artocarpus Kunstleri) tree, elaborate feathered headgear (<strong>Lalandau</strong>), and often carry a wooden shield (<strong>Kolid</strong>) and a machete (<strong>Hayang</strong>) or spear to symbolize warrior heritage.<br>
            - <strong>Women:</strong> Wear a beautiful, heavily embroidered and beaded traditional dress called <strong>Pinongkolo</strong>, paired with a waist accessory called a <strong>Pipirot</strong>.<br>
            Dancers perform completely barefoot.`
        },
        {
            keywords: ['see the dance today', 'modern', 'headhunting today', 'ritual today', 'kaamatan', 'festival', 'harvest', 'wedding', 'social', 'tourist', 'cultural village'],
            answer: `Today, Magunatip is no longer associated with headhunting or pagan rituals. It is proudly preserved as a <strong>cultural heritage</strong> and is performed during major social occasions, weddings, and especially during the <strong>Kaamatan (Harvest) Festival</strong> in May. It is also a popular highlight in cultural villages and tourism shows across Sabah.`
        },
        {
            keywords: ['simulator', 'game', 'play', 'control', 'speed', 'camera', 'gesture', 'webcam', 'hand', 'lag', 'warmup'],
            answer: `You can play the premium <strong>Magunatip Dance Simulator</strong> right on this website!<br>
            - <strong>Controls:</strong> Strictly controlled using <strong>camera hand gestures</strong>. Point index finger left, right, or down to move. Keyboard arrows and clicks are disabled.<br>
            - <strong>Webcam Warmup:</strong> Use the separate <strong>"Enable Camera"</strong> button on the start screen to pre-warm the hand tracker in the background. Once active, the <strong>"Start Dancing"</strong> button unlocks, giving you zero startup lag!`
        },
        {
            keywords: ['esp32', 'esp8266', 'led', 'hardware', 'arduino', 'firmware', 'ip', 'pin', 'wifi', 'serial', 'websocket', 'http', 'connection'],
            answer: `The project includes an <strong>ESP32/ESP8266 LED Lightbulb Bridge</strong> firmware:<br>
            - <strong>Pins:</strong> LED dimmer uses <strong>GPIO 23</strong>; NeoPixel strips use <strong>GPIO 4 & 18</strong>; Ultrasonic Sensor uses <strong>GPIO 14 & 27</strong>.<br>
            - <strong>Protocols:</strong> Commands are sent via HTTP REST API (port 80 GET requests to <code>/led?mode=MODE</code>), WebSockets (port 81), or Web Serial (USB cable at 115200 baud).<br>
            - <strong>Speed presets:</strong> Toggle between <strong>Fast Mode</strong> (clashing) and <strong>Slow Mode</strong> presets.`
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
