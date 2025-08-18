import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlayCircle, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Activity,
  BarChart3,
  Zap,
  Settings,
  Clock,
  Target,
  Users,
  Bell
} from 'lucide-react';
import Phase4TestSuite from './Phase4TestSuite';
// Phase3RealTimeEngine removed - using direct WebSocketPriceContext
import Phase4AnalyticsDashboard from '../analytics/Phase4AnalyticsDashboard';
import { useAuth } from '@/contexts/AuthContext';

interface PhaseStatus {
  id: string;
  name: string;
  description: string;
  status: 'inactive' | 'running' | 'completed' | 'error';
  completion: number;
  features: string[];
  dependencies: string[];
  component: React.ComponentType;
}

export default function IntegratedPhaseManager() {
  const { user } = useAuth();
  const [activePhase, setActivePhase] = useState<string>('overview');
  const [phaseStatuses, setPhaseStatuses] = useState<Record<string, PhaseStatus>>({
    phase1: {
      id: 'phase1',
      name: 'Foundation & Core APIs',
      description: 'Basic notification infrastructure and API client setup',
      status: 'completed',
      completion: 100,
      features: ['Enhanced API Client', 'Basic Notifications', 'Error Handling', 'Authentication'],
      dependencies: [],
      component: () => <div className="p-8 text-center text-muted-foreground">Phase 1 completed</div>
    },
    phase2: {
      id: 'phase2',
      name: 'Advanced Notifications',
      description: 'Enhanced notification system with OneSignal integration',
      status: 'completed',
      completion: 100,
      features: ['OneSignal Integration', 'Push Notifications', 'Audio Alerts', 'Preferences'],
      dependencies: ['phase1'],
      component: () => <div className="p-8 text-center text-muted-foreground">Phase 2 completed</div>
    },
    phase3: {
      id: 'phase3',
      name: 'Real-Time Trading Engine',
      description: 'Live market data streaming and trading signal processing',
      status: 'inactive',
      completion: 0,
      features: ['WebSocket Streaming', 'Market Data Processing', 'Signal Generation', 'Alert Triggers'],
      dependencies: ['phase1', 'phase2'],
      component: () => <div className="p-8 text-center text-muted-foreground">Phase 3 using direct WebSocket integration</div>
    },
    phase4: {
      id: 'phase4',
      name: 'Analytics & Testing Suite',
      description: 'Comprehensive analytics dashboard and automated testing',
      status: 'inactive',
      completion: 0,
      features: ['Analytics Dashboard', 'Performance Metrics', 'Test Automation', 'Reporting'],
      dependencies: ['phase1', 'phase2', 'phase3'],
      component: Phase4AnalyticsDashboard
    }
  });

  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    const totalPhases = Object.keys(phaseStatuses).length;
    const completedWeight = Object.values(phaseStatuses).reduce((sum, phase) => {
      return sum + (phase.completion / 100);
    }, 0);
    setOverallProgress(Math.round((completedWeight / totalPhases) * 100));
  }, [phaseStatuses]);

  const startPhase = (phaseId: string) => {
    setPhaseStatuses(prev => ({
      ...prev,
      [phaseId]: {
        ...prev[phaseId],
        status: 'running',
        completion: 25
      }
    }));

    // Simulate phase progression
    const progressInterval = setInterval(() => {
      setPhaseStatuses(prev => {
        const currentPhase = prev[phaseId];
        if (currentPhase.completion >= 100) {
          clearInterval(progressInterval);
          return {
            ...prev,
            [phaseId]: {
              ...currentPhase,
              status: 'completed',
              completion: 100
            }
          };
        }
        return {
          ...prev,
          [phaseId]: {
            ...currentPhase,
            completion: Math.min(currentPhase.completion + 25, 100)
          }
        };
      });
    }, 2000);
  };

  const getPhaseIcon = (phaseId: string) => {
    switch (phaseId) {
      case 'phase1': return <Settings className="w-5 h-5" />;
      case 'phase2': return <Bell className="w-5 h-5" />;
      case 'phase3': return <Activity className="w-5 h-5" />;
      case 'phase4': return <BarChart3 className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500';
      case 'running': return 'text-blue-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const canStartPhase = (phaseId: string) => {
    const phase = phaseStatuses[phaseId];
    if (phase.status === 'completed' || phase.status === 'running') return false;
    
    return phase.dependencies.every(depId => 
      phaseStatuses[depId]?.status === 'completed'
    );
  };

  const renderPhaseComponent = (phaseId: string) => {
    const phase = phaseStatuses[phaseId];
    const Component = phase.component;
    return <Component />;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Target className="w-6 h-6 text-purple-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              </div>
              Integrated Phase Management System
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {overallProgress}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-4 rounded-full transition-all duration-1000"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Object.values(phaseStatuses).map((phase) => (
                <div 
                  key={phase.id} 
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    activePhase === phase.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setActivePhase(phase.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getPhaseIcon(phase.id)}
                      <span className="font-medium text-sm">{phase.name}</span>
                    </div>
                    {getStatusIcon(phase.status)}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${phase.completion}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">{phase.completion}%</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Management */}
      <Tabs value={activePhase} onValueChange={setActivePhase} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <Users className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="phase1" className="gap-2" disabled={phaseStatuses.phase1.status === 'inactive'}>
            <Settings className="w-4 h-4" />
            Phase 1
          </TabsTrigger>
          <TabsTrigger value="phase2" className="gap-2" disabled={phaseStatuses.phase2.status === 'inactive'}>
            <Bell className="w-4 h-4" />
            Phase 2
          </TabsTrigger>
          <TabsTrigger value="phase3" className="gap-2">
            <Activity className="w-4 h-4" />
            Phase 3
          </TabsTrigger>
          <TabsTrigger value="phase4" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Phase 4
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Imperial Trading Platform - Phase Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.values(phaseStatuses).map((phase) => (
                <div key={phase.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getPhaseIcon(phase.id)}
                      <div>
                        <h3 className="font-semibold">{phase.name}</h3>
                        <p className="text-sm text-muted-foreground">{phase.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={phase.status === 'completed' ? 'default' : 'secondary'}>
                        {phase.status}
                      </Badge>
                      {canStartPhase(phase.id) && phase.status === 'inactive' && (
                        <Button onClick={() => startPhase(phase.id)} size="sm" className="gap-2">
                          <PlayCircle className="w-4 h-4" />
                          Start Phase
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Features:</h4>
                      <div className="space-y-1">
                        {phase.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Dependencies:</h4>
                      {phase.dependencies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No dependencies</p>
                      ) : (
                        <div className="space-y-1">
                          {phase.dependencies.map((depId) => (
                            <div key={depId} className="flex items-center gap-2 text-sm">
                              {getStatusIcon(phaseStatuses[depId]?.status)}
                              {phaseStatuses[depId]?.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${phase.completion}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phase1" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Phase 1: Foundation & Core APIs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Phase 1 Completed</h3>
                <p className="text-muted-foreground">
                  Core infrastructure and API foundations have been successfully implemented.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phase2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Phase 2: Advanced Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Phase 2 Completed</h3>
                <p className="text-muted-foreground">
                  Enhanced notification system with OneSignal integration is fully operational.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phase3" className="space-y-4">
          {phaseStatuses.phase3.status === 'inactive' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Phase 3: Real-Time Trading Engine
                  </div>
                  <Button onClick={() => startPhase('phase3')} className="gap-2">
                    <PlayCircle className="w-4 h-4" />
                    Initialize Phase 3
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Zap className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Start Phase 3</h3>
                  <p className="text-muted-foreground mb-4">
                    Initialize the real-time trading engine with WebSocket streaming and market data processing.
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Activity className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                      <div className="text-sm font-medium">Real-Time Data</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <Target className="w-6 h-6 text-green-500 mx-auto mb-2" />
                      <div className="text-sm font-medium">Signal Processing</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            renderPhaseComponent('phase3')
          )}
        </TabsContent>

        <TabsContent value="phase4" className="space-y-4">
          {phaseStatuses.phase4.status === 'inactive' ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Phase 4: Analytics & Testing Suite
                  </div>
                  <Button 
                    onClick={() => startPhase('phase4')} 
                    disabled={!canStartPhase('phase4')}
                    className="gap-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Initialize Phase 4
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {canStartPhase('phase4') ? 'Ready to Start Phase 4' : 'Waiting for Dependencies'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {canStartPhase('phase4') 
                      ? 'Launch comprehensive analytics dashboard and automated testing suite.'
                      : 'Complete Phase 3 before starting the analytics dashboard.'
                    }
                  </p>
                  {!canStartPhase('phase4') && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4" />
                      Phase 3 must be completed first
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {renderPhaseComponent('phase4')}
              <Phase4TestSuite />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}