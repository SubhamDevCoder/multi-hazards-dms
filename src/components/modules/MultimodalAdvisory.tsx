import React, { useState, useEffect } from 'react';
import { HardwareScrew } from '../common/HardwareScrew';
import { VentSlots } from '../common/VentSlots';
import { StatusLed } from '../common/StatusLed';
import { TactileButton } from '../common/TactileButton';
import {
  CloudRain,
  Sun,
  Wind,
  Compass,
  Search,
  Bot,
  AlertTriangle,
  Volume2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Thermometer,
  Gauge,
  Droplets,
  Calendar,
  Radio,
  Eye,
} from 'lucide-react';
import { playMechanicalClick, playSuccessChime, playAlarmChirp } from '../../utils/audio';
import { fetchUniversalLocationData, UniversalLocationData, DayForecast } from '../../utils/liveDisasterPipeline';

interface MultimodalAdvisoryProps {
  currentLocationName?: string;
  coordinates?: [number, number];
}

export const MultimodalAdvisory: React.FC<MultimodalAdvisoryProps> = ({
  currentLocationName = 'Regional Operations Focal Sector',
  coordinates = [20.2961, 85.8245],
}) => {
  const [weatherData, setWeatherData] = useState<UniversalLocationData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [advisoryText, setAdvisoryText] = useState<string>('');
  const [isGrounded, setIsGrounded] = useState<boolean>(false);
  const [sources, setSources] = useState<any[]>([]);
  const [generatingAdvisory, setGeneratingAdvisory] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');

  // Fetch 7-Day Meteorological Weather Telemetry
  const loadLocalWeather = async () => {
    setLoadingWeather(true);
    try {
      const data = await fetchUniversalLocationData(coordinates[0], coordinates[1], currentLocationName);
      setWeatherData(data);
    } catch (err) {
      console.error('Failed to load meteorological weather forecast:', err);
    } finally {
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    loadLocalWeather();
  }, [coordinates[0], coordinates[1], currentLocationName]);

  // Trigger Gemini Search-Grounded Weather Early Warning Bulletin
  const handleGenerateAdvisory = async () => {
    playMechanicalClick();
    setGeneratingAdvisory(true);
    try {
      const res = await fetch('/api/gemini/weather-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: currentLocationName,
          weatherData: weatherData?.dailyForecasts || [],
        }),
      });
      const data = await res.json();
      setAdvisoryText(data.advisory || '');
      setIsGrounded(!!data.grounded);
      setSources(data.sources || []);
      playSuccessChime();
    } catch (err) {
      console.error('Weather forecast advisory generation failed:', err);
      playAlarmChirp();
      setAdvisoryText(
        `### [OFFLINE EARLY WARNING BULLETIN] 7-DAY METEOROLOGICAL OUTLOOK\n- **Atmospheric Watch**: Convective moisture convergence active across the coastal plain.\n- **Precipitation**: Localized surges exceeding 80mm/24h anticipated.\n- **Safety Protocol**: Secure loose high-surface items and maintain continuous VHF/satellite radio monitoring.`
      );
    } finally {
      setGeneratingAdvisory(false);
    }
  };

  // Auto-generate on first load when weather ready
  useEffect(() => {
    if (weatherData && !advisoryText && !generatingAdvisory) {
      handleGenerateAdvisory();
    }
  }, [weatherData]);

  // Voice Readout toggle
  const handleToggleVoice = () => {
    playMechanicalClick();
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    } else {
      if ('speechSynthesis' in window && advisoryText) {
        const cleanText = advisoryText.replace(/[#*`_]/g, '');
        const utter = new SpeechSynthesisUtterance(cleanText.slice(0, 500));
        utter.rate = 1.0;
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
        setIsSpeaking(true);
      }
    }
  };

  const convertTemp = (celsius: number) => {
    if (tempUnit === 'F') {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  };

  const selectedDay: DayForecast | undefined = weatherData?.dailyForecasts[selectedDayIndex];

  return (
    <div className="relative panel-raised rounded-2xl border-2 border-[#babecc] p-4 sm:p-5 shadow-xl select-none text-[#2d3436] space-y-4">
      {/* Corner Screws */}
      <HardwareScrew className="absolute top-2.5 left-2.5" angle={15} />
      <HardwareScrew className="absolute top-2.5 right-2.5" angle={-35} />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#babecc] pb-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2d3436] flex items-center justify-center text-white shadow-md">
            <CloudRain className="w-5 h-5 text-[#38bdf8] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold font-mono tracking-tight text-[#1e293b]">
                MULTIMODAL ADVISORY // 7-DAY METEOROLOGICAL WEATHER FORECAST
              </h2>
              <StatusLed color="green" pulse size="sm" />
            </div>
            <p className="text-[10px] font-mono text-[#64748b]">
              7-Day Synoptic Weather Telemetry • Global Open-Meteo Integration • Search-Grounded AI Hazard Synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Temperature Unit Switcher */}
          <div className="flex items-center p-0.5 rounded-lg well-recessed border border-[#babecc] font-mono text-[10px] font-bold">
            <button
              type="button"
              onClick={() => {
                playMechanicalClick();
                setTempUnit('C');
              }}
              className={`px-2 py-0.5 rounded transition ${tempUnit === 'C' ? 'bg-[#2d3436] text-white shadow-sm' : 'text-[#64748b]'}`}
            >
              °C
            </button>
            <button
              type="button"
              onClick={() => {
                playMechanicalClick();
                setTempUnit('F');
              }}
              className={`px-2 py-0.5 rounded transition ${tempUnit === 'F' ? 'bg-[#2d3436] text-white shadow-sm' : 'text-[#64748b]'}`}
            >
              °F
            </button>
          </div>

          <button
            type="button"
            onClick={loadLocalWeather}
            disabled={loadingWeather}
            className="p-1.5 rounded-lg well-recessed border border-[#babecc] text-[#475569] hover:text-[#1e293b] active:scale-95 transition"
            title="Refresh Live Forecast"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingWeather ? 'animate-spin' : ''}`} />
          </button>
          <VentSlots count={3} />
        </div>
      </div>

      {/* Location & Current Condition Snapshot */}
      {weatherData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-mono">
          <div className="well-recessed p-2.5 rounded-xl border border-[#babecc]">
            <span className="text-[9px] text-[#64748b] block font-bold">FOCAL REGION</span>
            <strong className="text-[#1e293b] truncate block text-xs">{currentLocationName}</strong>
          </div>
          <div className="well-recessed p-2.5 rounded-xl border border-[#babecc]">
            <span className="text-[9px] text-[#64748b] block font-bold">TEMPERATURE</span>
            <strong className="text-[#ff4757] text-sm">
              {convertTemp(weatherData.current.tempC)}°{tempUnit}
            </strong>
          </div>
          <div className="well-recessed p-2.5 rounded-xl border border-[#babecc]">
            <span className="text-[9px] text-[#64748b] block font-bold">CURRENT RAIN</span>
            <strong className="text-[#2563eb] text-sm">{weatherData.current.rainfallMmHr} mm/h</strong>
          </div>
          <div className="well-recessed p-2.5 rounded-xl border border-[#babecc]">
            <span className="text-[9px] text-[#64748b] block font-bold">WIND / GUSTS</span>
            <strong className="text-[#1e293b] text-sm">
              {weatherData.current.windKnots} / {weatherData.current.gustKnots} kt
            </strong>
          </div>
          <div className="well-recessed p-2.5 rounded-xl border border-[#babecc]">
            <span className="text-[9px] text-[#64748b] block font-bold">PRESSURE</span>
            <strong className="text-[#1e293b] text-sm">{weatherData.current.pressureHpa} hPa</strong>
          </div>
          <div className="well-recessed p-2.5 rounded-xl border border-[#babecc]">
            <span className="text-[9px] text-[#64748b] block font-bold">HUMIDITY</span>
            <strong className="text-[#1e293b] text-sm">{weatherData.current.humidity}%</strong>
          </div>
        </div>
      )}

      {/* 7-Day Forecast Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono font-bold text-[#1e293b]">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#2563eb]" />
            7-DAY DAILY METEOROLOGICAL FORECAST (SELECT DAY TO INSPECT):
          </span>
          <span className="text-[10px] text-[#22c55e] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-ping" />
            LIVE TELEMETRY FEED
          </span>
        </div>

        {loadingWeather ? (
          <div className="well-recessed p-8 rounded-xl text-center font-mono text-xs text-[#64748b] animate-pulse">
            Fetching 7-day meteorological forecast from global sensor grid...
          </div>
        ) : weatherData ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 overflow-x-auto pb-1">
            {weatherData.dailyForecasts.map((df) => {
              const isSelected = selectedDayIndex === df.dayIndex;
              const isHeavy = df.precipitationMm >= 25;
              const isGale = df.maxWindKnots >= 28;

              return (
                <button
                  key={df.dayIndex}
                  type="button"
                  onClick={() => {
                    playMechanicalClick();
                    setSelectedDayIndex(df.dayIndex);
                  }}
                  className={`p-3 rounded-xl border font-mono text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#2d3436] text-white border-2 border-[#38bdf8] shadow-lg scale-[1.02]'
                      : df.predictedRiskScore >= 70
                      ? 'bg-red-50 hover:bg-red-100 border-red-300 text-red-950 shadow-sm'
                      : df.predictedRiskScore >= 45
                      ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-950 shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-[#cbd5e1] text-[#1e293b]'
                  }`}
                >
                  {/* Top: Day label & risk indicator */}
                  <div className="flex items-center justify-between border-b border-black/10 pb-1 mb-1 w-full">
                    <span className="text-[10px] font-bold truncate">{df.dayName}</span>
                    <span
                      className={`text-[8px] font-bold px-1 rounded ${
                        df.riskCategory === 'CRITICAL'
                          ? 'bg-red-600 text-white'
                          : df.riskCategory === 'HIGH'
                          ? 'bg-orange-500 text-white'
                          : 'bg-green-600 text-white'
                      }`}
                    >
                      {df.riskCategory}
                    </span>
                  </div>

                  {/* Icon & Temp */}
                  <div className="my-1.5 text-center w-full">
                    <div className="text-2xl">
                      {df.weatherCode >= 80 ? '⛈️' : df.weatherCode >= 60 ? '🌧️' : df.weatherCode >= 50 ? '🌦️' : df.weatherCode >= 3 ? '⛅' : '☀️'}
                    </div>
                    <div className="text-xs font-bold mt-1">
                      {convertTemp(df.maxTempC)}°{' '}
                      <span className={`text-[10px] ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                        / {convertTemp(df.minTempC)}°{tempUnit}
                      </span>
                    </div>
                    <div className={`text-[9px] truncate mt-0.5 ${isSelected ? 'text-blue-300' : 'text-[#64748b]'}`}>
                      {df.weatherDescription}
                    </div>
                  </div>

                  {/* Weather Indicators */}
                  <div className="space-y-1 text-[9px] pt-1.5 border-t border-black/10 w-full">
                    <div className="flex justify-between">
                      <span className={isSelected ? 'text-gray-300' : 'text-gray-500'}>RAIN:</span>
                      <strong className={isHeavy ? 'text-red-500 font-bold' : ''}>
                        {df.precipitationMm} mm
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className={isSelected ? 'text-gray-300' : 'text-gray-500'}>PROB:</span>
                      <strong>{df.precipitationProbability}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className={isSelected ? 'text-gray-300' : 'text-gray-500'}>WIND:</span>
                      <strong className={isGale ? 'text-red-500 font-bold' : ''}>
                        {df.maxWindKnots} kt
                      </strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="well-recessed p-4 rounded-xl text-center text-xs text-red-500 font-mono">
            Unable to stream meteorological forecast telemetry.
          </div>
        )}
      </div>

      {/* Selected Day Meteorological Deep Dive Panel */}
      {selectedDay && (
        <div className="well-recessed p-4 rounded-xl border border-[#babecc] space-y-3 font-mono">
          <div className="flex flex-wrap items-center justify-between border-b border-[#cbd5e1] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] animate-pulse" />
              <h3 className="text-xs font-bold text-[#1e293b]">
                DETAILED METEOROLOGICAL TELEMETRY // {selectedDay.dayName.toUpperCase()} ({selectedDay.dateLabel})
              </h3>
            </div>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                selectedDay.riskCategory === 'CRITICAL'
                  ? 'bg-red-600 text-white'
                  : selectedDay.riskCategory === 'HIGH'
                  ? 'bg-orange-500 text-white'
                  : 'bg-green-600 text-white'
              }`}
            >
              PREDICTED THREAT TIER: {selectedDay.riskCategory}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-[#cbd5e1]">
              <span className="text-[9px] text-[#64748b] block font-bold flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-[#ff4757]" /> PEAK TEMPERATURE
              </span>
              <strong className="text-sm text-[#1e293b]">
                {convertTemp(selectedDay.maxTempC)}°{tempUnit} (Low {convertTemp(selectedDay.minTempC)}°{tempUnit})
              </strong>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#cbd5e1]">
              <span className="text-[9px] text-[#64748b] block font-bold flex items-center gap-1">
                <CloudRain className="w-3 h-3 text-[#2563eb]" /> PRECIPITATION ACCUMULATION
              </span>
              <strong className="text-sm text-[#2563eb]">{selectedDay.precipitationMm} mm ({selectedDay.precipitationProbability}% prob)</strong>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#cbd5e1]">
              <span className="text-[9px] text-[#64748b] block font-bold flex items-center gap-1">
                <Wind className="w-3 h-3 text-[#0284c7]" /> PEAK SUSTAINED WIND
              </span>
              <strong className="text-sm text-[#1e293b]">{selectedDay.maxWindKnots} Knots ({Math.round(selectedDay.maxWindKnots * 1.852)} km/h)</strong>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#cbd5e1]">
              <span className="text-[9px] text-[#64748b] block font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-[#f97316]" /> PREDICTED RISK SCORE
              </span>
              <strong className="text-sm text-[#ff4757]">{selectedDay.predictedRiskScore} / 100</strong>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-black/5 border border-black/10 text-xs text-[#334155] leading-relaxed">
            <strong className="text-[#1e293b]">Causal Meteorological Assessment:</strong> {selectedDay.explainableLogic}
          </div>
        </div>
      )}

      {/* AI Weather Early Warning Bulletin Section */}
      <div className="panel-raised p-4 rounded-xl border border-[#babecc] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#babecc] pb-2">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#ff4757] animate-pulse" />
            <h3 className="text-xs font-mono font-bold text-[#1e293b] uppercase">
              AI METEOROLOGICAL EARLY WARNING BULLETIN // 7-DAY SYNOPTIC OUTLOOK
            </h3>
            {isGrounded && (
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[9px] font-bold flex items-center gap-1">
                <Search className="w-3 h-3 text-blue-600" />
                SEARCH GROUNDED
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleVoice}
              className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold well-recessed border border-[#babecc] text-[#1e293b] flex items-center gap-1.5 hover:bg-[#d5dce6]"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'text-[#22c55e] animate-bounce' : 'text-gray-500'}`} />
              <span>{isSpeaking ? 'STOP AUDIO' : 'READ BULLETIN'}</span>
            </button>

            <TactileButton
              size="sm"
              variant="orange"
              disabled={generatingAdvisory}
              icon={<Search className="w-3.5 h-3.5" />}
              onClick={handleGenerateAdvisory}
            >
              {generatingAdvisory ? 'QUERYING SATELLITE & MODELS...' : 'RE-SYNTHESIZE BULLETIN'}
            </TactileButton>
          </div>
        </div>

        {/* Advisory Body */}
        {generatingAdvisory ? (
          <div className="well-recessed p-6 rounded-xl font-mono text-xs text-center space-y-2">
            <div className="w-6 h-6 border-2 border-[#ff4757] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="font-bold text-[#1e293b]">
              Synthesizing 7-day meteorological telemetry with global atmospheric models...
            </p>
          </div>
        ) : (
          <div className="well-recessed p-4 rounded-xl font-mono text-xs text-[#2d3436] space-y-3 leading-relaxed whitespace-pre-wrap">
            {advisoryText || 'Click Re-Synthesize to generate authoritative 7-day meteorological weather warnings.'}
          </div>
        )}

        {/* Grounded Search Sources / Citations if available */}
        {sources && sources.length > 0 && (
          <div className="pt-2 border-t border-[#babecc] flex flex-wrap items-center gap-2 text-[10px] font-mono text-[#64748b]">
            <span className="font-bold">METEOROLOGICAL SOURCES:</span>
            {sources.map((s, idx) => (
              <a
                key={idx}
                href={s.web?.uri || '#'}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded bg-white border border-[#cbd5e1] text-[#2563eb] hover:underline flex items-center gap-1 truncate max-w-[200px]"
              >
                <span>{s.web?.title || `Official Bulletin ${idx + 1}`}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
