import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Users,
} from "lucide-react";

interface TestResult {
  testName: string;
  status: "pending" | "running" | "passed" | "failed";
  duration?: number;
  error?: string;
  details?: string[];
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  tests: string[];
  userEmail: string;
  userPassword: string;
}

const automatedTests: TestScenario[] = [
  {
    id: "basic-user-flow",
    name: "Basic User Flow",
    description: "Test login, dashboard access, navigation",
    userEmail: "john.trader@test.com",
    userPassword: "TestPass123!",
    tests: [
      "Login with credentials",
      "Access dashboard home",
      "Navigate to different sections",
      "View profile information",
      "Logout successfully",
    ],
  },
  {
    id: "educator-workflow",
    name: "Educator Workflow",
    description: "Test educator-specific features and permissions",
    userEmail: "sarah.educator@test.com",
    userPassword: "EduPass123!",
    tests: [
      "Login as educator",
      "Access moderator features",
      "View education content",
      "Check permission boundaries",
      "Test content creation rights",
    ],
  },
  {
    id: "admin-operations",
    name: "Admin Operations",
    description: "Test admin panel functionality",
    userEmail: "admin.test@test.com",
    userPassword: "AdminTest123!",
    tests: [
      "Login as admin",
      "Access admin panel",
      "View user management",
      "Check system monitoring",
      "Test audit logs",
      "Verify account request management",
    ],
  },
  {
    id: "permission-boundaries",
    name: "Permission Boundaries",
    description: "Test access control and security",
    userEmail: "bob.newbie@test.com",
    userPassword: "Newbie123!",
    tests: [
      "Login as basic user",
      "Attempt admin panel access (should fail)",
      "Verify restricted content access",
      "Test role-based navigation",
      "Check security boundaries",
    ],
  },
];

export function AutomatedTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [progress, setProgress] = useState(0);

  const simulateTest = async (
    testName: string,
    shouldFail: boolean = false
  ): Promise<TestResult> => {
    const startTime = Date.now();

    // Simulate test execution time
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 2000 + 1000)
    );

    const duration = Date.now() - startTime;

    if (shouldFail && Math.random() < 0.2) {
      return {
        testName,
        status: "failed",
        duration,
        error: "Simulated test failure for demonstration",
        details: ["Mock error details", "Additional context"],
      };
    }

    return {
      testName,
      status: "passed",
      duration,
      details: ["Test completed successfully", "All assertions passed"],
    };
  };

  const runTestScenario = async (scenario: TestScenario) => {
    const scenarioResults: TestResult[] = [];

    for (let i = 0; i < scenario.tests.length; i++) {
      const testName = scenario.tests[i];
      setCurrentTest(`${scenario.name}: ${testName}`);

      // Add pending test result
      const pendingResult: TestResult = {
        testName: `${scenario.name}: ${testName}`,
        status: "running",
      };

      setTestResults((prev) => [
        ...prev.filter((r) => r.testName !== pendingResult.testName),
        pendingResult,
      ]);

      // Run the test
      const result = await simulateTest(
        testName,
        scenario.id === "permission-boundaries"
      );
      result.testName = `${scenario.name}: ${testName}`;

      scenarioResults.push(result);
      setTestResults((prev) => [
        ...prev.filter((r) => r.testName !== result.testName),
        result,
      ]);

      // Update progress
      const totalTests = automatedTests.reduce(
        (sum, s) => sum + s.tests.length,
        0
      );
      const currentTestIndex = testResults.length + i + 1;
      setProgress((currentTestIndex / totalTests) * 100);
    }

    return scenarioResults;
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgress(0);
    setCurrentTest(null);

    let totalPassed = 0;
    let totalFailed = 0;

    try {
      for (const scenario of automatedTests) {
        toast.info(`Running ${scenario.name}...`);
        const results = await runTestScenario(scenario);

        results.forEach((result) => {
          if (result.status === "passed") totalPassed++;
          else if (result.status === "failed") totalFailed++;
        });
      }

      setCurrentTest(null);
      setProgress(100);

      toast.success(
        `Tests completed: ${totalPassed} passed, ${totalFailed} failed`
      );
    } catch (error) {
      toast.error("Test execution failed");
      logger.error("Test execution error:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const resetTests = () => {
    setTestResults([]);
    setProgress(0);
    setCurrentTest(null);
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "running":
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-secondary" />;
    }
  };

  const getStatusBadge = (status: TestResult["status"]) => {
    const colors = {
      passed: "bg-green-500/20 text-green-400 border-green-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
      running: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      pending: "bg-secondary/20 text-secondary border-secondary/30",
    };

    return (
      <Badge className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const passedTests = testResults.filter((r) => r.status === "passed").length;
  const failedTests = testResults.filter((r) => r.status === "failed").length;
  const totalTests = testResults.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Users className="w-6 h-6" />
            Automated Test Runner
          </h2>
          <p className="text-secondary mt-1">
            Run comprehensive automated tests across different user scenarios
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={resetTests}
            variant="outline"
            disabled={isRunning}
            className="border-default text-secondary hover:bg-surface"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>

          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-accent-blue hover:bg-accent-blue/80 text-white"
          >
            {isRunning ? (
              <Pause className="w-4 h-4 mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isRunning ? "Running..." : "Run All Tests"}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {(isRunning || progress > 0) && (
        <Card className="glass-effect">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Test Progress</span>
                <span className="text-primary">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {currentTest && (
                <p className="text-sm text-secondary mt-2">
                  Currently running:{" "}
                  <span className="text-primary">{currentTest}</span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass-effect">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-green-400">
                {passedTests}
              </div>
              <div className="text-sm text-secondary">Passed</div>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-red-400">
                {failedTests}
              </div>
              <div className="text-sm text-secondary">Failed</div>
            </CardContent>
          </Card>

          <Card className="glass-effect">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl font-bold text-primary">
                {totalTests}
              </div>
              <div className="text-sm text-secondary">Total</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Scenarios */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="text-primary">Test Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {automatedTests.map((scenario) => (
              <div
                key={scenario.id}
                className="p-4 rounded-lg border border-default bg-surface/50"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h4 className="font-semibold text-primary">
                      {scenario.name}
                    </h4>
                    <p className="text-secondary text-sm">
                      {scenario.description}
                    </p>
                    <p className="text-xs text-secondary mt-1">
                      Test User: {scenario.userEmail}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {scenario.tests.map((test, index) => {
                    const fullTestName = `${scenario.name}: ${test}`;
                    const result = testResults.find(
                      (r) => r.testName === fullTestName
                    );

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded bg-background/50"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result?.status || "pending")}
                          <span className="text-sm text-primary">{test}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {result?.duration && (
                            <span className="text-xs text-secondary">
                              {result.duration}ms
                            </span>
                          )}
                          {getStatusBadge(result?.status || "pending")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      {testResults.some((r) => r.status === "failed") && (
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="text-red-400">Failed Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {testResults
                .filter((r) => r.status === "failed")
                .map((result, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="font-medium text-red-400">
                        {result.testName}
                      </span>
                    </div>

                    {result.error && (
                      <p className="text-sm text-red-300 mb-2">
                        {result.error}
                      </p>
                    )}

                    {result.details && (
                      <div className="text-xs text-red-200 space-y-1">
                        {result.details.map((detail, i) => (
                          <div key={i}>• {detail}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
