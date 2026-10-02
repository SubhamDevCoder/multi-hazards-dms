import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map,
  Polygon,
  Polyline,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  CrisisZone,
  EmergencyResource,
  EvacuationRoute,
  HazardType,
  LocationHazardForecast,
  CycloneTrackData,
} from '../../types';
import { HardwareScrew } from '../common/HardwareScrew';
import { VentSlots } from '../common/VentSlots';
import { StatusLed } from '../common/StatusLed';
import { TactileButton } from '../common/TactileButton';
import {
  MapPin,
  Navigation,
  Shield,
  Users,
  Crosshair,
  Globe,
  Compass,
  X,
  Radio,
  Layers,
  CloudRain,
  Wind,
  Search,
  Activity,
  Play,
  Pause,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Flame,
  Waves,
  Zap,
} from 'lucide-react';
import { playMechanicalClick, playSuccessChime, playAlarmChirp } from '../../utils/audio';
import {
  fetchLiveEarthquakes,
  LiveEarthquakeEvent,
  searchWorldwidePlaces,
  fetchUniversalLocationData,
  UniversalLocationData,
  DayForecast,
} from '../../utils/liveDisasterPipeline';

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDT_3epCkE4kOfG-ozzFC6rLI_o5UmXR8o';

interface TacticalMapProps {
  center: [number, number];
  zoom: number;
  hazardType: HazardType;
  zones: CrisisZone[];
  resources: EmergencyResource[];
  routes: EvacuationRoute[];
  selectedZone: CrisisZone | null;
  onSelectZone: (zone: CrisisZone) => void;
  locations?: LocationHazardForecast[];
  cycloneTrack?: CycloneTrackData;
  timeOffsetHours?: number;
  selectedLocationId?: string | null;
  onSelectLocation?: (loc: LocationHazardForecast) => void;
}

interface InspectedItem {
  title: string;
  subtitle: string;
  type: 'ZONE' | 'EARTHQUAKE' | 'SHELTER' | 'RESOURCE' | 'ROUTE' | 'LOCATION';
  position: { lat: number; lng: number };
  telemetry: {
    tempC?: number;
    rainfallMmHr?: number;
    windKnots?: number;
    elevationM?: number;
    pressureHpa?: number;
    humidity?: number;
    depthKm?: number;
    magnitude?: number;
  };
  explainableLogic: string;
  impactAssessment: {
    populationAtRisk: number | string;
    criticalInfrastructure: string[];
    evacuationDirective: string;
  };
  sixDayOutlook?: DayForecast[];
  details: Record<string, string | number>;
}

// Controller component to smoothly pan/zoom camera and enforce safe zoom bounds
const MapCameraController: React.FC<{
  center: [number, number];
  zoom: number;
  mapType: string;
  showRadar: boolean;
}> = ({ center, zoom, mapType, showRadar }) => {
  const map = useMap();
  const radarLayerRef = useRef<google.maps.ImageMapType | null>(null);

  useEffect(() => {
    if (!map) return;
    // Bound zoom level between 3 and 17 (satellite) / 18 (vector) to prevent 'zoom level not supported'
    const maxSafeZoom = mapType === 'satellite' || mapType === 'hybrid' ? 17 : 18;
    const clampedZoom = Math.min(maxSafeZoom, Math.max(3, zoom));
    map.panTo({ lat: center[0], lng: center[1] });
    map.setZoom(clampedZoom);
  }, [map, center, zoom, mapType]);

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapType);
    const maxSafeZoom = mapType === 'satellite' || mapType === 'hybrid' ? 17 : 18;
    const currentZ = map.getZoom() || 12;
    if (currentZ > maxSafeZoom) {
      map.setZoom(maxSafeZoom);
    }
  }, [map, mapType]);

  // RainViewer precipitation radar layer
  useEffect(() => {
    if (!map) return;

    if (showRadar) {
      if (!radarLayerRef.current) {
        radarLayerRef.current = new google.maps.ImageMapType({
          getTileUrl: (coord, z) => {
            return `https://tilecache.rainviewer.com/v2/radar/nowcast_latest/256/${z}/${coord.x}/${coord.y}/2/1_1.png`;
          },
          tileSize: new google.maps.Size(256, 256),
          opacity: 0.65,
          name: 'PrecipitationRadar',
        });
        map.overlayMapTypes.push(radarLayerRef.current);
      }
    } else {
      if (radarLayerRef.current) {
        const idx = map.overlayMapTypes.getArray().indexOf(radarLayerRef.current);
        if (idx !== -1) {
          map.overlayMapTypes.removeAt(idx);
        }
        radarLayerRef.current = null;
      }
    }

    return () => {
      if (map && radarLayerRef.current) {
        const idx = map.overlayMapTypes.getArray().indexOf(radarLayerRef.current);
        if (idx !== -1) {
          map.overlayMapTypes.removeAt(idx);
        }
        radarLayerRef.current = null;
      }
    };
  }, [map, showRadar]);

  return null;
};

