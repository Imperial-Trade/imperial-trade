
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CertificateProps {
  studentName: string;
  courseName: string;
  completionDate?: string;
  grade?: string;
}

export default function Certificate({ 
  studentName, 
  courseName, 
  completionDate = new Date().toLocaleDateString(),
  grade = "A"
}: CertificateProps) {
  return (
    <Card className="bg-gradient-to-br from-accent-gold/10 to-accent-gold/5 border-accent-gold/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent-gold/20 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-accent-gold" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">{courseName}</h3>
              <p className="text-sm text-secondary">Certificate of Completion</p>
            </div>
          </div>
          <Badge className="bg-accent-gold/10 text-accent-gold border-accent-gold/20">
            Grade {grade}
          </Badge>
        </div>
        
        <div className="space-y-2 mb-4">
          <p className="text-sm text-secondary">
            <strong className="text-primary">Student:</strong> {studentName}
          </p>
          <p className="text-sm text-secondary flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <strong className="text-primary">Completed:</strong> {completionDate}
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full border-accent-gold/20 text-accent-gold hover:bg-accent-gold/10"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Certificate
        </Button>
      </CardContent>
    </Card>
  );
}
