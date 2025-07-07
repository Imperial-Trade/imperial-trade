
import React from 'react';
import { Crown } from 'lucide-react';

interface CertificateProps {
  studentName: string;
  courseName: string;
}

export default function Certificate({ studentName, courseName }: CertificateProps) {
    return (
        <div className="p-4 bg-surface rounded-lg border border-accent-gold/50 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 text-accent-gold/20">
                <Crown className="w-full h-full" />
            </div>
            <div className="relative z-10">
                <p className="text-xs text-accent-gold font-semibold">CERTIFICATE OF COMPLETION</p>
                <h3 className="text-lg font-bold text-primary">{courseName}</h3>
                <p className="text-sm text-secondary">Awarded to</p>
                <p className="text-md font-semibold text-primary">{studentName}</p>
            </div>
        </div>
    );
}
