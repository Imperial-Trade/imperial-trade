import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, RefreshCw, Bug, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { TokenValidator } from '@/utils/tokenValidation';
import { RecoveryFlowSecurity } from '@/utils/recoveryFlowSecurity';
import { supabase } from '@/integrations/supabase/client';

interface DebugInfo {
  timestamp: string;
  url: {
    full: string;
    hash: string;
    search: string;
    pathname: string;
    hostname: string;
  };
  tokens: {
    inHash: boolean;
    inQuery: boolean;
    hasBackup: boolean;
    backupAge?: number;
  };
  session: {
    exists: boolean;
    isRecovery: boolean;
    userId?: string;
    email?: string;
  };
  validation: {
    tokenValidation?: any;
    flowState?: any;
  };
}

export const TokenDebugDashboard: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const collectDebugInfo = async () => {
    setLoading(true);
    try {
      const info: DebugInfo = {
        timestamp: new Date().toISOString(),
        url: {
          full: window.location.href,
          hash: window.location.hash,
          search: window.location.search,
          pathname: window.location.pathname,
          hostname: window.location.hostname
        },
        tokens: {
          inHash: checkTokensInHash(),
          inQuery: checkTokensInQuery(),
          hasBackup: checkBackupTokens(),
          backupAge: getBackupAge()
        },
        session: await checkSessionInfo(),
        validation: {}
      };

      // Run token validation
      console.log('🐛 Debug Dashboard: Running token validation...');
      const tokenValidation = await TokenValidator.validateRecoveryTokens();
      info.validation.tokenValidation = tokenValidation;

      // Run flow validation
      console.log('🐛 Debug Dashboard: Running flow validation...');
      const flowState = await RecoveryFlowSecurity.initializeRecoveryFlow({
        securityScoreThreshold: 50 // Lower threshold for debugging
      });
      info.validation.flowState = flowState;

      setDebugInfo(info);
    } catch (error) {
      console.error('Debug info collection failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTokensInHash = (): boolean => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.has('access_token') && params.has('type');
  };

  const checkTokensInQuery = (): boolean => {
    const search = window.location.search.substring(1);
    const params = new URLSearchParams(search);
    return params.has('access_token') && params.has('type');
  };

  const checkBackupTokens = (): boolean => {
    return !!sessionStorage.getItem('password_reset_tokens_backup');
  };

  const getBackupAge = (): number | undefined => {
    try {
      const backup = sessionStorage.getItem('password_reset_tokens_backup');
      if (!backup) return undefined;
      
      const data = JSON.parse(backup);
      return Math.round((Date.now() - data.timestamp) / 1000);
    } catch {
      return undefined;
    }
  };

  const checkSessionInfo = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session || !session.user) {
        return {
          exists: false,
          isRecovery: false
        };
      }

      const isRecovery = !!(
        session.user.recovery_sent_at || 
        session.user.app_metadata?.recovery_sent_at ||
        session.user.user_metadata?.recovery_sent_at
      );

      return {
        exists: true,
        isRecovery,
        userId: session.user.id,
        email: session.user.email
      };
    } catch {
      return {
        exists: false,
        isRecovery: false
      };
    }
  };

  useEffect(() => {
    collectDebugInfo();
  }, []);

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (isValid: boolean, label: string) => {
    return (
      <Badge variant={isValid ? "default" : "destructive"} className="ml-2">
        {label}
      </Badge>
    );
  };

  if (!debugInfo) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bug className="h-5 w-5" />
            <span>Token Debug Dashboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="ml-2">Loading debug info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bug className="h-5 w-5" />
            <span>Production Password Reset Debug Dashboard</span>
          </div>
          <Button
            onClick={collectDebugInfo}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            {getStatusIcon(debugInfo.tokens.inHash || debugInfo.tokens.inQuery)}
            <span className="text-sm">Tokens in URL</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(debugInfo.tokens.hasBackup)}
            <span className="text-sm">Backup Tokens</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(debugInfo.session.exists)}
            <span className="text-sm">Active Session</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(debugInfo.session.isRecovery)}
            <span className="text-sm">Recovery Session</span>
          </div>
        </div>

        {/* Validation Results */}
        {debugInfo.validation.tokenValidation && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium flex items-center">
              Token Validation Results
              {getStatusBadge(debugInfo.validation.tokenValidation.isValid, 
                debugInfo.validation.tokenValidation.isValid ? 'Valid' : 'Invalid'
              )}
            </h3>
            <div className="mt-2 text-sm space-y-1">
              <div>Errors: {debugInfo.validation.tokenValidation.errors.length}</div>
              <div>Warnings: {debugInfo.validation.tokenValidation.warnings.length}</div>
              {debugInfo.validation.tokenValidation.metadata.recoveryMethod && (
                <div>Recovery Method: {debugInfo.validation.tokenValidation.metadata.recoveryMethod}</div>
              )}
            </div>
          </div>
        )}

        {/* Flow State Results */}
        {debugInfo.validation.flowState && (
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-medium flex items-center">
              Recovery Flow State
              {getStatusBadge(debugInfo.validation.flowState.isSecure, 
                debugInfo.validation.flowState.isSecure ? 'Secure' : 'Insecure'
              )}
            </h3>
            <div className="mt-2 text-sm space-y-1">
              <div>Stage: {debugInfo.validation.flowState.flowStage}</div>
              <div>Security Score: {debugInfo.validation.flowState.securityScore}/100</div>
              <div>Errors: {debugInfo.validation.flowState.errors.length}</div>
              <div>Warnings: {debugInfo.validation.flowState.warnings.length}</div>
            </div>
          </div>
        )}

        {/* Detailed Debug Information */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="ml-2">Detailed Debug Information</span>
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 mt-4">
            {/* URL Information */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">URL Information</h4>
              <div className="text-sm space-y-1 font-mono">
                <div><strong>Full URL:</strong> {debugInfo.url.full}</div>
                <div><strong>Hash:</strong> {debugInfo.url.hash || '(empty)'}</div>
                <div><strong>Query:</strong> {debugInfo.url.search || '(empty)'}</div>
                <div><strong>Hostname:</strong> {debugInfo.url.hostname}</div>
              </div>
            </div>

            {/* Token Information */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Token Information</h4>
              <div className="text-sm space-y-1">
                <div>Tokens in Hash: {debugInfo.tokens.inHash ? '✅ Yes' : '❌ No'}</div>
                <div>Tokens in Query: {debugInfo.tokens.inQuery ? '✅ Yes' : '❌ No'}</div>
                <div>Backup Available: {debugInfo.tokens.hasBackup ? '✅ Yes' : '❌ No'}</div>
                {debugInfo.tokens.backupAge !== undefined && (
                  <div>Backup Age: {debugInfo.tokens.backupAge}s</div>
                )}
              </div>
            </div>

            {/* Session Information */}
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Session Information</h4>
              <div className="text-sm space-y-1">
                <div>Session Exists: {debugInfo.session.exists ? '✅ Yes' : '❌ No'}</div>
                <div>Is Recovery Session: {debugInfo.session.isRecovery ? '✅ Yes' : '❌ No'}</div>
                {debugInfo.session.email && (
                  <div>Email: {debugInfo.session.email}</div>
                )}
                {debugInfo.session.userId && (
                  <div className="font-mono">User ID: {debugInfo.session.userId}</div>
                )}
              </div>
            </div>

            {/* Raw Validation Data */}
            {debugInfo.validation.tokenValidation && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Raw Token Validation</h4>
                <pre className="text-xs overflow-auto bg-background p-2 rounded border">
                  {JSON.stringify(debugInfo.validation.tokenValidation, null, 2)}
                </pre>
              </div>
            )}

            {/* Console Logs Reminder */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Console Logs</span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Check the browser console for detailed debugging logs with 🔐, 📍, and 🔄 prefixes.
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(debugInfo.timestamp).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};