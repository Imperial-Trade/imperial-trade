
import React from 'react';
import { validatePasswordStrength } from '@/lib/validations/securityRules';
import { Shield, ShieldCheck } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { score, feedback } = validatePasswordStrength(password);
  
  const getStrengthColor = (score: number) => {
    if (score <= 2) return 'bg-red-500';
    if (score <= 3) return 'bg-yellow-500';
    if (score <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Fair';
    if (score <= 4) return 'Good';
    return 'Strong';
  };

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {score >= 4 ? (
          <ShieldCheck className="w-4 h-4 text-green-500" />
        ) : (
          <Shield className="w-4 h-4 text-gray-400" />
        )}
        <span className="text-sm font-medium">
          Password Strength: {getStrengthText(score)}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getStrengthColor(score)} transition-all duration-300`}
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      
      {feedback.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-1">
          {feedback.map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className="w-1 h-1 bg-gray-400 rounded-full" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
