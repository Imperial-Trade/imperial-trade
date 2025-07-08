
import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, TrendingUp, Users, BookOpen, Shield, Star, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-amber-300 rounded-2xl flex items-center justify-center">
              <Crown className="w-10 h-10 text-background" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              IMPERIAL
            </h1>
          </div>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the elite trading community where professionals share insights, 
            strategies, and real-time market analysis to maximize your trading success.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/access-portal">
              <Button size="lg" className="bg-accent-green hover:bg-green-500 text-white px-8">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-surface/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Imperial?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="p-8">
                <TrendingUp className="h-12 w-12 text-accent-green mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-4">Live Trading Signals</h3>
                <p className="text-muted-foreground">
                  Get real-time trading signals from professional traders with proven track records.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-8">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-4">Expert Community</h3>
                <p className="text-muted-foreground">
                  Connect with experienced traders and learn from their strategies and insights.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-8">
                <BookOpen className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-4">Educational Resources</h3>
                <p className="text-muted-foreground">
                  Access comprehensive trading education materials and live learning sessions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Ready to Join the Elite?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start your journey with Imperial Trading Community today.
          </p>
          
          <Link to="/access-portal">
            <Button size="lg" className="bg-accent-green hover:bg-green-500 text-white px-12">
              Join Now <Star className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Crown className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              IMPERIAL
            </span>
          </div>
          <p className="text-muted-foreground">
            © 2024 Imperial Trading Community. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
