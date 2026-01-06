// js/weatherService.js - USING WEATHERAPI.COM (BETTER COVERAGE)
class WeatherService {
    constructor() {
        // You'll get this from weatherapi.com - sign up is free and instant
        this.apiKey = 'c051c87a74f64c7184f172245251210'; // Replace with your key
        this.baseUrl = 'https://api.weatherapi.com/v1';
        this.cacheDuration = 30 * 60 * 1000;
    }

    // Test the API
    async testAPI() {
        try {
            // Test with Mumbai
            const testUrl = `${this.baseUrl}/current.json?key=${this.apiKey}&q=Mumbai`;
            const response = await fetch(testUrl);
            
            if (!response.ok) throw new Error(`API test failed: ${response.status}`);
            
            const data = await response.json();
            console.log('WeatherAPI test successful:', data);
            return true;
            
        } catch (error) {
            console.error('WeatherAPI test failed:', error);
            return false;
        }
    }

    // Get weather by coordinates - MOST RELIABLE
    async getWeatherByCoords(lat, lon) {
        console.log('Getting weather for coordinates:', lat, lon);
        
        try {
            const cacheKey = `weather_${lat}_${lon}`;
            const cached = this.getFromCache(cacheKey);
            
            if (cached) {
                console.log('Using cached weather data');
                return cached;
            }

            // WeatherAPI uses q=lat,lon format for coordinates
            const [current, forecast] = await Promise.all([
                this.fetchCurrentWeather(`${lat},${lon}`),
                this.fetchWeatherForecast(`${lat},${lon}`)
            ]);

            const weatherData = {
                current: this.processCurrentWeather(current),
                forecast: this.processForecast(forecast),
                location: {
                    lat: lat,
                    lon: lon,
                    name: current.location.name || 'Your Location',
                    region: current.location.region,
                    country: current.location.country
                }
            };

            this.saveToCache(cacheKey, weatherData);
            return weatherData;

        } catch (error) {
            console.error('Weather API Error:', error);
            throw new Error('Unable to fetch weather data. Please try a nearby city name.');
        }
    }

    // Get weather by city/village name - EXCELLENT FOR INDIAN LOCATIONS
    async getWeatherByCity(city) {
        console.log('Getting weather for:', city);
        
        try {
            // WeatherAPI handles Indian villages much better
            const [current, forecast] = await Promise.all([
                this.fetchCurrentWeather(city),
                this.fetchWeatherForecast(city)
            ]);

            const weatherData = {
                current: this.processCurrentWeather(current),
                forecast: this.processForecast(forecast),
                location: {
                    lat: current.location.lat,
                    lon: current.location.lon,
                    name: current.location.name,
                    region: current.location.region,
                    country: current.location.country
                }
            };

            return weatherData;

        } catch (error) {
            console.error('City weather fetch error:', error);
            
            // Provide better error messages
            if (error.message.includes('400')) {
                throw new Error(`"${city}" not found. Try a nearby city or check spelling.`);
            } else if (error.message.includes('403')) {
                throw new Error('Weather service temporarily unavailable. Please try again.');
            } else {
                throw new Error(`Unable to find weather for "${city}". Try: Pune, Mumbai, Delhi, etc.`);
            }
        }
    }

    // Fetch current weather
    async fetchCurrentWeather(query) {
        const url = `${this.baseUrl}/current.json?key=${this.apiKey}&q=${encodeURIComponent(query)}&aqi=no`;
        console.log('Fetching current weather from:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Current weather failed: ${response.status}`);
        }
        return response.json();
    }

