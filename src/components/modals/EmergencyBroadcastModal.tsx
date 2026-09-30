import React, { useState } from 'react';
import { CrisisZone, HazardType } from '../../types';
import { HardwareScrew } from '../common/HardwareScrew';
import { StatusLed } from '../common/StatusLed';
import { TactileButton } from '../common/TactileButton';
import {
  ShieldAlert,
  Radio,
  Smartphone,
  Volume2,
  Lock,
  Unlock,
  X,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { playMechanicalClick, playHeavyRelay, playAlarmChirp } from '../../utils/audio';

interface EmergencyBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  hazardType: HazardType;
  zones: CrisisZone[];
  onConfirmBroadcast: (payload: { title: string; zones: string[]; channels: string[] }) => void;
}

export const EmergencyBroadcastModal: React.FC<EmergencyBroadcastModalProps> = ({
  isOpen,
  onClose,
  hazardType,
  zones,
  onConfirmBroadcast,
}) => {
  const [safetyCoverOpen, setSafetyCoverOpen] = useState(false);
  const [selectedZones, setSelectedZones] = useState<string[]>(zones.map((z) => z.id));
  const [channels, setChannels] = useState<{ id: string; label: string; active: boolean; icon: React.ReactNode }[]>([
    { id: 'cell', label: 'NATIONAL CELL BROADCAST (WEA/SMS)', active: true, icon: <Smartphone className="w-4 h-4" /> },
    { id: 'eas', label: 'EMERGENCY ALERT SYSTEM (FM/TV/DTH)', active: true, icon: <Radio className="w-4 h-4" /> },
    { id: 'siren', label: 'MUNICIPAL ACOUSTIC SIREN TOWERS', active: true, icon: <Volume2 className="w-4 h-4" /> },
  ]);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleSafetyCover = () => {
    playHeavyRelay();
    setSafetyCoverOpen(!safetyCoverOpen);
  };

  const toggleZone = (zId: string) => {
    playMechanicalClick();
    setSelectedZones((prev) =>
      prev.includes(zId) ? prev.filter((id) => id !== zId) : [...prev, zId]
    );
  };

  const toggleChannel = (cId: string) => {
    playMechanicalClick();
    setChannels((prev) =>
      prev.map((c) => (c.id === cId ? { ...c, active: !c.active } : c))
    );
  };

  const handleBroadcastTrigger = () => {
    if (!safetyCoverOpen) return;
    playAlarmChirp();
    setSentSuccess(true);
    onConfirmBroadcast({
      title: `EMERGENCY ALERT: MANDATORY EVACUATION PROTOCOL [${hazardType.toUpperCase()}]`,
      zones: selectedZones,
      channels: channels.filter((c) => c.active).map((c) => c.label),
    });

    setTimeout(() => {
      setSentSuccess(false);
      setSafetyCoverOpen(false);
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      {/* Modal Industrial Chassis */}
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto panel-raised rounded-2xl border-4 border-[#ff4757] p-4 sm:p-6 shadow-2xl">
        <HardwareScrew className="absolute top-3 left-3" angle={45} />
        <HardwareScrew className="absolute top-3 right-3" angle={-30} />
        <HardwareScrew className="absolute bottom-3 left-3" angle={15} />
        <HardwareScrew className="absolute bottom-3 right-3" angle={-60} />

        {/* Hazard Stripes Banner */}
        <div className="w-full h-3 bg-[repeating-linear-gradient(45deg,#ff4757,#ff4757_10px,#2d3436_10px,#2d3436_20px)] mb-4 rounded-sm" />

        <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#babecc]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#ff4757] animate-pulse" />
            <h2 className="text-sm font-mono font-black text-[#2d3436] uppercase tracking-wider">
              AUTHORITY SAFETY INTERLOCK // EMERGENCY BROADCAST
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded bg-[#d1d9e6] hover:bg-[#babecc] text-[#2d3436]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-10 text-center space-y-3 font-mono">
            <CheckCircle className="w-12 h-12 text-[#22c55e] mx-auto animate-bounce" />
            <h3 className="text-base font-bold text-[#22c55e]">
              ALL ALERT CHANNELS SUCCESSFULLY ENERGIZED & TRANSMITTED
            </h3>
            <p className="text-xs text-[#4a5568]">
              Cellular broadcast pushed to {selectedZones.length} designated crisis sectors.
            </p>
          </div>
        ) : (
          <div className="space-y-4 font-mono">
            {/* Target Sectors */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[#4a5568] block mb-1">
                TARGET EVACUATION SECTORS:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {zones.map((zone) => {
                  const isChecked = selectedZones.includes(zone.id);
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => toggleZone(zone.id)}
                      className={`p-2 rounded text-left text-xs font-bold border transition-all flex items-center justify-between ${
                        isChecked
                          ? 'bg-[#2d3436] text-[#ff4757] border-[#ff4757]'
                          : 'well-recessed text-[#4a5568] border-[#babecc]'
                      }`}
                    >
                      <span className="truncate">{zone.name}</span>
                      <span className="text-[9px] uppercase">[{zone.riskLevel}]</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Broadcast Media Channels */}
            <div>
              <label className="text-[10px] uppercase font-bold text-[#4a5568] block mb-1">
                DISSEMINATION CHANNELS:
              </label>
              <div className="space-y-1.5">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    className={`w-full p-2 rounded text-left text-xs font-bold border transition-all flex items-center gap-2 ${
                      ch.active
                        ? 'bg-[#f0f2f5] text-[#2d3436] border-[#22c55e] shadow-[inset_1px_1px_2px_#ffffff]'
                        : 'well-recessed text-[#747d8c] border-[#babecc]'
                    }`}
                  >
                    <StatusLed color={ch.active ? 'green' : 'red'} size="sm" />
                    {ch.icon}
                    <span>{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Safety Cover Switch Interlock */}
            <div className="p-4 rounded-xl well-recessed border-2 border-[#babecc] flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-2 mb-2">
                {safetyCoverOpen ? (
                  <Unlock className="w-5 h-5 text-[#ff4757]" />
                ) : (
                  <Lock className="w-5 h-5 text-[#4a5568]" />
                )}
                <span className="text-xs font-bold text-[#2d3436]">
                  {safetyCoverOpen ? 'INTERLOCK ARMED // SAFETY GUARD OPEN' : 'SAFETY GUARD LOCKED'}
                </span>
              </div>

              <TactileButton
                size="sm"
                variant={safetyCoverOpen ? 'orange' : 'standard'}
                soundType="relay"
                onClick={toggleSafetyCover}
                className="mb-3"
              >
                {safetyCoverOpen ? 'CLOSE SAFETY COVER' : 'FLIP OPEN SAFETY GUARD'}
              </TactileButton>

              {/* Master Safety Trigger Button */}
              <button
                type="button"
                disabled={!safetyCoverOpen}
                onClick={handleBroadcastTrigger}
                className={`w-full py-3 rounded-lg font-mono font-black text-sm uppercase tracking-widest transition-all duration-100 select-none ${
                  safetyCoverOpen
                    ? 'bg-[#ff4757] text-white shadow-[0_0_20px_4px_rgba(255,71,87,0.7)] active:scale-95 active:shadow-[inset_4px_4px_8px_#b71540] cursor-pointer'
                    : 'bg-[#a4b0be] text-[#4a5568] opacity-40 cursor-not-allowed'
                }`}
              >
                ⚡ TRANSMIT MASTER EVACUATION ALERT ⚡
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
