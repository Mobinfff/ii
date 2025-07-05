document.addEventListener('DOMContentLoaded', () => {
    const nameModal = document.getElementById('name-modal');
    const chatContainer = document.getElementById('chat-container');
    const nameInput = document.getElementById('name-input');
    const submitNameBtn = document.getElementById('submit-name-btn');
    const userNameDisplay = document.getElementById('user-name-display');
    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message-btn');

    const GEMINI_API_KEY = 'AIzaSyAX6b08Fl_ksi6G02yjALPO5cyPO36981o'; // کلید API جدید شما
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    let userName = '';
    let conversationHistory = []; // برای ذخیره تاریخچه مکالمه برای ارسال به Gemini

    const CHAT_HISTORY_KEY = 'geminiChatHistory';
    const USER_NAME_KEY = 'geminiChatUserName';

    // بارگذاری تاریخچه و نام کاربر از localStorage
    function loadChatState() {
        const storedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
        const storedUserName = localStorage.getItem(USER_NAME_KEY);

        if (storedUserName) {
            userName = storedUserName;
            userNameDisplay.textContent = userName;
            nameModal.classList.add('hidden');
            chatContainer.classList.remove('hidden');

            if (storedHistory) {
                conversationHistory = JSON.parse(storedHistory);
                conversationHistory.forEach(item => {
                    // پیام‌های اولیه سیستمی که قبلا در تاریخچه بودند را دوباره اضافه نمی‌کنیم
                    // فقط پیام های واقعی کاربر و مدل را نمایش می‌دهیم
                    if (item.role === "user" && item.parts[0].text.startsWith("کاربر جدیدی با نام")) {
                        // این پیام سیستمی است، نمایش نده
                    } else if (item.role === "model" && item.parts[0].text.startsWith("سلام") && item.parts[0].text.includes("خیلی خوشحالم که اینجا هستی")) {
                        // این پیام خوشامدگویی اولیه است، اگر تاریخچه وجود دارد، احتمالا از قبل نمایش داده شده
                        // یا اگر تاریخچه خالی است و فقط نام کاربر ذخیره شده، می‌توانیم یک خوشامدگویی جدید بدهیم
                        if (conversationHistory.length === 0 || (conversationHistory.length > 0 && conversationHistory[conversationHistory.length-1].role === "user")) {
                             addMessageToChatBox(`سلام مجدد ${userName}! آماده گفتگو هستم.`, 'bot', false); // false برای عدم ذخیره مجدد
                        } else if (conversationHistory.length > 0) {
                            addMessageToChatBox(item.parts[0].text, 'bot', false);
                        }
                    }
                    else {
                        addMessageToChatBox(item.parts[0].text, item.role === 'user' ? 'user' : 'bot', false, item.role === 'user' ? userName : undefined);
                    }
                });
                 // اگر تاریخچه خالی بود اما نام کاربر وجود داشت، یک پیام خوشامدگویی نمایش بده
                if (conversationHistory.length === 0) {
                    const welcomeMessage = `سلام مجدد ${userName}! چطور می‌تونم کمکت کنم؟`;
                    addMessageToChatBox(welcomeMessage, 'bot', false); // false برای عدم ذخیره مجدد
                    // لازم نیست پیام خوشامدگویی اولیه را به تاریخچه اضافه کنیم چون در بارگذاری بعدی دوباره ساخته می‌شود
                }

            } else {
                 // اگر تاریخچه نبود ولی نام بود، پیام خوشامدگویی اولیه
                const welcomeMessage = `سلام ${userName}! چطور می‌تونم کمکت کنم؟`;
                addMessageToChatBox(welcomeMessage, 'bot', false);
                // اضافه کردن پیام اولیه مدل به تاریخچه جدید
                // conversationHistory.push({ role: "model", parts: [{ text: welcomeMessage }] });
                // saveChatHistory(); // ذخیره تاریخچه اولیه با پیام خوشامدگویی
            }
        } else {
            nameModal.classList.remove('hidden');
            chatContainer.classList.add('hidden');
        }
    }

    function saveChatHistory() {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversationHistory));
    }

    function saveUserName() {
        localStorage.setItem(USER_NAME_KEY, userName);
    }

    submitNameBtn.addEventListener('click', () => {
        userName = nameInput.value.trim();
        if (userName) {
            saveUserName();
            userNameDisplay.textContent = userName;
            nameModal.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            
            // اگر تاریخچه چت از قبل وجود ندارد، پیام خوشامدگویی و context اولیه را اضافه کن
            if (conversationHistory.length === 0) {
                const welcomeMessage = `سلام ${userName}! چطور می‌تونم کمکت کنم؟`;
                addMessageToChatBox(welcomeMessage, 'bot'); // این پیام به تاریخچه اضافه خواهد شد توسط addMessageToChatBox
                
                // Context اولیه برای جمینای (این در UI نمایش داده نمی‌شود)
                // اما برای شروع مکالمه جدید مهم است
                const initialUserContext = {
                    role: "user",
                    parts: [{ text: `کاربر جدیدی با نام ${userName} وارد چت شد. لطفا به او به فارسی خوش آمد بگو و آماده پاسخگویی به سوالاتش باش. این اولین پیام سیستم به تو است.` }]
                };
                const initialModelResponse = { // پاسخ فرضی مدل به context اولیه
                    role: "model",
                    parts: [{ text: `سلام ${userName}! خیلی خوشحالم که اینجا هستی. من یک مدل زبان بزرگ هستم که توسط گوگل آموزش داده شده‌ام. چطور می‌تونم امروز بهت کمک کنم؟` }]
                };
                // اینها را مستقیما به تاریخچه اضافه می‌کنیم و ذخیره می‌کنیم
                // چون addMessageToChatBox آنها را نمایش می‌دهد
                if(!conversationHistory.find(m => m.role === 'model' && m.parts[0].text.startsWith(`سلام ${userName}! خیلی خوشحالم`))) {
                    conversationHistory.unshift(initialModelResponse); // پاسخ مدل اول بیاید
                    conversationHistory.unshift(initialUserContext); // سپس پیام کاربر اولیه
                    saveChatHistory();
                }
            }

        } else {
            alert('لطفاً نام خود را وارد کنید.');
        }
    });

    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // اولین بار که اسکریپت بارگذاری می‌شود، وضعیت چت را بارگذاری کن
    loadChatState();

    const clearChatBtn = document.getElementById('clear-chat-btn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            const confirmation = confirm("آیا مطمئن هستید که می‌خواهید کل تاریخچه چت و نام کاربری ذخیره شده را پاک کنید؟ این عمل غیرقابل بازگشت است و برنامه دوباره بارگذاری خواهد شد."); // NOSONAR
            if (confirmation) {
                localStorage.removeItem(CHAT_HISTORY_KEY);
                localStorage.removeItem(USER_NAME_KEY);
                conversationHistory = [];
                chatBox.innerHTML = '';
                // نمایش مجدد مودال نام و پنهان کردن چت یا رفرش صفحه
                // nameModal.classList.remove('hidden');
                // chatContainer.classList.add('hidden');
                // userNameDisplay.textContent = '';
                // messageInput.value = '';
                // alert("تاریخچه چت و نام کاربری پاک شد. لطفاً نام جدید خود را وارد کنید یا صفحه را رفرش کنید اگر به صورت خودکار انجام نشد.");
                location.reload(); // ساده ترین راه برای شروع مجدد و تمیز
            }
        });
    }

    // Theme Toggle Functionality
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    const THEME_KEY = 'geminiChatTheme';

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        } else {
            document.body.classList.remove('dark-mode');
            moonIcon.classList.remove('hidden');
            sunIcon.classList.add('hidden');
        }
    }

    function toggleTheme() {
        const currentThemeIsDark = document.body.classList.contains('dark-mode');
        const newTheme = currentThemeIsDark ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, newTheme);
        applyTheme(newTheme);
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Load saved theme on startup
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Optional: Detect system preference if no theme is saved
        // if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        //     applyTheme('dark');
        // } else {
        //     applyTheme('light');
        // }
        applyTheme('light'); // Default to light if nothing is set
    }


    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        addMessageToChatBox(messageText, 'user', true, userName); // true برای ذخیره
        messageInput.value = '';

        // اضافه کردن پیام کاربر به تاریخچه در addMessageToChatBox انجام و ذخیره می‌شود
        // اگر نقش addMessageToChatBox فقط نمایش است، اینجا باید اضافه و ذخیره کنیم:
        // conversationHistory.push({
        //     role: "user",
        //     parts: [{ text: messageText }]
        // });
        // saveChatHistory();


        // نمایش نشانگر تایپ (اختیاری)
        addTypingIndicator();

        // ارسال پیام به Gemini API
        fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: conversationHistory, // ارسال کل تاریخچه
                 "generationConfig": { // تنظیمات تولید محتوا (اختیاری)
                    "temperature": 0.7, // خلاقیت پاسخ (0 تا 1)
                    "topK": 1,
                    "topP": 1,
                    "maxOutputTokens": 2048, // حداکثر تعداد توکن‌های خروجی
                },
                "safetySettings": [ // تنظیمات ایمنی (اختیاری)
                    { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                    { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" },
                    { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE" }
                ]
            }),
        })
        .then(response => {
            if (!response.ok) {
                // خواندن بدنه خطا برای اطلاعات بیشتر
                return response.json().then(errorData => {
                    console.error('Error response from API:', errorData);
                    let errorMessage = `خطا در ارتباط با API: ${response.status}`;
                    if (errorData && errorData.error && errorData.error.message) {
                        errorMessage += ` - ${errorData.error.message}`;
                    }
                    throw new Error(errorMessage);
                });
            }
            return response.json();
        })
        .then(data => {
            removeTypingIndicator(); // حذف نشانگر تایپ
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                const botResponse = data.candidates[0].content.parts[0].text;
                addMessageToChatBox(botResponse, 'bot', true); // true برای ذخیره
                // تاریخچه توسط addMessageToChatBox ذخیره می‌شود
            } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                const blockReason = data.promptFeedback.blockReason;
                const safetyRatings = data.promptFeedback.safetyRatings.map(r => `${r.category}: ${r.probability}`).join(', ');
                const botMessage = `متاسفانه نتوانستم به این درخواست پاسخ دهم زیرا محتوای آن ایمن تشخیص داده نشد. (دلیل: ${blockReason}, امتیازات ایمنی: ${safetyRatings})`;
                addMessageToChatBox(botMessage, 'bot', true); // true برای ذخیره
            } else {
                console.error('Invalid response structure from API:', data);
                addMessageToChatBox('متاسفانه پاسخی از هوش مصنوعی دریافت نشد یا ساختار پاسخ نامعتبر است.', 'bot', true); // true برای ذخیره
            }
        })
        .catch(error => {
            removeTypingIndicator();
            console.error('Error sending message to Gemini API:', error);
            const errorMessage = `خطا: ${error.message}`;
            addMessageToChatBox(errorMessage, 'bot', true); // true برای ذخیره
        });
    }

    function addMessageToChatBox(message, sender, shouldSave = true, senderNameToDisplay = 'هوش مصنوعی') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

        const senderElement = document.createElement('div');
        senderElement.classList.add('sender');
        // اگر پیام از کاربر است، از userName استفاده کن، در غیر این صورت از senderNameToDisplay (که پیش‌فرضش "هوش مصنوعی" است)
        senderElement.textContent = sender === 'user' ? (userName || 'کاربر') : senderNameToDisplay;


        const textElement = document.createElement('div');
        textElement.classList.add('text');
        textElement.textContent = message;

        messageElement.appendChild(senderElement);
        messageElement.appendChild(textElement);

        // Add copy button for bot messages
        if (sender === 'bot' || sender === 'model') { // Gemini API uses 'model'
            const copyBtn = document.createElement('button');
            copyBtn.classList.add('copy-btn');
            copyBtn.setAttribute('aria-label', 'کپی کردن پیام');
            copyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16px" height="16px">
                    <path d="M0 0h24v24H0V0z" fill="none"/>
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
            `;
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent message click if any
                navigator.clipboard.writeText(message)
                    .then(() => {
                        copyBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16px" height="16px">
                            <path d="M0 0h24v24H0V0z" fill="none"/>
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                        `;
                        setTimeout(() => {
                             copyBtn.innerHTML = `
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16px" height="16px">
                                    <path d="M0 0h24v24H0V0z" fill="none"/>
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                            `;
                        }, 1500);
                    })
                    .catch(err => {
                        console.error('Failed to copy text: ', err);
                        // Optionally, provide feedback to the user about the failure
                    });
            });
            messageElement.appendChild(copyBtn);
        }

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;

        // اضافه کردن پیام به تاریخچه و ذخیره آن فقط اگر shouldSave true باشد
        // و پیام از نوعی نباشد که نباید در تاریخچه ذخیره شود (مثل پیام‌های خوشامدگویی که در loadChatState مدیریت می‌شوند)
        if (shouldSave) {
            // جلوگیری از ذخیره پیام‌های سیستمی اولیه یا خوشامدگویی‌هایی که در loadChatState مدیریت می‌شوند
            const isInitialSystemMessage = sender === "user" && message.startsWith("کاربر جدیدی با نام");
            const isInitialWelcomeMessage = sender === "model" && message.startsWith("سلام") && message.includes("خیلی خوشحالم که اینجا هستی");
            
            if (!isInitialSystemMessage && !isInitialWelcomeMessage) {
                conversationHistory.push({
                    role: sender, // 'user' یا 'bot' (که برای جمینای باید 'model' باشد)
                    parts: [{ text: message }]
                });
                saveChatHistory();
            }
        }
    }

    function addTypingIndicator() {
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
        typingIndicator.innerHTML = `
            <div class="sender">هوش مصنوعی</div>
            <div class="text"><em>در حال نوشتن...</em></div>
        `;
        chatBox.appendChild(typingIndicator);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = chatBox.querySelector('.typing-indicator');
        if (typingIndicator) {
            chatBox.removeChild(typingIndicator);
        }
    }
});
