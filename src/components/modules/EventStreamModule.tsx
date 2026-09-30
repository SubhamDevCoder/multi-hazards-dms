import React, { useState } from 'react';
import { IncidentEventLog } from '../../types';
import { HardwareScrew } from '../common/HardwareScrew';
import { VentSlots } from '../common/VentSlots';
import { StatusLed } from '../common/StatusLed';
import { TactileButton } from '../common/TactileButton';
import {
  ListFilter,
  CheckCircle2,
  Radio,
  Search,
  Terminal,
  Send,
  BellRing,
} from 'lucide-react';
import { playMechanicalClick, playSuccessChime } from '../../utils/audio';

interface EventStreamModuleProps {
  logs: IncidentEventLog[];
  onAcknowledgeLog: (logId: string) => void;
  onAddManualLog: (message: string, severity: 'CRIT' | 'WARN' | 'INFO') => void;
}

export const EventStreamModule: React.FC<EventStreamModuleProps> = ({
  logs,
  onAcknowledgeLog,
  onAddManualLog,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'CRIT' | 'WARN' | 'INFO'>('ALL');
  const [search, setSearch] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [manualSeverity, setManualSeverity] = useState<'CRIT' | 'WARN' | 'INFO'>('WARN');

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'ALL' && log.severity !== filter) return false;
    if (search.trim() && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAcknowledge = (logId: string) => {
    playMechanicalClick();
    onAcknowledgeLog(logId);
  };

  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMessage.trim()) return;
    playSuccessChime();
    onAddManualLog(manualMessage.trim(), manualSeverity);
    setManualMessage('');
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRIT':
        return 'bg-[#ff4757] text-white';
      case 'WARN':
        return 'bg-[#f59e0b] text-black font-bold';
      case 'INFO':
        return 'bg-[#3b82f6] text-white';
      default:
        return 'bg-[#22c55e] text-white';
    }
  };

  return (
    <div className="relative w-full rounded-xl panel-raised border border-[#babecc] p-4 flex flex-col">
      <HardwareScrew className="absolute top-2.5 left-2.5" angle={-10} />
      <HardwareScrew className="absolute top-2.5 right-2.5" angle={25} />

      {/* Title & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 mb-3 border-b border-[#babecc]/50 select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#ff4757]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#2d3436]">
            MODULE 06: OPERATIONAL EVENT TELEMETRY STREAM & INCIDENT LOG
          </h2>
          <StatusLed color="green" pulse size="sm" />
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['ALL', 'CRIT', 'WARN', 'INFO'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                playMechanicalClick();
                setFilter(lvl);
              }}
              className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-all ${
                filter === lvl
                  ? 'bg-[#2d3436] text-[#e0e5ec] shadow-[inset_1px_1px_2px_#000000]'
                  : 'bg-[#e0e5ec] text-[#4a5568] shadow-[2px_2px_4px_#babecc,-2px_-2px_4px_#ffffff] hover:text-[#2d3436]'
              }`}
            >
              {lvl}
            </button>
          ))}

          <VentSlots count={3} className="hidden sm:flex ml-1" />
        </div>
      </div>

      {/* Search Filter Input */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#4a5568] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="FILTER INCIDENT TELEMETRY STREAM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg well-recessed border border-[#babecc] text-[11px] font-mono text-[#2d3436] placeholder:text-[#747d8c] focus:outline-none"
          />
        </div>
      </div>

      {/* Log Feed Display inside Recessed Well */}
      <div className="well-recessed-deep p-3 rounded-xl border border-[#babecc] max-h-60 overflow-y-auto space-y-2 mb-3">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2.5 rounded-lg font-mono text-xs border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                log.acknowledged
                  ? 'bg-[#f0f2f5]/90 border-[#babecc]'
                  : 'bg-[#f0f2f5] border-[#ff4757]/60 shadow-[2px_2px_4px_rgba(0,0,0,0.06)]'
              }`}
            >
              <div className="flex items-start gap-2 flex-1">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${getSeverityBadge(
                    log.severity
                  )}`}
                >
                  {log.severity}
                </span>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-[10px] text-[#4a5568]">
                    <span>[{log.timestamp}]</span>
                    <span className="font-bold text-[#2d3436]">SOURCE: {log.source}</span>
                    {log.zoneId && (
                      <span className="text-[#ff4757] font-bold">[{log.zoneId}]</span>
                    )}
                  </div>
                  <p className="text-[#2d3436] font-medium leading-tight">{log.message}</p>
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-end gap-2">
                {log.acknowledged ? (
                  <span className="text-[10px] font-mono text-[#22c55e] flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ACKNOWLEDGED
                  </span>
                ) : (
                  <TactileButton
                    size="sm"
                    variant="orange"
                    onClick={() => handleAcknowledge(log.id)}
                  >
                    ACKNOWLEDGE
                  </TactileButton>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-xs font-mono text-[#747d8c]">
            NO EVENT LOGS MATCHING ACTIVE CRITERIA
          </div>
        )}
      </div>

      {/* Manual Transmission Dispatch Input Bar */}
      <form onSubmit={handleSendManual} className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#babecc]/50">
        <select
          value={manualSeverity}
          onChange={(e) => setManualSeverity(e.target.value as 'CRIT' | 'WARN' | 'INFO')}
          className="text-[10px] font-mono font-bold bg-[#f0f2f5] border border-[#babecc] rounded px-2 py-1.5 text-[#2d3436]"
        >
          <option value="WARN">WARN // ADVISORY</option>
          <option value="CRIT">CRIT // EMERGENCY</option>
          <option value="INFO">INFO // LOGISTIC</option>
        </select>

        <input
          type="text"
          placeholder="TYPE MANUAL DISPATCH ORDER TO LOG & BROADCAST FREQUENCY..."
          value={manualMessage}
          onChange={(e) => setManualMessage(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-1.5 rounded well-recessed border border-[#babecc] text-[11px] font-mono text-[#2d3436] placeholder:text-[#747d8c] focus:outline-none"
        />

        <TactileButton
          type="submit"
          size="sm"
          variant="orange"
          soundType="relay"
          icon={<Send className="w-3.5 h-3.5" />}
        >
          TRANSMIT
        </TactileButton>
      </form>
    </div>
  );
};
