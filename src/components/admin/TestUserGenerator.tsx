
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdminUserManagement } from '@/hooks/useAdminUserManagement';
import { toast } from 'sonner';
import { Users, Play, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';

interface TestUser {
  email: string;
  password: string;
  display_name: string;
  user_type: 'member' | 'educator' | 'admin';
  access_level: 'user' | 'moderator' | 'admin';
  role: string;
  scenario: string;
}

const testUsers: TestUser[] = [
  {
    email: 'john.trader@test.com',
    password: 'TestPass123!',
    display_name: 'John Trader',
    user_type: 'member',
    access_level: 'user',
    role: 'user',
    scenario: 'Regular trading member'
  },
  {
    email: 'sarah.educator@test.com',
    password: 'EduPass123!',
    display_name: 'Sarah Education Lead',
    user_type: 'educator',
    access_level: 'moderator',
    role: 'educator',
    scenario: 'Trading educator with moderator access'
  },
  {
    email: 'mike.premium@test.com',
    password: 'Premium123!',
    display_name: 'Mike Premium User',
    user_type: 'member',
    access_level: 'user',
    role: 'premium_member',
    scenario: 'Premium member with advanced features'
  },
  {
    email: 'lisa.analyst@test.com',
    password: 'Analyst123!',
    display_name: 'Lisa Market Analyst',
    user_type: 'educator',
    access_level: 'moderator',
    role: 'market_analyst',
    scenario: 'Market analyst with content creation rights'
  },
  {
    email: 'bob.newbie@test.com',
    password: 'Newbie123!',
    display_name: 'Bob Newbie',
    user_type: 'member',
    access_level: 'user',
    role: 'new_member',
    scenario: 'New member just getting started'
  },
  {
    email: 'admin.test@test.com',
    password: 'AdminTest123!',
    display_name: 'Test Admin',
    user_type: 'admin',
    access_level: 'admin',
    role: 'admin',
    scenario: 'Test admin account for admin panel testing'
  },
  {
    email: 'emma.vip@test.com',
    password: 'VipUser123!',
    display_name: 'Emma VIP Member',
    user_type: 'member',
    access_level: 'user',
    role: 'vip_member',
    scenario: 'VIP member with exclusive access'
  },
  {
    email: 'carlos.mentor@test.com',
    password: 'Mentor123!',
    display_name: 'Carlos Trading Mentor',
    user_type: 'educator',
    access_level: 'moderator',
    role: 'mentor',
    scenario: 'Trading mentor for one-on-one sessions'
  }
];

const testScenarios = [
  {
    name: 'Basic User Journey',
    description: 'Test basic login, dashboard access, and profile viewing',
    users: ['john.trader@test.com', 'bob.newbie@test.com']
  },
  {
    name: 'Educator Workflow',
    description: 'Test content creation, student management, and moderation tools',
    users: ['sarah.educator@test.com', 'lisa.analyst@test.com', 'carlos.mentor@test.com']
  },
  {
    name: 'Admin Operations',
    description: 'Test user management, system monitoring, and admin controls',
    users: ['admin.test@test.com']
  },
  {
    name: 'Premium Features',
    description: 'Test advanced trading tools and premium content access',
    users: ['mike.premium@test.com', 'emma.vip@test.com']
  },
  {
    name: 'Cross-Role Interactions',
    description: 'Test interactions between different user types and permission boundaries',
    users: ['john.trader@test.com', 'sarah.educator@test.com', 'admin.test@test.com']
  }
];

export function TestUserGenerator() {
  const [isCreating, setIsCreating] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<string[]>([]);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const { createUser } = useAdminUserManagement();

  const createTestUser = async (user: TestUser) => {
    try {
      await createUser({
        email: user.email,
        password: user.password,
        display_name: user.display_name,
        user_type: user.user_type,
        access_level: user.access_level,
        role: user.role
      });
      
      setCreatedUsers(prev => [...prev, user.email]);
      toast.success(`Created test user: ${user.display_name}`);
      return true;
    } catch (error) {
      console.error(`Failed to create user ${user.email}:`, error);
      toast.error(`Failed to create ${user.display_name}: ${(error as Error).message}`);
      return false;
    }
  };

  const createAllTestUsers = async () => {
    setIsCreating(true);
    setCreatedUsers([]);
    
    let successCount = 0;
    
    for (const user of testUsers) {
      const success = await createTestUser(user);
      if (success) successCount++;
      
      // Add small delay between user creation to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsCreating(false);
    toast.success(`Successfully created ${successCount}/${testUsers.length} test users`);
  };

  const runTestScenario = (scenarioName: string) => {
    setCurrentScenario(scenarioName);
    const scenario = testScenarios.find(s => s.name === scenarioName);
    
    if (scenario) {
      toast.info(`Running test scenario: ${scenario.name}`, {
        description: scenario.description
      });
      
      // Log scenario details
      console.log('Test Scenario:', scenario);
      console.log('Test Users for this scenario:', scenario.users);
      
      // You can add automated test execution here
    }
  };

  const getUserStatusBadge = (email: string) => {
    const isCreated = createdUsers.includes(email);
    return (
      <Badge 
        variant={isCreated ? "default" : "secondary"}
        className={isCreated ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}
      >
        {isCreated ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
        {isCreated ? 'Created' : 'Pending'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Users className="w-6 h-6" />
            Test User Generator
          </h2>
          <p className="text-secondary mt-1">
            Create test users with various roles and scenarios for comprehensive testing
          </p>
        </div>
        
        <Button 
          onClick={createAllTestUsers}
          disabled={isCreating}
          className="bg-accent-blue hover:bg-accent-blue/80 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {isCreating ? 'Creating Users...' : 'Create All Test Users'}
        </Button>
      </div>

      {/* Test Users List */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-primary">Test Users ({testUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {testUsers.map((user, index) => (
              <div 
                key={user.email}
                className="p-4 rounded-lg border border-default bg-surface/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-primary">{user.display_name}</h4>
                  {getUserStatusBadge(user.email)}
                </div>
                
                <div className="space-y-1 text-sm">
                  <p className="text-secondary">📧 {user.email}</p>
                  <p className="text-secondary">🔑 {user.password}</p>
                  <p className="text-secondary">👤 {user.user_type} | {user.access_level}</p>
                  <p className="text-secondary">🎭 {user.role}</p>
                </div>
                
                <div className="pt-2">
                  <Badge variant="outline" className="text-xs">
                    {user.scenario}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-primary">Test Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {testScenarios.map((scenario) => (
              <div 
                key={scenario.name}
                className="p-4 rounded-lg border border-default bg-surface/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-primary mb-2">{scenario.name}</h4>
                    <p className="text-secondary text-sm mb-3">{scenario.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {scenario.users.map(email => (
                        <Badge key={email} variant="secondary" className="text-xs">
                          {testUsers.find(u => u.email === email)?.display_name || email}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runTestScenario(scenario.name)}
                    className={`${
                      currentScenario === scenario.name 
                        ? 'bg-accent-green/20 border-accent-green text-accent-green' 
                        : ''
                    }`}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Run Test
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {createdUsers.length > 0 && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="text-primary text-green-400">
              Created Users ({createdUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-secondary">
                The following test users have been successfully created and can be used for testing:
              </p>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {createdUsers.map(email => {
                  const user = testUsers.find(u => u.email === email);
                  return (
                    <div key={email} className="p-2 rounded bg-green-500/10 border border-green-500/20">
                      <p className="text-sm font-medium text-green-400">{user?.display_name}</p>
                      <p className="text-xs text-green-300">{email}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
