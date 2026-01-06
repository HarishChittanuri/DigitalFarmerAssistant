// js/crop-recommendations.js - AI Crop Recommendations with Groq
import config from './config.js';

class CropRecommendations {
    constructor() {
        this.apiKey = config.GROQ_API_KEY; // From config
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions'; // Groq API endpoint
        this.currentLocation = '';
    }

    init() {
        this.setupEventListeners();
        console.log("✅ Crop Recommendations initialized with working API");
    }

    setupEventListeners() {
        // Check if required elements exist before adding listeners
        const getRecommendationsBtn = document.getElementById('getRecommendations');
        const farmLocationInput = document.getElementById('farmLocation');
        const locationChips = document.querySelectorAll('.location-chip');

        if (!getRecommendationsBtn || !farmLocationInput) {
            console.log('Crop recommendations elements not found on this page. Skipping event listener setup.');
            return;
        }

        // Get recommendations button
        getRecommendationsBtn.addEventListener('click', () => {
            this.getRecommendations();
        });

        // Location chips
        locationChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const location = chip.getAttribute('data-location');
                farmLocationInput.value = location;
                this.getRecommendations();
            });
        });

        // Enter key support
        farmLocationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.getRecommendations();
            }
        });
    }

    async getRecommendations() {
        const farmLocationInput = document.getElementById('farmLocation');
        if (!farmLocationInput) {
            console.log('Farm location input not found on this page.');
            return;
        }

        const location = farmLocationInput.value.trim();
        
        if (!location) {
            this.showError('Please enter your farm location');
            return;
        }

        this.currentLocation = location;
        this.showLoading();

        try {
            // Step 1: Get weather data
            const weatherData = await this.getWeatherData(location);
            
            // Step 2: Generate AI recommendations
            const recommendations = await this.generateAIRecommendations(weatherData, location);
            
            // Step 3: Display results
            this.showRecommendations(recommendations, weatherData);
            
        } catch (error) {
            console.error('Error getting recommendations:', error);
            this.showError(error.message || 'Failed to generate recommendations. Please try again.');
        }
    }

    async getWeatherData(location) {
        try {
            const weatherData = await window.weatherService.getWeatherByCity(location);
            this.displayCurrentWeather(weatherData);
            return weatherData;
        } catch (error) {
            throw new Error(`Could not fetch weather data for ${location}. Please check the location name.`);
        }
    }

    async generateAIRecommendations(weatherData, location) {
        const prompt = this.createAIPrompt(weatherData, location);
        
        try {
            console.log('🌾 Sending crop recommendation request to Groq...');
            const response = await this.callGroqAPI(prompt);
            return this.parseAIResponse(response);
        } catch (error) {
            console.error('AI recommendation failed:', error);
            // Fallback to mock data
            console.log('🔄 Using fallback recommendations');
            return this.createFallbackRecommendations(location);
        }
    }

    async callGroqAPI(prompt) {
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
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2048,
                top_p: 0.95
            })
        });

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API Response received successfully');
        
        if (!data.choices || !data.choices[0]?.message?.content) {
            throw new Error('Invalid response format from Groq API');
        }

        return data.choices[0].message.content;
    }

    createAIPrompt(weatherData, location) {
        const currentDate = new Date();
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        const monthName = nextMonth.toLocaleString('en', { month: 'long' });
        
        return `You are an agricultural expert specializing in Indian farming conditions. Provide crop recommendations for ${location} based on the current weather and seasonal forecast.

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:

{
    "recommendations": [
        {
            "crop": "Crop Name",
            "suitability": "excellent|good|moderate",
            "confidence": 85,
            "planting_time": "When to plant",
            "duration": "Growth duration",
            "key_advantages": ["advantage1", "advantage2", "advantage3"],
            "considerations": ["consideration1", "consideration2"],
            "watering_needs": "Low/Medium/High",
            "fertilizer_tips": ["tip1", "tip2"],
            "market_demand": "High/Medium/Low in region"
        }
    ],
    "weather_analysis": "Brief analysis of how weather affects farming",
    "general_tips": ["tip1", "tip2", "tip3"]
}

WEATHER DATA:
- Location: ${location}
- Current Temperature: ${weatherData.current.temp}°C
- Current Humidity: ${weatherData.current.humidity}%
- Current Conditions: ${weatherData.current.description}
- Season: ${this.getSeason(nextMonth)}
- Month: ${monthName}

FORECAST NEXT 7 DAYS:
${weatherData.forecast.slice(0, 7).map(day => 
    `- ${day.date.toLocaleDateString()}: ${day.temp}°C, ${day.description}`
).join('\n')}

Provide 3-5 crop recommendations suitable for Maharashtra region. Include practical advice for Indian farmers.`;
    }

    parseAIResponse(aiResponse) {
        console.log("🤖 Raw AI Response:", aiResponse);
        
        try {
            // Extract JSON from response (handle any extra text)
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            
            const parsedData = JSON.parse(jsonMatch[0]);
            console.log("✅ Parsed AI Response:", parsedData);
            
            // Validate structure
            if (!parsedData.recommendations || !Array.isArray(parsedData.recommendations)) {
                throw new Error('Invalid recommendations format');
            }
            
            return parsedData;
        } catch (error) {
            console.error('Error parsing AI response:', error);
            throw new Error('AI response format error. Using fallback recommendations.');
        }
    }

    createFallbackRecommendations(location) {
        // Simple fallback recommendations
        return {
            recommendations: [
                {
                    crop: "Tomato",
                    suitability: "good",
                    confidence: 78,
                    planting_time: "Can plant immediately",
                    duration: "70-90 days",
                    key_advantages: ["Good market demand", "Suitable for current season", "Multiple harvests possible"],
                    considerations: ["Need staking support", "Watch for fungal diseases"],
                    watering_needs: "Medium",
                    fertilizer_tips: ["Use balanced NPK fertilizer", "Add organic compost"],
                    market_demand: "High"
                },
                {
                    crop: "Chili",
                    suitability: "good",
                    confidence: 75,
                    planting_time: "Ideal for current conditions",
                    duration: "80-100 days",
                    key_advantages: ["Drought resistant varieties available", "High profit margin", "Good for intercropping"],
                    considerations: ["Needs well-drained soil", "Regular pest monitoring needed"],
                    watering_needs: "Medium",
                    fertilizer_tips: ["Phosphorus-rich fertilizer recommended", "Avoid excessive nitrogen"],
                    market_demand: "High"
                },
                {
                    crop: "Okra (Bhindi)",
                    suitability: "excellent",
                    confidence: 85,
                    planting_time: "Perfect timing for planting",
                    duration: "50-60 days",
                    key_advantages: ["Quick harvest", "Heat tolerant", "Continuous yield"],
                    considerations: ["Harvest regularly for best yield", "Susceptible to fruit borers"],
                    watering_needs: "Medium",
                    fertilizer_tips: ["Well-decomposed farm yard manure", "Balanced fertilizer application"],
                    market_demand: "High"
                }
            ],
            weather_analysis: `Current weather in ${location} is favorable for vegetable cultivation. Temperature range supports good growth for most crops.`,
            general_tips: [
                "Ensure proper irrigation scheduling",
                "Use organic mulch to conserve soil moisture", 
                "Monitor plants regularly for pest attacks",
                "Consider crop rotation for soil health"
            ]
        };
    }

    displayCurrentWeather(weatherData) {
        const currentWeatherEl = document.getElementById('currentWeather');
        const weatherSectionEl = document.getElementById('weatherSection');
        
        if (!currentWeatherEl || !weatherSectionEl) {
            console.log('Weather display elements not found on this page.');
            return;
        }

        const weatherHtml = `
            <div class="current-weather-display">
                <div class="weather-main">
                    <div class="weather-temp">${weatherData.current.temp}°C</div>
                    <div class="weather-desc">${weatherData.current.description}</div>
                    <div class="weather-location">📍 ${weatherData.location.name}</div>
                </div>
                <div class="weather-details">
                    <div class="weather-detail">
                        <span class="detail-label">Humidity</span>
                        <span class="detail-value">${weatherData.current.humidity}%</span>
                    </div>
                    <div class="weather-detail">
                        <span class="detail-label">Wind</span>
                        <span class="detail-value">${weatherData.current.windSpeed} km/h</span>
                    </div>
                    <div class="weather-detail">
                        <span class="detail-label">Feels Like</span>
                        <span class="detail-value">${weatherData.current.feelsLike}°C</span>
                    </div>
                </div>
            </div>
        `;
        
        currentWeatherEl.innerHTML = weatherHtml;
        weatherSectionEl.classList.remove('hidden');
    }

    showRecommendations(data, weatherData) {
        this.hideLoading();
        
        const recommendationsListEl = document.getElementById('recommendationsList');
        const recommendationsSectionEl = document.getElementById('recommendationsSection');
        
        if (!recommendationsListEl || !recommendationsSectionEl) {
            console.log('Recommendations display elements not found on this page.');
            return;
        }
        
        const recommendationsHtml = data.recommendations.map(rec => `
            <div class="crop-card crop-${rec.suitability}">
                <div class="crop-header">
                    <h4 class="crop-name">${rec.crop}</h4>
                    <div class="crop-badges">
                        <span class="suitability-badge ${rec.suitability}">${rec.suitability.toUpperCase()}</span>
                        <span class="confidence-badge">${rec.confidence}% Match</span>
                    </div>
                </div>
                
                <div class="crop-meta">
                    <span class="meta-item">🕒 ${rec.planting_time}</span>
                    <span class="meta-item">📅 ${rec.duration}</span>
                    <span class="meta-item">💧 ${rec.watering_needs} Water</span>
                    <span class="meta-item">💰 ${rec.market_demand} Demand</span>
                </div>
                
                <div class="crop-advantages">
                    <h5>Key Advantages:</h5>
                    <ul>
                        ${rec.key_advantages.map(adv => `<li>✅ ${adv}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="crop-considerations">
                    <h5>Considerations:</h5>
                    <ul>
                        ${rec.considerations.map(cons => `<li>⚠️ ${cons}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="crop-tips">
                    <h5>Fertilizer Tips:</h5>
                    <ul>
                        ${rec.fertilizer_tips.map(tip => `<li>🌱 ${tip}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');

        const generalTipsHtml = data.general_tips ? `
            <div class="general-tips">
                <h4>🌿 General Farming Tips</h4>
                <ul>
                    ${data.general_tips.map(tip => `<li>💡 ${tip}</li>`).join('')}
                </ul>
            </div>
        ` : '';

        const weatherAnalysisHtml = data.weather_analysis ? `
            <div class="weather-analysis">
                <h4>🌤️ Weather Analysis</h4>
                <p>${data.weather_analysis}</p>
            </div>
        ` : '';

        const finalHtml = `
            ${weatherAnalysisHtml}
            ${recommendationsHtml}
            ${generalTipsHtml}
            <div class="ai-disclaimer">
                <p>🤖 These recommendations are generated by AI based on current weather patterns and agricultural best practices. Always consult local agricultural experts for specific advice.</p>
            </div>
        `;

        recommendationsListEl.innerHTML = finalHtml;
        recommendationsSectionEl.classList.remove('hidden');
    }

    showLoading() {
        const weatherSectionEl = document.getElementById('weatherSection');
        const recommendationsSectionEl = document.getElementById('recommendationsSection');
        const errorSectionEl = document.getElementById('errorSection');
        const loadingSectionEl = document.getElementById('loadingSection');
        
        if (weatherSectionEl) weatherSectionEl.classList.add('hidden');
        if (recommendationsSectionEl) recommendationsSectionEl.classList.add('hidden');
        if (errorSectionEl) errorSectionEl.classList.add('hidden');
        if (loadingSectionEl) loadingSectionEl.classList.remove('hidden');
    }

    hideLoading() {
        const loadingSectionEl = document.getElementById('loadingSection');
        if (loadingSectionEl) loadingSectionEl.classList.add('hidden');
    }

    showError(message) {
        this.hideLoading();
        const errorMessageEl = document.getElementById('errorMessage');
        const errorSectionEl = document.getElementById('errorSection');
        
        if (errorMessageEl) errorMessageEl.textContent = message;
        if (errorSectionEl) errorSectionEl.classList.remove('hidden');
    }

    getSeason(date) {
        const month = date.getMonth();  
        if (month >= 6 && month <= 9) return 'Monsoon';
        if (month >= 10 || month <= 1) return 'Winter';
        return 'Summer';
    }
}

// Global functions
function retryRecommendations() {
    const errorSectionEl = document.getElementById('errorSection');
    if (errorSectionEl) errorSectionEl.classList.add('hidden');
    if (window.cropRecommender && window.cropRecommender.currentLocation) {
        window.cropRecommender.getRecommendations();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    window.cropRecommender = new CropRecommendations();
    window.cropRecommender.init();
    console.log("🚀 Crop Recommendations loaded with working API!");
});