import React from 'react';
import { playMechanicalClick, playHeavyRelay } from '../../utils/audio';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'standard' | 'orange' | 'recessed' | 'danger';
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  ledColor?: 'green' | 'red' | 'amber';
  soundType?: 'click' | 'relay';
  icon?: React.ReactNode;
  badge?: string | number;
  truncate?: boolean;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  children,
  variant = 'standard',
  active = false,
  size = 'md',
  ledColor,
  soundType = 'click',
  icon,
  badge,
  truncate = false,
  className = '',
  onClick,
  disabled,
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (soundType === 'relay') {
      playHeavyRelay();
    } else {
      playMechanicalClick();
    }
    if (onClick) onClick(e);
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs font-mono',
    md: 'px-3.5 py-2 text-xs font-mono',
    lg: 'px-5 py-2.5 text-sm font-mono',
  };

  const variantClasses = {
    standard: active
      ? 'button-tactile-pressed text-[#2d3436] font-bold border border-[#babecc]'
      : 'button-tactile text-[#2d3436] border border-[#f0f2f5] hover:border-[#babecc]',
    orange:
      'button-tactile-orange font-bold uppercase tracking-wider',
    recessed: active
      ? 'well-recessed-deep text-[#ff4757] font-bold'
      : 'well-recessed text-[#4a5568] hover:text-[#2d3436]',
    danger:
      'bg-[#ff4757] text-white shadow-[4px_4px_8px_#c0392b,-4px_-4px_8px_#ff7675] active:translate-y-[2px] active:shadow-[inset_3px_3px_6px_#b71540]',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-all duration-75 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {ledColor && (
        <span
          className={`w-2 h-2 rounded-full border border-black/30 ${
            active
              ? ledColor === 'green'
                ? 'bg-[#22c55e] led-green-glow'
                : ledColor === 'red'
                ? 'bg-[#ff4757] led-red-glow'
                : 'bg-[#f59e0b] led-amber-glow'
              : 'bg-[#4a5568]'
          }`}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className={truncate ? 'truncate' : 'whitespace-normal text-center'}>{children}</span>
      {badge !== undefined && (
        <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded bg-[#2d3436] text-[#e0e5ec] font-mono font-bold">
          {badge}
        </span>
      )}
    </button>
  );
};
