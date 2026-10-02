import React from 'react';
import { EvacuationRoute, RouteStatus } from '../../types';
import { HardwareScrew } from '../common/HardwareScrew';
import { VentSlots } from '../common/VentSlots';
import { StatusLed } from '../common/StatusLed';
import { TactileButton } from '../common/TactileButton';
import {
  Navigation,
  AlertOctagon,
  CheckCircle,
  Clock,
  Milestone,
  Truck,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { playMechanicalClick, playAlarmChirp } from '../../utils/audio';

interface EvacuationRoutingModuleProps {
  routes: EvacuationRoute[];
  onToggleRouteStatus: (routeId: string) => void;
  onEngageDetour: (routeId: string) => void;
}

export const EvacuationRoutingModule: React.FC<EvacuationRoutingModuleProps> = ({
  routes,
  onToggleRouteStatus,
  onEngageDetour,
}) => {
  const getStatusBadge = (status: RouteStatus) => {
    switch (status) {
      case 'flooded':
        return {
          label: 'ROADWAY FLOODED',
          bg: 'bg-[#ff4757]',
          text: 'text-white',
          led: 'red' as const,
        };
      case 'blocked':
        return {
          label: 'DEBRIS / SEVERED',
          bg: 'bg-[#ff4757]',
          text: 'text-white',
          led: 'red' as const,
        };
      case 'congested':
        return {
          label: 'HEAVY CONGESTION',
          bg: 'bg-[#f59e0b]',
          text: 'text-black',
          led: 'amber' as const,
        };
      default:
        return {
          label: 'CORRIDOR CLEAR',
          bg: 'bg-[#22c55e]',
          text: 'text-white',
          led: 'green' as const,
        };
    }
  };

  const handleToggle = (routeId: string) => {
    playAlarmChirp();
    onToggleRouteStatus(routeId);
  };

  const handleDetour = (routeId: string) => {
    playMechanicalClick();
    onEngageDetour(routeId);
  };

  return (
    <div className="relative w-full rounded-xl panel-raised border border-[#babecc] p-4 flex flex-col">
      <HardwareScrew className="absolute top-2.5 left-2.5" angle={45} />
      <HardwareScrew className="absolute top-2.5 right-2.5" angle={-18} />

      {/* Module Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 mb-3 border-b border-[#babecc]/50 select-none">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#ff4757]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2d3436]">
            MODULE 05: EVACUATION & DYNAMIC EMERGENCY ROUTING
          </h2>
          <StatusLed color="blue" pulse size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-[#4a5568]">
            ACTIVE CORRIDORS: {routes.length}
          </span>
          <VentSlots count={3} className="hidden sm:flex ml-1" />
        </div>
      </div>

      {/* Routes Mechanical Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {routes.map((route) => {
          const badge = getStatusBadge(route.status);
          const isImpassable = route.status === 'flooded' || route.status === 'blocked';

          return (
            <div
              key={route.id}
              className={`well-recessed p-4 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                isImpassable ? 'border-[#ff4757]/80' : 'border-[#babecc]'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2d3436] text-[#e0e5ec] font-bold">
                      {route.code}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#2d3436]">
                      {route.name}
                    </span>
                  </div>

                  <div
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${badge.bg} ${badge.text}`}
                  >
                    <StatusLed color={badge.led} pulse={isImpassable} size="sm" />
                    <span>{badge.label}</span>
                  </div>
                </div>

                {/* Primary Roadway info */}
                <div className="p-2 rounded bg-[#f0f2f5] border border-[#babecc] text-[11px] font-mono mb-2">
                  <span className="text-[#4a5568] block text-[9px] font-bold">PRIMARY LIFELINE ARTERIAL:</span>
                  <p className="text-[#2d3436] font-bold mt-0.5">{route.roadName}</p>
                </div>

                {/* Telemetry Stats */}
                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono p-2 rounded bg-[#f0f2f5] border border-[#babecc] mb-2">
                  <div>
                    <span className="text-[#4a5568] block text-[9px]">CORRIDOR DIST:</span>
                    <strong className="text-xs text-[#2d3436]">
                      {route.isDetourActive ? (route.distanceKm * 1.25).toFixed(1) : route.distanceKm} km
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#4a5568] block text-[9px]">ESTIMATED ETA:</span>
                    <strong className="text-xs text-[#ff4757]">
                      {route.isDetourActive ? Math.round(route.etaMinutes * 1.3) : route.etaMinutes} mins
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#4a5568] block text-[9px]">EVACUEES TRANSIT:</span>
                    <strong className="text-xs text-[#22c55e]">
                      {route.evacueesCount.toLocaleString()} pax
                    </strong>
                  </div>
                </div>

                {/* Detour status indicator */}
                {route.isDetourActive ? (
                  <div className="p-2 rounded bg-[#2d3436] text-[#e0e5ec] text-[10px] font-mono border border-[#3b82f6] space-y-0.5 mb-2">
                    <div className="flex items-center gap-1.5 text-[#3b82f6] font-bold">
                      <Zap className="w-3.5 h-3.5" />
                      <span>DYNAMIC DETOUR ENGAGED</span>
                    </div>
                    <p className="text-[#a4b0be] text-[9px]">
                      Traffic automatically routed through secondary high-elevation bypass away from hazard sector.
                    </p>
                  </div>
                ) : (
                  <div className="p-2 rounded bg-[#e0e5ec] text-[#4a5568] text-[10px] font-mono border border-[#babecc] mb-2 flex items-center justify-between">
                    <span>PRIMARY AXIS IN SERVICE</span>
                    <span className="text-[#22c55e] font-bold">DETOUR STANDBY</span>
                  </div>
                )}
              </div>

              {/* Tactical Buttons */}
              <div className="pt-2 border-t border-[#babecc]/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <TactileButton
                  size="sm"
                  variant={isImpassable ? 'standard' : 'danger'}
                  onClick={() => handleToggle(route.id)}
                  icon={<AlertOctagon className="w-3.5 h-3.5 shrink-0" />}
                  className="w-full sm:flex-1 py-2 text-center"
                >
                  {isImpassable ? 'CLEAR ROAD BLOCKAGE' : 'SIMULATE ROAD HAZARD'}
                </TactileButton>

                <TactileButton
                  size="sm"
                  variant={route.isDetourActive ? 'orange' : 'standard'}
                  active={route.isDetourActive}
                  onClick={() => handleDetour(route.id)}
                  icon={<RotateCcw className="w-3.5 h-3.5 shrink-0" />}
                  className="w-full sm:flex-1 py-2 text-center font-bold"
                >
                  {route.isDetourActive ? 'DISENGAGE DETOUR' : 'CALCULATE DETOUR'}
                </TactileButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
