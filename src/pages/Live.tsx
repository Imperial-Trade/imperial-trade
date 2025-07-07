
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Users, Calendar, Clock } from 'lucide-react';

const Live = () => {
  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            Live Trading Sessions
          </h1>
          <p className="text-lg text-muted-foreground">
            Join our expert traders in live market analysis and trading sessions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <Video className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Daily Market Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Join us every weekday at 9 AM EST for comprehensive market analysis.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>9:00 AM EST</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Live Trading Room</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Real-time trading with our professional traders throughout market hours.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4" />
                <span>Mon-Fri Market Hours</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Live;
