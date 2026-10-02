import React, { useState, useEffect } from 'react';
import {
  HazardType,
  CrisisZone,
  EmergencyResource,
  EvacuationRoute,
  IncidentEventLog,
  WeatherTelemetry,
  RiverGaugeData,
  SatelliteFeed,
  CitizenReport,
  LocationHazardForecast,
} from './types';
import { HAZARD_DATASETS } from './data/mockDisasterData';
import {
  HAZARD_LOCATIONS_MAP,
  REALTIME_CYCLONE_TRACK,
  getRealtimeHazardLocations,
  getRealtimeCycloneTrack,
} from './data/hazardForecastData';
import { ConsoleHeader } from './components/common/ConsoleHeader';
import { RotarySelector } from './components/common/RotarySelector';
import { TactileButton } from './components/common/TactileButton';
import { TacticalMap } from './components/map/TacticalMap';
import { RealTimeHazardMatrixModule } from './components/modules/RealTimeHazardMatrixModule';
import { DataIngestionModule } from './components/modules/DataIngestionModule';
import { RiskAssessmentModule } from './components/modules/RiskAssessmentModule';
import { ResourcePlanningModule } from './components/modules/ResourcePlanningModule';
import { EvacuationRoutingModule } from './components/modules/EvacuationRoutingModule';
import { EventStreamModule } from './components/modules/EventStreamModule';
import { GeminiChatBotModule } from './components/modules/GeminiChatBotModule';
import { MultimodalAdvisory } from './components/modules/MultimodalAdvisory';
import { EmergencyBroadcastModal } from './components/modals/EmergencyBroadcastModal';
import { TactileAiCopilotDrawer } from './components/modals/TactileAiCopilotDrawer';
import {
  LayoutDashboard,
  Map,
  Activity,
  Calculator,
  Boxes,
  Navigation,
  Terminal,
  ShieldAlert,
  HelpCircle,
  Bot,
  Clock,
  Sprout,
  CloudRain,
} from 'lucide-react';
import { playMechanicalClick, playAlarmChirp, playSuccessChime } from './utils/audio';
import { formatTimeHHMMSS, formatTimeHHMM, addHours, addMinutes } from './utils/timeFormatters';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { PWAInstallButton } from './components/common/PWAInstallButton';

