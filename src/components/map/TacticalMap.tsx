import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  APIProvider,
  Map,
  Polygon,
  Polyline,
  Marker,
  InfoWindow,
  useMap,
  MapMouseEvent,
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
  Eye,
  EyeOff,
  Globe,
  Compass,
  X,
  Radio,
  Layers,
  CloudRain,
  Wind,
  Waves,
  Zap,
} from 'lucide-react';
import { playMechanicalClick, playSuccessChime } from '../../utils/audio';

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
  // Real-time location forecasts and cyclone tracking
  locations?: LocationHazardForecast[];
  cycloneTrack?: CycloneTrackData;
  timeOffsetHours?: number;
  selectedLocationId?: string | null;
  onSelectLocation?: (loc: LocationHazardForecast) => void;
}

interface InspectedItem {
  title: string;
  subtitle: string;
  position: { lat: number; lng: number };
  details: Record<string, string | number>;
}

// Controller component to smoothly pan/zoom camera when center/zoom props change
const MapCameraController: React.FC<{ center: [number, number]; zoom: number }> = ({
  center,
  zoom,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo({ lat: center[0], lng: center[1] });
    map.setZoom(zoom);
  }, [map, center, zoom]);

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
  const [mapType, setMapType] = useState<'satellite' | 'hybrid'>('satellite');
  const [tilt, setTilt] = useState<number>(0);
  const [scanlinesActive, setScanlinesActive] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showCycloneTrack, setShowCycloneTrack] = useState(true);
  const [showWeatherLocations, setShowWeatherLocations] = useState(true);
  const [showRadarBands, setShowRadarBands] = useState(true);

  const [mouseCoords, setMouseCoords] = useState<{ lat: string; lng: string }>({
    lat: center[0].toFixed(4),
    lng: center[1].toFixed(4),
  });

  const [inspectedItem, setInspectedItem] = useState<InspectedItem | null>(null);

  // Helper to generate circular polygon points around a center coordinate (for radar / surge rings)
  const generateRadialPoints = useCallback((cntr: [number, number], radiusKm: number, numPts = 24) => {
    const pts: { lat: number; lng: number }[] = [];
    const lat = cntr[0];
    const lng = cntr[1];
    const dLat = radiusKm / 111.32;
    const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));

    for (let i = 0; i < numPts; i++) {
      const angle = (i * 2 * Math.PI) / numPts;
      pts.push({
        lat: lat + dLat * Math.sin(angle),
        lng: lng + dLng * Math.cos(angle),
      });
    }
    return pts;
  }, []);

  // Determine active cyclone eye based on timeline scrubber
  const currentCycloneEye = useMemo(() => {
    if (!cycloneTrack) return null;
    const activePoint = cycloneTrack.trackPoints.find(
      (tp) => tp.timeOffsetHours === timeOffsetHours
    ) || cycloneTrack.trackPoints[2];
    return activePoint ? activePoint.coordinates : cycloneTrack.currentEye;
  }, [cycloneTrack, timeOffsetHours]);

  // SVG Data URI markers
  const cycloneEyeIcon = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="22" fill="rgba(255, 71, 87, 0.28)" stroke="#ff4757" stroke-width="2.5" stroke-dasharray="4,2"/>
        <circle cx="24" cy="24" r="12" fill="#1e272e" stroke="#ff4757" stroke-width="3"/>
        <circle cx="24" cy="24" r="4.5" fill="#ffffff"/>
        <path d="M24 4 C32 10 38 18 38 24 C38 30 32 38 24 44 C16 38 10 30 10 24 C10 18 16 10 24 4 Z" fill="none" stroke="#ff4757" stroke-width="1.8" opacity="0.7"/>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, []);

  const getCycloneTrackWaypointIcon = useCallback((status: string, isLandfall: boolean) => {
    const strokeColor = isLandfall ? '#ff4757' : status === 'past' ? '#94a3b8' : '#38bdf8';
    const fillColor = isLandfall ? '#ff4757' : '#1e272e';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${isLandfall ? 3 : 2}"/>
        <circle cx="12" cy="12" r="3.5" fill="#ffffff"/>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, []);

  const getWeatherLocationIcon = useCallback((rainMmHr: number, isCritical: boolean, isSelected: boolean) => {
    const strokeColor = isSelected ? '#ffffff' : isCritical ? '#ff4757' : rainMmHr >= 70 ? '#f97316' : '#38bdf8';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r="15" fill="#1e272e" stroke="${strokeColor}" stroke-width="${isSelected ? 3.5 : 2.5}"/>
        <path d="M12 16 C12 13 14 11 17 11 C20 11 22 13 22 16 C23 16 24 17 24 18 C24 19 23 20 22 20 L12 20 C11 20 10 19 10 18 C10 17 11 16 12 16 Z" fill="${strokeColor}"/>
        <line x1="14" y1="22" x2="13" y2="25" stroke="#38bdf8" stroke-width="2"/>
        <line x1="17" y1="22" x2="16" y2="25" stroke="#38bdf8" stroke-width="2"/>
        <line x1="20" y1="22" x2="19" y2="25" stroke="#38bdf8" stroke-width="2"/>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, []);

  const shelterIcon = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
        <circle cx="15" cy="15" r="13" fill="#1e272e" stroke="#22c55e" stroke-width="2.5"/>
        <path d="M15 8 L8 15 L10 15 L10 21 L20 21 L20 15 L22 15 Z" fill="#22c55e"/>
        <circle cx="15" cy="15" r="1.5" fill="#ffffff"/>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, []);

  const getTeamIcon = useCallback((status: string) => {
    const strokeColor = status === 'on_scene' ? '#ff4757' : '#38bdf8';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12" fill="#2d3436" stroke="${strokeColor}" stroke-width="2.5"/>
        <circle cx="14" cy="14" r="5" fill="${strokeColor}"/>
        <circle cx="14" cy="14" r="2" fill="#ffffff"/>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, []);

  const getZoneCenterIcon = useCallback((riskLevel: string, isSelected: boolean) => {
    const color =
      riskLevel === 'critical'
        ? '#ff4757'
        : riskLevel === 'high'
        ? '#f97316'
        : riskLevel === 'moderate'
        ? '#eab308'
        : '#22c55e';
    const stroke = isSelected ? '#ffffff' : color;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <polygon points="16,3 29,16 16,29 3,16" fill="#1e272e" stroke="${stroke}" stroke-width="${isSelected ? 3 : 2}"/>
        <circle cx="16" cy="16" r="4.5" fill="${color}"/>
      </svg>
    `.trim();
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical':
        return '#ff4757';
      case 'high':
        return '#f97316';
      case 'moderate':
        return '#eab308';
      default:
        return '#22c55e';
    }
  };

  const handleMouseMove = (e: MapMouseEvent) => {
    if (e.detail.latLng) {
      setMouseCoords({
        lat: e.detail.latLng.lat.toFixed(4),
        lng: e.detail.latLng.lng.toFixed(4),
      });
    }
  };

  const handleToggleTilt = () => {
    playMechanicalClick();
    setTilt((prev) => (prev === 0 ? 45 : 0));
  };

  const handleToggleMapType = (newType: 'satellite' | 'hybrid') => {
    playMechanicalClick();
    setMapType(newType);
  };

  return (
    <div className="relative w-full rounded-xl panel-raised border border-[#babecc] p-3 flex flex-col">
      {/* 4 Corner Chassis Fasteners */}
      <HardwareScrew className="absolute top-2 left-2" angle={22} />
      <HardwareScrew className="absolute top-2 right-2" angle={-45} />
      <HardwareScrew className="absolute bottom-2 left-2" angle={60} />
      <HardwareScrew className="absolute bottom-2 right-2" angle={-12} />

      {/* Top Header of Map Console */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-1 mb-2 select-none border-b border-[#babecc]/50">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#38bdf8] animate-pulse" />
          <span className="text-xs font-mono font-bold tracking-wider text-[#2d3436] uppercase">
            LIVE GOOGLE SATELLITE COMMAND VIEWPORT // HIGH-DEF OPTICAL IMAGERY
          </span>
          <StatusLed color="green" pulse size="sm" />
        </div>

        {/* Real-Time Crosshair Coordinates HUD */}
        <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono text-[#4a5568]">
          <span className="well-recessed px-2 py-0.5 rounded border border-[#babecc]/40">
            LAT: <strong className="text-[#2d3436]">{mouseCoords.lat}°N</strong>
          </span>
          <span className="well-recessed px-2 py-0.5 rounded border border-[#babecc]/40">
            LNG: <strong className="text-[#2d3436]">{mouseCoords.lng}°E</strong>
          </span>
          <span className="hidden md:inline well-recessed px-2 py-0.5 rounded border border-[#babecc]/40 text-[#22c55e] font-bold">
            FEED: LIVE ORBITAL
          </span>
        </div>

        {/* Satellite Mode Switcher & Scanlines */}
        <div className="flex items-center gap-1.5">
          {/* Satellite vs Hybrid Switcher */}
          <div className="flex rounded p-0.5 bg-[#d1d9e6] border border-[#babecc] text-[10px] font-mono font-bold">
            <button
              type="button"
              onClick={() => handleToggleMapType('satellite')}
              className={`px-2 py-0.5 rounded transition-all ${
                mapType === 'satellite'
                  ? 'bg-[#2d3436] text-[#f1f2f6] shadow-[inset_1px_1px_2px_#000000]'
                  : 'text-[#4a5568] hover:text-[#2d3436]'
              }`}
            >
              SATELLITE
            </button>
            <button
              type="button"
              onClick={() => handleToggleMapType('hybrid')}
              className={`px-2 py-0.5 rounded transition-all ${
                mapType === 'hybrid'
                  ? 'bg-[#2d3436] text-[#f1f2f6] shadow-[inset_1px_1px_2px_#000000]'
                  : 'text-[#4a5568] hover:text-[#2d3436]'
              }`}
            >
              HYBRID LABELS
            </button>
          </div>

          <TactileButton
            size="sm"
            active={scanlinesActive}
            onClick={() => setScanlinesActive(!scanlinesActive)}
            icon={scanlinesActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            title="Toggle CRT Scanline Phosphor Overlay"
          >
            SCANLINES
          </TactileButton>

          <VentSlots count={3} className="hidden sm:flex ml-1" />
        </div>
      </div>

      {/* Map Recessed Well Frame */}
      <div className="relative w-full h-[520px] lg:h-[580px] rounded-lg well-recessed overflow-hidden border-2 border-[#babecc] bg-[#0f172a]">
        {/* Google Maps API Provider & Map Viewport */}
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            defaultCenter={{ lat: center[0], lng: center[1] }}
            defaultZoom={zoom}
            mapTypeId={mapType}
            tilt={tilt}
            heading={0}
            gestureHandling="greedy"
            disableDefaultUI={true}
            onMousemove={handleMouseMove}
            className="w-full h-full"
          >
            <MapCameraController center={center} zoom={zoom} />

            {/* 1. Crisis Zone Polygons & Center Markers */}
            {showZones &&
              zones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                const color = getRiskColor(zone.riskLevel);
                const paths = zone.polygon.map(([lat, lng]) => ({ lat, lng }));

                return (
                  <React.Fragment key={zone.id}>
                    <Polygon
                      paths={paths}
                      strokeColor={color}
                      strokeOpacity={0.95}
                      strokeWeight={isSelected ? 3.5 : 2}
                      fillColor={color}
                      fillOpacity={isSelected ? 0.38 : 0.22}
                      zIndex={isSelected ? 5 : 2}
                      onClick={() => {
                        playMechanicalClick();
                        onSelectZone(zone);
                        setInspectedItem({
                          title: zone.name,
                          subtitle: `SECTOR // RISK LEVEL: ${zone.riskLevel.toUpperCase()}`,
                          position: { lat: zone.coordinates[0], lng: zone.coordinates[1] },
                          details: {
                            'Calculated Risk': `${zone.calculatedRiskScore}/100`,
                            Population: zone.population.toLocaleString(),
                            'Evacuated Pct': `${zone.evacuatedPercentage}%`,
                            'Elevation Stage': `${zone.elevationMeters}m MSL`,
                            'Hazard Intensity': `${zone.hazardIntensity}%`,
                            'Critical Assets': zone.criticalInfrastructure.join(', '),
                          },
                        });
                      }}
                    />

                    {/* Center Zone Marker */}
                    <Marker
                      position={{ lat: zone.coordinates[0], lng: zone.coordinates[1] }}
                      title={`${zone.name} [Risk Score: ${zone.calculatedRiskScore}]`}
                      icon={getZoneCenterIcon(zone.riskLevel, isSelected)}
                      label={{
                        text: `${zone.name.split(' ')[0]} [${zone.calculatedRiskScore}]`,
                        color: '#f8fafc',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        className: 'font-mono text-shadow-md',
                      }}
                      onClick={() => {
                        playMechanicalClick();
                        onSelectZone(zone);
                        setInspectedItem({
                          title: zone.name,
                          subtitle: `SECTOR // RISK LEVEL: ${zone.riskLevel.toUpperCase()}`,
                          position: { lat: zone.coordinates[0], lng: zone.coordinates[1] },
                          details: {
                            'Calculated Risk': `${zone.calculatedRiskScore}/100`,
                            Population: zone.population.toLocaleString(),
                            'Evacuated Pct': `${zone.evacuatedPercentage}%`,
                            'Elevation Stage': `${zone.elevationMeters}m MSL`,
                            'Hazard Intensity': `${zone.hazardIntensity}%`,
                            'Critical Assets': zone.criticalInfrastructure.join(', '),
                          },
                        });
                      }}
                    />
                  </React.Fragment>
                );
              })}

            {/* 2. Evacuation Routes & Tactical Detour Polylines */}
            {showRoutes &&
              routes.map((route) => {
                const isFloodedOrBlocked =
                  route.status === 'flooded' || route.status === 'blocked';
                const primaryCoords = route.primaryPath.map(([lat, lng]) => ({ lat, lng }));
                const detourCoords = route.detourPath.map(([lat, lng]) => ({ lat, lng }));

                return (
                  <React.Fragment key={route.id}>
                    {/* Primary Route Corridor */}
                    <Polyline
                      path={primaryCoords}
                      strokeColor={isFloodedOrBlocked ? '#ff4757' : '#22c55e'}
                      strokeOpacity={0.9}
                      strokeWeight={4}
                      zIndex={3}
                      onClick={() => {
                        playMechanicalClick();
                        const mid = primaryCoords[Math.floor(primaryCoords.length / 2)] || {
                          lat: center[0],
                          lng: center[1],
                        };
                        setInspectedItem({
                          title: `${route.code}: ${route.name}`,
                          subtitle: `CORRIDOR STATUS: ${route.status.toUpperCase()}`,
                          position: mid,
                          details: {
                            'Status Summary': route.status.toUpperCase(),
                            'Transit ETA': `${route.etaMinutes} mins`,
                            Distance: `${route.distanceKm} km`,
                            'Elevation Clearance': `${route.elevationClearanceM}m`,
                            'Active Evacuees': route.evacueesCount.toLocaleString(),
                            'Detour Bypass Active': route.isDetourActive ? 'YES' : 'NO',
                          },
                        });
                      }}
                    />

                    {/* Active Recalculated Detour Corridor */}
                    {route.isDetourActive && detourCoords.length > 0 && (
                      <Polyline
                        path={detourCoords}
                        strokeColor="#38bdf8"
                        strokeOpacity={0.95}
                        strokeWeight={4}
                        zIndex={4}
                        onClick={() => {
                          playMechanicalClick();
                          const mid = detourCoords[Math.floor(detourCoords.length / 2)] || {
                            lat: center[0],
                            lng: center[1],
                          };
                          setInspectedItem({
                            title: `TACTICAL DETOUR // ${route.code}`,
                            subtitle: 'RECALCULATED SAFEPATH (AVOIDING HAZARD)',
                            position: mid,
                            details: {
                              'Primary Artery': route.name,
                              'Bypass Reason': `Primary route is ${route.status}`,
                              'Transit Clearance': 'Authorized for emergency convoys and civilians',
                            },
                          });
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}

            {/* 3. Emergency Havens / Shelters */}
            {showShelters &&
              resources
                .filter((r) => r.type === 'shelter')
                .map((shelter) => {
                  const occupancyRate = shelter.capacity
                    ? Math.round(((shelter.currentOccupancy || 0) / shelter.capacity) * 100)
                    : 0;

                  return (
                    <Marker
                      key={shelter.id}
                      position={{ lat: shelter.coordinates[0], lng: shelter.coordinates[1] }}
                      title={`${shelter.name} (${occupancyRate}% Full)`}
                      icon={shelterIcon}
                      label={{
                        text: `${shelter.callsign.replace('SHELTER-', '')} [${occupancyRate}%]`,
                        color: '#22c55e',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        className: 'font-mono bg-[#1e272e]/80 px-1 rounded border border-[#22c55e]/60',
                      }}
                      onClick={() => {
                        playMechanicalClick();
                        setInspectedItem({
                          title: shelter.name,
                          subtitle: `EMERGENCY HAVEN // CALLSIGN: ${shelter.callsign}`,
                          position: {
                            lat: shelter.coordinates[0],
                            lng: shelter.coordinates[1],
                          },
                          details: {
                            Occupancy: `${shelter.currentOccupancy} / ${shelter.capacity} (${occupancyRate}%)`,
                            'Supply Reserves': `${shelter.supplyDays} Days Remaining`,
                            'Radio Comm Frequency': `${shelter.radioFrequencyMhz} MHz (VHF Ch 16)`,
                            Status: shelter.status.toUpperCase(),
                          },
                        });
                      }}
                    />
                  );
                })}

            {/* 4. Tactical Emergency Teams (NDRF, Medical, Air Rescue) */}
            {showResources &&
              resources
                .filter((r) => r.type !== 'shelter')
                .map((res) => {
                  return (
                    <Marker
                      key={res.id}
                      position={{ lat: res.coordinates[0], lng: res.coordinates[1] }}
                      title={`${res.name} [${res.status}]`}
                      icon={getTeamIcon(res.status)}
                      label={{
                        text: res.callsign,
                        color: res.status === 'on_scene' ? '#ff4757' : '#38bdf8',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        className: 'font-mono bg-[#1e272e]/80 px-1 rounded border border-[#a4b0be]/40',
                      }}
                      onClick={() => {
                        playMechanicalClick();
                        setInspectedItem({
                          title: res.name,
                          subtitle: `FIELD RESPONSE UNIT // CALLSIGN: ${res.callsign}`,
                          position: { lat: res.coordinates[0], lng: res.coordinates[1] },
                          details: {
                            Status: res.status.toUpperCase(),
                            'Personnel Deployed': res.personnelCount,
                            'Tactical Frequency': `${res.radioFrequencyMhz} MHz`,
                            'Operational Type': res.type.toUpperCase(),
                            'Deployment Area': res.locationName,
                          },
                        });
                      }}
                    />
                  );
                })}

            {/* 5. Cyclone Trajectory & Forecast Eye Wall Track */}
            {showCycloneTrack && cycloneTrack && (
              <React.Fragment>
                {/* Cyclone Trajectory Track Polyline */}
                <Polyline
                  path={cycloneTrack.trackPoints.map((tp) => ({
                    lat: tp.coordinates[0],
                    lng: tp.coordinates[1],
                  }))}
                  strokeColor="#ff4757"
                  strokeOpacity={0.85}
                  strokeWeight={3.5}
                  zIndex={6}
                />

                {/* Hurricane Gale Force Wind Swirl Ring (95km Radius) */}
                {currentCycloneEye && (
                  <Polygon
                    paths={generateRadialPoints(currentCycloneEye, 65, 30)}
                    strokeColor="#ff4757"
                    strokeOpacity={0.6}
                    strokeWeight={1.5}
                    fillColor="#ff4757"
                    fillOpacity={0.12}
                    zIndex={5}
                  />
                )}

                {/* Track Waypoint Markers with Forecast Timestamps */}
                {cycloneTrack.trackPoints.map((tp) => {
                  const isLandfall = tp.timeLabel.includes('LANDFALL');
                  return (
                    <Marker
                      key={tp.id}
                      position={{ lat: tp.coordinates[0], lng: tp.coordinates[1] }}
                      title={`${tp.timeLabel} - ${tp.category} [${tp.windKnots} kt]` }
                      icon={getCycloneTrackWaypointIcon(tp.status, isLandfall)}
                      label={{
                        text: `${tp.timeLabel.split(' ')[0]} [${tp.windKnots}kt]`,
                        color: isLandfall ? '#ff4757' : '#f1f2f6',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        className: 'font-mono bg-[#1e272e]/85 px-1 rounded border border-[#ff4757]/40',
                      }}
                      onClick={() => {
                        playMechanicalClick();
                        setInspectedItem({
                          title: `CYCLONE WAYPOINT: ${tp.timeLabel}`,
                          subtitle: tp.stageLabel,
                          position: { lat: tp.coordinates[0], lng: tp.coordinates[1] },
                          details: {
                            'Forecast Window': tp.timeLabel,
                            'Category Scale': tp.category,
                            'Sustained Winds': `${tp.windKnots} Knots`,
                            'Peak Gusts': `${tp.gustKnots} Knots`,
                            'Central Pressure': `${tp.pressureHpa} hPa`,
                            Coordinates: `${tp.coordinates[0].toFixed(2)}°N, ${tp.coordinates[1].toFixed(2)}°E`,
                          },
                        });
                      }}
                    />
                  );
                })}

                {/* Live Position Cyclone Eye Marker */}
                {currentCycloneEye && (
                  <Marker
                    position={{ lat: currentCycloneEye[0], lng: currentCycloneEye[1] }}
                    title={`CYCLONE EYE // ${cycloneTrack.cycloneName} [${cycloneTrack.centralPressureHpa} hPa]`}
                    icon={cycloneEyeIcon}
                    label={{
                      text: `EYE // ${cycloneTrack.cycloneName.split(' ')[1] || 'STORM'} [${cycloneTrack.centralPressureHpa}hPa]`,
                      color: '#ff4757',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      className: 'font-mono bg-[#1e272e] px-1.5 py-0.5 rounded border border-[#ff4757]',
                    }}
                    onClick={() => {
                      playMechanicalClick();
                      setInspectedItem({
                        title: cycloneTrack.cycloneName,
                        subtitle: `${cycloneTrack.category} // EYE WALL POSITION`,
                        position: { lat: currentCycloneEye[0], lng: currentCycloneEye[1] },
                        details: {
                          'Present Eye Coords': `${currentCycloneEye[0].toFixed(3)}°N, ${currentCycloneEye[1].toFixed(3)}°E`,
                          'Central Pressure': `${cycloneTrack.centralPressureHpa} hPa`,
                          'Sustained Winds': `${cycloneTrack.maxSustainedWindKnots} Knots (Gusts ${cycloneTrack.gustKnots} Knots)`,
                          'Forward Speed': `${cycloneTrack.forwardSpeedKmh} km/h toward ${cycloneTrack.forwardDirection}`,
                          'Estimated Landfall': cycloneTrack.estimatedLandfallTime,
                          'Landfall Target': cycloneTrack.estimatedLandfallLocation,
                          'Predicted Surge': `+${cycloneTrack.surgePeakMeters}m Over Astronomical Tide`,
                        },
                      });
                    }}
                  />
                )}
              </React.Fragment>
            )}

            {/* 6. Heavy Rain Radar Reflectivity Rings */}
            {showRadarBands &&
              locations.map((loc) => {
                const currentPt =
                  loc.hourlyTimeline.find((pt) => pt.timeOffsetHours === timeOffsetHours) ||
                  loc.hourlyTimeline[0];
                const rainVal = currentPt ? currentPt.rainfallMmHr : loc.currentCondition.rainfallMmHr;
                if (rainVal < 50.0) return null;

                const radiusKm = rainVal >= 120 ? 18 : rainVal >= 80 ? 12 : 8;
                const ringColor = rainVal >= 120 ? '#ff4757' : rainVal >= 80 ? '#f97316' : '#eab308';

                return (
                  <Polygon
                    key={`radar-${loc.locationId}`}
                    paths={generateRadialPoints(loc.coordinates, radiusKm, 20)}
                    strokeColor={ringColor}
                    strokeOpacity={0.7}
                    strokeWeight={2}
                    fillColor={ringColor}
                    fillOpacity={0.28}
                    zIndex={4}
                  />
                );
              })}

            {/* 7. Real-Time Hazard Weather Locations & Chronology Pins */}
            {showWeatherLocations &&
              locations.map((loc) => {
                const isSelected = selectedLocationId === loc.locationId;
                const currentPt =
                  loc.hourlyTimeline.find((pt) => pt.timeOffsetHours === timeOffsetHours) ||
                  loc.hourlyTimeline[0];

                const activeRain = currentPt ? currentPt.rainfallMmHr : loc.currentCondition.rainfallMmHr;
                const activeWind = currentPt ? currentPt.windKnots : loc.currentCondition.windKnots;
                const isCritical = loc.severityLevel === 'critical' || activeRain >= 120.0;

                return (
                  <Marker
                    key={loc.locationId}
                    position={{ lat: loc.coordinates[0], lng: loc.coordinates[1] }}
                    title={`${loc.locationName} - Rain: ${activeRain} mm/h`}
                    icon={getWeatherLocationIcon(activeRain, isCritical, isSelected)}
                    label={{
                      text: `${loc.locationName.split(' ')[0]}: ${activeRain}mm/h [PEAK ${loc.heavyPeakTime.split(' ')[0]}]`,
                      color: isCritical ? '#ff4757' : '#38bdf8',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      className: 'font-mono bg-[#1e272e]/90 px-1.5 py-0.5 rounded border border-[#babecc]/50',
                    }}
                    onClick={() => {
                      playMechanicalClick();
                      if (onSelectLocation) onSelectLocation(loc);
                      setInspectedItem({
                        title: loc.locationName,
                        subtitle: `${loc.hazardTitle} // ${loc.severityLevel.toUpperCase()}`,
                        position: { lat: loc.coordinates[0], lng: loc.coordinates[1] },
                        details: {
                          'Current Rain Rate': `${activeRain} mm/hr`,
                          'Sustained Wind': `${activeWind} Knots (Gusts ${loc.currentCondition.gustKnots} kt)`,
                          'Barometric Pressure': `${loc.currentCondition.pressureHpa} hPa`,
                          'Heavy Rain Inception': loc.heavyStartTime,
                          'Heavy Peak Period': loc.heavyPeakTime,
                          'Expected Receding': loc.heavyEndTime,
                          'Total 24h Rainfall': `${loc.totalExpectedRainfallMm} mm`,
                          'Storm Surge Level': loc.peakSurgeMeters ? `+${loc.peakSurgeMeters}m` : 'Normal',
                          'Evacuation Status': loc.evacuationMandatory ? 'MANDATORY DIRECTIVE ACTIVE' : 'SHELTER IN PLACE',
                          Advisory: loc.advisoryAlert,
                        },
                      });
                    }}
                  />
                );
              })}

            {/* In-Map InfoWindow when an item is clicked */}
            {inspectedItem && (
              <InfoWindow
                position={inspectedItem.position}
                onCloseClick={() => setInspectedItem(null)}
              >
                <div className="p-1 font-mono text-xs text-[#0f172a] max-w-xs">
                  <div className="font-bold text-sm text-[#0f172a] border-b border-gray-300 pb-1 mb-1">
                    {inspectedItem.title}
                  </div>
                  <div className="text-[10px] font-bold text-[#0284c7] mb-1.5 uppercase">
                    {inspectedItem.subtitle}
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    {Object.entries(inspectedItem.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 border-b border-gray-100 py-0.5">
                        <span className="text-gray-600">{k}:</span>
                        <span className="font-bold text-gray-900">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* CRT Scanline Overlay */}
        {scanlinesActive && (
          <div className="absolute inset-0 crt-overlay z-10 pointer-events-none" />
        )}

        {/* Tactical Crosshair Grid Reticle in Corners */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none font-mono text-[9px] text-[#f1f2f6] bg-[#1e272e]/85 backdrop-blur-[2px] border border-[#4a5568] px-2 py-1 rounded shadow-md flex items-center gap-1.5">
          <Crosshair className="w-3 h-3 text-[#38bdf8]" />
          <span>GEO-SATELLITE SYNC // REAL-TIME EARTH OBSERVATION</span>
        </div>

        {/* Layer Visibility Toggles floating top-right (horizontal scroll on mobile) */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 max-w-[calc(100%-1rem)] overflow-x-auto no-scrollbar flex items-center flex-nowrap sm:flex-wrap gap-1 bg-[#1e272e]/90 backdrop-blur-[2px] p-1 rounded-lg border border-[#4a5568] shadow-lg select-none">
          {cycloneTrack && (
            <button
              type="button"
              onClick={() => setShowCycloneTrack(!showCycloneTrack)}
              className={`px-2 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 transition-all ${
                showCycloneTrack
                  ? 'bg-[#ff4757] text-white shadow-[0_0_6px_#ff4757]'
                  : 'bg-[#2d3436] text-[#a4b0be] hover:text-white'
              }`}
              title="Toggle Cyclone Track & Eyewall Swirl"
            >
              <Wind className="w-3 h-3" />
              CYCLONE
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowRadarBands(!showRadarBands)}
            className={`px-2 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 transition-all ${
              showRadarBands
                ? 'bg-amber-500 text-black shadow-[0_0_6px_#f59e0b]'
                : 'bg-[#2d3436] text-[#a4b0be] hover:text-white'
            }`}
            title="Toggle Torrential Rain Radar Reflectivity Rings"
          >
            <CloudRain className="w-3 h-3" />
            RAIN RADAR
          </button>

          <button
            type="button"
            onClick={() => setShowWeatherLocations(!showWeatherLocations)}
            className={`px-2 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 transition-all ${
              showWeatherLocations
                ? 'bg-[#0284c7] text-white shadow-[0_0_6px_#0284c7]'
                : 'bg-[#2d3436] text-[#a4b0be] hover:text-white'
            }`}
            title="Toggle Weather Telemetry Locations & Chronology"
          >
            <MapPin className="w-3 h-3" />
            WEATHER NODES
          </button>

          <button
            type="button"
            onClick={() => setShowZones(!showZones)}
            className={`px-2 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 transition-all ${
              showZones
                ? 'bg-[#ef4444] text-white shadow-[0_0_6px_#ef4444]'
                : 'bg-[#2d3436] text-[#a4b0be] hover:text-white'
            }`}
          >
            <Shield className="w-3 h-3" />
            ZONES
          </button>
          <button
            type="button"
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 transition-all ${
              showRoutes
                ? 'bg-[#38bdf8] text-[#0f172a] shadow-[0_0_6px_#38bdf8]'
                : 'bg-[#2d3436] text-[#a4b0be] hover:text-white'
            }`}
          >
            <Navigation className="w-3 h-3" />
            ROUTES
          </button>
          <button
            type="button"
            onClick={() => setShowShelters(!showShelters)}
            className={`px-2 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 transition-all ${
              showShelters
                ? 'bg-[#22c55e] text-[#0f172a] shadow-[0_0_6px_#22c55e]'
                : 'bg-[#2d3436] text-[#a4b0be] hover:text-white'
            }`}
          >
            <MapPin className="w-3 h-3" />
            SHELTERS
          </button>
          <button
            type="button"
            onClick={() => setShowResources(!showResources)}
            className={`px-2 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 transition-all ${
              showResources
                ? 'bg-[#f97316] text-white shadow-[0_0_6px_#f97316]'
                : 'bg-[#2d3436] text-[#a4b0be] hover:text-white'
            }`}
          >
            <Users className="w-3 h-3" />
            TEAMS
          </button>
        </div>

        {/* Tactile 3D Tilt & Perspective Controls (Bottom Right) */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-[#1e272e]/90 backdrop-blur-[2px] p-1.5 rounded-lg border border-[#4a5568] shadow-lg select-none">
          <button
            type="button"
            onClick={handleToggleTilt}
            className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1.5 transition-all ${
              tilt > 0
                ? 'bg-[#38bdf8] text-[#0f172a]'
                : 'bg-[#2d3436] text-[#f1f2f6] hover:bg-[#3d4852]'
            }`}
            title="Toggle 45° Oblique Satellite Perspective"
          >
            <Compass className="w-3 h-3" />
            <span>{tilt > 0 ? '45° 3D TILT ON' : '45° 3D TILT'}</span>
          </button>

          <div className="text-[9px] font-mono text-center text-[#94a3b8] px-1">
            SCROLL / DRAG TO PAN
          </div>
        </div>

        {/* Legend strip inside bottom-left */}
        <div className="absolute bottom-3 left-3 z-20 hidden sm:flex items-center gap-2 bg-[#1e272e]/90 backdrop-blur-[2px] px-2.5 py-1.5 rounded border border-[#4a5568] font-mono text-[10px] text-[#f1f2f6] shadow-lg">
          <span className="font-bold text-[#94a3b8]">HAZARD RISK:</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#ff4757] shadow-[0_0_4px_#ff4757]" /> CRITICAL
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

        {/* Tactical Inspect Popup Overlay when user clicks any zone, haven, or convoy */}
        {inspectedItem && (
          <div className="absolute top-12 left-2 right-2 sm:right-auto sm:left-3 z-30 max-w-sm w-auto bg-[#1e272e]/95 backdrop-blur-md rounded-lg border-2 border-[#38bdf8] shadow-2xl p-3 font-mono text-xs text-[#f1f2f6] animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#4a5568] pb-1 mb-2">
              <div className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#38bdf8]" />
                <span className="font-bold text-[#f1f2f6] truncate">{inspectedItem.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setInspectedItem(null)}
                className="text-[#94a3b8] hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[10px] text-[#38bdf8] font-bold mb-2 uppercase">
              {inspectedItem.subtitle}
            </div>

            <div className="space-y-1 text-[11px]">
              {Object.entries(inspectedItem.details).map(([key, val]) => (
                <div key={key} className="flex justify-between gap-2 border-b border-[#334155]/50 py-0.5">
                  <span className="text-[#94a3b8]">{key}:</span>
                  <span className="font-bold text-right text-[#f8fafc] truncate">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
