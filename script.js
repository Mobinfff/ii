document.addEventListener('DOMContentLoaded', () => {
    const nameModal = document.getElementById('name-modal');
    const chatContainer = document.getElementById('chat-container');
    const nameInput = document.getElementById('name-input');
    const submitNameBtn = document.getElementById('submit-name-btn');
    const userNameDisplay = document.getElementById('user-name-display');
    const chatBox = document.getElementById('chat-box');
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message-btn');

    const GEMINI_API_KEY = 'AIzaSyD-OsiVoglse9GS0hZ3yUWroUW_MY5uqiE'; // کلید API شما
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;

    let userName = '';
    let conversationHistory = []; // برای ذخیره تاریخچه مکالمه برای ارسال به Gemini

    // نمایش مودال نام در ابتدا
    nameModal.classList.remove('hidden');
    chatContainer.classList.add('hidden');

    submitNameBtn.addEventListener('click', () => {
        userName = nameInput.value.trim();
        if (userName) {
            userNameDisplay.textContent = userName;
            nameModal.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            addMessageToChatBox(`سلام ${userName}! چطور می‌تونم کمکت کنم؟`, 'bot');
            // اضافه کردن پیام اولیه سیستم به تاریخچه
            conversationHistory.push({
                role: "user", // جمینای با اولین پیام کاربر شروع می‌کند
                parts: [{ text: `کاربر جدیدی با نام ${userName} وارد شده است. لطفا به او خوش آمد بگو و آماده پاسخگویی به سوالاتش باش.` }]
            });
             conversationHistory.push({ // پاسخ اولیه مدل
                role: "model",
                parts: [{ text: `سلام ${userName}! خیلی خوشحالم که اینجا هستی. من یک مدل زبان بزرگ هستم که توسط گوگل آموزش دیده‌ام. چطور می‌تونم امروز بهت کمک کنم؟` }]
            });
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

    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText === '') return;

        addMessageToChatBox(messageText, 'user', userName);
        messageInput.value = '';

        // اضافه کردن پیام کاربر به تاریخچه
        conversationHistory.push({
            role: "user",
            parts: [{ text: messageText }]
        });

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
                addMessageToChatBox(botResponse, 'bot');
                // اضافه کردن پاسخ بات به تاریخچه
                conversationHistory.push({
                    role: "model",
                    parts: [{ text: botResponse }]
                });
            } else if (data.promptFeedback && data.promptFeedback.blockReason) {
                // اگر محتوا به دلیل ایمنی بلاک شده باشد
                const blockReason = data.promptFeedback.blockReason;
                const safetyRatings = data.promptFeedback.safetyRatings.map(r => `${r.category}: ${r.probability}`).join(', ');
                addMessageToChatBox(`متاسفانه نتوانستم به این درخواست پاسخ دهم زیرا محتوای آن ایمن تشخیص داده نشد. (دلیل: ${blockReason}, امتیازات ایمنی: ${safetyRatings})`, 'bot');
                 conversationHistory.push({
                    role: "model",
                    parts: [{ text: `متاسفانه نتوانستم به این درخواست پاسخ دهم زیرا محتوای آن ایمن تشخیص داده نشد. (دلیل: ${blockReason})` }]
                });
            }
             else {
                console.error('Invalid response structure from API:', data);
                addMessageToChatBox('متاسفانه پاسخی از هوش مصنوعی دریافت نشد یا ساختار پاسخ نامعتبر است.', 'bot');
                 conversationHistory.push({
                    role: "model",
                    parts: [{ text: 'متاسفانه پاسخی از هوش مصنوعی دریافت نشد یا ساختار پاسخ نامعتبر است.' }]
                });
            }
        })
        .catch(error => {
            removeTypingIndicator(); // حذف نشانگر تایپ
            console.error('Error sending message to Gemini API:', error);
            addMessageToChatBox(`خطا: ${error.message}`, 'bot');
            // در صورت خطا، پیام خطا را به تاریخچه اضافه نکنید یا یک پیام خطای عمومی اضافه کنید
            conversationHistory.push({
                role: "model",
                parts: [{ text: `متاسفانه در پردازش درخواست شما خطایی رخ داد.` }]
            });
        });
    }

    function addMessageToChatBox(message, sender, senderName = 'هوش مصنوعی') {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');

        const senderElement = document.createElement('div');
        senderElement.classList.add('sender');
        senderElement.textContent = sender === 'user' ? senderName : 'هوش مصنوعی';

        const textElement = document.createElement('div');
        textElement.classList.add('text');
        textElement.textContent = message; // برای سادگی، فقط متن نمایش داده می‌شود. برای HTML، از innerHTML استفاده کنید (با احتیاط).

        messageElement.appendChild(senderElement);
        messageElement.appendChild(textElement);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight; // اسکرول به پایین
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
