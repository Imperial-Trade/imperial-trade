
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Target, Users, Award } from 'lucide-react';

const About = () => {
  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-full bg-gradient-to-r from-primary to-amber-300">
              <Crown className="h-12 w-12 text-background" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            About Imperial Trading
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Empowering traders worldwide with premium education, live mentorship, and professional trading signals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <Target className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To provide traders with the knowledge, tools, and community support needed to achieve consistent profitability in the financial markets.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Our Community</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                A global network of traders supporting each other through education, mentorship, and shared experiences in the markets.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="text-center">
          <CardHeader>
            <Award className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Why Choose Imperial?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <h3 className="font-semibold text-lg mb-2">Professional Signals</h3>
                <p className="text-muted-foreground">High-quality trading signals from experienced professionals</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Live Education</h3>
                <p className="text-muted-foreground">Interactive learning sessions with market experts</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Community Support</h3>
                <p className="text-muted-foreground">24/7 community support and mentorship</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default About;
