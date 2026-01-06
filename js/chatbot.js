// js/chatbot.js - Groq AI Chatbot for Farmers (Updated with Clear Chat)
import config from './config.js';

class FarmChatbot {
    constructor() {
        this.apiKey = config.GROQ_API_KEY; // From config
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions'; // Groq API endpoint


 // Correct model
        this.isOpen = false;
        this.conversation = [];
        this.retryCount = 0;
        this.maxRetries = 2;
        
        // Farming context for better responses
        this.context = `You are "Krishi Mitra" (Farmer's Friend), a helpful AI assistant for Indian farmers.

**CRITICAL RESPONSE FORMATTING RULES:**
1. ALWAYS use clear headings with ## for main sections
2. Use **bold** for important terms and key points
3. Use bullet points • for lists and steps
4. Use numbered lists 1. 2. 3. for sequences
5. Keep paragraphs short and concise
6. Use clear spacing between sections
7. Structure information logically

**TOPIC GUIDELINES:**
- Crops: Provide specific varieties, seasons, and regional advice
- Labor: Give practical numbers and management tips
- Weather: Explain impacts and protective measures
- Schemes: Mention specific names and eligibility
- Pests: Offer organic and chemical solutions
- Practices: Share proven traditional and modern methods

**TONE:**
- Be empathetic and practical
- Use simple, clear language
- Be specific with numbers and details
- Focus on actionable advice
- Admit limitations when unsure

Provide practical, actionable farming advice in simple, clear language. 
Focus on: crops, labor management, weather impact, government schemes, pest control, and best practices.
Keep responses well-structured and easy to read.`;
        
        this.initializeChatbot();
    }

    initializeChatbot() {
        this.addBotMessage("👋 Namaste! I'm Krishi Mitra, your AI farming assistant. Ask me about crops, labor, weather, or any farming questions!");
    }

