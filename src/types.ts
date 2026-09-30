export type HazardType =
  | 'cyclone'
  | 'flood'
  | 'drought'
  | 'heatwave'
  | 'landslide'
  | 'storm_surge';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface WeatherTelemetry {
  rainfallMmHr: number;
  windKnots: number;
  pressureHpa: number;
  temperatureC: number;
  humidityPercent: number;
  gustKnots: number;
}

export interface RiverGaugeData {
  stationId: string;
  riverName: string;
  currentLevelM: number;
  warningLevelM: number;
  dangerLevelM: number;
  trend: 'rising' | 'steady' | 'falling';
  dischargeCumec: number;
  breachStatus: boolean;
}

export interface SatelliteFeed {
  satelliteName: string;
  orbitPassTime: string;
  radarReflectivityDbz: number;
  soilMoistureIndex: number;
  cloudTopTempC: number;
  inundationAreaSqKm: number;
}

export interface CitizenReport {
  id: string;
  timestamp: string;
  reporterHandle: string;
  hazardType: HazardType;
  locationName: string;
  coordinates: [number, number];
  description: string;
  confidenceScore: number;
  verified: boolean;
  mediaCount: number;
}

export interface RiskFactorBreakdown {
  factor: string;
  value: string;
  weightPercent: number;
  severity: RiskLevel;
  description: string;
}

export interface ZoneExplainability {
  headline: string;
  formula: string;
  breakdown: RiskFactorBreakdown[];
  recommendedAction: string;
}

export interface CrisisZone {
  id: string;
  name: string;
  hazardType: HazardType;
  coordinates: [number, number];
  polygon: [number, number][];
  population: number;
  elevationMeters: number;
  criticalInfrastructure: string[];
  hazardIntensity: number; // 0 - 100
  exposureScore: number;   // 0 - 100
  vulnerabilityIndex: number; // 0 - 100
  calculatedRiskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  assignedResourcesCount: number;
  evacuatedPercentage: number;
  explainability: ZoneExplainability;
}

export type ResourceType =
  | 'shelter'
  | 'medical'
  | 'ambulance'
  | 'ndrf_team'
  | 'air_rescue'
  | 'water_bowser';

export type ResourceStatus = 'standby' | 'dispatched' | 'on_scene' | 'maintenance';

export interface EmergencyResource {
  id: string;
  callsign: string;
  name: string;
  type: ResourceType;
  status: ResourceStatus;
  capacity?: number;
  currentOccupancy?: number;
  supplyDays?: number;
  personnelCount: number;
  assignedZoneId?: string;
  locationName: string;
  coordinates: [number, number];
  radioFrequencyMhz: string;
}

export type RouteStatus = 'open' | 'flooded' | 'blocked' | 'congested';

export interface EvacuationRoute {
  id: string;
  code: string;
  name: string;
  fromZoneId: string;
  toShelterId: string;
  status: RouteStatus;
  distanceKm: number;
  etaMinutes: number;
  evacueesCount: number;
  roadName: string;
  elevationClearanceM: number;
  primaryPath: [number, number][];
  detourPath: [number, number][];
  isDetourActive: boolean;
}

export interface IncidentEventLog {
  id: string;
  timestamp: string;
  severity: 'CRIT' | 'WARN' | 'INFO' | 'OK';
  source: 'TELEMETRY' | 'CITIZEN' | 'RADAR' | 'COMMAND' | 'NDRF' | 'HYDROLOGY';
  message: string;
  zoneId?: string;
  acknowledged: boolean;
}

export interface DefconState {
  level: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  color: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  source?: string;
}

export interface HazardTimelinePoint {
  timeOffsetHours: number; // 0, 1, 2, 4, 6, 12, 24, 48
  timestamp: string;       // e.g. "14:00 IST", "16:00 IST"
  label: string;           // "NOW", "+2H (INCEPTION)", "+4H (PEAK)"
  rainfallMmHr: number;
  windKnots: number;
  gustKnots: number;
  pressureHpa: number;
  hazardSeverity: 'low' | 'moderate' | 'heavy' | 'extreme' | 'catastrophic';
  statusDescription: string;
  cycloneEyeCoords?: [number, number];
}

export interface LocationHazardForecast {
  locationId: string;
  locationName: string;
  sectorCode: string;
  coordinates: [number, number];
  elevationM: number;
  distanceFromCoastKm?: number;
  hazardType: HazardType;
  hazardTitle: string; // e.g. "SUPER CYCLONE EYEWALL & GALE SURGE"
  severityLevel: 'low' | 'moderate' | 'high' | 'critical';
  currentCondition: {
    tempC: number;
    rainfallMmHr: number;
    windKnots: number;
    gustKnots: number;
    pressureHpa: number;
    humidity: number;
    cloudCoverPct?: number;
    surgeMeters?: number;
    description: string;
    weatherCode: string;
  };
  // Specific heavy hazard timing parameters (User prompt requirement)
  heavyStartTime: string;     // e.g. "14:30 IST Today"
  heavyPeakTime: string;      // e.g. "17:30 - 21:00 IST (Max 165mm/h)"
  heavyEndTime: string;       // e.g. "04:30 IST Tomorrow"
  peakWindowLabel: string;
  timeToHeavyMinutes: number; // negative if already heavy
  currentStatus: 'approaching' | 'heavy_active' | 'peak_impact' | 'receding' | 'cleared';
  totalExpectedRainfallMm: number;
  peakWindKnots: number;
  peakSurgeMeters?: number;
  hourlyTimeline: HazardTimelinePoint[];
  advisoryAlert: string;
  evacuationMandatory: boolean;
  priorityLevel: 'ALPHA' | 'BRAVO' | 'CHARLIE';
}

export interface CycloneTrackPoint {
  id: string;
  timeOffsetHours: number;
  timeLabel: string;
  coordinates: [number, number];
  windKnots: number;
  gustKnots: number;
  pressureHpa: number;
  category: string;
  stageLabel: string;
  status: 'past' | 'current' | 'forecast';
}

export interface CycloneTrackData {
  cycloneName: string;
  category: string;
  currentEye: [number, number];
  centralPressureHpa: number;
  maxSustainedWindKnots: number;
  gustKnots: number;
  forwardSpeedKmh: number;
  forwardDirection: string;
  estimatedLandfallTime: string;
  estimatedLandfallLocation: string;
  surgePeakMeters: number;
  radiusGaleKm: number;
  radiusStormKm: number;
  trackPoints: CycloneTrackPoint[];
}
