import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Smartphone, Download, CheckCircle2, Share2, PlusSquare, X, Monitor, ShieldCheck } from 'lucide-react';
import { playMechanicalClick, playSuccessChime } from '../../utils/audio';

interface PWAInstallButtonProps {
  compact?: boolean;
  className?: string;
  variant?: 'primary' | 'header' | 'minimal' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleClick = async () => {
    playMechanicalClick();

    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'accepted') {
        playSuccessChime();
        setInstallSuccess(true);
      }
    } else {
      // If no native prompt available (iOS or desktop browser), show guided instructions
      setShowModal(true);
    }
  };

  // If already installed in standalone mode
  if (isInstalled && !showModal) {
    if (variant === 'minimal') {
      return (
        <div className={`flex items-center gap-1.5 text-[10px] font-mono text-[#22c55e] font-bold ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
          <span>APP INSTALLED</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`well-recessed px-2.5 py-1 rounded-md text-[10px] font-mono font-bold text-[#22c55e] flex items-center gap-1.5 border border-[#babecc] hover:bg-[#d5dce6] transition-all ${className}`}
        title="Disaster Command Console is installed as a native web application"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-[#22c55e]" />
        <span>{compact ? 'INSTALLED' : 'APP INSTALLED'}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`relative group font-mono font-bold transition-all select-none flex items-center justify-center gap-1.5 ${
          variant === 'banner'
            ? 'w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-[0_4px_12px_rgba(37,99,235,0.35)] hover:brightness-110 active:scale-[0.98]'
            : variant === 'minimal'
            ? 'px-2 py-1 text-xs rounded text-[#2563eb] hover:bg-blue-50 font-semibold'
            : 'px-2.5 py-1.5 rounded-md text-xs bg-[#e0e5ec] text-[#1e293b] border border-[#babecc] shadow-[2px_2px_4px_#babecc,-2px_-2px_4px_#ffffff] hover:bg-[#d8e0ea] active:shadow-[inset_2px_2px_4px_#babecc,inset_-2px_-2px_4px_#ffffff]'
        } ${className}`}
        title="Install this application on your mobile phone or desktop"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563eb] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563eb]" />
        </span>

        {isIOS ? (
          <Smartphone className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
        ) : (
          <Download className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
        )}

        <span className="tracking-tight text-[11px] whitespace-nowrap font-bold text-[#1e293b]">
          {compact ? 'INSTALL' : isIOS ? 'INSTALL ON PHONE' : 'INSTALL APP'}
        </span>
      </button>

      {/* Guided PWA Installation Instruction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md rounded-2xl panel-raised border-2 border-[#babecc] p-5 shadow-2xl text-[#2d3436]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#babecc]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#2563eb] flex items-center justify-center text-white shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-mono tracking-tight text-[#1e293b]">
                    INSTALL DISASTER COMMAND APP
                  </h3>
                  <p className="text-[10px] font-mono text-[#64748b]">
                    Run directly on your mobile home screen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#d0d7e2] text-[#64748b] hover:text-[#1e293b] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Based on Platform */}
            <div className="py-4 space-y-3 font-mono text-xs">
              {isInstalled ? (
                <div className="well-recessed p-4 rounded-xl border border-[#22c55e]/40 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-[#22c55e] mx-auto" />
                  <p className="font-bold text-[#1e293b]">App Is Successfully Installed!</p>
                  <p className="text-[11px] text-[#64748b]">
                    The Disaster Command Console is running in standalone mode or installed on your device. You can launch it directly from your home screen or app drawer anytime.
                  </p>
                </div>
              ) : isIOS ? (
                <div className="space-y-3">
                  <div className="well-recessed p-3.5 rounded-xl border border-[#babecc] space-y-2.5">
                    <p className="font-bold text-[#1e293b] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xs">1</span>
                      Tap the <strong>Share</strong> button in Safari toolbar:
                    </p>
                    <div className="flex items-center justify-center p-2 rounded bg-white/70 border border-[#cbd5e1] gap-2 text-[#2563eb]">
                      <Share2 className="w-5 h-5" />
                      <span className="text-[11px] text-[#475569]">Share Icon at bottom of Safari</span>
                    </div>
                  </div>

                  <div className="well-recessed p-3.5 rounded-xl border border-[#babecc] space-y-2.5">
                    <p className="font-bold text-[#1e293b] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xs">2</span>
                      Scroll down and tap <strong>Add to Home Screen</strong>:
                    </p>
                    <div className="flex items-center justify-center p-2 rounded bg-white/70 border border-[#cbd5e1] gap-2 text-[#2563eb]">
                      <PlusSquare className="w-5 h-5" />
                      <span className="text-[11px] text-[#475569]">"Add to Home Screen"</span>
                    </div>
                  </div>

                  <div className="well-recessed p-3.5 rounded-xl border border-[#babecc] space-y-1">
                    <p className="font-bold text-[#1e293b] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#22c55e] text-white flex items-center justify-center text-xs">3</span>
                      Tap <strong>Add</strong> in the top right.
                    </p>
                    <p className="text-[11px] text-[#64748b] pl-6.5">
                      The Disaster Command icon will appear right alongside your other mobile apps!
                    </p>
                  </div>
                </div>
              ) : isAndroid ? (
                <div className="space-y-3">
                  <div className="well-recessed p-3.5 rounded-xl border border-[#babecc] space-y-2">
                    <p className="font-bold text-[#1e293b]">Android Chrome Installation:</p>
                    <p className="text-[11px] text-[#64748b]">
                      Tap the button below or tap the Chrome three dots (⋮) in the top right and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                    </p>
                  </div>

                  {isInstallable && (
                    <button
                      type="button"
                      onClick={async () => {
                        const outcome = await install();
                        if (outcome === 'accepted') {
                          setShowModal(false);
                        }
                      }}
                      className="w-full py-2.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold flex items-center justify-center gap-2 shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      PROMPT NATIVE ANDROID INSTALL NOW
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="well-recessed p-3.5 rounded-xl border border-[#babecc] space-y-2">
                    <p className="font-bold text-[#1e293b] flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-[#2563eb]" />
                      Desktop & Chrome / Edge Installation:
                    </p>
                    <p className="text-[11px] text-[#64748b]">
                      Look for the <strong>Install</strong> icon in the address bar (at the right end near bookmarks), or open your browser menu (⋮) and click <strong>"Install Multi-Hazard Disaster Command..."</strong>.
                    </p>
                  </div>

                  {isInstallable && (
                    <button
                      type="button"
                      onClick={async () => {
                        const outcome = await install();
                        if (outcome === 'accepted') {
                          setShowModal(false);
                        }
                      }}
                      className="w-full py-2.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold flex items-center justify-center gap-2 shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      INSTALL DESKTOP APPLICATION
                    </button>
                  )}
                </div>
              )}

              {/* Benefits list */}
              <div className="pt-2 border-t border-[#babecc]/60 flex items-center justify-between text-[10px] text-[#64748b]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
                  Full-screen native view
                </span>
                <span>•</span>
                <span>Fast home screen access</span>
                <span>•</span>
                <span>Offline resilient</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full py-2 rounded-lg bg-[#dbe2ed] hover:bg-[#ccd5e2] text-[#1e293b] font-mono font-bold text-xs transition"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
