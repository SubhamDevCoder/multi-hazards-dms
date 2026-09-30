import React from 'react';
import { HazardType } from '../../types';
import { playRotaryDetent } from '../../utils/audio';

interface RotarySelectorProps {
  currentHazard: HazardType;
  onChange: (hazard: HazardType) => void;
}

const HAZARD_OPTIONS: { id: HazardType; label: string; angle: number; color: string }[] = [
  { id: 'flood', label: 'FLOOD', angle: -60, color: '#3b82f6' },
  { id: 'cyclone', label: 'CYCLONE', angle: -24, color: '#06b6d4' },
  { id: 'storm_surge', label: 'STORM SURGE', angle: 12, color: '#6366f1' },
  { id: 'landslide', label: 'LANDSLIDE', angle: 48, color: '#d97706' },
  { id: 'heatwave', label: 'HEATWAVE', angle: 84, color: '#ef4444' },
  { id: 'drought', label: 'DROUGHT', angle: 120, color: '#b45309' },
];

export const RotarySelector: React.FC<RotarySelectorProps> = ({ currentHazard, onChange }) => {
  const currentIndex = HAZARD_OPTIONS.findIndex((h) => h.id === currentHazard);
  const activeOption = HAZARD_OPTIONS[currentIndex] || HAZARD_OPTIONS[0];

  const handleSelect = (hazard: HazardType) => {
    if (hazard !== currentHazard) {
      playRotaryDetent();
      onChange(hazard);
    }
  };

  const handleStepNext = () => {
    const nextIdx = (currentIndex + 1) % HAZARD_OPTIONS.length;
    handleSelect(HAZARD_OPTIONS[nextIdx].id);
  };

  const handleStepPrev = () => {
    const prevIdx = (currentIndex - 1 + HAZARD_OPTIONS.length) % HAZARD_OPTIONS.length;
    handleSelect(HAZARD_OPTIONS[prevIdx].id);
  };

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl panel-raised border border-[#babecc]/40 relative">
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#4a5568] font-bold">
          HAZARD REGIME SELECTOR
        </span>
        <span className="text-[10px] font-mono font-bold text-[#ff4757] bg-[#2d3436] px-1.5 py-0.5 rounded">
          DETENT: {activeOption.label}
        </span>
      </div>

      {/* Rotary Mechanical Unit */}
      <div className="relative w-36 h-36 flex items-center justify-center my-1">
        {/* Outer Bezel with Tick Marks */}
        <div className="absolute inset-0 rounded-full bg-[#d1d9e6] shadow-[inset_3px_3px_6px_#babecc,inset_-3px_-3px_6px_#ffffff] border border-[#babecc]">
          {HAZARD_OPTIONS.map((opt) => {
            const rad = ((opt.angle - 90) * Math.PI) / 180;
            const x = 50 + 42 * Math.cos(rad);
            const y = 50 + 42 * Math.sin(rad);
            const isActive = opt.id === currentHazard;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                title={`Switch scenario: ${opt.label}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer focus:outline-none"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-200 border ${
                    isActive
                      ? 'bg-[#ff4757] led-red-glow scale-125 border-white'
                      : 'bg-[#4a5568] hover:bg-[#2d3436] border-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Central Knurled Knob */}
        <div
          onClick={handleStepNext}
          title="Click to advance rotary detent"
          className="relative w-22 h-22 rounded-full cursor-pointer transition-transform duration-300 ease-out bg-[#e0e5ec] shadow-[6px_6px_12px_#babecc,-6px_-6px_12px_#ffffff] border-2 border-[#d1d9e6] flex items-center justify-center select-none active:scale-95"
          style={{ transform: `rotate(${activeOption.angle}deg)` }}
        >
          {/* Knurling notches on knob edge */}
          <div className="absolute inset-1 rounded-full border border-dashed border-[#a4b0be]/60" />
          
          {/* Recessed metal center */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#f0f2f5] via-[#d1d9e6] to-[#babecc] shadow-[inset_2px_2px_4px_#babecc,inset_-2px_-2px_4px_#ffffff] flex items-center justify-center">
            {/* Pointer notch */}
            <div className="absolute -top-1 w-2 h-4 rounded-sm bg-[#ff4757] shadow-[0_0_6px_rgba(255,71,87,0.8)]" />
            <div className="w-4 h-4 rounded-full bg-[#2d3436] shadow-[inset_1px_1px_2px_#000000]" />
          </div>
        </div>
      </div>

      {/* Manual Stepper & Key Buttons */}
      <div className="grid grid-cols-3 gap-1.5 w-full mt-2">
        {HAZARD_OPTIONS.map((opt) => {
          const isActive = opt.id === currentHazard;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt.id)}
              className={`px-1.5 py-1 text-[9px] font-mono font-bold tracking-wider rounded transition-all text-center truncate select-none ${
                isActive
                  ? 'bg-[#2d3436] text-[#ff4757] shadow-[inset_2px_2px_4px_#000000] border border-[#ff4757]/40'
                  : 'bg-[#e0e5ec] text-[#4a5568] shadow-[2px_2px_4px_#babecc,-2px_-2px_4px_#ffffff] hover:text-[#2d3436]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center w-full mt-2 pt-1 border-t border-[#babecc]/50">
        <button
          type="button"
          onClick={handleStepPrev}
          className="text-[10px] font-mono text-[#4a5568] hover:text-[#2d3436] px-2 py-0.5 rounded bg-[#d1d9e6] shadow-[inset_1px_1px_2px_#babecc]"
        >
          ◀ STEP PREV
        </button>
        <span className="text-[9px] font-mono text-[#747d8c]">RATCHET: 6 POS</span>
        <button
          type="button"
          onClick={handleStepNext}
          className="text-[10px] font-mono text-[#4a5568] hover:text-[#2d3436] px-2 py-0.5 rounded bg-[#d1d9e6] shadow-[inset_1px_1px_2px_#babecc]"
        >
          STEP NEXT ▶
        </button>
      </div>
    </div>
  );
};
