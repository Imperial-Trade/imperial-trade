
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AccessDenied({ requiredLevel = "user" }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="glass-effect border-default max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-accent-red" />
          </div>
          <h2 className="text-2xl font-bold text-primary mb-4">Access Restricted</h2>
          <p className="text-secondary mb-6">
            This content requires a full member account. Please sign in or create an account to access this feature.
          </p>
          <div className="space-y-3">
            <Link to="/signin">
              <Button className="w-full bg-accent-green hover:bg-green-500 text-white">
                Sign In or Join
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full border-default text-secondary hover:bg-surface">
                Return to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
