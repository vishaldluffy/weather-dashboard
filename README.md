# Weatherline

InternCircle Project 04. Search for a city to view current conditions and a five-day forecast in Celsius.

[Open the dashboard](https://vishaldluffy.github.io/weather-dashboard/)

The app submits one geocoding request when a city search is submitted, then requests a forecast for the matching coordinates. It stores the last successful search in localStorage and reloads it on return. No API key or build step is required.

## Error handling

The search validates the city name before making a request, disables the submit button and announces loading. It checks HTTP responses before parsing JSON and gives separate messages for unknown cities, unavailable or incomplete forecasts, and network errors or timeouts. Failed searches leave the last successfully saved city intact.

Weather data comes from the [Open-Meteo Forecast API](https://open-meteo.com/en/docs) and [Geocoding API](https://open-meteo.com/en/docs/geocoding-api). Serve the repository root with a static server to run locally.
