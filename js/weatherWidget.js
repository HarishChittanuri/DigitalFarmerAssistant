class WeatherWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.weatherService = window.weatherService;
        this.userLocation = null;
    }

    async init() {
        if (!this.container) {
            console.error('Weather widget container not found');
            return;
        }
        this.showLocationOptions();
    }

    showLocationOptions() {
        this.container.innerHTML = `
            <div class="text-center p-4">
                <h3 class="text-lg font-bold" style="color: var(--primary-color);">Farm Weather</h3>
                <p class="mt-2 mb-4">Enter a location to get the latest forecast and farming suggestions.</p>
                <button class="neu-button px-6 py-2" onclick="window.weatherWidget.showQuickManualInput()">Enter Location</button>
            </div>
        `;
    }

    showQuickManualInput(message = 'Enter location for weather') {
        this.container.innerHTML = `
            <div class="p-4">
                <h3 class="text-lg font-bold text-center mb-4" style="color: var(--primary-color);">${message}</h3>
                <div class="flex items-center space-x-2">
                    <input type="text" id="cityInput" class="neu-input w-full p-3" placeholder="City or village..." autofocus onkeypress="if(event.key === 'Enter') window.weatherWidget.instantSearch()">
                    <button class="neu-button px-5 py-3" onclick="window.weatherWidget.instantSearch()">Go</button>
                </div>
                <div class="text-center mt-4">
                    <h4 class="text-sm font-semibold mb-2">📍 Popular Locations:</h4>
                    <div class="flex flex-wrap justify-center gap-2">
                        ${[
                            'Pune', 'Nashik', 'Nagpur', 'Aurangabad', 'Kolhapur', 'Sangli', 'Satara', 'Amravati'
                        ].map(city => `<button class="neu-button text-xs px-3 py-1" onclick="window.weatherWidget.instantLoadWeather('${city}')">${city}</button>`).join('')}
                    </div>
                </div>
                <div id="quick-error-container" class="mt-2"></div>
            </div>
        `;
        setTimeout(() => {
            const input = document.getElementById('cityInput');
            if (input) input.focus();
        }, 50);
    }

    async instantSearch() {
        const input = document.getElementById('cityInput');
        const city = input.value.trim();
        if (!city) {
            this.showQuickError('Please enter a location');
            return;
        }
        await this.instantLoadWeather(city);
    }

    async instantLoadWeather(city) {
        this.showLoading(`Fetching weather for ${city}...`);
        try {
            const weatherData = await this.weatherService.getWeatherByCity(city);
            this.renderWeather(weatherData);
        } catch (error) {
            this.showQuickError(`Weather for "${city}" not found. Try a nearby city.`);
        }
    }

    renderWeather(weatherData) {
        const { current, forecast, location } = weatherData;
        const suggestions = this.weatherService.generateFarmingSuggestions(current, forecast);

        const forecastHtml = forecast.slice(0, 4).map(day => `
            <div class="neu-card p-3">
                <p class="font-semibold">${this.getDayName(day.date)}</p>
                <p class="text-3xl my-1">${this.getWeatherIcon(day.icon)}</p>
                <p class="font-bold" style="color: var(--accent-dark-color);">${day.temp}°C</p>
            </div>
        `).join('');

        this.container.innerHTML = `
            <div class="weather-content">
                <!-- Top Section: Current Weather -->
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h3 class="text-xl font-bold" style="color: var(--primary-color);">${location.name}</h3>
                        <p class="text-sm">${new Date().toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric' })}</p>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-5xl">${this.getWeatherIcon(current.icon)}</span>
                        <div>
                            <p class="text-4xl font-bold" style="color: var(--primary-color);">${current.temp}°C</p>
                            <p class="text-sm text-right capitalize">${current.description}</p>
                        </div>
                    </div>
                </div>

                <!-- Middle Section: Details -->
                <div class="neu-inset rounded-lg p-4 flex justify-around text-center text-sm mb-6">
                    <div>
                        <p class="font-semibold">Feels Like</p>
                        <p class="font-bold mt-1" style="color: var(--accent-dark-color);">${current.feelsLike}°C</p>
                    </div>
                    <div>
                        <p class="font-semibold">Humidity</p>
                        <p class="font-bold mt-1" style="color: var(--accent-dark-color);">${current.humidity}%</p>
                    </div>
                    <div>
                        <p class="font-semibold">Wind</p>
                        <p class="font-bold mt-1" style="color: var(--accent-dark-color);">${current.windSpeed} km/h</p>
                    </div>
                </div>

                <!-- Bottom Section: Forecast -->
                <div>
                    <h4 class="text-lg font-bold mb-4 text-center" style="color: var(--primary-color);">4-Day Forecast</h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        ${forecastHtml}
                    </div>
                </div>
                
                <!-- Farming Suggestions -->
                <div class="mt-6">
                    <h4 class="text-lg font-bold mb-2 text-center" style="color: var(--primary-color);">🌱 Farming Suggestions</h4>
                    <div class="neu-inset rounded-lg p-4 text-sm space-y-2">
                        ${suggestions.map(s => `<div>${s}</div>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    showLoading(message) {
        this.container.innerHTML = `
            <div class="text-center p-8">
                <p>${message}</p>
            </div>
        `;
    }
    
    showQuickError(message) {
        this.showQuickManualInput(); // Re-render the input form
        setTimeout(() => { // Wait for the DOM to update
            const errorContainer = document.getElementById('quick-error-container');
            if (errorContainer) {
                errorContainer.innerHTML = `<p class="text-red-600 text-sm text-center">${message}</p>`;
                setTimeout(() => errorContainer.innerHTML = '', 3000);
            }
        }, 50);
    }

    refreshWeather() {
        this.showQuickManualInput('Refresh by entering location again.');
    }

    capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
    getDayName(date) { return date.toLocaleDateString('en', { weekday: 'short' }); }
    getWeatherIcon(iconCode) { return { '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️', '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️', '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌦️', '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️', '50d': '🌫️', '50n': '🌫️' }[iconCode] || '🌤️'; }
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('weatherWidget')) {
        window.weatherWidget = new WeatherWidget('weatherWidget');
        window.weatherWidget.init();
    }
});
