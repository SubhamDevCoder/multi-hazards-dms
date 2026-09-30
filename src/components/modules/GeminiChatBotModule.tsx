import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  HazardType,
  CrisisZone,
  EmergencyResource,
  EvacuationRoute,
  WeatherTelemetry,
  RiverGaugeData,
  ChatMessage,
} from '../../types';
import { HAZARD_LOCATIONS_MAP } from '../../data/hazardForecastData';
import { HardwareScrew } from '../common/HardwareScrew';
import { VentSlots } from '../common/VentSlots';
import { StatusLed } from '../common/StatusLed';
import { TactileButton } from '../common/TactileButton';
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  Radio,
  FileCheck,
  AlertTriangle,
  Flame,
  LifeBuoy,
  RefreshCw,
  Cpu,
  ChevronRight,
  ClipboardCopy,
  Check,
} from 'lucide-react';
import {
  playMechanicalClick,
  playSuccessChime,
  playAlarmChirp,
} from '../../utils/audio';

interface GeminiChatBotModuleProps {
  hazardType: HazardType;
  defconLevel: 1 | 2 | 3 | 4;
  zones: CrisisZone[];
  resources: EmergencyResource[];
  routes: EvacuationRoute[];
  selectedZone: CrisisZone | null;
  weather: WeatherTelemetry;
  riverGauge: RiverGaugeData;
  onPostToLog: (message: string, severity: 'CRIT' | 'WARN' | 'INFO') => void;
  compactView?: boolean;
}