    // Fetch 3-day forecast (WeatherAPI provides better forecast)
    async fetchWeatherForecast(query) {
        const url = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(query)}&days=3&aqi=no&alerts=no`;
        console.log('Fetching forecast from:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Forecast failed: ${response.status}`);
        }
        return response.json();
    }

    // Process current weather data from WeatherAPI
    processCurrentWeather(data) {
        return {
            temp: Math.round(data.current.temp_c),
            feelsLike: Math.round(data.current.feelslike_c),
            humidity: data.current.humidity,
            windSpeed: Math.round(data.current.wind_kph),
            description: data.current.condition.text,
            icon: this.getIconUrl(data.current.condition.icon),
            pressure: data.current.pressure_mb,
            visibility: data.current.vis_km,
            uv: data.current.uv,
            cloud: data.current.cloud,
            lastUpdated: new Date(data.current.last_updated)
        };
    }

    // Process forecast data from WeatherAPI
    processForecast(data) {
        const dailyForecasts = [];
        
        // WeatherAPI provides structured daily forecast
        data.forecast.forecastday.forEach(day => {
            dailyForecasts.push({
                date: new Date(day.date),
                temp: Math.round(day.day.avgtemp_c),
                minTemp: Math.round(day.day.mintemp_c),
                maxTemp: Math.round(day.day.maxtemp_c),
                description: day.day.condition.text,
                icon: this.getIconUrl(day.day.condition.icon),
                humidity: day.day.avghumidity,
                windSpeed: Math.round(day.day.maxwind_kph),
                rainChance: day.day.daily_chance_of_rain,
                uv: day.day.uv
            });
        });

        return dailyForecasts;
    }

    // Convert WeatherAPI icon URL to use CDN
    getIconUrl(iconPath) {
        if (!iconPath) return '🌤️';
        // WeatherAPI returns relative paths, convert to full URL
        return iconPath.startsWith('//') ? `https:${iconPath}` : iconPath;
    }

    // Generate farming suggestions based on weather
    generateFarmingSuggestions(current, forecast) {
        const suggestions = [];
        
        // Temperature-based suggestions
        if (current.temp > 35) {
            suggestions.push('🔥 High temperatures: Schedule irrigation in early morning or late evening');
        } else if (current.temp > 30) {
            suggestions.push('☀️ Warm weather: Good for most crops, maintain regular watering');
        } else if (current.temp < 15) {
            suggestions.push('❄️ Cool temperatures: Protect sensitive plants, reduce watering frequency');
        }

        // Rain-based suggestions
        const hasSignificantRain = forecast.some(day => day.rainChance > 60);
        const hasSomeRain = forecast.some(day => day.rainChance > 30);
        
        if (hasSignificantRain) {
            suggestions.push('🌧️ Heavy rain expected: Delay harvesting, plan indoor activities');
        } else if (hasSomeRain) {
            suggestions.push('🌦️ Light rain possible: Good for planting, reduce irrigation');
        } else {
            suggestions.push('☀️ Dry conditions: Ideal for harvesting and fieldwork');
        }

        // Wind-based suggestions
        if (current.windSpeed > 20) {
            suggestions.push('💨 Windy conditions: Avoid pesticide spraying, secure loose items');
        }

        // Humidity-based suggestions
        if (current.humidity > 80) {
            suggestions.push('💧 High humidity: Monitor for fungal diseases, ensure good air circulation');
        } else if (current.humidity < 30) {
            suggestions.push('🏜️ Low humidity: Increase irrigation frequency, watch for plant stress');
        }

        // UV index suggestions
        if (current.uv > 8) {
            suggestions.push('☀️ Very high UV: Protect yourself with hat and sunscreen during fieldwork');
        }

        // Default suggestion if none apply
        if (suggestions.length === 0) {
            suggestions.push('🌱 Good farming conditions: Continue regular activities');
        }

        return suggestions.slice(0, 4); // Limit to 4 most relevant suggestions
    }

    // Cache management
    getFromCache(key) {
        const cached = localStorage.getItem(key);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > this.cacheDuration) {
            localStorage.removeItem(key);
            return null;
        }

        return data;
    }

    saveToCache(key, data) {
        const cacheItem = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheItem));
    }
}

window.weatherService = new WeatherService();