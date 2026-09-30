/**
 * Real-Time Open-Meteo Meteorology Fetcher
 * Provides live weather conditions and hourly forecasts without requiring an API key.
 */

export interface OpenMeteoCurrentData {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  precipitation: number; // mm
  rain: number;          // mm
  weather_code: number;
  surface_pressure: number; // hPa
  wind_speed_10m: number;   // km/h
  wind_gusts_10m: number;   // km/h
}

export interface OpenMeteoHourlyData {
  time: string[];
  precipitation: number[];
  rain: number[];
  wind_speed_10m: number[];
  wind_gusts_10m: number[];
  surface_pressure: number[];
  temperature_2m: number[];
}

export interface LiveWeatherReport {
  latitude: number;
  longitude: number;
  placeName?: string;
  timestamp: string;
  current: {
    tempC: number;
    rainfallMmHr: number;
    windKnots: number;
    gustKnots: number;
    pressureHpa: number;
    humidity: number;
    weatherDescription: string;
    isHazardous: boolean;
  };
  hourly: {
    time: string;
    rainfallMmHr: number;
    windKnots: number;
    isHeavyRain: boolean;
  }[];
  heavyRainWindow?: {
    startTime: string;
    peakTime: string;
    endTime: string;
    peakRateMmHr: number;
  };
}

export function mapWeatherCodeToDescription(code: number): string {
  if (code === 0) return 'Clear Skies';
  if (code === 1 || code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Dense Fog';
  if (code >= 51 && code <= 55) return 'Continuous Drizzle';
  if (code >= 61 && code <= 63) return 'Moderate Rain';
  if (code === 65) return 'Heavy Violent Rain';
  if (code >= 71 && code <= 77) return 'Snow / Ice Pellets';
  if (code >= 80 && code <= 82) return 'Violent Rain Showers';
  if (code === 95) return 'Severe Thunderstorm';
  if (code >= 96 && code <= 99) return 'Severe Thunderstorm with Hail';
  return 'Overcast Squall';
}

export async function fetchLiveWeatherForCoordinates(
  lat: number,
  lng: number,
  placeName = 'Target Coordinate'
): Promise<LiveWeatherReport> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_gusts_10m&hourly=precipitation,rain,wind_speed_10m,wind_gusts_10m,surface_pressure,temperature_2m&forecast_days=2&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo API returned status ${res.status}`);
  }

  const data = await res.json();
  const current: OpenMeteoCurrentData = data.current;
  const hourly: OpenMeteoHourlyData = data.hourly;

  const currentRain = current.precipitation || current.rain || 0;
  // Convert km/h to knots (1 km/h = 0.539957 knots)
  const windKnots = Math.round((current.wind_speed_10m || 0) * 0.539957);
  const gustKnots = Math.round((current.wind_gusts_10m || 0) * 0.539957);

  // Parse hourly forecast points (next 24 hours)
  const parsedHourly = (hourly.time || []).slice(0, 24).map((t, idx) => {
    const rainVal = hourly.precipitation ? hourly.precipitation[idx] || 0 : 0;
    const wKnots = Math.round(((hourly.wind_speed_10m && hourly.wind_speed_10m[idx]) || 0) * 0.539957);
    return {
      time: t.slice(11, 16),
      rainfallMmHr: parseFloat(rainVal.toFixed(1)),
      windKnots: wKnots,
      isHeavyRain: rainVal >= 15.0,
    };
  });

  // Determine heavy rain window from hourly data
  let heavyStart = '';
  let heavyPeakTime = '';
  let heavyEnd = '';
  let maxHourlyRain = 0;

  for (let i = 0; i < parsedHourly.length; i++) {
    const pt = parsedHourly[i];
    if (pt.rainfallMmHr >= 10.0) {
      if (!heavyStart) heavyStart = pt.time;
      if (pt.rainfallMmHr > maxHourlyRain) {
        maxHourlyRain = pt.rainfallMmHr;
        heavyPeakTime = pt.time;
      }
      heavyEnd = pt.time;
    }
  }

  return {
    latitude: lat,
    longitude: lng,
    placeName,
    timestamp: current.time ? current.time.replace('T', ' ') : new Date().toISOString(),
    current: {
      tempC: current.temperature_2m,
      rainfallMmHr: parseFloat(currentRain.toFixed(1)),
      windKnots,
      gustKnots,
      pressureHpa: current.surface_pressure || 1013,
      humidity: current.relative_humidity_2m || 75,
      weatherDescription: mapWeatherCodeToDescription(current.weather_code),
      isHazardous: currentRain >= 15.0 || windKnots >= 34,
    },
    hourly: parsedHourly,
    heavyRainWindow: heavyStart
      ? {
          startTime: `${heavyStart} hrs`,
          peakTime: `${heavyPeakTime} hrs (${maxHourlyRain} mm/h)`,
          endTime: `${heavyEnd} hrs`,
          peakRateMmHr: maxHourlyRain,
        }
      : undefined,
  };
}

export function getUserCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}