export const GeminiChatBotModule: React.FC<GeminiChatBotModuleProps> = ({
  hazardType,
  defconLevel,
  zones,
  resources,
  routes,
  selectedZone,
  weather,
  riverGauge,
  onPostToLog,
  compactView = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-init',
      role: 'model',
      text: `### 🛰️ TACTICAL AI COPILOT ONLINE // GEMINI 3.8 FLASH\n\nCommand telemetry link established for **${hazardType.toUpperCase()} REGIME** (DEFCON ${defconLevel}).\n\nI am grounded in live sector telemetries, river gauge levels, evacuation arteries, and resource deployments. You can ask for:\n- **Immediate Sector Triage & Evacuation Priorities**\n- **Emergency SMS Broadcast Drafting** (NDMA/FEMA standards)\n- **Shelter Rations & Medical Asset Logistics**\n- **Alternative Transit Detours for Flooded Corridors**\n\nSelect a preset operational query below or type your tactical situation order.`,
      timestamp: new Date().toISOString().slice(11, 19),
      source: 'GEMINI-TACTICAL-CORE',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loggedId, setLoggedId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal smoothly on message update
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Curated rapid-response tactical prompts based on active hazard
  const getTacticalPresets = () => {
    const zoneName = selectedZone?.name || 'Sector Delta';
    return [
      {
        label: 'Chronology: Which locations have heavy rain/cyclone from what time?',
        prompt: `Provide a detailed chronological briefing: At which location will cyclone or rain be heavy from what time? List each affected sector, the exact heavy inception time, peak intensity window, and expected clearing time, along with immediate operational safety directives.`,
      },
      {
        label: `Assess ${zoneName} breach & triage priorities`,
        prompt: `Conduct an immediate tactical risk assessment for ${zoneName}. Analyze current hazard intensity (${selectedZone?.hazardIntensity || 88}%), flood depth/exposure, vulnerable population, and propose a 3-step prioritized life-safety action plan.`,
      },
      {
        label: 'Draft Emergency SMS Public Broadcast',
        prompt: `Draft a high-priority bilingual public evacuation alert for the ${hazardType.toUpperCase()} incident in ${zoneName}. Keep it under 160 words, concise, calm, actionable, specifying mandatory evacuation routes, muster centers, and emergency helpline frequencies.`,
      },
      {
        label: 'Optimize shelter capacity & food rations',
        prompt: `Review current shelter occupancy and supply days across our relief centers. What logistical recommendations do you have to prevent supply exhaustion over the next 48 to 72 hours?`,
      },
      {
        label: 'Calculate bypass around blocked evacuation routes',
        prompt: `Several primary lifeline corridors are currently reported as flooded or blocked. What emergency convoy protocols and high-elevation detours should emergency vehicles execute right now?`,
      },
      {
        label: 'SOP Checklist for Incident Command',
        prompt: `Provide a rapid SOP checklist for Incident Command under DEFCON ${defconLevel} conditions for a high-consequence ${hazardType.toUpperCase()} event.`,
      },
    ];
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const query = (promptToSend || inputPrompt).trim();
    if (!query || isLoading) return;

    playMechanicalClick();
    setInputPrompt('');
    setServerError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toISOString().slice(11, 19),
      source: 'OPERATOR',
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setIsLoading(true);

    // Prepare full live disaster context payload
    const liveContext = {
      hazardType,
      defconLevel,
      weather: {
        rainfallMmHr: weather.rainfallMmHr,
        windKnots: weather.windKnots,
        gustKnots: weather.gustKnots,
        pressureHpa: weather.pressureHpa,
      },
      riverGauge: {
        station: riverGauge.riverName,
        currentStageM: riverGauge.currentLevelM,
        dangerLevelM: riverGauge.dangerLevelM,
        breachStatus: riverGauge.breachStatus,
        trend: riverGauge.trend,
      },
      activeZone: selectedZone
        ? {
            id: selectedZone.id,
            name: selectedZone.name,
            riskLevel: selectedZone.riskLevel,
            hazardIntensity: selectedZone.hazardIntensity,
            population: selectedZone.population,
            evacuatedPct: selectedZone.evacuatedPercentage,
            criticalInfra: selectedZone.criticalInfrastructure,
          }
        : null,
      zonesSummary: zones.map((z) => ({
        name: z.name,
        risk: z.riskLevel,
        evacuatedPct: z.evacuatedPercentage,
      })),
      resourcesSummary: {
        totalAssets: resources.length,
        dispatched: resources.filter((r) => r.status === 'dispatched' || r.status === 'on_scene').length,
        shelters: resources
          .filter((r) => r.type === 'shelter')
          .map((s) => ({
            name: s.name,
            occupancy: `${s.currentOccupancy}/${s.capacity}`,
            supplyDays: s.supplyDays,
          })),
      },
      evacuationRoutes: routes.map((rt) => ({
        code: rt.code,
        name: rt.name,
        status: rt.status,
        detourActive: rt.isDetourActive,
      })),
      realtimeLocationHazardChronology: (HAZARD_LOCATIONS_MAP[hazardType] || []).map((loc) => ({
        location: loc.locationName,
        hazard: loc.hazardTitle,
        severity: loc.severityLevel,
        currentRainfallMmHr: loc.currentCondition.rainfallMmHr,
        currentWindKnots: loc.currentCondition.windKnots,
        heavyRainfallStartsAt: loc.heavyStartTime,
        peakImpactWindow: loc.heavyPeakTime,
        recedingAt: loc.heavyEndTime,
        totalExpectedRainfallMm: loc.totalExpectedRainfallMm,
        advisoryDirective: loc.advisoryAlert,
      })),
    };

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({
            role: m.role,
            text: m.text,
          })),
          context: liveContext,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server returned an error.');
      }

      playSuccessChime();
      const modelMsg: ChatMessage = {
        id: `gemini-${Date.now()}`,
        role: 'model',
        text: data.reply || 'No tactical reply generated.',
        timestamp: new Date().toISOString().slice(11, 19),
        source: 'GEMINI-3.8-FLASH',
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error('Tactical AI Query Failed:', err);
      playAlarmChirp();
      setServerError(err.message || 'Failed to communicate with tactical engine.');

      const fallbackMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **COMMUNICATION INTERRUPTION**: Unable to complete query with Gemini backend.\n\n*Technical Details*: ${err.message || 'API link down'}.\n\n*Emergency Contingency Guideline*: For active ${hazardType.toUpperCase()} DEFCON ${defconLevel}, adhere to pre-loaded National Disaster Management Authority (NDMA) / FEMA standard field protocols: evacuate flood plains, prioritize vulnerable persons, and maintain radio frequency on ${resources[0]?.radioFrequencyMhz || '156.800'} MHz.`,
        timestamp: new Date().toISOString().slice(11, 19),
        source: 'STANDALONE-CONTINGENCY-SOP',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    playMechanicalClick();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        text: `### 🛰️ TACTICAL AI COPILOT RESET // CONSOLE READY\n\nOperational cache purged. Telemetry grounding active for **${hazardType.toUpperCase()}** regime.\n\nReady for incident command queries.`,
        timestamp: new Date().toISOString().slice(11, 19),
        source: 'GEMINI-TACTICAL-CORE',
      },
    ]);
  };

  const handleCopyText = (id: string, text: string) => {
    playMechanicalClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCommitToEventStream = (id: string, text: string) => {
    playSuccessChime();
    setLoggedId(id);
    // Truncate cleanly for operational event stream
    const cleanExcerpt = text
      .replace(/[#*`_]/g, '')
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .slice(0, 2)
      .join(' ')
      .slice(0, 240);

    onPostToLog(`[AI TACTICAL DIRECTIVE]: ${cleanExcerpt}`, 'WARN');
    setTimeout(() => setLoggedId(null), 2500);
  };

  return (
    <div
      id="gemini-chatbot-module"
      className="relative w-full rounded-xl panel-raised border border-[#babecc] p-4 flex flex-col transition-all"
    >
      <HardwareScrew className="absolute top-2.5 left-2.5" angle={-35} />
      <HardwareScrew className="absolute top-2.5 right-2.5" angle={60} />

      {/* Header & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 mb-3 border-b border-[#babecc]/50 select-none">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#ff4757] animate-pulse" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2d3436]">
            MODULE 07: GEMINI TACTICAL CRISIS ADVISOR & COPILOT
          </h2>
          <span className="px-1.5 py-0.2 rounded bg-[#2d3436] text-[#22c55e] text-[9px] font-mono font-bold">
            GEMINI-3.8-FLASH
          </span>
          <StatusLed color={isLoading ? 'amber' : 'green'} pulse={isLoading} size="sm" />
        </div>

        <div className="flex items-center gap-2">
          {/* Grounding Context Capsule */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded well-recessed text-[10px] font-mono text-[#4a5568]">
            <Radio className="w-3 h-3 text-[#3b82f6]" />
            <span>GROUNDED IN {hazardType.toUpperCase()} TELEMETRY</span>
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            title="Purge session cache"
            className="p-1 rounded text-[#747d8c] hover:text-[#ff4757] hover:bg-[#d1d9e6] transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <VentSlots count={3} className="hidden md:flex ml-1" />
        </div>
      </div>

      {/* Live Operational Context Ticker Banner */}
      <div className="well-recessed px-3 py-1.5 rounded-lg border border-[#babecc] mb-3 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono select-none">
        <div className="flex items-center gap-2 text-[#2d3436]">
          <span className="text-[#ff4757] font-bold">TARGET SECTOR:</span>
          <strong>{selectedZone?.name || 'ALL SECTORS'}</strong>
          <span className="text-[#747d8c]">|</span>
          <span className="text-[#ff4757] font-bold">RIVER STAGE:</span>
          <strong className={riverGauge.breachStatus ? 'text-[#ff4757]' : 'text-[#22c55e]'}>
            {riverGauge.currentLevelM}m ({riverGauge.breachStatus ? 'BREACH' : 'NORMAL'})
          </strong>
          <span className="text-[#747d8c]">|</span>
          <span className="text-[#ff4757] font-bold">RAIN:</span>
          <strong>{weather.rainfallMmHr} mm/h</strong>
        </div>

        <div className="flex items-center gap-1 text-[#22c55e]">
          <Sparkles className="w-3 h-3" />
          <span className="font-bold">EOC DECISION ENGINE SYNCED</span>
        </div>
      </div>

      {/* Preset Tactical Quick-Prompts Carousel */}
      <div className="mb-3 space-y-1">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#747d8c] px-1 block">
          RAPID TACTICAL MISSION INQUIRIES:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {getTacticalPresets().map((preset, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(preset.prompt)}
              className="shrink-0 px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-[#e0e5ec] text-[#2d3436] shadow-[2px_2px_4px_#babecc,-2px_-2px_4px_#ffffff] hover:shadow-[inset_1px_1px_2px_#babecc] hover:text-[#ff4757] active:scale-98 transition-all border border-[#babecc]/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronRight className="w-3 h-3 text-[#ff4757]" />
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Message Display Well */}
      <div
        className={`well-recessed-deep p-3.5 rounded-xl border-2 border-[#babecc] overflow-y-auto space-y-3 mb-3 ${
          compactView ? 'max-h-[360px]' : 'min-h-[320px] max-h-[460px]'
        }`}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
            >
              {/* Message Header Tag */}
              <div className="flex items-center gap-2 text-[10px] font-mono px-1">
                <span className="font-bold text-[#747d8c]">
                  {isUser ? 'OPERATOR DISPATCH' : msg.source || 'GEMINI ADVISOR'}
                </span>
                <span className="text-[#a4b0be]">[{msg.timestamp}]</span>
                {!isUser && <StatusLed color="green" size="sm" />}
              </div>

              {/* Message Bubble Chassis */}
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-xl p-3.5 text-xs font-mono transition-all border ${
                  isUser
                    ? 'bg-[#2d3436] text-[#f1f2f6] border-[#4a5568] shadow-[3px_3px_6px_#babecc]'
                    : 'bg-[#f0f2f5] text-[#2d3436] border-[#babecc] shadow-[inset_1px_1px_2px_#ffffff,2px_2px_4px_rgba(0,0,0,0.06)]'
                }`}
              >
                {/* Markdown Rendering Container */}
                <div className="prose prose-xs max-w-none text-[#2d3436] leading-relaxed space-y-2 [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-[#2d3436] [&_h2]:text-xs [&_h2]:font-bold [&_h2]:text-[#2d3436] [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-[#ff4757] [&_strong]:text-[#2d3436] [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_code]:bg-[#d1d9e6] [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[#2d3436] [&_p]:my-1">
                  {isUser ? (
                    <p className="text-[#f1f2f6] font-medium whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div>
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  )}
                </div>

                {/* AI Response Operational Action Buttons */}
                {!isUser && (
                  <div className="mt-3 pt-2 border-t border-[#babecc]/60 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="px-2 py-0.5 rounded bg-[#e0e5ec] text-[#4a5568] hover:text-[#2d3436] hover:bg-[#d1d9e6] flex items-center gap-1 border border-[#babecc] transition-all"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-[#22c55e]" />
                            <span className="text-[#22c55e] font-bold">COPIED</span>
                          </>
                        ) : (
                          <>
                            <ClipboardCopy className="w-3 h-3" />
                            <span>COPY ADVISORY</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCommitToEventStream(msg.id, msg.text)}
                        className="px-2 py-0.5 rounded bg-[#e0e5ec] text-[#ff4757] hover:bg-[#d1d9e6] flex items-center gap-1 border border-[#babecc] font-bold transition-all"
                      >
                        {loggedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-[#22c55e]" />
                            <span className="text-[#22c55e]">COMMITTED TO EVENT LOG</span>
                          </>
                        ) : (
                          <>
                            <FileCheck className="w-3 h-3" />
                            <span>POST TO EVENT STREAM</span>
                          </>
                        )}
                      </button>
                    </div>

                    <span className="text-[9px] text-[#747d8c]">VERIFIED BY GEMINI 3.8</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading / Neural Computing State */}
        {isLoading && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[#f0f2f5] border border-[#ff4757]/60 animate-pulse font-mono text-xs">
            <Cpu className="w-4 h-4 text-[#ff4757] animate-spin shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#ff4757]">
                [GEMINI TACTICAL CORE INGESTING REAL-TIME DISASTER TELEMETRY...]
              </span>
              <p className="text-[10px] text-[#4a5568] mt-0.5">
                Cross-referencing river gauge gradients, NDRF asset locations, and population density algorithms...
              </p>
            </div>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Input Formulation Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-[#babecc]/50"
      >
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={`TRANSMIT TACTICAL OPERATIONAL QUERY TO GEMINI [${hazardType.toUpperCase()}]...`}
            value={inputPrompt}
            disabled={isLoading}
            onChange={(e) => setInputPrompt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg well-recessed border border-[#babecc] text-xs font-mono text-[#2d3436] placeholder:text-[#747d8c] focus:outline-none focus:ring-1 focus:ring-[#ff4757]"
          />
        </div>

        <TactileButton
          type="submit"
          variant="orange"
          soundType="relay"
          disabled={isLoading || !inputPrompt.trim()}
          icon={isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        >
          {isLoading ? 'TRANSMITTING...' : 'TRANSMIT ORDER'}
        </TactileButton>
      </form>
    </div>
  );
};
