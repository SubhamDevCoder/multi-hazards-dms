import React from 'react';

export type LedColor = 'green' | 'red' | 'amber' | 'blue';

interface StatusLedProps {
  color?: LedColor;
  active?: boolean;
  pulse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const StatusLed: React.FC<StatusLedProps> = ({
  color = 'green',
  active = true,
  pulse = false,
  size = 'md',
  label,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  const colorStyles: Record<LedColor, { on: string; glow: string; off: string }> = {
    green: {
      on: 'bg-[#22c55e]',
      glow: 'led-green-glow',
      off: 'bg-[#1b432a]',
    },
    red: {
      on: 'bg-[#ff4757]',
      glow: 'led-red-glow',
      off: 'bg-[#592328]',
    },
    amber: {
      on: 'bg-[#f59e0b]',
      glow: 'led-amber-glow',
      off: 'bg-[#523812]',
    },
    blue: {
      on: 'bg-[#3b82f6]',
      glow: 'led-blue-glow',
      off: 'bg-[#182949]',
    },
  };

  const currentStyle = colorStyles[color];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Outer recessed bezel */}
      <div className="p-0.5 rounded-full bg-[#3d4552] shadow-[inset_1px_1px_2px_#1e272e,0.5px_0.5px_1px_#ffffff] flex items-center justify-center">
        <div
          className={`rounded-full transition-all duration-300 ${sizeClasses[size]} ${
            active
              ? `${currentStyle.on} ${currentStyle.glow} ${pulse ? 'animate-pulse' : ''}`
              : currentStyle.off
          }`}
        />
      </div>
      {label && (
        <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[#4a5568] select-none">
          {label}
        </span>
      )}
    </div>
  );
};