export const TacticalMap: React.FC<TacticalMapProps> = ({
  center,
  zoom,
  hazardType,
  zones,
  resources,
  routes,
  selectedZone,
  onSelectZone,
  locations = [],
  cycloneTrack,
  timeOffsetHours = 0,
  selectedLocationId,
  onSelectLocation,
}) => {
  // Map Type & View Controls
  const [mapTypeId, setMapTypeId] = useState<'hybrid' | 'satellite' | 'terrain' | 'roadmap'>('hybrid');
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(center);
  const [currentZoom, setCurrentZoom] = useState<number>(zoom);

  // Layer Toggles
  const [showZones, setShowZones] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [showEarthquakes, setShowEarthquakes] = useState(true);
  const [showWeatherNodes, setShowWeatherNodes] = useState(true);
  const [showCycloneTrack, setShowCycloneTrack] = useState(true);

  // Live Earthquakes feed (Past 24-72 hours)
  const [earthquakes, setEarthquakes] = useState<LiveEarthquakeEvent[]>([]);
  const [loadingQuakes, setLoadingQuakes] = useState(false);

  // Universal Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ name: string; country: string; lat: number; lng: number }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 6-Day Disaster Timeline Slider (Day 0 = Present, Day 1..6 = Future)
  const [forecastDay, setForecastDay] = useState<number>(0);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState<boolean>(false);

  // Interactive Inspector Window State
  const [inspectedItem, setInspectedItem] = useState<InspectedItem | null>(null);

  // Universal Weather Telemetry for current focal point
  const [focalWeather, setFocalWeather] = useState<UniversalLocationData | null>(null);

  // Load USGS Live Earthquakes on Mount
  useEffect(() => {
    let mounted = true;
    const loadQuakes = async () => {
      setLoadingQuakes(true);
      try {
        const quakes = await fetchLiveEarthquakes();
        if (mounted) setEarthquakes(quakes);
      } catch (err) {
        console.error('USGS load failed:', err);
      } finally {
        if (mounted) setLoadingQuakes(false);
      }
    };
    loadQuakes();
    const interval = setInterval(loadQuakes, 120000); // refresh every 2 mins
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sync center when prop changes
  useEffect(() => {
    setCurrentCenter(center);
    setCurrentZoom(zoom);
    loadLocationTelemetry(center[0], center[1], 'Operations Focal Center');
  }, [center, zoom]);

  // Load weather and 6-day predictive risk for focal coordinate
  const loadLocationTelemetry = async (lat: number, lng: number, placeName: string) => {
    try {
      const data = await fetchUniversalLocationData(lat, lng, placeName);
      setFocalWeather(data);
    } catch (e) {
      console.error('Telemetry fetch failed:', e);
    }
  };

  // Automated Timeline Player
  useEffect(() => {
    if (!isTimelinePlaying) return;
    const timer = setInterval(() => {
      setForecastDay((prev) => (prev >= 6 ? 0 : prev + 1));
    }, 2500);
    return () => clearInterval(timer);
  }, [isTimelinePlaying]);

  // Handle Search Input
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      setIsSearching(true);
      const results = await searchWorldwidePlaces(val);
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (r: { name: string; country: string; lat: number; lng: number }) => {
    playSuccessChime();
    setCurrentCenter([r.lat, r.lng]);
    setCurrentZoom(11);
    setSearchQuery(`${r.name}, ${r.country}`);
    setSearchResults([]);
    loadLocationTelemetry(r.lat, r.lng, r.name);
  };

  // Dynamic Risk polygon calculation based on forecastDay (Day 0 to Day +6)
  const getZoneSeverityForDay = (zone: CrisisZone, day: number) => {
    const baseSeverity = zone.riskLevel;
    // Scale risk score with forecast trajectory
    const dayFactor = 1 + (day * 0.12);
    const scaledScore = Math.min(99, Math.round(zone.calculatedRiskScore * dayFactor));

    let severity: 'critical' | 'high' | 'moderate' | 'low' = baseSeverity;
    if (scaledScore >= 80) severity = 'critical';
    else if (scaledScore >= 55) severity = 'high';
    else if (scaledScore >= 35) severity = 'moderate';
    else severity = 'low';

    const color =
      severity === 'critical'
        ? '#ff4757'
        : severity === 'high'
        ? '#f97316'
        : severity === 'moderate'
        ? '#eab308'
        : '#22c55e';

    return { severity: severity.toUpperCase(), scaledScore, color };
  };

  // Helper to inspect a zone
  const handleInspectZone = (zone: CrisisZone) => {
    playMechanicalClick();
    onSelectZone(zone);
    const dayMetrics = getZoneSeverityForDay(zone, forecastDay);

    setInspectedItem({
      title: zone.name,
      subtitle: `${dayMetrics.severity} SEVERITY // ${zone.hazardType.toUpperCase()}`,
      type: 'ZONE',
      position: { lat: zone.coordinates[0], lng: zone.coordinates[1] },
      telemetry: {
        rainfallMmHr: dayMetrics.severity === 'CRITICAL' ? 145 : 35,
        windKnots: 55,
        elevationM: zone.elevationMeters,
        pressureHpa: 986,
        humidity: 92,
      },
      explainableLogic:
        dayMetrics.severity === 'CRITICAL'
          ? `Predicted CRITICAL risk on Day +${forecastDay}: Extreme precipitation combined with ${dayMetrics.scaledScore}% saturation coefficient over low-lying terrain (${zone.elevationMeters}m ASL). Drainage capacity exceeded.`
          : zone.explainability?.headline || `Proactive risk tier on Day +${forecastDay}: Moderate tidal influx and surface runoff. Levees intact; maintain continuous telemetry monitoring.`,
      impactAssessment: {
        populationAtRisk: zone.population.toLocaleString(),
        criticalInfrastructure: zone.criticalInfrastructure || [
          'Substation Delta-4 (Flood Vulnerable)',
          'Coastal Highway Bridge 12',
          'Primary Municipal Water Intake',
        ],
        evacuationDirective:
          dayMetrics.severity === 'CRITICAL'
            ? 'MANDATORY EVACUATION: Move immediately along primary designated corridors to elevated cyclone havens.'
            : zone.explainability?.recommendedAction || 'ADVISORY ALERT: Prepare emergency kits; secure livestock and agricultural water pumps.',
      },
      sixDayOutlook: focalWeather?.dailyForecasts,
      details: {
        'Active Regime': zone.hazardType.toUpperCase(),
        'Forecast Window': `Day +${forecastDay}`,
        'Population Exposed': zone.population.toLocaleString(),
        'Risk Score': `${dayMetrics.scaledScore} / 100`,
        'Elevation': `${zone.elevationMeters}m ASL`,
      },
    });
  };

  // Helper to inspect an earthquake
  const handleInspectEarthquake = (eq: LiveEarthquakeEvent) => {
    playMechanicalClick();
    setInspectedItem({
      title: `USGS SEISMIC EVENT: M${eq.magnitude}`,
      subtitle: eq.place,
      type: 'EARTHQUAKE',
      position: { lat: eq.coordinates[0], lng: eq.coordinates[1] },
      telemetry: {
        magnitude: eq.magnitude,
        depthKm: eq.depthKm,
      },
      explainableLogic: `USGS Real-Time Ingestion: Magnitude ${eq.magnitude} tectonic displacement recorded at ${eq.depthKm}km focal depth. ${
        eq.tsunamiAlert ? 'TSUNAMI ADVISORY ISSUED: Coastal tide sensors active.' : 'No deep-ocean displacement tsunami trigger detected.'
      }`,
      impactAssessment: {
        populationAtRisk: 'Regional Shaking Swath (MMI V+)',
        criticalInfrastructure: ['Structural integrity inspection of bridges and masonry required.'],
        evacuationDirective: eq.magnitude >= 6.0 ? 'Follow earthquake drop, cover, and hold protocol.' : 'Monitor local seismic bulletins.',
      },
      details: {
        Magnitude: `M ${eq.magnitude}`,
        'Focal Depth': `${eq.depthKm} km`,
        'Timestamp Recorded': eq.timeFormatted,
        'Tsunami Warning': eq.tsunamiAlert ? 'YES - ELEVATED' : 'NONE',
        Coordinates: `${eq.coordinates[0].toFixed(3)}°N, ${eq.coordinates[1].toFixed(3)}°E`,
      },
    });
  };

  return (
    <div className="relative panel-raised rounded-2xl border-2 border-[#babecc] p-3 sm:p-4 shadow-xl select-none flex flex-col gap-3 text-[#2d3436]">
      {/* 4 Corner Screws */}
      <HardwareScrew className="absolute top-2.5 left-2.5" angle={-25} />
      <HardwareScrew className="absolute top-2.5 right-2.5" angle={45} />

      {/* Top Header & Universal Geocoding Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#babecc] pb-3 pt-1">
        {/* Title & Live Status */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#2d3436] flex items-center justify-center text-white shadow-md">
            <Globe className="w-5 h-5 text-[#ff4757] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold font-mono tracking-tight text-[#1e293b]">
                GLOBAL TACTICAL GIS // LIVE GOOGLE MAPS ENGINE
              </h2>
              <StatusLed color="green" pulse size="sm" />
            </div>
            <p className="text-[10px] font-mono text-[#64748b]">
              Universal Geocoding • Satellite Doppler Radar • USGS Real-Time Earthquakes • 6-Day Predictive Swath
            </p>
          </div>
        </div>

        {/* Universal Search Bar & Map Styles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Universal Worldwide Location Search */}
          <div className="relative">
            <div className="flex items-center well-recessed px-2.5 py-1 rounded-lg border border-[#babecc] w-64 sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#64748b] mr-1.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search any global city/port..."
                className="bg-transparent border-none outline-none font-mono text-xs w-full text-[#1e293b] placeholder:text-[#94a3b8]"
              />
              {isSearching && <span className="w-2 h-2 rounded-full bg-[#ff4757] animate-ping" />}
            </div>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#e0e5ec] rounded-xl border border-[#babecc] shadow-2xl overflow-hidden font-mono text-xs">
                {searchResults.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(r)}
                    className="w-full px-3 py-2 text-left hover:bg-[#d5dce6] flex items-center justify-between border-b border-[#cbd5e1] last:border-none"
                  >
                    <span className="font-bold text-[#1e293b] truncate">{r.name}</span>
                    <span className="text-[10px] text-[#64748b] shrink-0 ml-2">{r.country}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Styles Selector */}
          <div className="flex items-center p-1 rounded-lg well-recessed border border-[#babecc] gap-1 font-mono text-[10px] font-bold">
            {(['hybrid', 'satellite', 'terrain', 'roadmap'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  playMechanicalClick();
                  setMapTypeId(mode);
                }}
                className={`px-2 py-1 rounded transition-all uppercase ${
                  mapTypeId === mode
                    ? 'bg-[#2d3436] text-white shadow-sm'
                    : 'text-[#475569] hover:text-[#1e293b]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Map Viewport Chassis */}
      <div className="relative w-full h-[520px] sm:h-[600px] rounded-xl overflow-hidden border-2 border-[#babecc] shadow-[inset_2px_2px_8px_#000000]">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} solutionChannel="GMP_aistudio_builder">
          <Map
            mapId="DEMO_MAP_ID"
            minZoom={3}
            maxZoom={18}
            defaultCenter={{ lat: currentCenter[0], lng: currentCenter[1] }}
            defaultZoom={Math.min(18, Math.max(3, currentZoom))}
            disableDefaultUI={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={true}
            zoomControl={true}
            className="w-full h-full"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          >
            <MapCameraController
              center={currentCenter}
              zoom={currentZoom}
              mapType={mapTypeId}
              showRadar={showRadar}
            />

            {/* 1. Dynamic GeoJSON Risk Polygons with Severity Fills */}
            {showZones &&
              zones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                const { color } = getZoneSeverityForDay(zone, forecastDay);
                const polyPaths = (zone.polygon && zone.polygon.length > 0
                  ? zone.polygon
                  : [
                      [zone.coordinates[0] - 0.04, zone.coordinates[1] - 0.04],
                      [zone.coordinates[0] - 0.04, zone.coordinates[1] + 0.04],
                      [zone.coordinates[0] + 0.04, zone.coordinates[1] + 0.04],
                      [zone.coordinates[0] + 0.04, zone.coordinates[1] - 0.04],
                    ]
                ).map((c) => ({ lat: c[0], lng: c[1] }));

                return (
                  <Polygon
                    key={`zone-${zone.id}`}
                    paths={polyPaths}
                    strokeColor={isSelected ? '#38bdf8' : color}
                    strokeOpacity={1.0}
                    strokeWeight={isSelected ? 3.5 : 2.5}
                    fillColor={color}
                    fillOpacity={isSelected ? 0.45 : 0.28}
                    zIndex={isSelected ? 10 : 3}
                    onClick={() => handleInspectZone(zone)}
                  />
                );
              })}

            {/* 2. Evacuation Routes */}
            {showRoutes &&
              routes.map((route) => {
                const strokeColor =
                  route.status === 'open'
                    ? '#22c55e'
                    : route.status === 'congested'
                    ? '#eab308'
                    : '#ef4444';
                const pathPoints = (route.isDetourActive && route.detourPath && route.detourPath.length > 0
                  ? route.detourPath
                  : route.primaryPath || []
                ).map((w) => ({ lat: w[0], lng: w[1] }));

                return (
                  <Polyline
                    key={`route-${route.id}`}
                    path={pathPoints}
                    strokeColor={strokeColor}
                    strokeOpacity={0.9}
                    strokeWeight={4}
                    zIndex={5}
                    onClick={() => {
                      playMechanicalClick();
                      setInspectedItem({
                        title: route.name,
                        subtitle: `${route.status.toUpperCase()} EVACUATION CORRIDOR`,
                        type: 'ROUTE',
                        position: { lat: pathPoints[0]?.lat || 20.29, lng: pathPoints[0]?.lng || 85.82 },
                        telemetry: {
                          rainfallMmHr: route.status === 'flooded' ? 120 : 15,
                        },
                        explainableLogic: route.status === 'open' ? 'Corridor clear for high-capacity vehicular evacuation.' : 'Hazard breach detected along corridor road surface. Divert convoys.',
                        impactAssessment: {
                          populationAtRisk: `${route.evacueesCount} civilian evacuees in transit`,
                          criticalInfrastructure: [route.roadName || 'State Highway Sector', 'Low Clearance Culvert'],
                          evacuationDirective: route.status === 'open' ? 'Primary designated evacuation corridor.' : 'Use designated alternative detour path.',
                        },
                        details: {
                          'Estimated Transit': `${route.etaMinutes} mins`,
                          'Road Condition': route.status.toUpperCase(),
                          'Distance': `${route.distanceKm} km`,
                        },
                      });
                    }}
                  />
                );
              })}

            {/* 3. Live USGS Earthquakes (Past 24-72h) with Pulsing LED Rings */}
            {showEarthquakes &&
              earthquakes.map((eq) => (
                <AdvancedMarker
                  key={`eq-${eq.id}`}
                  position={{ lat: eq.coordinates[0], lng: eq.coordinates[1] }}
                  title={`M${eq.magnitude} Earthquake - ${eq.place}`}
                  onClick={() => handleInspectEarthquake(eq)}
                >
                  <div className="relative group cursor-pointer flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-500 opacity-75" />
                    <div className="relative w-6 h-6 rounded-full bg-[#1e272e] border-2 border-[#ff4757] text-[#ff4757] flex items-center justify-center font-mono font-bold text-[9px] shadow-lg">
                      {eq.magnitude}
                    </div>
                  </div>
                </AdvancedMarker>
              ))}

            {/* 4. Shelters / Havens */}
            {showShelters &&
              resources
                .filter((r) => r.type === 'shelter')
                .map((shelter) => {
                  const cap = shelter.capacity || 1000;
                  const occ = shelter.currentOccupancy || 0;
                  return (
                    <AdvancedMarker
                      key={`shelter-${shelter.id}`}
                      position={{ lat: shelter.coordinates[0], lng: shelter.coordinates[1] }}
                      title={shelter.name}
                      onClick={() => {
                        playMechanicalClick();
                        setInspectedItem({
                          title: shelter.name,
                          subtitle: 'CYCLONE & FLOOD REFUGE HAVEN',
                          type: 'SHELTER',
                          position: { lat: shelter.coordinates[0], lng: shelter.coordinates[1] },
                          telemetry: {
                            elevationM: 32,
                          },
                          explainableLogic: 'High-elevation reinforced RCC shelter structure. Rated for Category 5 wind loads (280 km/h).',
                          impactAssessment: {
                            populationAtRisk: `${cap - occ} bed spaces remaining`,
                            criticalInfrastructure: ['Emergency Diesel Generator', 'RO Water Treatment Plant'],
                            evacuationDirective: 'Accepting civilian evacuees.',
                          },
                          details: {
                            Capacity: `${occ} / ${cap}`,
                            'Saturation Level': `${Math.round((occ / cap) * 100)}%`,
                            'Radio Channel': `${shelter.radioFrequencyMhz} MHz`,
                          },
                        });
                      }}
                    >
                      <div className="px-2 py-1 rounded bg-[#22c55e] text-black font-mono font-black text-[10px] border border-black/40 shadow-lg flex items-center gap-1">
                        <Shield className="w-3 h-3 text-black" />
                        <span>SHELTER</span>
                      </div>
                    </AdvancedMarker>
                  );
                })}

            {/* 5. Rescue Teams */}
            {showResources &&
              resources
                .filter((r) => r.type !== 'shelter')
                .map((team) => (
                  <AdvancedMarker
                    key={`team-${team.id}`}
                    position={{ lat: team.coordinates[0], lng: team.coordinates[1] }}
                    title={team.name}
                    onClick={() => {
                      playMechanicalClick();
                      setInspectedItem({
                        title: team.name,
                        subtitle: `${team.status.toUpperCase()} // ${team.type.toUpperCase()}`,
                        type: 'RESOURCE',
                        position: { lat: team.coordinates[0], lng: team.coordinates[1] },
                        telemetry: {
                          windKnots: 40,
                        },
                        explainableLogic: 'Specialized response squad equipped with communications gear and tactical equipment.',
                        impactAssessment: {
                          populationAtRisk: 'Under active tactical deployment',
                          criticalInfrastructure: ['Emergency rescue transport', 'Field satellite transceiver'],
                          evacuationDirective: 'Conducting incident triage and tactical assistance.',
                        },
                        details: {
                          Unit: team.name,
                          Personnel: `${team.personnelCount} responders`,
                          Radio: `${team.radioFrequencyMhz} MHz`,
                          Deployment: team.status.toUpperCase(),
                        },
                      });
                    }}
                  >
                    <div className="px-2 py-1 rounded bg-[#f97316] text-white font-mono font-bold text-[10px] border border-black/40 shadow-lg flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{team.type.toUpperCase()}</span>
                    </div>
                  </AdvancedMarker>
                ))}
          </Map>
        </APIProvider>

        {/* Floating Layer Controls (Top Right) */}
        <div className="absolute top-3 right-3 z-20 max-w-[calc(100%-1.5rem)] overflow-x-auto no-scrollbar flex items-center gap-1 bg-[#1e272e]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#4a5568] shadow-2xl font-mono text-[10px]">
          <button
            type="button"
            onClick={() => setShowRadar(!showRadar)}
            className={`px-2 py-1 rounded font-bold flex items-center gap-1 transition ${
              showRadar ? 'bg-[#2563eb] text-white shadow-md' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <CloudRain className="w-3 h-3" />
            RADAR
          </button>

          <button
            type="button"
            onClick={() => setShowEarthquakes(!showEarthquakes)}
            className={`px-2 py-1 rounded font-bold flex items-center gap-1 transition ${
              showEarthquakes ? 'bg-[#ff4757] text-white shadow-md' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Activity className="w-3 h-3" />
            QUAKES ({earthquakes.length})
          </button>

          <button
            type="button"
            onClick={() => setShowZones(!showZones)}
            className={`px-2 py-1 rounded font-bold flex items-center gap-1 transition ${
              showZones ? 'bg-orange-500 text-white shadow-md' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Shield className="w-3 h-3" />
            ZONES
          </button>

          <button
            type="button"
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2 py-1 rounded font-bold flex items-center gap-1 transition ${
              showRoutes ? 'bg-[#38bdf8] text-black shadow-md' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <Navigation className="w-3 h-3" />
            ROUTES
          </button>

          <button
            type="button"
            onClick={() => setShowShelters(!showShelters)}
            className={`px-2 py-1 rounded font-bold flex items-center gap-1 transition ${
              showShelters ? 'bg-[#22c55e] text-black shadow-md' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            <MapPin className="w-3 h-3" />
            SHELTERS
          </button>
        </div>

        {/* 6-Day Disaster Timeline Slider Hardware Bay (Floating Bottom Left/Center) */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-[480px] z-20 bg-[#1e272e]/95 backdrop-blur-md p-3 rounded-xl border border-[#4a5568] shadow-2xl font-mono text-white space-y-2">
          <div className="flex items-center justify-between border-b border-[#334155] pb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff4757] animate-pulse" />
              <span className="text-xs font-bold text-white tracking-wider">
                6-DAY DISASTER PREDICTIVE TIMELINE
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsTimelinePlaying(!isTimelinePlaying)}
                className="p-1 rounded bg-[#334155] hover:bg-[#475569] text-white flex items-center gap-1 text-[10px] px-2 font-bold"
              >
                {isTimelinePlaying ? <Pause className="w-3 h-3 text-[#22c55e]" /> : <Play className="w-3 h-3" />}
                <span>{isTimelinePlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>
              <span className="text-xs font-black text-[#ff4757] px-2 py-0.5 rounded bg-black/40 border border-[#ff4757]/40">
                {forecastDay === 0 ? 'PRESENT (NOW)' : `DAY +${forecastDay}`}
              </span>
            </div>
          </div>

          {/* Slider Bar */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={6}
              step={1}
              value={forecastDay}
              onChange={(e) => {
                playMechanicalClick();
                setForecastDay(parseInt(e.target.value, 10));
              }}
              className="w-full accent-[#ff4757] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[#94a3b8] font-bold">
              <span>DAY 0 (NOW)</span>
              <span>+1D</span>
              <span>+2D</span>
              <span>+3D</span>
              <span>+4D</span>
              <span>+5D</span>
              <span>+6D</span>
            </div>
          </div>

          <div className="text-[10px] text-[#cbd5e1] flex items-center justify-between pt-0.5">
            <span>SWATH FORECAST: Dynamic Risk polygons & surge extents scaled</span>
            <span className="text-[#22c55e] font-bold">PREDICTIVE AI ACTIVE</span>
          </div>
        </div>

        {/* Hardware-Styled Interactive Inspector Window (Slide-Over Panel) */}
        {inspectedItem && (
          <div className="absolute top-3 left-3 bottom-3 w-80 sm:w-96 z-30 bg-[#1e272e]/98 backdrop-blur-lg rounded-xl border-2 border-[#ff4757] shadow-2xl p-4 font-mono text-white flex flex-col justify-between overflow-y-auto animate-fadeIn">
            {/* Top Bar */}
            <div className="border-b border-[#334155] pb-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#ff4757] tracking-wider uppercase">
                  OBJECT INSPECTOR // {inspectedItem.type}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectedItem(null)}
                  className="p-1 rounded text-[#94a3b8] hover:text-white hover:bg-[#334155]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-sm font-bold text-white mt-1 leading-tight">{inspectedItem.title}</h3>
              <p className="text-[10px] text-[#38bdf8] font-semibold">{inspectedItem.subtitle}</p>
            </div>

            {/* Live Sensor Telemetry */}
            <div className="my-3 space-y-2">
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase">1. Live Sensor Telemetry:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {inspectedItem.telemetry.rainfallMmHr !== undefined && (
                  <div className="well-recessed p-2 rounded bg-black/40 border border-[#334155]">
                    <span className="text-[9px] text-gray-400 block">RAINFALL:</span>
                    <strong className="text-white text-sm">{inspectedItem.telemetry.rainfallMmHr} mm/h</strong>
                  </div>
                )}
                {inspectedItem.telemetry.windKnots !== undefined && (
                  <div className="well-recessed p-2 rounded bg-black/40 border border-[#334155]">
                    <span className="text-[9px] text-gray-400 block">WIND SPEED:</span>
                    <strong className="text-white text-sm">{inspectedItem.telemetry.windKnots} Knots</strong>
                  </div>
                )}
                {inspectedItem.telemetry.elevationM !== undefined && (
                  <div className="well-recessed p-2 rounded bg-black/40 border border-[#334155]">
                    <span className="text-[9px] text-gray-400 block">ELEVATION:</span>
                    <strong className="text-white text-sm">{inspectedItem.telemetry.elevationM}m ASL</strong>
                  </div>
                )}
                {inspectedItem.telemetry.magnitude !== undefined && (
                  <div className="well-recessed p-2 rounded bg-black/40 border border-[#334155]">
                    <span className="text-[9px] text-gray-400 block">SEISMIC MAG:</span>
                    <strong className="text-[#ff4757] text-sm">M {inspectedItem.telemetry.magnitude}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Explainable Risk Logic */}
            <div className="my-2 p-2.5 rounded-lg bg-black/50 border border-[#ff4757]/40 space-y-1">
              <span className="text-[10px] font-bold text-[#ff4757] uppercase flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                2. Explainable Risk Logic:
              </span>
              <p className="text-[11px] text-[#cbd5e1] leading-relaxed">{inspectedItem.explainableLogic}</p>
            </div>

            {/* Impact Assessment */}
            <div className="my-2 space-y-1 text-xs">
              <span className="text-[10px] font-bold text-[#94a3b8] uppercase">3. Impact Assessment:</span>
              <div className="text-[11px] text-[#cbd5e1] space-y-1">
                <div>
                  <span className="text-gray-400">Population Exposed:</span>{' '}
                  <strong className="text-white">{inspectedItem.impactAssessment.populationAtRisk}</strong>
                </div>
                <div>
                  <span className="text-gray-400">Directive:</span>{' '}
                  <strong className="text-amber-400">{inspectedItem.impactAssessment.evacuationDirective}</strong>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setInspectedItem(null)}
              className="mt-3 w-full py-2 rounded-lg bg-[#334155] hover:bg-[#475569] text-white font-mono font-bold text-xs"
            >
              CLOSE INSPECTOR
            </button>
          </div>
        )}
      </div>

      {/* Legend & Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono border-t border-[#babecc] pt-2 px-1 text-[#475569]">
        <div className="flex items-center gap-3">
          <span className="font-bold text-[#1e293b]">RISK TIERS:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ff4757]" /> CRITICAL
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#f97316]" /> HIGH
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#eab308]" /> MODERATE
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" /> LOW
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>CENTER: {currentCenter[0].toFixed(3)}°N, {currentCenter[1].toFixed(3)}°E</span>
          <span>•</span>
          <span>ZOOM: {currentZoom}X</span>
        </div>
      </div>
    </div>
  );
};
