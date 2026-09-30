import React from 'react';

interface HardwareScrewProps {
  className?: string;
  angle?: number;
}

export const HardwareScrew: React.FC<HardwareScrewProps> = ({ className = '', angle = 38 }) => {
  return (
    <div
      className={`screw-indent shrink-0 ${className}`}
      style={{
        transform: `rotate(${angle}deg)`,
      }}
      title="Console Chassis Fastener"
      aria-hidden="true"
    />
  );
};
