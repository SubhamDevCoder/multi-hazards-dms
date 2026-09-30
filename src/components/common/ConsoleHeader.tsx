import React, { useState, useEffect } from 'react';
import { HardwareScrew } from './HardwareScrew';
import { VentSlots } from './VentSlots';
import { StatusLed } from './StatusLed';
import { TactileButton } from './TactileButton';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Volume2,
  VolumeX,
  ShieldAlert,
  Wifi,
  Cpu,
  Clock,
  Bot,
  Menu,
  X,
  Play,
  Pause,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';
import { setSoundMuted, getSoundMuted, playAlarmChirp, playMechanicalClick } from '../../utils/audio';

interface ConsoleHeaderProps {
  defconLevel: 1 | 2 | 3 | 4;
  hazardTitle: string;
  codeName: string;
  onOpenBroadcastModal: () => void;
  isSimulating: boolean;
  onToggleSimulating: () => void;
  onToggleAiCopilot?: () => void;
  isAiCopilotOpen?: boolean;
  weatherAlertBanner?: string;
}

export const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({
  defconLevel,
  hazardTitle,
  codeName,
  onOpenBroadcastModal,
  isSimulating,
  onToggleSimulating,
  onToggleAiCopilot,
  isAiCopilotOpen = false,
  weatherAlertBanner,
}) => {
  const [timeUtc, setTimeUtc] = useState('');
  const [timeLocal, setTimeLocal] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [metSeconds, setMetSeconds] = useState(3845);
  const [muted, setMuted] = useState(getSoundMuted());
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeUtc(now.toISOString().slice(11, 19) + ' UTC');
      setTimeLocal(now.toLocaleTimeString(undefined, { hour12: false }));
      setDateStr(now.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase());
    };
    updateTime();
    const interval = setInterval(() => {
      updateTime();
      setMetSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  const defconConfig = {
    1: { label: 'DEFCON 1 // STANDBY', bg: 'bg-[#22c55e]', text: 'text-white', led: 'green' as const },
    2: { label: 'DEFCON 2 // ADVISORY', bg: 'bg-[#3b82f6]', text: 'text-white', led: 'blue' as const },
    3: { label: 'DEFCON 3 // WARNING', bg: 'bg-[#f59e0b]', text: 'text-black', led: 'amber' as const },
    4: { label: 'DEFCON 4 // CATASTROPHIC', bg: 'bg-[#ff4757]', text: 'text-white', led: 'red' as const },
  }[defconLevel];

  return (
    <header className="relative w-full panel-raised border-b-2 border-[#babecc] p-2.5 sm:p-3 select-none">
      {/* 4 Corner Screws */}
      <HardwareScrew className="absolute top-2 left-2 hidden sm:block" angle={42} />
      <HardwareScrew className="absolute top-2 right-2 hidden sm:block" angle={-15} />

      <div className="max-w-[1720px] mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 px-2 sm:px-6">
        {/* Top / Left: System Title & Tactical Identification */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-4 h-4 bg-[#2d3436] rounded-sm flex items-center justify-center text-[10px] font-mono text-[#ff4757] font-bold shrink-0">
              ▲
            </div>
            <div className="flex flex-col">
              <h1 className="text-xs sm:text-base md:text-lg font-bold font-mono tracking-tight text-[#2d3436] leading-tight">
                INTELLIGENT MULTI-HAZARD DISASTER COMMAND CONSOLE
              </h1>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                <span className="text-[10px] sm:text-[11px] font-mono font-semibold text-[#ff4757] tracking-wider uppercase">
                  ACTIVE: {hazardTitle}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2d3436] text-[#e0e5ec]">
                  {codeName}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Right Quick Action: Install Button + Menu Toggle (Visible only on Mobile md:hidden) */}
          <div className="flex md:hidden items-center gap-1.5">
            <PWAInstallButton compact variant="header" />
            <button
              type="button"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-1.5 rounded-lg well-recessed border border-[#babecc] text-[#2d3436] hover:bg-[#d5dce6]"
              aria-label="Toggle Mobile Command Controls"
            >
              {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Center: Mission Clocks & Real-Time Live Readout */}
        <div className="flex items-center justify-between md:justify-center gap-2 flex-wrap">
          {/* Mission Clocks with Real-Time Live Readout */}
          <div className="well-recessed px-2.5 py-1 rounded-md flex items-center gap-2.5 border border-[#babecc]/50">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#2d3436]">
              <Clock className="w-3.5 h-3.5 text-[#ff4757] animate-pulse" />
              <div className="flex flex-col">
                <span className="leading-tight text-[11px] font-mono">
                  {timeLocal || '00:00:00'}{' '}
                  <small className="text-[8px] text-[#4a5568]">LOCAL</small>
                </span>
                <span className="leading-tight text-[8px] text-[#4a5568]">{dateStr}</span>
              </div>
            </div>
            <div className="w-[1px] h-4 bg-[#babecc]" />
            <div className="flex flex-col text-[10px] font-mono font-bold text-[#4a5568]">
              <span className="text-[#2d3436]">{timeUtc || '00:00:00 UTC'}</span>
              <span className="text-[8px] text-[#22c55e] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-ping" />
                REAL-TIME
              </span>
            </div>
          </div>

          {/* SATCOM & DSP Link (Visible on large screens) */}
          <div className="well-recessed px-2.5 py-1 rounded-md hidden xl:flex items-center gap-2 border border-[#babecc]/50">
            <div className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-[#22c55e]" />
              <span className="text-[10px] font-mono font-bold text-[#2d3436]">SATCOM: LOCK</span>
              <StatusLed color="green" pulse size="sm" />
            </div>
            <div className="w-[1px] h-3.5 bg-[#babecc]" />
            <div className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-[#3b82f6]" />
              <span className="text-[10px] font-mono font-bold text-[#4a5568]">INGEST: 1.48 Gbps</span>
            </div>
          </div>

          {/* DEFCON Badge */}
          <div
            className={`px-2 py-1 rounded-md font-mono text-[10px] sm:text-xs font-black tracking-wider flex items-center gap-1.5 shadow-[1px_1px_3px_#babecc,-1px_-1px_3px_#ffffff] ${defconConfig.bg} ${defconConfig.text}`}
          >
            <StatusLed color={defconConfig.led} pulse size="sm" />
            <span>{defconConfig.label}</span>
          </div>
        </div>

        {/* Right: Master Controls (Desktop md:flex) */}
        <div className="hidden md:flex items-center gap-2">
          {/* Prominent In-App PWA Install Button */}
          <PWAInstallButton variant="header" />

          {/* Gemini AI Copilot Quick Launcher */}
          {onToggleAiCopilot && (
            <TactileButton
              size="sm"
              active={isAiCopilotOpen}
              ledColor={isAiCopilotOpen ? 'red' : 'green'}
              icon={<Bot className="w-3.5 h-3.5 text-[#ff4757]" />}
              onClick={() => {
                playMechanicalClick();
                onToggleAiCopilot();
              }}
              title="Open Gemini Tactical Disaster Advisor & Copilot Drawer"
            >
              AI COPILOT
            </TactileButton>
          )}

          {/* Simulation Stream Toggle */}
          <TactileButton
            size="sm"
            active={isSimulating}
            ledColor="green"
            onClick={onToggleSimulating}
            title="Toggle live telemetry feed updates every 8 seconds"
          >
            {isSimulating ? 'SIM: RUNNING' : 'SIM: PAUSED'}
          </TactileButton>

          {/* Sound Mute Toggle */}
          <TactileButton
            size="sm"
            onClick={toggleSound}
            icon={muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            title="Toggle console acoustic feedback"
          >
            {muted ? 'MUTED' : 'AUDIO ON'}
          </TactileButton>

          {/* Emergency Alert Broadcaster */}
          <TactileButton
            variant="orange"
            size="sm"
            soundType="relay"
            icon={<ShieldAlert className="w-3.5 h-3.5" />}
            onClick={() => {
              playAlarmChirp();
              onOpenBroadcastModal();
            }}
          >
            BROADCAST ALERT
          </TactileButton>

          {/* Thermal Vents */}
          <VentSlots count={3} className="hidden 2xl:flex ml-2" />
        </div>
      </div>

      {/* Mobile Collapsible Command Menu Dropdown (md:hidden) */}
      {showMobileMenu && (
        <div className="md:hidden mt-2 pt-2 border-t border-[#babecc] grid grid-cols-2 gap-2 animate-fadeIn font-mono text-xs">
          <button
            type="button"
            onClick={() => {
              setShowMobileMenu(false);
              onToggleAiCopilot?.();
            }}
            className="p-2 rounded-lg well-recessed flex items-center gap-2 text-left font-bold text-[#2d3436]"
          >
            <Bot className="w-4 h-4 text-[#ff4757]" />
            <span>AI COPILOT</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggleSimulating();
            }}
            className="p-2 rounded-lg well-recessed flex items-center gap-2 text-left font-bold text-[#2d3436]"
          >
            {isSimulating ? <Pause className="w-4 h-4 text-[#22c55e]" /> : <Play className="w-4 h-4 text-[#ff4757]" />}
            <span>{isSimulating ? 'SIM RUNNING' : 'SIM PAUSED'}</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            className="p-2 rounded-lg well-recessed flex items-center gap-2 text-left font-bold text-[#2d3436]"
          >
            {muted ? <VolumeX className="w-4 h-4 text-gray-500" /> : <Volume2 className="w-4 h-4 text-[#2563eb]" />}
            <span>{muted ? 'AUDIO MUTED' : 'AUDIO ON'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowMobileMenu(false);
              playAlarmChirp();
              onOpenBroadcastModal();
            }}
            className="p-2 rounded-lg bg-[#ff4757] text-white flex items-center gap-2 text-left font-bold"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>BROADCAST</span>
          </button>

          <div className="col-span-2 pt-1">
            <PWAInstallButton variant="banner" />
          </div>
        </div>
      )}

      {/* Real-Time Meteorological & Hazard Ticker Strip */}
      {weatherAlertBanner && (
        <div className="mt-2 border-t border-[#babecc]/60 pt-1 px-3 sm:px-6 flex items-center justify-between text-[10px] sm:text-[11px] font-mono bg-[#1e272e] text-[#f1f2f6] rounded py-1 shadow-[inset_1px_1px_3px_#000000]">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden">
            <span className="flex items-center gap-1 text-[#ff4757] font-bold shrink-0">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#ff4757] animate-ping" />
              BULLETIN:
            </span>
            <span className="text-white truncate font-medium text-[9px] sm:text-[11px]">
              {weatherAlertBanner}
            </span>
          </div>
          <span className="shrink-0 text-[9px] sm:text-[10px] text-gray-400 pl-2">
            RADAR: LIVE
          </span>
        </div>
      )}
    </header>
  );
};
