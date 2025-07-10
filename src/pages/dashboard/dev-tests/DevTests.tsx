
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestUserGenerator } from '@/components/admin/TestUserGenerator';
import { AutomatedTestRunner } from '@/components/admin/AutomatedTestRunner';
import { ComprehensiveTestSuite } from '@/components/admin/ComprehensiveTestSuite';
import { ComponentTypeSafetyTest } from '@/components/testing/ComponentTypeSafetyTest';
import { AlertTriangle, Code, Flask } from 'lucide-react';

const DevTests = () => {
  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="container mx-auto p-6">
        <Card className="glass-effect border-default">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-primary mb-2">Development Only</h2>
            <p className="text-secondary">
              This page is only available in development mode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card className="glass-effect border-default">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Flask className="w-5 h-5" />
            Development Testing Suite
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
              DEV ONLY
            </Badge>
          </CardTitle>
          <p className="text-secondary">
            Developer tools for testing and debugging. Not available in production.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="test-users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-surface">
          <TabsTrigger value="test-users" className="data-[state=active]:bg-accent-green/20">
            Test Users
          </TabsTrigger>
          <TabsTrigger value="auto-tests" className="data-[state=active]:bg-accent-green/20">
            Auto Tests
          </TabsTrigger>
          <TabsTrigger value="comprehensive" className="data-[state=active]:bg-accent-green/20">
            Test Suite
          </TabsTrigger>
          <TabsTrigger value="component-safety" className="data-[state=active]:bg-accent-green/20">
            Type Safety
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test-users" className="space-y-6">
          <TestUserGenerator />
        </TabsContent>

        <TabsContent value="auto-tests" className="space-y-6">
          <AutomatedTestRunner />
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-6">
          <ComprehensiveTestSuite />
        </TabsContent>

        <TabsContent value="component-safety" className="space-y-6">
          <ComponentTypeSafetyTest />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DevTests;
