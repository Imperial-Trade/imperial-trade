
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, DollarSign, Users, TrendingUp, Award } from 'lucide-react';

const IBPartnership = () => {
  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="p-4 rounded-full bg-gradient-to-r from-primary to-amber-300">
              <Crown className="h-12 w-12 text-background" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            IB Partnership Program
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Join our exclusive Introducing Broker program and earn competitive commissions while helping traders succeed.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover:scale-[1.02] transition-all duration-300 border-primary/20">
            <CardHeader>
              <DollarSign className="h-8 w-8 text-green-500 mb-2" />
              <CardTitle>Competitive Commissions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Earn up to $8 per lot with our tiered commission structure.
              </p>
              <ul className="text-sm space-y-1">
                <li>• Tier 1: $3-5 per lot</li>
                <li>• Tier 2: $5-7 per lot</li>
                <li>• Tier 3: $7-8 per lot</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-all duration-300 border-primary/20">
            <CardHeader>
              <Users className="h-8 w-8 text-blue-500 mb-2" />
              <CardTitle>Dedicated Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Get dedicated account management and 24/7 support for you and your clients.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-all duration-300 border-primary/20">
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
              <CardTitle>Marketing Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Access professional marketing materials, landing pages, and promotional content.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="text-center bg-gradient-to-r from-primary/10 to-amber-300/10 border-primary/30">
          <CardHeader>
            <Award className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Ready to Partner with Us?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join hundreds of successful partners who are already earning with our IB program. 
              Start building your trading business today.
            </p>
            <Button size="lg" className="bg-gradient-to-r from-primary to-amber-300 hover:from-primary/90 hover:to-amber-300/90 text-background font-semibold px-8 py-3">
              Apply for Partnership
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IBPartnership;
