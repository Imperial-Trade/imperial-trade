import { FC } from 'react';

export const GradientBackground: FC = () => {
  return (
    <div 
      className="fixed inset-0 -z-10"
      style={{
        backgroundColor: '#000000',
        backgroundImage: `
          radial-gradient(at 5% 95%, hsla(120, 60%, 70%, 0.15) 0px, transparent 50%),
          radial-gradient(at 85% 10%, hsla(30, 30%, 30%, 0.2) 0px, transparent 50%)
        `
      }}
    />
  );
};
