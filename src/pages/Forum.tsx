
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, TrendingUp } from 'lucide-react';

const Forum = () => {
  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            Trading Community
          </h1>
          <p className="text-lg text-muted-foreground">
            Connect with fellow traders, share insights, and learn from the community.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-primary mb-2" />
              <CardTitle>General Discussion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Share your trading experiences and discuss market trends with the community.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Trade Ideas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Share and discuss potential trading opportunities and market analysis.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:scale-[1.02] transition-all duration-300">
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Beginner's Corner</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                A dedicated space for new traders to ask questions and get guidance.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Forum;
