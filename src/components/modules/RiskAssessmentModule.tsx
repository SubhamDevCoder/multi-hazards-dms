import React, { useState } from 'react';
import { CrisisZone, RiskLevel } from '../../types';
import { HardwareScrew } from '../common/HardwareScrew';
import { VentSlots } from '../common/VentSlots';
import { StatusLed } from '../common/StatusLed';
import { TactileButton } from '../common/TactileButton';
import {
  AlertTriangle,
  Calculator,
  Sliders,
  ShieldCheck,
  Building2,
  Users,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { playMechanicalClick, playRotaryDetent } from '../../utils/audio';

interface RiskAssessmentModuleProps {
  zones: CrisisZone[];
  selectedZone: CrisisZone | null;
  onSelectZone: (zone: CrisisZone) => void;
}

export const RiskAssessmentModule: React.FC<RiskAssessmentModuleProps> = ({
  zones,
  selectedZone,
  onSelectZone,
}) => {
  // Configurable weights for Risk Calculation Engine
  const [hazardWeight, setHazardWeight] = useState(40);
  const [exposureWeight, setExposureWeight] = useState(35);
  const [vulnerabilityWeight, setVulnerabilityWeight] = useState(25);
  const [showWeightTuner, setShowWeightTuner] = useState(false);

  const activeZone = selectedZone || zones[0] || null;

  // Dynamically calculate risk based on current engine weights
  const calculateDynamicScore = (zone: CrisisZone) => {
    const totalWeight = hazardWeight + exposureWeight + vulnerabilityWeight;
    const score =
      (zone.hazardIntensity * hazardWeight +
        zone.exposureScore * exposureWeight +
        zone.vulnerabilityIndex * vulnerabilityWeight) /
      totalWeight;
    return Math.round(score);
  };

  const getRiskLevelBadge = (level: RiskLevel) => {
    switch (level) {
      case 'critical':
        return {
          bg: 'bg-[#ff4757]',
          text: 'text-white',
          border: 'border-[#c0392b]',
          led: 'red' as const,
        };
      case 'high':
        return {
          bg: 'bg-[#f97316]',
          text: 'text-white',
          border: 'border-[#ea580c]',
          led: 'amber' as const,
        };
      case 'moderate':
        return {
          bg: 'bg-[#eab308]',
          text: 'text-black',
          border: 'border-[#ca8a04]',
          led: 'amber' as const,
        };
      default:
        return {
          bg: 'bg-[#22c55e]',
          text: 'text-white',
          border: 'border-[#16a34a]',
          led: 'green' as const,
        };
    }
  };

  const resetWeights = () => {
    playMechanicalClick();
    setHazardWeight(40);
    setExposureWeight(35);
    setVulnerabilityWeight(25);
  };

  return (
    <div className="relative w-full rounded-xl panel-raised border border-[#babecc] p-4 flex flex-col">
      <HardwareScrew className="absolute top-2.5 left-2.5" angle={-24} />
      <HardwareScrew className="absolute top-2.5 right-2.5" angle={48} />

      {/* Title & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 mb-3 border-b border-[#babecc]/50 select-none">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#ff4757]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2d3436]">
            MODULES 02 & 03: DYNAMIC RISK ENGINE & EXPLAINABLE IMPACT PREDICTION
          </h2>
          <StatusLed color="red" pulse size="sm" />
        </div>

        <div className="flex items-center gap-2">
          <TactileButton
            size="sm"
            active={showWeightTuner}
            onClick={() => {
              playMechanicalClick();
              setShowWeightTuner(!showWeightTuner);
            }}
            icon={<Sliders className="w-3.5 h-3.5" />}
          >
            {showWeightTuner ? 'CLOSE WEIGHT TUNER' : 'FINE-TUNE WEIGHTS'}
          </TactileButton>

          <VentSlots count={3} className="hidden sm:flex ml-1" />
        </div>
      </div>

      {/* Optional Weight Tuner Drawer */}
      {showWeightTuner && (
        <div className="well-recessed p-3 rounded-lg border border-[#babecc] mb-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#2d3436]">
            <span>COEFFICIENT TUNER [NORMALIZED SUM: {hazardWeight + exposureWeight + vulnerabilityWeight}%]</span>
            <button
              type="button"
              onClick={resetWeights}
              className="text-[10px] text-[#ff4757] hover:underline"
            >
              RESTORE DEFAULTS (40/35/25)
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono text-[#4a5568] flex justify-between">
                <span>HAZARD INTENSITY:</span>
                <strong>{hazardWeight}%</strong>
              </label>
              <input
                type="range"
                min="10"
                max="60"
                value={hazardWeight}
                onChange={(e) => {
                  playRotaryDetent();
                  setHazardWeight(Number(e.target.value));
                }}
                className="w-full accent-[#ff4757] cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#4a5568] flex justify-between">
                <span>EXPOSURE INDEX:</span>
                <strong>{exposureWeight}%</strong>
              </label>
              <input
                type="range"
                min="10"
                max="60"
                value={exposureWeight}
                onChange={(e) => {
                  playRotaryDetent();
                  setExposureWeight(Number(e.target.value));
                }}
                className="w-full accent-[#ff4757] cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-[#4a5568] flex justify-between">
                <span>VULNERABILITY INDEX:</span>
                <strong>{vulnerabilityWeight}%</strong>
              </label>
              <input
                type="range"
                min="10"
                max="60"
                value={vulnerabilityWeight}
                onChange={(e) => {
                  playRotaryDetent();
                  setVulnerabilityWeight(Number(e.target.value));
                }}
                className="w-full accent-[#ff4757] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Zone Selector Column + Explainability Inspector Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Crisis Zones Mechanical List (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[#4a5568] px-1">
            <span>SECTOR CRISIS ZONES</span>
            <span>INTENSITY / RISK</span>
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {zones.map((zone) => {
              const dynamicScore = calculateDynamicScore(zone);
              const badge = getRiskLevelBadge(zone.riskLevel);
              const isSelected = activeZone?.id === zone.id;

              return (
                <div
                  key={zone.id}
                  onClick={() => {
                    playMechanicalClick();
                    onSelectZone(zone);
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-100 select-none border ${
                    isSelected
                      ? 'panel-raised border-[#ff4757] shadow-[6px_6px_12px_#babecc,-6px_-6px_12px_#ffffff] ring-1 ring-[#ff4757]'
                      : 'well-recessed border-[#babecc]/70 hover:border-[#4a5568]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <StatusLed color={badge.led} pulse={zone.riskLevel === 'critical'} size="sm" />
                      <span className="text-xs font-mono font-bold text-[#2d3436]">
                        {zone.name}
                      </span>
                    </div>

                    <div
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                    >
                      {zone.riskLevel} [{dynamicScore}]
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 my-1 text-[10px] font-mono text-[#4a5568]">
                    <div>
                      POP: <strong className="text-[#2d3436]">{zone.population.toLocaleString()}</strong>
                    </div>
                    <div>
                      ELEV: <strong className="text-[#2d3436]">{zone.elevationMeters}m</strong>
                    </div>
                    <div>
                      EVAC: <strong className="text-[#22c55e]">{zone.evacuatedPercentage}%</strong>
                    </div>
                  </div>

                  {/* Factor progress bars */}
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center justify-between text-[9px] font-mono text-[#4a5568]">
                      <span>HAZARD INTENSITY ({hazardWeight}%):</span>
                      <span className="font-bold text-[#2d3436]">{zone.hazardIntensity}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#babecc]/50 overflow-hidden">
                      <div
                        className="h-full bg-[#ff4757] rounded-full transition-all duration-300"
                        style={{ width: `${zone.hazardIntensity}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Dedicated Risk Explainability Panel (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between well-recessed p-4 rounded-xl border-2 border-[#babecc]">
          {activeZone ? (
            <div className="space-y-3">
              {/* Explainability Header */}
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#babecc]">
                <div>
                  <span className="text-[10px] font-mono text-[#ff4757] font-bold tracking-widest uppercase">
                    EXPLAINABILITY ENGINE // SECTOR AUDIT
                  </span>
                  <h3 className="text-sm font-mono font-bold text-[#2d3436] flex items-center gap-2 mt-0.5">
                    {activeZone.name}
                    <span className="text-xs px-2 py-0.5 rounded bg-[#2d3436] text-[#ff4757]">
                      CALCULATED RISK: {calculateDynamicScore(activeZone)}/100
                    </span>
                  </h3>
                </div>

                <div className="text-right">
                  <span className="text-[9px] font-mono text-[#4a5568] block">ZONE COORDINATES</span>
                  <span className="text-[10px] font-mono font-bold text-[#2d3436]">
                    {activeZone.coordinates[0].toFixed(3)}°N, {activeZone.coordinates[1].toFixed(3)}°E
                  </span>
                </div>
              </div>

              {/* Explicit Headline & Mathematical Formula */}
              <div className="p-2.5 rounded bg-[#f0f2f5] border border-[#babecc] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#ff4757]">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{activeZone.explainability.headline}</span>
                </div>
                <div className="font-mono text-[11px] text-[#2d3436] bg-[#d1d9e6] p-1.5 rounded border border-[#babecc]/60 overflow-x-auto">
                  <code>{activeZone.explainability.formula}</code>
                </div>
              </div>

              {/* Human-Readable Breakdown Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#4a5568] font-bold block">
                  CONTRIBUTING RISK FACTOR DECOMPOSITION
                </span>

                <div className="space-y-1.5">
                  {activeZone.explainability.breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#f0f2f5] border border-[#babecc]/80 text-[11px] font-mono"
                    >
                      <div className="flex items-center justify-between font-bold mb-0.5">
                        <span className="text-[#2d3436]">{item.factor}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] uppercase ${
                            item.severity === 'critical'
                              ? 'bg-[#ff4757] text-white'
                              : item.severity === 'high'
                              ? 'bg-[#f97316] text-white'
                              : 'bg-[#22c55e] text-white'
                          }`}
                        >
                          {item.severity} ({item.weightPercent}%)
                        </span>
                      </div>
                      <div className="text-[#ff4757] font-semibold text-[10px]">{item.value}</div>
                      <p className="text-[#4a5568] text-[10px] mt-0.5 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Critical Infrastructure Exposure */}
              <div className="p-2 rounded bg-[#f0f2f5] border border-[#babecc]/80">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#4a5568] font-bold block mb-1">
                  CRITICAL INFRASTRUCTURE AT RISK:
                </span>
                <div className="flex flex-wrap gap-1">
                  {activeZone.criticalInfrastructure.map((infra, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-[#2d3436] text-[#e0e5ec] text-[9px] font-mono font-bold"
                    >
                      {infra}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommended Tactical Response Action */}
              <div className="p-2.5 rounded bg-[#2d3436] text-[#e0e5ec] font-mono space-y-1 border border-[#ff4757]/60">
                <span className="text-[9px] font-bold text-[#ff4757] uppercase tracking-wider block">
                  RECOMMENDED TACTICAL PROTOCOL:
                </span>
                <p className="text-xs leading-relaxed text-white font-semibold">
                  {activeZone.explainability.recommendedAction}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 text-xs font-mono text-[#4a5568]">
              SELECT A SECTOR CRISIS ZONE TO INSPECT EXPLAINABLE IMPACT BREAKDOWN
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
