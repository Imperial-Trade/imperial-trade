import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Copy, RefreshCw } from "lucide-react";
import { SimplePasswordReset } from '@/utils/simplePasswordReset';
import { EmailRedirectFix } from '@/utils/emailRedirectFix';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { isDevToolsEnabled } from '@/utils/featureFlags';

interface DebugInfo {
  url: {
    current: string;
    hasTokens: boolean;
    canHandleReset: boolean;
  };
  session: {
    hasSession: boolean;
    userId?: string;
    email?: string;
  };
  timestamp: string;
}

export const SimpleDebugDashboard = () => {
  // Hide in production - only show when dev tools are enabled
  if (!isDevToolsEnabled()) {
    return null;
  }

  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const collectDebugInfo = async (): Promise<DebugInfo> => {
    try {
      // URL information
      EmailRedirectFix.debugCurrentUrl();
      
      // Session information
      const { data: { session } } = await supabase.auth.getSession();
      
      return {
        url: {
          current: window.location.href,
          hasTokens: SimplePasswordReset.hasRecoveryTokens(),
          canHandleReset: EmailRedirectFix.canHandlePasswordReset()
        },
        session: {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Debug info collection failed:', error);
      throw error;
    }
  };

  const refreshDebugInfo = async () => {
    setLoading(true);
    try {
      const info = await collectDebugInfo();
      setDebugInfo(info);
    } catch (error) {
      toast.error('Failed to collect debug info');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const testPasswordReset = async () => {
    try {
      const resetSession = await SimplePasswordReset.validateResetSession();
      toast.success(`Reset session validation: ${resetSession.isValid ? 'VALID' : 'INVALID'} (${resetSession.method})`);
    } catch (error) {
      toast.error('Reset session test failed');
    }
  };

  useEffect(() => {
    if (isOpen && !debugInfo) {
      refreshDebugInfo();
    }
  }, [isOpen]);

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <span>🐛 Simple Debug Dashboard</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={refreshDebugInfo} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button 
                onClick={testPasswordReset} 
                variant="outline" 
                size="sm"
              >
                Test Reset Session
              </Button>

              {debugInfo && (
                <Button 
                  onClick={() => copyToClipboard(JSON.stringify(debugInfo, null, 2))} 
                  variant="outline" 
                  size="sm"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy All
                </Button>
              )}
            </div>

            {debugInfo && (
              <div className="space-y-3">
                {/* URL Status */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">URL Status</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={debugInfo.url.hasTokens ? "default" : "secondary"}>
                      Tokens: {debugInfo.url.hasTokens ? 'Present' : 'Missing'}
                    </Badge>
                    <Badge variant={debugInfo.url.canHandleReset ? "default" : "destructive"}>
                      Reset Page: {debugInfo.url.canHandleReset ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                  <div className="text-xs font-mono bg-muted p-2 rounded break-all">
                    {debugInfo.url.current}
                  </div>
                </div>

                {/* Session Status */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Session Status</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={debugInfo.session.hasSession ? "default" : "secondary"}>
                      Session: {debugInfo.session.hasSession ? 'Active' : 'None'}
                    </Badge>
                    {debugInfo.session.userId && (
                      <Badge variant="outline">
                        User ID: {debugInfo.session.userId.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>
                  {debugInfo.session.email && (
                    <div className="text-xs bg-muted p-2 rounded">
                      Email: {debugInfo.session.email}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(debugInfo.timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};