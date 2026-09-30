import React, { useState } from 'react';
import { EmergencyResource, CrisisZone, ResourceType } from '../../types';
import { HardwareScrew } from '../common/HardwareScrew';
import { VentSlots } from '../common/VentSlots';
import { StatusLed } from '../common/StatusLed';
import { TactileButton } from '../common/TactileButton';
import {
  Boxes,
  Home,
  Shield,
  Ambulance,
  HeartPulse,
  Send,
  Radio,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { playMechanicalClick, playSuccessChime } from '../../utils/audio';

interface ResourcePlanningModuleProps {
  resources: EmergencyResource[];
  zones: CrisisZone[];
  onAssignResource: (resourceId: string, zoneId: string) => void;
  onAdmitShelterEvacuees: (shelterId: string, count: number) => void;
}

export const ResourcePlanningModule: React.FC<ResourcePlanningModuleProps> = ({
  resources,
  zones,
  onAssignResource,
  onAdmitShelterEvacuees,
}) => {
  const [selectedResourceType, setSelectedResourceType] = useState<string>('all');
  const [targetZoneMap, setTargetZoneMap] = useState<Record<string, string>>({});
  const [lastDispatchedId, setLastDispatchedId] = useState<string | null>(null);

  const filterOptions = [
    { id: 'all', label: 'ALL ASSETS', icon: <Boxes className="w-3.5 h-3.5" /> },
    { id: 'shelter', label: 'SHELTERS', icon: <Home className="w-3.5 h-3.5" /> },
    { id: 'ndrf_team', label: 'NDRF SQUADS', icon: <Shield className="w-3.5 h-3.5" /> },
    { id: 'medical', label: 'MEDICAL / TRIAGE', icon: <HeartPulse className="w-3.5 h-3.5" /> },
    { id: 'ambulance', label: 'AMBULANCES', icon: <Ambulance className="w-3.5 h-3.5" /> },
  ];

  const filteredResources = resources.filter((r) => {
    if (selectedResourceType === 'all') return true;
    return r.type === selectedResourceType;
  });

  const handleTargetZoneChange = (resId: string, zoneId: string) => {
    setTargetZoneMap((prev) => ({ ...prev, [resId]: zoneId }));
  };

  const handleDispatch = (res: EmergencyResource) => {
    const targetZoneId = targetZoneMap[res.id] || zones[0]?.id;
    if (!targetZoneId) return;

    playSuccessChime();
    setLastDispatchedId(res.id);
    onAssignResource(res.id, targetZoneId);

    setTimeout(() => {
      setLastDispatchedId(null);
    }, 2500);
  };

  const handleIncrementOccupancy = (shelterId: string) => {
    playMechanicalClick();
    onAdmitShelterEvacuees(shelterId, 150);
  };

  return (
    <div className="relative w-full rounded-xl panel-raised border border-[#babecc] p-4 flex flex-col">
      <HardwareScrew className="absolute top-2.5 left-2.5" angle={-15} />
      <HardwareScrew className="absolute top-2.5 right-2.5" angle={30} />

      {/* Title & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 mb-3 border-b border-[#babecc]/50 select-none">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-[#ff4757]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2d3436]">
            MODULE 04: TACTICAL ASSET INVENTORY & CRISIS ALLOCATION
          </h2>
          <StatusLed color="green" size="sm" />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                playMechanicalClick();
                setSelectedResourceType(opt.id);
              }}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded flex items-center gap-1 transition-all ${
                selectedResourceType === opt.id
                  ? 'bg-[#2d3436] text-[#e0e5ec] shadow-[inset_1px_1px_2px_#000000]'
                  : 'bg-[#e0e5ec] text-[#4a5568] shadow-[2px_2px_4px_#babecc,-2px_-2px_4px_#ffffff] hover:text-[#2d3436]'
              }`}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}

          <VentSlots count={3} className="hidden lg:flex ml-2" />
        </div>
      </div>

      {/* Asset Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredResources.map((res) => {
          const isShelter = res.type === 'shelter';
          const occupancyPct =
            res.capacity && res.currentOccupancy
              ? Math.min(100, Math.round((res.currentOccupancy / res.capacity) * 100))
              : 0;
          const isDispatched = res.status === 'dispatched' || res.status === 'on_scene';
          const selectedZoneForRes =
            targetZoneMap[res.id] || res.assignedZoneId || zones[0]?.id;

          return (
            <div
              key={res.id}
              className={`well-recessed p-3.5 rounded-xl border transition-all duration-150 flex flex-col justify-between ${
                lastDispatchedId === res.id
                  ? 'border-[#22c55e] ring-2 ring-[#22c55e]/50'
                  : 'border-[#babecc]/70'
              }`}
            >
              <div>
                {/* Top Card Row */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#2d3436] text-[#e0e5ec] font-bold">
                    {res.callsign}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <StatusLed
                      color={
                        res.status === 'on_scene'
                          ? 'green'
                          : res.status === 'dispatched'
                          ? 'amber'
                          : 'blue'
                      }
                      size="sm"
                    />
                    <span className="text-[10px] font-mono font-bold uppercase text-[#4a5568]">
                      {res.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <h3 className="text-xs font-mono font-bold text-[#2d3436] mb-1">
                  {res.name}
                </h3>

                <div className="flex items-center gap-2 text-[10px] font-mono text-[#4a5568] mb-2">
                  <span className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-[#ff4757]" /> {res.radioFrequencyMhz} MHz
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#3b82f6]" /> {res.personnelCount} Personnel
                  </span>
                </div>

                {/* Shelter Specific Capacity Bar */}
                {isShelter && res.capacity && (
                  <div className="p-2 rounded bg-[#f0f2f5] border border-[#babecc] space-y-1 mb-2">
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                      <span className="text-[#4a5568]">OCCUPANCY STATUS:</span>
                      <span
                        className={
                          occupancyPct > 90
                            ? 'text-[#ff4757]'
                            : occupancyPct > 70
                            ? 'text-[#f59e0b]'
                            : 'text-[#22c55e]'
                        }
                      >
                        {res.currentOccupancy} / {res.capacity} ({occupancyPct}%)
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#d1d9e6] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          occupancyPct > 90
                            ? 'bg-[#ff4757]'
                            : occupancyPct > 70
                            ? 'bg-[#f59e0b]'
                            : 'bg-[#22c55e]'
                        }`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[9px] font-mono text-[#747d8c] pt-0.5">
                      <span>RATIONS: {res.supplyDays} DAYS</span>
                      <button
                        type="button"
                        onClick={() => handleIncrementOccupancy(res.id)}
                        className="text-[9px] text-[#ff4757] font-bold hover:underline"
                      >
                        + ADMIT EVACUEES
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Assignment Selector & Tactile Push Button */}
              <div className="pt-2 border-t border-[#babecc]/60 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#4a5568]">TARGET:</span>
                  <select
                    value={selectedZoneForRes}
                    onChange={(e) => handleTargetZoneChange(res.id, e.target.value)}
                    className="flex-1 text-[10px] font-mono bg-[#f0f2f5] border border-[#babecc] rounded px-1.5 py-1 text-[#2d3436] focus:outline-none"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} [{z.riskLevel.toUpperCase()}]
                      </option>
                    ))}
                  </select>
                </div>

                <TactileButton
                  size="sm"
                  variant={isDispatched ? 'standard' : 'orange'}
                  soundType="relay"
                  icon={
                    lastDispatchedId === res.id ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )
                  }
                  onClick={() => handleDispatch(res)}
                >
                  {lastDispatchedId === res.id
                    ? 'DISPATCH TRANSMITTED'
                    : isDispatched
                    ? 'RE-DEPLOY TO TARGET'
                    : 'DISPATCH ASSET NOW'}
                </TactileButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
