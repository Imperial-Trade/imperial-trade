import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, BookOpen, Percent } from "lucide-react";
import Certificate from "@/components/learning/Certificate";

export default function MyProgress() {
  // This data would be derived from UserProgress and QuizAttempt entities
  const progressSummary = {
    coursesCompleted: 12,
    avgScore: 88,
    courses: [
      { id: 1, title: "Introduction to Technical Analysis", completed: true },
      { id: 2, title: "Advanced Risk Management", completed: true },
      { id: 3, title: "The Psychology of Trading", completed: false },
    ],
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2">
            My <span className="gold-text-gradient">Learning Journey</span>
          </h1>
          <p className="text-secondary text-lg">
            Track your progress, review completed courses, and access your
            certificates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-surface">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <BookOpen className="w-6 h-6 text-accent-green" />
              </div>
              <div>
                <p className="text-sm text-secondary">Courses Completed</p>
                <p className="text-2xl font-bold text-primary">
                  {progressSummary.coursesCompleted}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-surface">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Percent className="w-6 h-6 text-accent-blue" />
              </div>
              <div>
                <p className="text-sm text-secondary">Average Quiz Score</p>
                <p className="text-2xl font-bold text-primary">
                  {progressSummary.avgScore}%
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-surface">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-secondary">Certificates Earned</p>
                <p className="text-2xl font-bold text-primary">2</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>My Certificates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Certificate
                studentName="Your Name"
                courseName="Introduction to Technical Analysis"
              />
              <Certificate
                studentName="Your Name"
                courseName="Advanced Risk Management"
              />
            </CardContent>
          </Card>
          <Card className="glass-effect">
            <CardHeader>
              <CardTitle>Course Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-secondary">
                A list of all courses showing your completion status would be
                displayed here.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
