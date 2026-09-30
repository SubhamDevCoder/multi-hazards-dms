import React from 'react';

interface VentSlotsProps {
  count?: number;
  className?: string;
}

export const VentSlots: React.FC<VentSlotsProps> = ({ count = 4, className = '' }) => {
  return (
    <div className={`flex items-center gap-1.5 px-1 py-0.5 ${className}`} title="Thermal Dissipation Vents" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="vent-slit" />
      ))}
    </div>
  );
};
