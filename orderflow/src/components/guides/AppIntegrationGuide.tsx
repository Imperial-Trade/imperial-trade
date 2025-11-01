import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code, Link, FileText, Zap } from 'lucide-react';

export default function AppIntegrationGuide() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="glass-effect border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Zap className="w-6 h-6" />
            App Integration Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">Option 1: Copy Components & Pages</h3>
            <p className="text-secondary">If you have another Base44 app, you can:</p>
            <ul className="list-disc list-inside space-y-2 text-secondary ml-4">
              <li>Export/Copy entities from the other app</li>
              <li>Copy page components and modify for this app's theme</li>
              <li>Merge the layouts to maintain consistent styling</li>
              <li>Update navigation to include new pages</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">Option 2: Iframe Integration</h3>
            <Card className="bg-background border-default">
              <CardContent className="p-4">
                <pre className="text-sm overflow-x-auto">
{`// Embed another app as iframe
<iframe 
  src="https://your-other-app.base44.com" 
  className="w-full h-screen border-0"
  title="Integrated App"
/>`}
                </pre>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">Option 3: API Integration</h3>
            <Card className="bg-background border-default">
              <CardContent className="p-4">
                <pre className="text-sm overflow-x-auto">
{`// If the other app has APIs
const fetchExternalData = async () => {
  const response = await fetch('external-app-api');
  return response.json();
};`}
                </pre>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-primary">Option 4: Component Migration</h3>
            <Card className="bg-background border-default">
              <CardContent className="p-4">
                <pre className="text-sm overflow-x-auto">
{`// Copy specific components and adapt them
import ExternalComponent from './migrated/ExternalComponent';

// Adapt styling to match Imperial theme
const AdaptedComponent = () => {
  return (
    <div className="glass-effect border-default">
      <ExternalComponent />
    </div>
  );
};`}
                </pre>
              </CardContent>
            </Card>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
            <h4 className="font-semibold text-primary mb-2">To help you better, please tell me:</h4>
            <ul className="list-disc list-inside space-y-1 text-secondary">
              <li>What specific app/functionality do you want to integrate?</li>
              <li>What does it do (trading tools, charts, data analysis, etc.)?</li>
              <li>How do you want it to appear in the Imperial app?</li>
              <li>Do you have access to the code of the other app?</li>
            </ul>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}