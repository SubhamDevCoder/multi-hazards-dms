import React, { useState } from 'react';
import {
  Map,
  Clock,
  Radio,
  Activity,
  Bot,
  Flame,
  ShieldAlert,
  Menu,
  X,
  Compass,
  Download,
  Smartphone,
  ChevronUp,
} from 'lucide-react';
import { HazardType } from '../../types';
import { PWAInstallButton } from './PWAInstallButton';
import { playMechanicalClick, playAlarmChirp } from '../../utils/audio';

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: any) => void;
  currentHazard: HazardType;
  onChangeHazard: (hazard: HazardType) => void;
  onOpenBroadcastModal: () => void;
  onToggleAiCopilot: () => void;
  isAiCopilotOpen: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  currentHazard,
  onChangeHazard,
  onOpenBroadcastModal,
  onToggleAiCopilot,
  isAiCopilotOpen,
}) => {
  const [showHazardSheet, setShowHazardSheet] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const hazardOptions: { id: HazardType; label: string; icon: string; code: string; color: string }[] = [
    { id: 'cyclone', label: 'Cyclone Varuna', icon: '🌀', code: 'CAT-4', color: 'border-red-500 text-red-600' },
    { id: 'flood', label: 'Mahanadi Flood', icon: '🌊', code: 'BREACH', color: 'border-blue-500 text-blue-600' },
    { id: 'storm_surge', label: 'Coastal Surge', icon: '🌊', code: '+5.8m', color: 'border-cyan-500 text-cyan-600' },
    { id: 'landslide', label: 'Ghat Landslide', icon: '⛰️', code: 'SLOPE', color: 'border-amber-500 text-amber-600' },
    { id: 'heatwave', label: 'Vidarbha Heatwave', icon: '☀️', code: '48.6°C', color: 'border-orange-500 text-orange-600' },
    { id: 'drought', label: 'Marathwada Drought', icon: '🏜️', code: 'DEFICIT', color: 'border-yellow-600 text-yellow-700' },
  ];

  const handleTabClick = (tab: string) => {
    playMechanicalClick();
    onSelectTab(tab);
    setShowHazardSheet(false);
    setShowMoreSheet(false);
  };

  return (
    <>
      {/* Fixed Bottom Tactical Dock for Mobile (Hidden on Desktop lg:hidden) */}
      <nav
        aria-label="Mobile Navigation Dock"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#e0e5ec]/95 backdrop-blur-md border-t-2 border-[#babecc] shadow-[0_-4px_15px_rgba(0,0,0,0.15)] px-2 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {/* Tactical Map */}
          <button
            type="button"
            onClick={() => handleTabClick('map')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg font-mono text-[9px] font-bold transition-all ${
              activeTab === 'map'
                ? 'text-[#2563eb] bg-[#dbe4ef] shadow-[inset_1px_1px_2px_#babecc]'
                : 'text-[#475569] hover:text-[#1e293b]'
            }`}
          >
            <Map className="w-5 h-5 mb-0.5" />
            <span>MAP</span>
          </button>

          {/* Real-Time Hazard Chrono */}
          <button
            type="button"
            onClick={() => handleTabClick('matrix')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg font-mono text-[9px] font-bold transition-all ${
              activeTab === 'matrix'
                ? 'text-[#ff4757] bg-[#dbe4ef] shadow-[inset_1px_1px_2px_#babecc]'
                : 'text-[#475569] hover:text-[#1e293b]'
            }`}
          >
            <div className="relative">
              <Clock className="w-5 h-5 mb-0.5" />
              <span className="w-2 h-2 rounded-full bg-[#ff4757] absolute -top-0.5 -right-0.5 animate-pulse" />
            </div>
            <span>CHRONO</span>
          </button>

          {/* Disaster Hazard Selector Pop-up Button (Center Accent Button) */}
          <button
            type="button"
            onClick={() => {
              playMechanicalClick();
              setShowHazardSheet(!showHazardSheet);
              setShowMoreSheet(false);
            }}
            className="flex flex-col items-center justify-center -mt-4 bg-[#2d3436] text-white p-2 rounded-xl border-2 border-[#ff4757] shadow-[0_4px_10px_rgba(0,0,0,0.3)] active:scale-95 transition-all"
            title="Switch Disaster Scenario"
          >
            <span className="text-base leading-none">
              {hazardOptions.find((h) => h.id === currentHazard)?.icon || '⚠️'}
            </span>
            <span className="text-[8px] font-mono font-bold mt-0.5 text-[#ff4757] uppercase tracking-tighter">
              SCENARIO
            </span>
          </button>

          {/* Ingest & Telemetry */}
          <button
            type="button"
            onClick={() => handleTabClick('ingestion')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg font-mono text-[9px] font-bold transition-all ${
              activeTab === 'ingestion'
                ? 'text-[#2563eb] bg-[#dbe4ef] shadow-[inset_1px_1px_2px_#babecc]'
                : 'text-[#475569] hover:text-[#1e293b]'
            }`}
          >
            <Activity className="w-5 h-5 mb-0.5" />
            <span>INGEST</span>
          </button>

          {/* AI Copilot Drawer */}
          <button
            type="button"
            onClick={() => {
              playMechanicalClick();
              onToggleAiCopilot();
              setShowHazardSheet(false);
              setShowMoreSheet(false);
            }}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg font-mono text-[9px] font-bold transition-all ${
              isAiCopilotOpen
                ? 'text-[#ff4757] bg-[#dbe4ef] shadow-[inset_1px_1px_2px_#babecc]'
                : 'text-[#475569] hover:text-[#1e293b]'
            }`}
          >
            <Bot className="w-5 h-5 mb-0.5 text-[#ff4757]" />
            <span>COPILOT</span>
          </button>

          {/* More Modules / Menu */}
          <button
            type="button"
            onClick={() => {
              playMechanicalClick();
              setShowMoreSheet(!showMoreSheet);
              setShowHazardSheet(false);
            }}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg font-mono text-[9px] font-bold transition-all ${
              showMoreSheet
                ? 'text-[#2563eb] bg-[#dbe4ef] shadow-[inset_1px_1px_2px_#babecc]'
                : 'text-[#475569] hover:text-[#1e293b]'
            }`}
          >
            <Menu className="w-5 h-5 mb-0.5" />
            <span>MORE</span>
          </button>
        </div>
      </nav>

      {/* Hazard Selector Bottom Sheet Modal */}
      {showHazardSheet && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
          <div
            className="w-full bg-[#e0e5ec] rounded-t-3xl border-t-2 border-[#babecc] p-4 pb-8 shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-[#a4b0be] rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3 border-b border-[#babecc] mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <h3 className="text-sm font-bold font-mono tracking-tight text-[#1e293b]">
                    SELECT ACTIVE DISASTER SCENARIO
                  </h3>
                  <p className="text-[10px] font-mono text-[#64748b]">
                    Switches telemetry, maps, timeline, and risk prediction models
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHazardSheet(false)}
                className="p-1.5 rounded-lg hover:bg-[#d0d7e2] text-[#64748b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scenarios Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {hazardOptions.map((h) => {
                const isSelected = currentHazard === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      playMechanicalClick();
                      onChangeHazard(h.id);
                      setShowHazardSheet(false);
                    }}
                    className={`p-3 rounded-xl border text-left font-mono transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#2d3436] text-white border-2 border-[#ff4757] shadow-lg'
                        : 'bg-white/80 hover:bg-white text-[#2d3436] border-[#cbd5e1] shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-2xl">{h.icon}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          isSelected ? 'bg-[#ff4757] text-white' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {h.code}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{h.label}</div>
                      <div className="text-[9px] opacity-75 mt-0.5 capitalize">{h.id.replace('_', ' ')}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* "More Modules" Bottom Sheet Modal */}
      {showMoreSheet && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fadeIn">
          <div
            className="w-full bg-[#e0e5ec] rounded-t-3xl border-t-2 border-[#babecc] p-4 pb-8 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[#a4b0be] rounded-full mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3 border-b border-[#babecc] mb-3">
              <div>
                <h3 className="text-sm font-bold font-mono tracking-tight text-[#1e293b]">
                  DISASTER COMMAND MODULES
                </h3>
                <p className="text-[10px] font-mono text-[#64748b]">
                  Complete operations suite & mobile install
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreSheet(false)}
                className="p-1.5 rounded-lg hover:bg-[#d0d7e2] text-[#64748b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Install Button Callout in More Menu */}
            <div className="well-recessed p-3 rounded-xl border border-[#babecc] mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#1e293b]">MOBILE INSTALLATION</span>
                <span className="text-[10px] font-mono text-[#2563eb] font-semibold">PWA APP</span>
              </div>
              <p className="text-[11px] font-mono text-[#64748b]">
                Install this app so it appears on your mobile home screen and launches full-screen like any other native app.
              </p>
              <PWAInstallButton variant="banner" />
            </div>

            {/* All Modules List */}
            <div className="space-y-1.5 font-mono text-xs mb-4">
              <button
                type="button"
                onClick={() => handleTabClick('all')}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between ${
                  activeTab === 'all'
                    ? 'bg-[#2d3436] text-white border-[#ff4757]'
                    : 'bg-white/80 text-[#1e293b] border-[#cbd5e1]'
                }`}
              >
                <span>FULL CONSOLE OVERVIEW (ALL)</span>
                <span className="text-[10px] text-gray-400">All Modules</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('risk')}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between ${
                  activeTab === 'risk'
                    ? 'bg-[#2d3436] text-white border-[#ff4757]'
                    : 'bg-white/80 text-[#1e293b] border-[#cbd5e1]'
                }`}
              >
                <span>M2/3: RISK EXPLAINER & DAMAGE</span>
                <span className="text-[10px] text-gray-400">AI Scoring</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('resources')}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between ${
                  activeTab === 'resources'
                    ? 'bg-[#2d3436] text-white border-[#ff4757]'
                    : 'bg-white/80 text-[#1e293b] border-[#cbd5e1]'
                }`}
              >
                <span>M4: RESCUE TEAMS & SHELTERS</span>
                <span className="text-[10px] text-gray-400">Dispatch</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('evac')}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between ${
                  activeTab === 'evac'
                    ? 'bg-[#2d3436] text-white border-[#ff4757]'
                    : 'bg-white/80 text-[#1e293b] border-[#cbd5e1]'
                }`}
              >
                <span>M5: EVACUATION ROUTES & DETOURS</span>
                <span className="text-[10px] text-gray-400">Navigation</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabClick('logs')}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between ${
                  activeTab === 'logs'
                    ? 'bg-[#2d3436] text-white border-[#ff4757]'
                    : 'bg-white/80 text-[#1e293b] border-[#cbd5e1]'
                }`}
              >
                <span>M6: LIVE INCIDENT EVENT FEED</span>
                <span className="text-[10px] text-gray-400">Logs</span>
              </button>
            </div>

            {/* Emergency Broadcast Button */}
            <button
              type="button"
              onClick={() => {
                setShowMoreSheet(false);
                playAlarmChirp();
                onOpenBroadcastModal();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#c2410c] text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
            >
              <ShieldAlert className="w-4 h-4" />
              OPEN NATIONAL EMERGENCY BROADCASTER
            </button>
          </div>
        </div>
      )}
    </>
  );
};