export default function App() {
  // Master Hazard Regime State
  const [currentHazard, setCurrentHazard] = useState<HazardType>('cyclone');
  const dataset = HAZARD_DATASETS[currentHazard];

  // Dynamic state derived from current hazard dataset
  const [weather, setWeather] = useState<WeatherTelemetry>(dataset.weather);
  const [riverGauge, setRiverGauge] = useState<RiverGaugeData>(dataset.riverGauge);
  const [satellite, setSatellite] = useState<SatelliteFeed>(dataset.satellite);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>(dataset.citizenReports);
  const [zones, setZones] = useState<CrisisZone[]>(dataset.zones);
  const [resources, setResources] = useState<EmergencyResource[]>(dataset.resources);
  const [routes, setRoutes] = useState<EvacuationRoute[]>(dataset.routes);
  // Initialize logs with real-time timestamps relative to right now
  const initializeRealtimeLogs = (rawLogs: IncidentEventLog[]) => {
    const now = new Date();
    return rawLogs.map((l, idx) => ({
      ...l,
      timestamp: formatTimeHHMMSS(addMinutes(now, -idx * 2)),
    }));
  };

  const [logs, setLogs] = useState<IncidentEventLog[]>(initializeRealtimeLogs(dataset.logs));
  const [selectedZone, setSelectedZone] = useState<CrisisZone | null>(dataset.zones[0] || null);

  // Real-time weather and hazard locations state generated dynamically from current clock
  const [locations, setLocations] = useState<LocationHazardForecast[]>(
    getRealtimeHazardLocations(currentHazard, new Date())
  );
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);
  const [selectedLocation, setSelectedLocation] = useState<LocationHazardForecast | null>(
    getRealtimeHazardLocations(currentHazard, new Date())[0] || null
  );

  // Map camera position state
  const [mapCenter, setMapCenter] = useState<[number, number]>(dataset.mapCenter);
  const [mapZoom, setMapZoom] = useState<number>(dataset.zoom);

  // Active module view navigation
  const [activeTab, setActiveTab] = useState<
    'all' | 'map' | 'matrix' | 'ingestion' | 'risk' | 'resources' | 'evac' | 'logs' | 'copilot' | 'advisory'
  >('matrix');

  // Google Maps Platform Quota Exceeded Defense
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Simulation loop toggle
  const [isSimulating, setIsSimulating] = useState(true);

  // Emergency Broadcast Modal
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Quick Slide-over AI Copilot Drawer State
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // When hazard switches, reload dataset baseline with real-time timestamps
  useEffect(() => {
    const newDs = HAZARD_DATASETS[currentHazard];
    const now = new Date();
    setWeather(newDs.weather);
    setRiverGauge(newDs.riverGauge);
    setSatellite(newDs.satellite);
    setCitizenReports(newDs.citizenReports);
    setZones(newDs.zones);
    setResources(newDs.resources);
    setRoutes(newDs.routes);
    setLogs(initializeRealtimeLogs(newDs.logs));
    setSelectedZone(newDs.zones[0] || null);

    const newLocs = getRealtimeHazardLocations(currentHazard, now);
    setLocations(newLocs);
    setSelectedLocation(newLocs[0] || null);
    setMapCenter(newDs.mapCenter);
    setMapZoom(newDs.zoom);
    setTimeOffsetHours(0);
  }, [currentHazard]);

  // Keep location hazard timelines synchronized with real-time clock every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setLocations(getRealtimeHazardLocations(currentHazard, new Date()));
    }, 30000);
    return () => clearInterval(timer);
  }, [currentHazard]);

  // Handler: Focus camera on specific hazard location
  const handleFocusLocation = (coords: [number, number], zoom = 13) => {
    setMapCenter(coords);
    setMapZoom(zoom);
  };

  // Live telemetry ingestion simulation ticker (every 8 seconds)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setWeather((prev) => {
        const deltaRain = (Math.random() - 0.45) * 4;
        const deltaWind = (Math.random() - 0.48) * 3;
        return {
          ...prev,
          rainfallMmHr: Math.max(0, parseFloat((prev.rainfallMmHr + deltaRain).toFixed(1))),
          windKnots: Math.max(5, Math.round(prev.windKnots + deltaWind)),
          pressureHpa: parseFloat((prev.pressureHpa + (Math.random() - 0.5) * 0.4).toFixed(1)),
        };
      });

      setRiverGauge((prev) => {
        const deltaStage = (Math.random() - 0.4) * 0.15;
        const nextLevel = parseFloat((prev.currentLevelM + deltaStage).toFixed(2));
        return {
          ...prev,
          currentLevelM: nextLevel,
          breachStatus: nextLevel >= prev.dangerLevelM,
          trend: deltaStage >= 0 ? 'rising' : 'falling',
        };
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Handler: Manual Telemetry Spike
  const handleInjectSpike = () => {
    setWeather((prev) => ({
      ...prev,
      rainfallMmHr: parseFloat((prev.rainfallMmHr + 45.0).toFixed(1)),
      windKnots: prev.windKnots + 22,
      gustKnots: prev.gustKnots + 30,
      pressureHpa: parseFloat((prev.pressureHpa - 8.5).toFixed(1)),
    }));

    setRiverGauge((prev) => ({
      ...prev,
      currentLevelM: parseFloat((prev.currentLevelM + 1.2).toFixed(2)),
      breachStatus: true,
      trend: 'rising',
    }));

    const spikeLog: IncidentEventLog = {
      id: `SPIKE-${Date.now()}`,
      timestamp: formatTimeHHMMSS(new Date()),
      severity: 'CRIT',
      source: 'TELEMETRY',
      message: 'MANUAL INGESTION SURGE INJECTED: Rainfall +45mm/h, River Stage Surcharge +1.2m over threshold.',
      acknowledged: false,
    };
    setLogs((prev) => [spikeLog, ...prev]);
  };

  // Handler: Assign resource to crisis zone
  const handleAssignResource = (resourceId: string, zoneId: string) => {
    setResources((prev) =>
      prev.map((r) =>
        r.id === resourceId ? { ...r, status: 'on_scene', assignedZoneId: zoneId } : r
      )
    );

    const targetZone = zones.find((z) => z.id === zoneId);
    const assignedRes = resources.find((r) => r.id === resourceId);

    const newLog: IncidentEventLog = {
      id: `DISPATCH-${Date.now()}`,
      timestamp: formatTimeHHMMSS(new Date()),
      severity: 'INFO',
      source: 'COMMAND',
      message: `${assignedRes?.callsign || 'ASSET'} successfully deployed to ${targetZone?.name || zoneId}. Tactical radio frequency active.`,
      zoneId: zoneId,
      acknowledged: true,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  // Handler: Admit evacuees to shelter
  const handleAdmitEvacuees = (shelterId: string, count: number) => {
    setResources((prev) =>
      prev.map((r) => {
        if (r.id === shelterId && r.capacity && r.currentOccupancy !== undefined) {
          const nextOcc = Math.min(r.capacity, r.currentOccupancy + count);
          return { ...r, currentOccupancy: nextOcc };
        }
        return r;
      })
    );
  };

  // Handler: Toggle Road Status (Open vs Flooded/Blocked)
  const handleToggleRouteStatus = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((rt) => {
        if (rt.id === routeId) {
          const isBlocked = rt.status === 'flooded' || rt.status === 'blocked';
          const newStatus = isBlocked ? 'open' : 'flooded';
          return {
            ...rt,
            status: newStatus,
            isDetourActive: !isBlocked, // Auto-activate detour if roadway gets blocked
          };
        }
        return rt;
      })
    );
  };

  // Handler: Toggle Detour Calculation
  const handleEngageDetour = (routeId: string) => {
    setRoutes((prev) =>
      prev.map((rt) =>
        rt.id === routeId ? { ...rt, isDetourActive: !rt.isDetourActive } : rt
      )
    );
  };

  // Handler: Acknowledge log
  const handleAcknowledgeLog = (logId: string) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, acknowledged: true } : l))
    );
  };

  // Handler: Add manual log
  const handleAddManualLog = (message: string, severity: 'CRIT' | 'WARN' | 'INFO') => {
    const newLog: IncidentEventLog = {
      id: `MANUAL-${Date.now()}`,
      timestamp: formatTimeHHMMSS(new Date()),
      severity,
      source: 'COMMAND',
      message,
      acknowledged: true,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  // Handler: Emergency Broadcast Submission
  const handleConfirmBroadcast = (payload: { title: string; zones: string[]; channels: string[] }) => {
    const broadcastLog: IncidentEventLog = {
      id: `ALERT-${Date.now()}`,
      timestamp: formatTimeHHMMSS(new Date()),
      severity: 'CRIT',
      source: 'COMMAND',
      message: `NATIONAL PRIORITY BROADCAST TRANSMITTED: ${payload.title} across ${payload.channels.length} channels. Target sectors: ${payload.zones.join(', ')}.`,
      acknowledged: true,
    };
    setLogs((prev) => [broadcastLog, ...prev]);
  };

  // Dynamic weather alert bulletin string for header (dynamically calculated relative to real-time clock)
  const nowClock = new Date();
  const activeAlertBulletin = {
    cyclone: `CYCLONE "VARUNA" [CAT 4] EYE LANDFALL FORECAST AT ${formatTimeHHMM(addHours(nowClock, 3.5))} // HEAVY RAIN COMMENCED ${formatTimeHHMM(addMinutes(nowClock, -35))} (165mm/h) // TIDAL SURGE +5.8m`,
    flood: `MAHANADI DELTA SLUICE 3 BREACH // CREST PEAK ${formatTimeHHMM(nowClock)} - ${formatTimeHHMM(addHours(nowClock, 4))} (142.5mm/h RAIN) // STAGE 28.6m OVER DANGER 26.5m`,
    storm_surge: `DHAMRA PORT SPRING TIDE SURGE (+5.6m) FORECAST AT ${formatTimeHHMM(addHours(nowClock, 2))} // EVACUATION MANDATORY WITHIN 2KM SHORELINE`,
    landslide: `WAYANAD GHAT ESCARPMENT PORE WATER PRESSURE TRIGGERED // TORRENTIAL DELUGE (154mm/h) ACTIVE SINCE ${formatTimeHHMM(addMinutes(nowClock, -50))}`,
    heatwave: `VIDARBHA BASIN AMBIENT 48.6°C // PEAK SOLAR INSOLATION ACTIVE UNTIL ${formatTimeHHMM(addHours(nowClock, 2.5))}`,
    drought: `MARATHWADA GROUNDWATER DEFICIT // EMERGENCY WATER DISTRIBUTION TRAINS ACTIVE [SYNC: ${formatTimeHHMM(nowClock)}]`,
  }[currentHazard];

  const navItems: { id: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { id: 'matrix', label: 'M1-B: WEATHER & HAZARD CHRONO', icon: <Clock className="w-4 h-4 text-[#ff4757]" /> },
    { id: 'map', label: 'TACTICAL MAP', icon: <Map className="w-4 h-4" /> },
    { id: 'ingestion', label: 'M1: DATA INGESTION', icon: <Activity className="w-4 h-4" /> },
    { id: 'risk', label: 'M2/3: RISK EXPLAINER', icon: <Calculator className="w-4 h-4" /> },
    { id: 'resources', label: 'M4: ASSET PLANNING', icon: <Boxes className="w-4 h-4" /> },
    { id: 'evac', label: 'M5: EVAC ROUTING', icon: <Navigation className="w-4 h-4" /> },
    { id: 'logs', label: 'M6: INCIDENT STREAM', icon: <Terminal className="w-4 h-4" /> },
    { id: 'copilot', label: 'M7: GEMINI COPILOT', icon: <Bot className="w-4 h-4" /> },
    { id: 'advisory', label: 'M8: 7-DAY WEATHER FORECAST', icon: <CloudRain className="w-4 h-4 text-[#38bdf8]" /> },
    { id: 'all', label: 'FULL CONSOLE VIEW', icon: <LayoutDashboard className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#e0e5ec] text-[#2d3436] flex flex-col font-sans">
      {/* Sticky Google Maps Quota Defense Banner if Quota Exceeded */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm font-mono">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Console Status Bar */}
      <ConsoleHeader
        defconLevel={dataset.defconLevel}
        hazardTitle={dataset.title}
        codeName={dataset.codeName}
        isSimulating={isSimulating}
        onToggleSimulating={() => {
          playMechanicalClick();
          setIsSimulating(!isSimulating);
        }}
        onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
        onToggleAiCopilot={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
        isAiCopilotOpen={isAiDrawerOpen}
        weatherAlertBanner={activeAlertBulletin}
      />

      {/* Main Console Workspace */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto p-2 sm:p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 pb-20 lg:pb-4">
        {/* Left Physical Key Navigation & Hardware Selector (Desktop 3 Cols, hidden on mobile) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col gap-4 max-h-[calc(100vh-80px)] overflow-y-auto pr-1">
          {/* Module 6 & 7: Dynamic Hazard Switcher Rotary Selector */}
          <RotarySelector
            currentHazard={currentHazard}
            onChange={(h) => setCurrentHazard(h)}
          />

          {/* Tactile Navigation Keypad */}
          <div className="p-3 rounded-xl panel-raised border border-[#babecc] flex flex-col gap-1.5 select-none">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4a5568] px-1 mb-1">
              COMMAND MODULE DOCK
            </span>

            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <TactileButton
                  key={item.id}
                  active={isActive}
                  variant={isActive ? 'standard' : 'standard'}
                  ledColor={isActive ? 'red' : undefined}
                  icon={item.icon}
                  onClick={() => setActiveTab(item.id)}
                  className="w-full justify-start text-left"
                >
                  {item.label}
                </TactileButton>
              );
            })}
          </div>

          {/* Quick Hardware Status Bay */}
          <div className="well-recessed p-3 rounded-xl border border-[#babecc] space-y-2 text-[11px] font-mono">
            <div className="flex items-center justify-between text-[#4a5568] font-bold pb-1 border-b border-[#babecc]">
              <span>SYSTEM CHASSIS SPECS</span>
              <span className="text-[#22c55e]">OPERATIONAL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4a5568]">LIGHT SOURCE:</span>
              <span className="font-bold text-[#2d3436]">45° TOP-LEFT SKEUO</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4a5568]">REFRESH INTERVAL:</span>
              <span className="font-bold text-[#2d3436]">{isSimulating ? '8.0 SEC' : 'PAUSED'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#4a5568]">SENSORS ONLINE:</span>
              <span className="font-bold text-[#ff4757]">38 TELEMETRY NODES</span>
            </div>
          </div>
        </div>

        {/* Center / Right Command Modules (9 Cols on desktop, full width on mobile) */}
        <div className="lg:col-span-9 flex flex-col gap-3 lg:gap-4 min-w-0">
          {/* Mobile Quick Scenario Selector Strip (lg:hidden) */}
          <div className="lg:hidden p-2.5 rounded-xl panel-raised border border-[#babecc] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {currentHazard === 'cyclone' ? '🌀' : currentHazard === 'flood' ? '🌊' : currentHazard === 'storm_surge' ? '🌊' : currentHazard === 'landslide' ? '⛰️' : currentHazard === 'heatwave' ? '☀️' : '🏜️'}
              </span>
              <div>
                <div className="text-[9px] font-mono text-[#64748b] leading-tight">ACTIVE DISASTER</div>
                <div className="text-xs font-mono font-bold text-[#ff4757] uppercase tracking-tight">
                  {dataset.title}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const hazardList: HazardType[] = ['cyclone', 'flood', 'storm_surge', 'landslide', 'heatwave', 'drought'];
                const nextIndex = (hazardList.indexOf(currentHazard) + 1) % hazardList.length;
                setCurrentHazard(hazardList[nextIndex]);
              }}
              className="px-2.5 py-1 text-[10px] font-mono font-bold bg-[#2d3436] text-white rounded-lg shadow hover:bg-black active:scale-95 transition"
            >
              CHANGE SCENARIO ↻
            </button>
          </div>

          {/* Mobile Scrollable Module Options Rail (lg:hidden) */}
          <div className="lg:hidden p-1.5 rounded-xl well-recessed border border-[#babecc] flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playMechanicalClick();
                    setActiveTab(item.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold shrink-0 flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#2d3436] text-white border border-[#ff4757] shadow-md'
                      : 'bg-white/80 text-[#475569] border border-[#cbd5e1] hover:text-[#1e293b]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#ff4757] animate-pulse' : 'bg-[#94a3b8]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
          {/* Tactical Map (Visible in ALL view or MAP view) */}
          {(activeTab === 'all' || activeTab === 'map') && (
            <TacticalMap
              center={mapCenter}
              zoom={mapZoom}
              hazardType={currentHazard}
              zones={zones}
              resources={resources}
              routes={routes}
              selectedZone={selectedZone}
              onSelectZone={(zone) => {
                setSelectedZone(zone);
                handleFocusLocation(zone.coordinates, 13);
              }}
              locations={locations}
              cycloneTrack={currentHazard === 'cyclone' ? REALTIME_CYCLONE_TRACK : undefined}
              timeOffsetHours={timeOffsetHours}
              selectedLocationId={selectedLocation?.locationId}
              onSelectLocation={(loc) => {
                setSelectedLocation(loc);
                handleFocusLocation(loc.coordinates, 13);
              }}
            />
          )}

          {/* Module 1-B: Real-Time Hazard Chronology & Location Weather Matrix */}
          {(activeTab === 'all' || activeTab === 'matrix') && (
            <RealTimeHazardMatrixModule
              hazardType={currentHazard}
              locations={locations}
              cycloneTrack={currentHazard === 'cyclone' ? REALTIME_CYCLONE_TRACK : undefined}
              timeOffsetHours={timeOffsetHours}
              onTimeOffsetChange={(offset) => setTimeOffsetHours(offset)}
              onFocusLocation={handleFocusLocation}
              selectedLocationId={selectedLocation?.locationId || null}
              onSelectLocation={(loc) => {
                setSelectedLocation(loc);
                handleFocusLocation(loc.coordinates, 13);
              }}
            />
          )}

          {/* Module 1: Hazard Detection & Data Ingestion */}
          {(activeTab === 'all' || activeTab === 'ingestion') && (
            <DataIngestionModule
              hazardType={currentHazard}
              weather={weather}
              riverGauge={riverGauge}
              satellite={satellite}
              citizenReports={citizenReports}
              isSimulating={isSimulating}
              onToggleSimulating={() => setIsSimulating(!isSimulating)}
              onInjectSpike={handleInjectSpike}
            />
          )}

          {/* Modules 2 & 3: Dynamic Risk Assessment & Explainability */}
          {(activeTab === 'all' || activeTab === 'risk') && (
            <RiskAssessmentModule
              zones={zones}
              selectedZone={selectedZone}
              onSelectZone={(z) => setSelectedZone(z)}
            />
          )}

          {/* Module 4: Resource Planning Module */}
          {(activeTab === 'all' || activeTab === 'resources') && (
            <ResourcePlanningModule
              resources={resources}
              zones={zones}
              onAssignResource={handleAssignResource}
              onAdmitShelterEvacuees={handleAdmitEvacuees}
            />
          )}

          {/* Module 5: Evacuation Routing Module */}
          {(activeTab === 'all' || activeTab === 'evac') && (
            <EvacuationRoutingModule
              routes={routes}
              onToggleRouteStatus={handleToggleRouteStatus}
              onEngageDetour={handleEngageDetour}
            />
          )}

          {/* Module 6: Real-time Monitoring Incident Stream */}
          {(activeTab === 'all' || activeTab === 'logs') && (
            <EventStreamModule
              logs={logs}
              onAcknowledgeLog={handleAcknowledgeLog}
              onAddManualLog={handleAddManualLog}
            />
          )}

          {/* Module 7: Gemini Tactical Crisis Advisor & Copilot */}
          {(activeTab === 'all' || activeTab === 'copilot') && (
            <GeminiChatBotModule
              hazardType={currentHazard}
              defconLevel={dataset.defconLevel}
              zones={zones}
              resources={resources}
              routes={routes}
              selectedZone={selectedZone}
              weather={weather}
              riverGauge={riverGauge}
              onPostToLog={handleAddManualLog}
            />
          )}

          {/* Module 8: Multimodal Advisory (7-Day Crop Weather & Search Grounding) */}
          {(activeTab === 'all' || activeTab === 'advisory') && (
            <MultimodalAdvisory
              currentLocationName={dataset.title}
              coordinates={dataset.mapCenter}
            />
          )}
        </div>
      </div>

      {/* Safety Interlock Master Emergency Broadcast Modal */}
      <EmergencyBroadcastModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        hazardType={currentHazard}
        zones={zones}
        onConfirmBroadcast={handleConfirmBroadcast}
      />

      {/* Quick Access Slide-Out AI Copilot Drawer */}
      <TactileAiCopilotDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        hazardType={currentHazard}
        defconLevel={dataset.defconLevel}
        zones={zones}
        resources={resources}
        routes={routes}
        selectedZone={selectedZone}
        weather={weather}
        riverGauge={riverGauge}
        onPostToLog={handleAddManualLog}
      />

      {/* Mobile Bottom Tactical Dock (lg:hidden) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        currentHazard={currentHazard}
        onChangeHazard={(h) => setCurrentHazard(h)}
        onOpenBroadcastModal={() => setIsBroadcastModalOpen(true)}
        onToggleAiCopilot={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
        isAiCopilotOpen={isAiDrawerOpen}
      />
    </div>
  );
}
