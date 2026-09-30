import React, { useState, useEffect } from 'react';
import {
  HazardType,
  LocationHazardForecast,
  CycloneTrackData,
} from '../../types';
import { HardwareScrew } from '../common/HardwareScrew';
import { VentSlots } from '../common/VentSlots';
import { StatusLed } from '../common/StatusLed';
import { TactileButton } from '../common/TactileButton';
import {
  CloudRain,
  Wind,
  Gauge,
  Clock,
  MapPin,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Globe,
  Radio,
  Search,
  CheckCircle2,
  Waves,
  Eye,
  Sliders,
  Layers,
  Navigation2,
  RefreshCw,
} from 'lucide-react';
import { playMechanicalClick, playAlarmChirp, playSuccessChime } from '../../utils/audio';
import { fetchLiveWeatherForCoordinates, getUserCurrentLocation, LiveWeatherReport } from '../../utils/openMeteoApi';
import { formatTimeHHMM, addHours } from '../../utils/timeFormatters';

interface RealTimeHazardMatrixModuleProps {
  hazardType: HazardType;
  locations: LocationHazardForecast[];
  cycloneTrack?: CycloneTrackData;
  timeOffsetHours: number;
  onTimeOffsetChange: (offset: number) => void;
  onFocusLocation: (coords: [number, number], zoom?: number) => void;
  selectedLocationId: string | null;
  onSelectLocation: (loc: LocationHazardForecast) => void;
}

