import * as Location from 'expo-location';

import type { Condition, Weather } from './types';

let cache: { at: number; value: Weather } | null = null;

// WMO weather codes -> our coarse conditions
function toCondition(code: number, wind: number): Condition {
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (wind >= 35) return 'wind';
  if (code >= 2) return 'cloudy';
  return 'clear';
}

/** Returns local weather or null (no permission / offline). Location never leaves the phone except to Open-Meteo. */
export async function getWeather(askPermission: boolean): Promise<Weather | null> {
  if (cache && Date.now() - cache.at < 30 * 60 * 1000) return cache.value;
  try {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted' && askPermission) {
      status = (await Location.requestForegroundPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;
    const pos =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }));
    // round to ~10 km for privacy
    const lat = pos.coords.latitude.toFixed(1);
    const lon = pos.coords.longitude.toFixed(1);
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`,
    );
    if (!res.ok) return null;
    const j = await res.json();
    const value: Weather = {
      temp_c: Math.round(j.current.temperature_2m),
      condition: toCondition(j.current.weather_code, j.current.wind_speed_10m ?? 0),
    };
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return null;
  }
}
