import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle, AlertCircle, Settings } from "lucide-react";

interface ProductionConfigGuideProps {
  projectId?: string;
}

export const ProductionConfigGuide: React.FC<ProductionConfigGuideProps> = ({ 
  projectId = "kmuoqkcxguafxulqlbmi" 
}) => {
  const dashboardUrl = `https://supabase.com/dashboard/project/${projectId}/auth/url-configuration`;
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const configSteps = [
    {
      title: "1. Update Site URL",
      description: "Set your Supabase Site URL to production domain",
      value: "https://www.tradeimperial.com",
      field: "Site URL"
    },
    {
      title: "2. Add Redirect URLs",
      description: "Add these URLs to your Redirect URLs whitelist",
      values: [
        "https://www.tradeimperial.com/**",
        "https://www.tradeimperial.com/reset-password",
        "https://www.tradeimperial.com/signin",
        "https://www.tradeimperial.com/dashboard/**"
      ],
      field: "Redirect URLs"
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Settings className="w-5 h-5" />
            Supabase Production Configuration Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-200 bg-amber-100 dark:bg-amber-900">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Password reset emails are currently pointing to localhost URLs. External users cannot access these links.
              Update your Supabase dashboard configuration to fix this issue.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Button 
              onClick={() => window.open(dashboardUrl, '_blank')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Supabase Dashboard - URL Configuration
            </Button>

            {configSteps.map((step, index) => (
              <div key={index} className="space-y-3">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200">
                  {step.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
                
                {step.value && (
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                        {step.value}
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => copyToClipboard(step.value!)}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}

                {step.values && (
                  <div className="space-y-2">
                    {step.values.map((value, idx) => (
                      <div key={idx} className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md">
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                            {value}
                          </code>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyToClipboard(value)}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>After updating these settings:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Password reset emails will contain production URLs</li>
                <li>• External users can successfully reset their passwords</li>
                <li>• Authentication will work properly in production</li>
                <li>• Changes take effect immediately</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};