export const RealTimeHazardMatrixModule: React.FC<RealTimeHazardMatrixModuleProps> = ({
  hazardType,
  locations,
  cycloneTrack,
  timeOffsetHours,
  onTimeOffsetChange,
  onFocusLocation,
  selectedLocationId,
  onSelectLocation,
}) => {
  const [isPlayingTimeline, setIsPlayingTimeline] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'heavy'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [autoSync, setAutoSync] = useState(true);
  const [syncCountdown, setSyncCountdown] = useState(30);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Live Open-Meteo fetch state
  const [isQueryingLive, setIsQueryingLive] = useState(false);
  const [liveReport, setLiveReport] = useState<LiveWeatherReport | null>(null);
  const [liveQueryCoords, setLiveQueryCoords] = useState<{ lat: number; lng: number }>({
    lat: 17.712,
    lng: 83.255,
  });

  // Keep current time updated every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-sync live meteorological satellite data
  useEffect(() => {
    // Initial fetch on mount for primary sector
    handleQueryLiveOpenMeteo(liveQueryCoords.lat, liveQueryCoords.lng, 'Sector Telemetry Hub');

    const interval = setInterval(() => {
      if (!autoSync) return;
      setSyncCountdown((prev) => {
        if (prev <= 1) {
          handleQueryLiveOpenMeteo(liveQueryCoords.lat, liveQueryCoords.lng, 'Sector Telemetry Hub');
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoSync, liveQueryCoords.lat, liveQueryCoords.lng]);

  // Timeline scrubber steps with dynamic real-time hours
  const timelineSteps = [
    { offset: 0, label: `${formatTimeHHMM(currentTime)} (LIVE NOW)`, desc: 'Present Conditions' },
    { offset: 2, label: `${formatTimeHHMM(addHours(currentTime, 2))} (+2H)`, desc: 'Outer Rain Bands Hit' },
    { offset: 4, label: `${formatTimeHHMM(addHours(currentTime, 4))} (+4H PEAK)`, desc: 'Landfall Core Window' },
    { offset: 6, label: `${formatTimeHHMM(addHours(currentTime, 6))} (+6H)`, desc: 'Estuary Surge Crossing' },
    { offset: 12, label: `${formatTimeHHMM(addHours(currentTime, 12))} (+12H)`, desc: 'Terrace Depressive Rain' },
    { offset: 24, label: `${formatTimeHHMM(addHours(currentTime, 24))} (+24H)`, desc: 'Subsidence & Recovery' },
  ];

  // Auto-play timeline simulation
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const interval = setInterval(() => {
      onTimeOffsetChange(
        timelineSteps[(timelineSteps.findIndex((s) => s.offset === timeOffsetHours) + 1) % timelineSteps.length].offset
      );
    }, 4500);
    return () => clearInterval(interval);
  }, [isPlayingTimeline, timeOffsetHours]);

  const handleQueryLiveOpenMeteo = async (lat: number, lng: number, name?: string) => {
    setIsQueryingLive(true);
    try {
      const report = await fetchLiveWeatherForCoordinates(lat, lng, name);
      setLiveReport(report);
    } catch {
      // Graceful fallback
    } finally {
      setIsQueryingLive(false);
    }
  };

  const handleLocateMe = async () => {
    playMechanicalClick();
    setIsLocatingGps(true);
    setGpsError(null);
    try {
      const pos = await getUserCurrentLocation();
      setLiveQueryCoords(pos);
      onFocusLocation([pos.lat, pos.lng], 13);
      await handleQueryLiveOpenMeteo(pos.lat, pos.lng, 'My Live Physical Location');
      playSuccessChime();
    } catch (err: any) {
      playAlarmChirp();
      setGpsError(err.message || 'Unable to retrieve device GPS. Please grant browser location permission.');
    } finally {
      setIsLocatingGps(false);
    }
  };

  const filteredLocations = locations.filter((loc) => {
    if (filterSeverity === 'critical' && loc.severityLevel !== 'critical') return false;
    if (filterSeverity === 'heavy' && (loc.severityLevel !== 'critical' && loc.severityLevel !== 'high')) return false;
    if (searchQuery && !loc.locationName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Active track point based on selected timeline offset
  const activeTrackPoint = cycloneTrack?.trackPoints.find(
    (tp) => tp.timeOffsetHours === timeOffsetHours
  ) || cycloneTrack?.trackPoints[2];

  return (
    <div className="relative w-full rounded-xl panel-raised border border-[#babecc] p-4 flex flex-col">
      <HardwareScrew className="absolute top-2.5 left-2.5" angle={15} />
      <HardwareScrew className="absolute top-2.5 right-2.5" angle={-25} />
      <HardwareScrew className="absolute bottom-2.5 left-2.5" angle={60} />
      <HardwareScrew className="absolute bottom-2.5 right-2.5" angle={-45} />

      {/* Module Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 mb-3 border-b border-[#babecc]/50 select-none">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#ff4757] animate-pulse" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2d3436]">
            REAL-TIME WEATHER & HAZARD CHRONOLOGY // LOCATION TIMELINE MATRIX
          </h2>
          <span className="px-1.5 py-0.5 rounded bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 text-[9px] font-mono font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-ping" />
            LIVE TELEMETRY
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* GPS Auto-Locate Button */}
          <TactileButton
            size="sm"
            icon={<Navigation2 className={`w-3.5 h-3.5 ${isLocatingGps ? 'animate-spin text-[#ff4757]' : 'text-[#0284c7]'}`} />}
            onClick={handleLocateMe}
            disabled={isLocatingGps}
            title="Detect real device GPS coordinates and display local real-time hazard status"
          >
            {isLocatingGps ? 'LOCATING GPS...' : 'USE MY REAL GPS'}
          </TactileButton>

          {/* Auto-Sync Satellite Toggle */}
          <TactileButton
            size="sm"
            active={autoSync}
            ledColor={autoSync ? 'green' : undefined}
            icon={<RefreshCw className={`w-3 h-3 ${isQueryingLive ? 'animate-spin text-[#22c55e]' : ''}`} />}
            onClick={() => {
              playMechanicalClick();
              setAutoSync(!autoSync);
            }}
            title="Auto-poll live Open-Meteo satellite feed every 30 seconds"
          >
            {autoSync ? `LIVE SYNC (${syncCountdown}s)` : 'AUTO-SYNC OFF'}
          </TactileButton>

          <div className="flex items-center gap-1.5 well-recessed px-2.5 py-1 rounded-md text-[11px] font-mono border border-[#babecc]">
            <span className="text-[#4a5568]">OFFSET:</span>
            <strong className="text-[#ff4757]">
              {timeOffsetHours === 0 ? `${formatTimeHHMM(currentTime)} (NOW)` : `+${timeOffsetHours}H FORECAST`}
            </strong>
          </div>
          <VentSlots count={3} />
        </div>
      </div>

      {gpsError && (
        <div className="mb-3 px-3 py-1.5 rounded-md bg-red-100 border border-red-300 text-red-700 font-mono text-xs flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* Timeline Scrubber & Hazard Progress Bar */}
      <div className="well-recessed p-3 rounded-xl border border-[#babecc] mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#0284c7]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#2d3436]">
              INTERACTIVE FORECAST CHRONOMETER // HEAVY WEATHER ONSET SLIDER
            </span>
          </div>

          {/* Scrubber Play / Step Controls */}
          <div className="flex items-center gap-1.5">
            <TactileButton
              size="sm"
              variant={isPlayingTimeline ? 'orange' : 'standard'}
              icon={isPlayingTimeline ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              onClick={() => {
                playMechanicalClick();
                setIsPlayingTimeline(!isPlayingTimeline);
              }}
              title="Automatically simulate forward timeline progression"
            >
              {isPlayingTimeline ? 'AUTO-PLAYING' : 'RUN SIMULATION'}
            </TactileButton>

            <TactileButton
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={() => {
                playMechanicalClick();
                onTimeOffsetChange(0);
                setIsPlayingTimeline(false);
              }}
              title="Reset time scrubber to current live telemetry"
            >
              RESET TO NOW
            </TactileButton>
          </div>
        </div>

        {/* Tactile Hardware Buttons for Forecast Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
          {timelineSteps.map((step) => {
            const isActive = timeOffsetHours === step.offset;
            return (
              <button
                key={step.offset}
                type="button"
                onClick={() => {
                  playMechanicalClick();
                  onTimeOffsetChange(step.offset);
                }}
                className={`relative px-2.5 py-2 rounded-lg font-mono text-left transition-all ${
                  isActive
                    ? 'bg-[#2d3436] text-white shadow-[inset_2px_2px_4px_#000000] border-2 border-[#ff4757]'
                    : 'bg-[#e0e5ec] text-[#2d3436] border border-[#babecc] hover:bg-[#d1d9e6] shadow-[2px_2px_5px_#babecc,-2px_-2px_5px_#ffffff]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-bold ${isActive ? 'text-[#ff4757]' : 'text-[#2d3436]'}`}>
                    {step.label}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-[#ff4757] shadow-[0_0_8px_#ff4757]' : 'bg-[#a4b0be]'
                    }`}
                  />
                </div>
                <div className="text-[9px] mt-0.5 opacity-80 truncate">
                  {step.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Chronometer Status Banner */}
        {cycloneTrack && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#1e272e] text-[#f1f2f6] text-[11px] font-mono border border-[#4a5568]">
            <div className="flex items-center gap-2">
              <span className="text-[#38bdf8] font-bold">CYCLONE TRACK TELEMETRY:</span>
              <span className="text-white font-semibold">
                {activeTrackPoint?.stageLabel || 'Approaching coastline'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-amber-400">
                EYE: [{activeTrackPoint?.coordinates[0].toFixed(2)}°N, {activeTrackPoint?.coordinates[1].toFixed(2)}°E]
              </span>
              <span className="text-[#ff4757] font-bold">
                WINDS: {activeTrackPoint?.windKnots} KT (GUSTS {activeTrackPoint?.gustKnots} KT)
              </span>
              <span className="text-sky-300">
                PRESSURE: {activeTrackPoint?.pressureHpa} hPa
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Search, Severity Filter & Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 select-none">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#4a5568]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location (e.g. Paradip, Puri, Cuttack)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md well-recessed text-xs font-mono text-[#2d3436] placeholder-[#4a5568]/70 border border-[#babecc] focus:outline-none focus:border-[#ff4757]"
            />
          </div>
        </div>

        {/* Severity Toggle Filter */}
        <div className="flex items-center gap-1.5 bg-[#d1d9e6] p-1 rounded-md border border-[#babecc] text-[10px] font-mono font-bold">
          <span className="text-[#4a5568] px-1.5">FILTER:</span>
          <button
            type="button"
            onClick={() => setFilterSeverity('all')}
            className={`px-2 py-0.5 rounded transition-all ${
              filterSeverity === 'all'
                ? 'bg-[#2d3436] text-white shadow-sm'
                : 'text-[#4a5568] hover:text-[#2d3436]'
            }`}
          >
            ALL SECTORS ({locations.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('critical')}
            className={`px-2 py-0.5 rounded transition-all ${
              filterSeverity === 'critical'
                ? 'bg-[#ff4757] text-white shadow-sm'
                : 'text-[#4a5568] hover:text-[#ff4757]'
            }`}
          >
            CRITICAL ONLY
          </button>
          <button
            type="button"
            onClick={() => setFilterSeverity('heavy')}
            className={`px-2 py-0.5 rounded transition-all ${
              filterSeverity === 'heavy'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-[#4a5568] hover:text-amber-700'
            }`}
          >
            HEAVY RAIN ACTIVE
          </button>
        </div>
      </div>

      {/* Main Locations Cards Grid ("At which location cyclone or rain will be heavy from what time") */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {filteredLocations.map((loc) => {
          const isSelected = selectedLocationId === loc.locationId;
          const currentTimelinePoint =
            loc.hourlyTimeline.find((pt) => pt.timeOffsetHours === timeOffsetHours) ||
            loc.hourlyTimeline[0];

          const rainRate = currentTimelinePoint ? currentTimelinePoint.rainfallMmHr : loc.currentCondition.rainfallMmHr;
          const windRate = currentTimelinePoint ? currentTimelinePoint.windKnots : loc.currentCondition.windKnots;
          const isHeavyNow = rainRate >= 75.0 || windRate >= 80;

          return (
            <div
              key={loc.locationId}
              onClick={() => {
                playMechanicalClick();
                onSelectLocation(loc);
              }}
              className={`relative rounded-xl p-3.5 flex flex-col justify-between cursor-pointer transition-all select-none ${
                isSelected
                  ? 'panel-raised border-2 border-[#ff4757] shadow-[6px_6px_12px_#babecc,-6px_-6px_12px_#ffffff]'
                  : 'panel-raised border border-[#babecc] hover:border-[#4a5568]'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-1 mb-1.5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-[#0284c7] font-bold">
                      {loc.sectorCode} // ELEV: {loc.elevationM}m
                    </span>
                    <h3 className="text-sm font-bold font-mono text-[#2d3436] leading-tight">
                      {loc.locationName}
                    </h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase ${
                      loc.severityLevel === 'critical'
                        ? 'bg-[#ff4757] text-white shadow-[0_0_6px_#ff4757]'
                        : loc.severityLevel === 'high'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {loc.severityLevel}
                  </span>
                </div>

                <div className="text-[11px] font-mono font-semibold text-[#ff4757] mb-2 leading-tight">
                  {loc.hazardTitle}
                </div>

                {/* EXACT TIME WINDOW BOX (Key User Requirement) */}
                <div className="well-recessed p-2.5 rounded-lg border border-[#babecc] space-y-1.5 font-mono text-[11px] mb-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[#babecc]/60">
                    <span className="text-[#4a5568] flex items-center gap-1 font-bold">
                      <Clock className="w-3 h-3 text-[#ff4757]" />
                      HEAVY RAIN / GALE WINDOW:
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-[#ff4757]/15 text-[#ff4757] font-bold text-[10px]">
                      {loc.peakWindowLabel}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#4a5568]">HEAVY STARTS:</span>
                    <strong className="text-[#2d3436]">{loc.heavyStartTime}</strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#4a5568]">PEAK MAXIMUM:</span>
                    <strong className="text-[#ff4757] bg-red-100/60 px-1 rounded">
                      {loc.heavyPeakTime}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-[#4a5568]">RECEDING BY:</span>
                    <strong className="text-[#4a5568]">{loc.heavyEndTime}</strong>
                  </div>
                </div>

                {/* Real-Time Condition Readouts at Selected Timeline Hour */}
                <div className="grid grid-cols-3 gap-2 mb-2 font-mono text-[10px]">
                  <div className="well-recessed p-1.5 rounded border border-[#babecc] text-center">
                    <div className="text-[#4a5568] text-[9px] flex items-center justify-center gap-0.5">
                      <CloudRain className="w-2.5 h-2.5 text-blue-500" /> RAIN
                    </div>
                    <div className={`font-bold text-xs ${rainRate >= 100 ? 'text-[#ff4757]' : 'text-[#2d3436]'}`}>
                      {rainRate} <span className="text-[8px]">mm/h</span>
                    </div>
                  </div>

                  <div className="well-recessed p-1.5 rounded border border-[#babecc] text-center">
                    <div className="text-[#4a5568] text-[9px] flex items-center justify-center gap-0.5">
                      <Wind className="w-2.5 h-2.5 text-sky-500" /> WIND
                    </div>
                    <div className={`font-bold text-xs ${windRate >= 80 ? 'text-[#ff4757]' : 'text-[#2d3436]'}`}>
                      {windRate} <span className="text-[8px]">kt</span>
                    </div>
                  </div>

                  <div className="well-recessed p-1.5 rounded border border-[#babecc] text-center">
                    <div className="text-[#4a5568] text-[9px] flex items-center justify-center gap-0.5">
                      <Waves className="w-2.5 h-2.5 text-cyan-600" /> SURGE
                    </div>
                    <div className="font-bold text-xs text-[#2d3436]">
                      {loc.peakSurgeMeters ? `+${loc.peakSurgeMeters}m` : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* 24-Hour Rainfall Chrono-Graph Bars */}
                <div className="well-recessed p-2 rounded-lg border border-[#babecc] mb-2 font-mono">
                  <div className="flex justify-between items-center text-[9px] text-[#4a5568] mb-1">
                    <span>24H INTENSITY PROFILE</span>
                    <span className="text-[#ff4757] font-bold">TOTAL: {loc.totalExpectedRainfallMm}mm</span>
                  </div>
                  <div className="flex items-end gap-1 h-8 px-1">
                    {loc.hourlyTimeline.map((pt, i) => {
                      const heightPct = Math.min(100, Math.max(15, (pt.rainfallMmHr / 220) * 100));
                      const isStepActive = pt.timeOffsetHours === timeOffsetHours;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end group">
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full rounded-t-sm transition-all ${
                              isStepActive
                                ? 'bg-[#ff4757] ring-1 ring-white'
                                : pt.rainfallMmHr >= 100
                                ? 'bg-red-500'
                                : pt.rainfallMmHr >= 50
                                ? 'bg-amber-500'
                                : 'bg-sky-400'
                            }`}
                            title={`${pt.timestamp}: ${pt.rainfallMmHr} mm/h (${pt.hazardSeverity})`}
                          />
                          <span className="text-[7px] text-[#4a5568]">{pt.label.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Advisory Notice */}
                <p className="text-[10px] font-mono text-[#4a5568] line-clamp-2 leading-relaxed">
                  {loc.advisoryAlert}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#babecc]/50">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playMechanicalClick();
                    onFocusLocation(loc.coordinates, 13);
                  }}
                  className="flex-1 py-1 px-2 rounded-md font-mono text-[10px] font-bold bg-[#e0e5ec] text-[#2d3436] border border-[#babecc] shadow-[2px_2px_4px_#babecc,-2px_-2px_4px_#ffffff] hover:bg-[#d1d9e6] active:translate-y-[1px] flex items-center justify-center gap-1"
                >
                  <MapPin className="w-3 h-3 text-[#ff4757]" />
                  FOCUS MAP SATELLITE
                </button>

                {loc.evacuationMandatory && (
                  <span className="px-2 py-1 rounded bg-[#ff4757]/15 text-[#ff4757] font-mono font-bold text-[9px] border border-[#ff4757]/40">
                    EVAC ORDER
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Global Satellite Weather Query Bay (Open-Meteo Integration) */}
      <div className="well-recessed p-3 rounded-xl border border-[#babecc] select-none">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#babecc]/60">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#0284c7]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2d3436]">
              REAL-TIME GLOBAL METEOROLOGICAL STATION QUERY // LIVE SATELLITE RADAR
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#4a5568]">
            DATA SOURCE: OPEN-METEO GLOBAL SATELLITE + WMO GAUGES (ZERO LATENCY)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-8 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-[#4a5568]">LAT:</span>
              <input
                type="number"
                step="0.001"
                value={liveQueryCoords.lat}
                onChange={(e) => setLiveQueryCoords({ ...liveQueryCoords, lat: parseFloat(e.target.value) || 0 })}
                className="w-24 px-2 py-1 rounded well-recessed text-xs font-mono border border-[#babecc]"
              />
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-[#4a5568]">LNG:</span>
              <input
                type="number"
                step="0.001"
                value={liveQueryCoords.lng}
                onChange={(e) => setLiveQueryCoords({ ...liveQueryCoords, lng: parseFloat(e.target.value) || 0 })}
                className="w-24 px-2 py-1 rounded well-recessed text-xs font-mono border border-[#babecc]"
              />
            </div>

            {/* Quick Geo-Preset Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLiveQueryCoords({ lat: 17.712, lng: 83.255 })}
                className="px-2 py-1 rounded text-[10px] font-mono bg-[#e0e5ec] border border-[#babecc] hover:bg-[#d1d9e6]"
              >
                PARADIP PORT
              </button>
              <button
                type="button"
                onClick={() => setLiveQueryCoords({ lat: 20.296, lng: 85.824 })}
                className="px-2 py-1 rounded text-[10px] font-mono bg-[#e0e5ec] border border-[#babecc] hover:bg-[#d1d9e6]"
              >
                MAHANADI DELTA
              </button>
              <button
                type="button"
                onClick={() => setLiveQueryCoords({ lat: 19.813, lng: 85.831 })}
                className="px-2 py-1 rounded text-[10px] font-mono bg-[#e0e5ec] border border-[#babecc] hover:bg-[#d1d9e6]"
              >
                PURI BEACH
              </button>
            </div>
          </div>

          <div className="md:col-span-4 flex justify-end">
            <TactileButton
              variant="orange"
              size="sm"
              icon={<Radio className="w-3.5 h-3.5" />}
              onClick={() => handleQueryLiveOpenMeteo(liveQueryCoords.lat, liveQueryCoords.lng, 'Tactical Target Coordinates')}
              disabled={isQueryingLive}
              className="w-full md:w-auto"
            >
              {isQueryingLive ? 'PINGING SATELLITES...' : 'QUERY LIVE METEOROLOGY'}
            </TactileButton>
          </div>
        </div>

        {/* Live Weather Readout Card if Queried */}
        {liveReport && (
          <div className="mt-3 p-3 rounded-lg bg-[#1e272e] text-[#f1f2f6] font-mono text-xs border border-[#4a5568] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-700 pb-1.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                <span className="font-bold text-white uppercase">
                  LIVE TELEMETRY: {liveReport.placeName} [{liveReport.latitude.toFixed(3)}°N, {liveReport.longitude.toFixed(3)}°E]
                </span>
              </div>
              <span className="text-[10px] text-gray-400">
                STAMP: {liveReport.timestamp}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[11px]">
              <div>
                <span className="text-gray-400 text-[10px] block">CONDITION</span>
                <strong className="text-white">{liveReport.current.weatherDescription}</strong>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">TEMPERATURE</span>
                <strong className="text-white">{liveReport.current.tempC}°C</strong>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">PRECIPITATION</span>
                <strong className={liveReport.current.rainfallMmHr > 10 ? 'text-[#ff4757]' : 'text-white'}>
                  {liveReport.current.rainfallMmHr} mm/h
                </strong>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">WIND SPEED</span>
                <strong className="text-white">{liveReport.current.windKnots} knots</strong>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">WIND GUSTS</span>
                <strong className="text-amber-400">{liveReport.current.gustKnots} knots</strong>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">BAROMETER</span>
                <strong className="text-sky-300">{liveReport.current.pressureHpa} hPa</strong>
              </div>
            </div>

            {liveReport.heavyRainWindow ? (
              <div className="p-2 rounded bg-red-950/50 border border-red-700/60 text-red-200 text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#ff4757]" />
                  HEAVY RAINFALL WINDOW IDENTIFIED:
                </span>
                <span>
                  From <strong>{liveReport.heavyRainWindow.startTime}</strong> to <strong>{liveReport.heavyRainWindow.endTime}</strong> (Peak: {liveReport.heavyRainWindow.peakTime})
                </span>
              </div>
            ) : (
              <div className="p-1.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-[10px]">
                NO SEVERE RAINFALL ALERT WITHIN 24-HOUR RADAR SWEEP AT THESE COORDINATES.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
