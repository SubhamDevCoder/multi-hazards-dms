import React from 'react';
import {
  HazardType,
  CrisisZone,
  EmergencyResource,
  EvacuationRoute,
  WeatherTelemetry,
  RiverGaugeData,
} from '../../types';
import { HardwareScrew } from '../common/HardwareScrew';
import { GeminiChatBotModule } from '../modules/GeminiChatBotModule';
import { Bot, X, Maximize2, Minimize2 } from 'lucide-react';
import { playMechanicalClick } from '../../utils/audio';

interface TactileAiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  hazardType: HazardType;
  defconLevel: 1 | 2 | 3 | 4;
  zones: CrisisZone[];
  resources: EmergencyResource[];
  routes: EvacuationRoute[];
  selectedZone: CrisisZone | null;
  weather: WeatherTelemetry;
  riverGauge: RiverGaugeData;
  onPostToLog: (message: string, severity: 'CRIT' | 'WARN' | 'INFO') => void;
}

export const TactileAiCopilotDrawer: React.FC<TactileAiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  hazardType,
  defconLevel,
  zones,
  resources,
  routes,
  selectedZone,
  weather,
  riverGauge,
  onPostToLog,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-[2px] animate-fade-in p-2 sm:p-4">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Industrial Slide-Over Bay */}
      <div className="relative w-full max-w-2xl h-[92vh] max-h-[860px] panel-raised rounded-2xl border-2 border-[#ff4757] shadow-2xl flex flex-col z-10 overflow-hidden">
        <HardwareScrew className="absolute top-3 left-3" angle={-18} />
        <HardwareScrew className="absolute top-3 right-3" angle={36} />
        <HardwareScrew className="absolute bottom-3 left-3" angle={72} />
        <HardwareScrew className="absolute bottom-3 right-3" angle={-45} />

        {/* Top Chassis Handle Bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-[#babecc] bg-[#e0e5ec] select-none">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#ff4757] animate-pulse" />
            <span className="text-xs font-mono font-black uppercase text-[#2d3436] tracking-wider">
              TACTICAL COMMS BAY // GEMINI AI CRISIS COPILOT
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                playMechanicalClick();
                onClose();
              }}
              className="p-1 rounded bg-[#d1d9e6] hover:bg-[#babecc] text-[#2d3436] transition-all"
              title="Close Comms Bay"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inner Scrollable Chatbot Module Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <GeminiChatBotModule
            hazardType={hazardType}
            defconLevel={defconLevel}
            zones={zones}
            resources={resources}
            routes={routes}
            selectedZone={selectedZone}
            weather={weather}
            riverGauge={riverGauge}
            onPostToLog={onPostToLog}
            compactView={false}
          />
        </div>
      </div>
    </div>
  );
};
