import React from 'react';

export const GradientBackground: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 -z-10"
      style={{
        backgroundColor: '#f0f2ff',
        backgroundImage: `
          radial-gradient(at 10% 20%, hsla(253, 98%, 87%, 1) 0px, transparent 50%),
          radial-gradient(at 80% 10%, hsla(212, 96%, 83%, 1) 0px, transparent 50%),
          radial-gradient(at 70% 80%, hsla(282, 92%, 84%, 1) 0px, transparent 50%),
          radial-gradient(at 10% 90%, hsla(253, 98%, 87%, 1) 0px, transparent 50%)
        `
      }}
    />
  );
};