    async sendMessage(userMessage, retry = false) {
        this.addUserMessage(userMessage);
        this.showTypingIndicator();

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile', // Updated Groq model
                    messages: [
                        {
                            role: 'user',
                            content: `${this.context}\n\nConversation so far:\n${this.getConversationHistory()}\nFarmer: ${userMessage}\nKrishi Mitra:`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 512,
                    top_p: 0.95
                })
            });

            console.log('Response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${response.statusText}. Details: ${errorText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            let botResponse = data.choices?.[0]?.message?.content || "Sorry, I couldn't process that response.";
            
            botResponse = this.formatResponse(botResponse);

            this.hideTypingIndicator();
            this.addBotMessage(botResponse);
            this.conversation.push({ role: 'user', content: userMessage });
            this.conversation.push({ role: 'assistant', content: botResponse });
            this.retryCount = 0;
            
        } catch (error) {
            console.error('Chatbot error:', error);
            this.hideTypingIndicator();
            if (error.message.includes('Failed to fetch') && this.retryCount < this.maxRetries && !retry) {
                this.retryCount++;
                this.addBotMessage(`Network hiccup—retrying... (Attempt ${this.retryCount}/${this.maxRetries})`);
                setTimeout(() => this.sendMessage(userMessage, true), 2000);
            } else {
                this.addBotMessage(`Network issue detected. Please check your internet. Error: ${error.message}`);
            }
        }
    }

    formatResponse(text) {
        let formatted = text.trim();
        
        // Remove excessive line breaks
        formatted = formatted.replace(/\n\s*\n/g, '\n');
        
        // Format headings (## Heading -> <h4>)
        formatted = formatted.replace(/^##\s+(.+)$/gm, '<h4 class="chat-heading">$1</h4>');
        
        // Format bold text (**text** -> <strong>)
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="chat-bold">$1</strong>');
        
        // Format lists with proper structure
        formatted = formatted.replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul class="chat-list">$1</ul>');
        
        // Format numbered lists
        formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)(?![^<]*<\/ul>)/gs, '<ol class="chat-list">$1</ol>');
        
        // Replace single line breaks with <br> but preserve list structure
        formatted = formatted.replace(/(?<!<\/li>|<\/h4>)\n(?!<ul|<\/ul>|<ol|<\/ol>|<li>)/g, '<br>');
        
        // Add proper spacing between sections
        formatted = formatted.replace(/<\/h4>/g, '</h4><div class="section-spacing">');
        formatted = formatted.replace(/<\/ul>/g, '</ul><div class="section-spacing">');
        formatted = formatted.replace(/<\/ol>/g, '</ol><div class="section-spacing">');
        
        // Wrap in container with dark text
        formatted = `<div class="bot-message-content">${formatted}</div>`;
        
        return formatted || "I apologize, but I couldn't process that response properly.";
    }

    getConversationHistory() {
        const recentMessages = this.conversation.slice(-6);
        return recentMessages.map(msg => `${msg.role === 'user' ? 'Farmer' : 'Krishi Mitra'}: ${msg.content}`).join('\n');
    }

    addUserMessage(message) {
        const messagesContainer = document.getElementById('chatbotMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-message';
        messageDiv.innerHTML = `<strong>You:</strong> ${message}`;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    addBotMessage(message) {
        const messagesContainer = document.getElementById('chatbotMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'bot-message';
        messageDiv.innerHTML = `<strong>🤖 Krishi Mitra:</strong> ${message}`;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chatbotMessages');
        if (document.getElementById('typingIndicator')) return;
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typingIndicator';
        typingDiv.className = 'bot-message typing';
        typingDiv.innerHTML = '<strong>🤖 Krishi Mitra:</strong> <span class="typing-dots">...</span>';
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) typingIndicator.remove();
    }

    toggleChatbot() {
        const chatbot = document.getElementById('chatbotWidget');
        const body = document.body;
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            chatbot.style.display = 'flex';
            body.classList.add('chatbot-open');
            const input = document.getElementById('chatbotInput');
            setTimeout(() => input.focus(), 150);
            this.attachScrollListeners();
        } else {
            chatbot.style.display = 'none';
            body.classList.remove('chatbot-open');
            this.detachScrollListeners();
        }
    }

    attachScrollListeners() {
        const messagesContainer = document.getElementById('chatbotMessages');
        const handleScroll = (e) => {
            if (messagesContainer.scrollTop === 0 || messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight) {
                e.stopPropagation();
            }
        };
        messagesContainer.addEventListener('wheel', handleScroll, { passive: false });
        messagesContainer.addEventListener('touchmove', handleScroll, { passive: false });
    }

    detachScrollListeners() {
        const messagesContainer = document.getElementById('chatbotMessages');
        messagesContainer.removeEventListener('wheel', this.attachScrollListeners);
        messagesContainer.removeEventListener('touchmove', this.attachScrollListeners);
    }

    clearChat() {
        this.conversation = [];
        const messagesContainer = document.getElementById('chatbotMessages');
        messagesContainer.innerHTML = '';
        this.addBotMessage("Chat cleared! Ask me anything new.");
    }

    handleQuickAction(action) {
        const questions = {
            'crops': 'What are the best crops to grow in my region this season?',
            'labor': 'How many laborers do I need for 5 acres of wheat harvesting?',
            'weather': 'How will the upcoming weather affect my farming activities?',
            'schemes': 'What government schemes are available for farmers right now?',
            'pests': 'How can I control common pests in vegetable farming?',
            'irrigation': 'What is the best irrigation schedule for rice crops?'
        };
        this.sendMessage(questions[action]);
    }

    toggleFullscreen() {
        const chatbot = document.getElementById('chatbotWidget');
        const fullscreenBtn = chatbot.querySelector('.chatbot-control-btn');
        
        if (chatbot.classList.contains('fullscreen')) {
            // Exit fullscreen
            chatbot.classList.remove('fullscreen');
            fullscreenBtn.innerHTML = '⛶';
            fullscreenBtn.title = 'Fullscreen';
            this.restoreScrollPosition();
        } else {
            // Enter fullscreen
            this.saveScrollPosition();
            chatbot.classList.add('fullscreen');
            fullscreenBtn.innerHTML = '⛷';
            fullscreenBtn.title = 'Exit Fullscreen';
            this.scrollToBottom();
        }
        
        // Refresh the chat display
        setTimeout(() => {
            this.scrollToBottom();
        }, 100);
    }

    saveScrollPosition() {
        const messagesContainer = document.getElementById('chatbotMessages');
        this.savedScrollPosition = messagesContainer.scrollTop;
    }

    restoreScrollPosition() {
        const messagesContainer = document.getElementById('chatbotMessages');
        if (this.savedScrollPosition) {
            messagesContainer.scrollTop = this.savedScrollPosition;
        }
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('chatbotMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Global functions
window.toggleChatbot = function() { 
    if (window.farmChatbot) {
        window.farmChatbot.toggleChatbot(); 
    } else {
        console.log('Chatbot not initialized yet');
    }
};
window.sendChatMessage = function() {
    if (window.farmChatbot) {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();
        if (message) {
            window.farmChatbot.sendMessage(message);
            input.value = '';
            input.focus();
        }
    } else {
        console.log('Chatbot not initialized yet');
    }
};
window.handleQuickAction = function(action) { 
    if (window.farmChatbot) {
        window.farmChatbot.handleQuickAction(action); 
    }
};
window.clearChat = function() { 
    if (window.farmChatbot) {
        window.farmChatbot.clearChat(); 
    }
};

// Global function for fullscreen toggle
window.toggleFullscreen = function() {
    if (window.farmChatbot) {
        window.farmChatbot.toggleFullscreen();
    } else {
        console.log('Chatbot not initialized yet');
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    window.farmChatbot = new FarmChatbot();
    const input = document.getElementById('chatbotInput');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendChatMessage();
        });
    }
});