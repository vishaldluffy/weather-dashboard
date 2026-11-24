const endpoints = {
  cities: "https://geocoding-api.open-meteo.com/v1/search",
  weather: "https://api.open-meteo.com/v1/forecast",
};
const storageKey = "weatherline.lastCity";
const form = document.querySelector("#search");
const input = document.querySelector("#city");
const button = form.querySelector("button");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const current = document.querySelector("#current");
const forecast = document.querySelector("#forecast");

const conditionGroups = [
  [[0], "Clear", "sun"],
  [[1, 2], "Partly cloudy", "cloud"],
  [[3], "Overcast", "cloud"],
  [[45, 48], "Fog", "fog"],
  [[51, 53, 55, 56, 57], "Drizzle", "rain"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Rain", "rain"],
  [[71, 73, 75, 77, 85, 86], "Snow", "snow"],
  [[95, 96, 99], "Thunderstorms", "storm"],
];
const conditions = new Map(conditionGroups.flatMap(([codes, label, icon]) =>
  codes.map((code) => [code, { label, icon }])
));

class WeatherError extends Error {}

async function requestJson(endpoint, params) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams(params).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new WeatherError("The weather service is unavailable. Please try again.");
  return response.json();
}

async function findCity(name) {
  const data = await requestJson(endpoints.cities, { name, count: 1, language: "en" });
  const city = data.results?.[0];
  if (!city) throw new WeatherError("City not found. Check the spelling or try a nearby city.");
  return city;
}

async function getWeather(latitude, longitude) {
  const data = await requestJson(endpoints.weather, {
    latitude, longitude, timezone: "auto", forecast_days: 5,
    current: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
  });
  if (!data.current || data.daily?.time?.length !== 5) {
    throw new WeatherError("The forecast is incomplete. Please try again.");
  }
  return data;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function weatherIcon(icon) {
  const image = document.createElement("img");
  image.src = "icons.svg#" + icon;
  image.alt = "";
  return image;
}

function temperature(value) {
  return Number.isFinite(value) ? Math.round(value) + "°C" : "—";
}

function describe(code) {
  return conditions.get(code) ?? { label: "Conditions unavailable", icon: "cloud" };
}

function render(city, data) {
  const now = describe(data.current.weather_code);
  const place = [city.admin1, city.country].filter((part) => part && part !== city.name).join(", ");
  const details = element("div", "");
  details.append(
    element("h2", city.name),
    element("p", place, "loc"),
    element("p", temperature(data.current.temperature_2m), "temp"),
    element("p", now.label, "condition")
  );

  const days = data.daily.time.map((date, index) => {
    const day = describe(data.daily.weather_code[index]);
    const label = new Date(date + "T12:00:00Z").toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
    });
    const card = element("li", "");
    card.append(
      element("strong", index === 0 ? "Today" : label),
      weatherIcon(day.icon),
      element("p", day.label),
      element("p", "High " + temperature(data.daily.temperature_2m_max[index]), "range"),
      element("p", "Low " + temperature(data.daily.temperature_2m_min[index]))
    );
    return card;
  });
  current.replaceChildren(details, weatherIcon(now.icon));
  forecast.replaceChildren(...days);
  results.hidden = false;
}

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

async function showWeather() {
  if (button.disabled) return;
  const query = input.value.trim();
  if ([...query].length < 2) {
    setStatus(query ? "Enter at least two characters." : "Enter a city name.", true);
    input.setAttribute("aria-invalid", "true");
    input.focus();
    return;
  }
  input.removeAttribute("aria-invalid");
  button.disabled = true;
  results.hidden = true;
  setStatus("Loading weather for " + query + "…");
  try {
    const city = await findCity(query);
    const data = await getWeather(city.latitude, city.longitude);
    render(city, data);
    setStatus("Current conditions for " + city.name + ".");
    try { localStorage.setItem(storageKey, query); } catch { /* Storage is optional. */ }
  } catch (error) {
    setStatus(error instanceof WeatherError ? error.message :
      "Could not reach the weather service. Check your connection and try again.", true);
  } finally {
    button.disabled = false;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  showWeather();
});

let lastCity;
try { lastCity = localStorage.getItem(storageKey); } catch { /* Storage is optional. */ }
if (lastCity) {
  input.value = lastCity;
  showWeather();
}
