import React, { useState } from 'react';
import {
  WeatherTelemetry,
  RiverGaugeData,
  SatelliteFeed,
  CitizenReport,
  HazardType,
} from '../../types';
import { HardwareScrew } from '../common/HardwareScrew';
import { VentSlots } from '../common/VentSlots';
import { StatusLed } from '../common/StatusLed';
import { TactileButton } from '../common/TactileButton';
import {
  Activity,
  CloudRain,
  Wind,
  Gauge,
  Satellite,
  MessageSquareWarning,
  Copy,
  Check,
  Zap,
  Terminal,
} from 'lucide-react';
import { playMechanicalClick, playAlarmChirp } from '../../utils/audio';

interface DataIngestionModuleProps {
  hazardType: HazardType;
  weather: WeatherTelemetry;
  riverGauge: RiverGaugeData;
  satellite: SatelliteFeed;
  citizenReports: CitizenReport[];
  isSimulating: boolean;
  onToggleSimulating: () => void;
  onInjectSpike: () => void;
}

export const DataIngestionModule: React.FC<DataIngestionModuleProps> = ({
  hazardType,
  weather,
  riverGauge,
  satellite,
  citizenReports,
  isSimulating,
  onToggleSimulating,
  onInjectSpike,
}) => {
  const [activeTab, setActiveTab] = useState<'normalized' | 'raw_json'>('normalized');
  const [copied, setCopied] = useState(false);

  // Generate normalized telemetry payload JSON
  const telemetryPayload = {
    schema_version: '2.4-OASIS-CAP-v1.2',
    timestamp_utc: new Date().toISOString(),
    hazard_regime: hazardType,
    sensor_array: {
      meteorological: {
        rainfall_rate_mm_hr: weather.rainfallMmHr,
        wind_speed_knots: weather.windKnots,
        wind_gust_knots: weather.gustKnots,
        barometric_pressure_hpa: weather.pressureHpa,
        surface_temp_c: weather.temperatureC,
        relative_humidity_pct: weather.humidityPercent,
      },
      hydrological: {
        station_id: riverGauge.stationId,
        river_name: riverGauge.riverName,
        current_stage_meters: riverGauge.currentLevelM,
        danger_threshold_meters: riverGauge.dangerLevelM,
        discharge_rate_cumec: riverGauge.dischargeCumec,
        breach_active: riverGauge.breachStatus,
        flow_trend: riverGauge.trend,
      },
      orbital_remote_sensing: {
        satellite_id: satellite.satelliteName,
        orbit_pass_utc: satellite.orbitPassTime,
        radar_reflectivity_dbz: satellite.radarReflectivityDbz,
        soil_moisture_index: satellite.soilMoistureIndex,
        cloud_top_temp_c: satellite.cloudTopTempC,
        estimated_inundation_sq_km: satellite.inundationAreaSqKm,
      },
      citizen_reports_ingested: citizenReports.length,
    },
  };

  const handleCopyJson = () => {
    playMechanicalClick();
    navigator.clipboard.writeText(JSON.stringify(telemetryPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpike = () => {
    playAlarmChirp();
    onInjectSpike();
  };

  return (
    <div className="relative w-full rounded-xl panel-raised border border-[#babecc] p-4 flex flex-col">
      <HardwareScrew className="absolute top-2.5 left-2.5" angle={12} />
      <HardwareScrew className="absolute top-2.5 right-2.5" angle={-32} />

      {/* Module Title & Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 mb-3 border-b border-[#babecc]/50 select-none">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#ff4757]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2d3436]">
            MODULE 01: REAL-TIME HAZARD DETECTION & DATA INGESTION
          </h2>
          <StatusLed color={isSimulating ? 'green' : 'amber'} pulse={isSimulating} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          {/* Inject Spike Key */}
          <TactileButton
            size="sm"
            variant="orange"
            icon={<Zap className="w-3.5 h-3.5" />}
            onClick={handleSpike}
            title="Inject real-time extreme meteorological surge"
          >
            INJECT SENSOR SPIKE
          </TactileButton>

          {/* Simulation Stream Key */}
          <TactileButton
            size="sm"
            active={isSimulating}
            ledColor={isSimulating ? 'green' : 'amber'}
            onClick={onToggleSimulating}
          >
            {isSimulating ? 'FEED: LIVE' : 'FEED: FROZEN'}
          </TactileButton>

          <VentSlots count={3} className="hidden sm:flex ml-1" />
        </div>
      </div>

      {/* Normalized Data Feeds Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* 1. Meteorological Feed */}
        <div className="well-recessed p-3 rounded-lg border border-[#babecc]/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#2d3436]">
              <CloudRain className="w-4 h-4 text-[#3b82f6]" />
              <span>METEOROLOGICAL</span>
            </div>
            <span className="text-[10px] font-mono text-[#ff4757] font-bold">AWS-LIVE</span>
          </div>

          <div className="space-y-1 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono text-[#4a5568]">RAINFALL:</span>
              <span className="text-base font-mono font-bold text-[#ff4757]">
                {weather.rainfallMmHr.toFixed(1)} <small className="text-xs">mm/h</small>
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono text-[#4a5568]">WIND SPEED:</span>
              <span className="text-xs font-mono font-bold text-[#2d3436]">
                {weather.windKnots} kts (GUST {weather.gustKnots})
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono text-[#4a5568]">BAROMETER:</span>
              <span className="text-xs font-mono font-bold text-[#2d3436]">
                {weather.pressureHpa.toFixed(1)} hPa
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-[#babecc]/50 flex justify-between items-center text-[9px] font-mono text-[#4a5568]">
            <span>TEMP: {weather.temperatureC}°C</span>
            <span>HUMIDITY: {weather.humidityPercent}%</span>
          </div>
        </div>

        {/* 2. Hydrological River Gauge Feed */}
        <div className="well-recessed p-3 rounded-lg border border-[#babecc]/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#2d3436]">
              <Gauge className="w-4 h-4 text-[#ff4757]" />
              <span>RIVER GAUGES</span>
            </div>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                riverGauge.breachStatus
                  ? 'bg-[#ff4757] text-white animate-pulse'
                  : 'bg-[#22c55e] text-white'
              }`}
            >
              {riverGauge.breachStatus ? 'STAGE BREACH' : 'NORMAL'}
            </span>
          </div>

          <div className="space-y-1 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono text-[#4a5568]">STAGE LEVEL:</span>
              <span className="text-base font-mono font-bold text-[#ff4757]">
                {riverGauge.currentLevelM.toFixed(1)}m
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono text-[#4a5568]">DANGER MARK:</span>
              <span className="text-xs font-mono font-bold text-[#2d3436]">
                {riverGauge.dangerLevelM.toFixed(1)}m ({riverGauge.currentLevelM > riverGauge.dangerLevelM ? `+${(riverGauge.currentLevelM - riverGauge.dangerLevelM).toFixed(1)}m` : 'SAFE'})
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono text-[#4a5568]">DISCHARGE:</span>
              <span className="text-xs font-mono font-bold text-[#2d3436]">
                {riverGauge.dischargeCumec.toLocaleString()} m³/s
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-[#babecc]/50 flex justify-between items-center text-[9px] font-mono text-[#4a5568]">
            <span className="truncate max-w-[120px]">{riverGauge.stationId}</span>
            <span className="uppercase text-[#ff4757] font-bold">TREND: {riverGauge.trend}</span>
          </div>
        </div>

        {/* 3. Satellite Remote Sensing Feed */}
        <div className="well-recessed p-3 rounded-lg border border-[#babecc]/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#2d3436]">
              <Satellite className="w-4 h-4 text-[#3b82f6]" />
              <span>ORBITAL SAR FEED</span>
            </div>
            <span className="text-[10px] font-mono text-[#22c55e] font-bold">ORBIT PASS</span>
          </div>

          <div className="space-y-1 my-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono text-[#4a5568]">INUNDATION:</span>
              <span className="text-base font-mono font-bold text-[#2d3436]">
                {satellite.inundationAreaSqKm.toFixed(1)} <small className="text-xs">km²</small>
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono text-[#4a5568]">REFLECTIVITY:</span>
              <span className="text-xs font-mono font-bold text-[#2d3436]">
                {satellite.radarReflectivityDbz} dBZ
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-mono text-[#4a5568]">SOIL MOISTURE:</span>
              <span className="text-xs font-mono font-bold text-[#2d3436]">
                {(satellite.soilMoistureIndex * 100).toFixed(0)}% SATURATION
              </span>
            </div>
          </div>

          <div className="pt-1.5 border-t border-[#babecc]/50 flex justify-between items-center text-[9px] font-mono text-[#4a5568]">
            <span className="truncate max-w-[110px]">{satellite.satelliteName}</span>
            <span>PASS: {satellite.orbitPassTime}</span>
          </div>
        </div>

        {/* 4. Citizen Crowdsourced Reports */}
        <div className="well-recessed p-3 rounded-lg border border-[#babecc]/60 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#2d3436]">
              <MessageSquareWarning className="w-4 h-4 text-[#f59e0b]" />
              <span>CITIZEN GROUND TRUTH</span>
            </div>
            <span className="text-[10px] font-mono text-[#f59e0b] font-bold">
              {citizenReports.length} VERIFIED
            </span>
          </div>

          <div className="space-y-1.5 my-1 overflow-y-auto max-h-[85px]">
            {citizenReports.slice(0, 2).map((rep) => (
              <div key={rep.id} className="p-1.5 rounded bg-[#f0f2f5] border border-[#babecc]/70 text-[10px] font-mono">
                <div className="flex justify-between items-center text-[9px] text-[#4a5568] font-bold">
                  <span>{rep.locationName}</span>
                  <span className="text-[#22c55e]">{rep.confidenceScore}% CONF</span>
                </div>
                <p className="text-[#2d3436] line-clamp-1 mt-0.5">{rep.description}</p>
              </div>
            ))}
          </div>

          <div className="pt-1 border-t border-[#babecc]/50 flex justify-between items-center text-[9px] font-mono text-[#4a5568]">
            <span>NLP FILTER: ACTIVE</span>
            <span>LATENCY: 1.2s</span>
          </div>
        </div>
      </div>

      {/* Recessed Dark CRT Monitor for JSON Ingestion Payload Viewer */}
      <div className="rounded-lg bg-[#1a1f2c] border-2 border-[#3d4552] p-3 shadow-[inset_4px_4px_10px_#000000] relative overflow-hidden">
        {/* Subtle CRT Phosphor Scanlines inside monitor */}
        <div className="absolute inset-0 crt-overlay pointer-events-none opacity-60" />

        {/* CRT Bezel Top Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#3d4552] relative z-10">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#22c55e]" />
            <span className="text-xs font-mono font-bold text-[#22c55e] tracking-wider uppercase">
              RECESSED CRT MONITOR // INGESTION PACKET BUS
            </span>
            <span className="px-1.5 py-0.2 rounded bg-[#22c55e]/20 text-[#22c55e] text-[9px] font-mono border border-[#22c55e]/40">
              BUFFER: 64 KB
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded bg-[#2d3436] p-0.5 border border-[#4a5568]">
              <button
                type="button"
                onClick={() => {
                  playMechanicalClick();
                  setActiveTab('normalized');
                }}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-all ${
                  activeTab === 'normalized'
                    ? 'bg-[#22c55e] text-[#1a1f2c]'
                    : 'text-[#a4b0be] hover:text-white'
                }`}
              >
                SUMMARY VIEW
              </button>
              <button
                type="button"
                onClick={() => {
                  playMechanicalClick();
                  setActiveTab('raw_json');
                }}
                className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-all ${
                  activeTab === 'raw_json'
                    ? 'bg-[#22c55e] text-[#1a1f2c]'
                    : 'text-[#a4b0be] hover:text-white'
                }`}
              >
                RAW JSON PACKET
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyJson}
              className="p-1 rounded bg-[#2d3436] text-[#a4b0be] hover:text-[#22c55e] border border-[#4a5568] transition-colors"
              title="Copy Normalized JSON Payload"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* CRT Display Content */}
        <div className="relative z-10 max-h-48 overflow-y-auto font-mono text-xs text-[#22c55e] p-2 bg-[#12161f]/80 rounded border border-[#2d3436]">
          {activeTab === 'raw_json' ? (
            <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#22c55e]">
              {JSON.stringify(telemetryPayload, null, 2)}
            </pre>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-[#a4b0be] block">// METEOROLOGICAL TELEMETRY</span>
                <p>PRECIPITATION: {weather.rainfallMmHr.toFixed(1)} mm/h</p>
                <p>VELOCITY: {weather.windKnots} kts [GUST {weather.gustKnots}]</p>
                <p>SURFACE PRESSURE: {weather.pressureHpa} hPa</p>
              </div>
              <div>
                <span className="text-[#a4b0be] block">// HYDROLOGY SENSOR BUS</span>
                <p>STATION ID: {riverGauge.stationId}</p>
                <p>STAGE LEVEL: {riverGauge.currentLevelM}m [DANGER: {riverGauge.dangerLevelM}m]</p>
                <p>STATUS: {riverGauge.breachStatus ? 'CRITICAL DYKE OVERFLOW' : 'NOMINAL'}</p>
              </div>
              <div>
                <span className="text-[#a4b0be] block">// ORBITAL REMOTE SENSING</span>
                <p>RADAR REFLECTIVITY: {satellite.radarReflectivityDbz} dBZ</p>
                <p>SOIL SATURATION: {(satellite.soilMoistureIndex * 100).toFixed(0)}%</p>
                <p>INUNDATION FOOTPRINT: {satellite.inundationAreaSqKm} km²</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
