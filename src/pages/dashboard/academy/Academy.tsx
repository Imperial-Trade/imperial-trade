import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, BookOpen, Video, Trophy, Clock, CheckCircle, Star, TrendingUp, PlayCircle, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function Academy() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                Trading Academy
              </h1>
              <p className="text-muted-foreground mt-1">
                Master the art of trading with comprehensive courses and tutorials
              </p>
            </div>
          </div>
        </motion.div>

        {/* Progress Overview */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <motion.div variants={itemVariants}>
            <Card className="border-purple-500/20 bg-purple-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Courses</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-pink-500/20 bg-pink-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">8</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-pink-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-violet-500/20 bg-violet-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Hours Learned</p>
                    <p className="text-2xl font-bold">47</p>
                  </div>
                  <Clock className="w-8 h-8 text-violet-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-fuchsia-500/20 bg-fuchsia-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Achievements</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                  <Trophy className="w-8 h-8 text-fuchsia-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Course Catalog */}
          <div className="lg:col-span-2 space-y-6">
            {/* Continue Learning */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-purple-500" />
                  Continue Learning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg border border-purple-500/20 bg-purple-500/5">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                      <Video className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">In Progress</Badge>
                        <span className="text-xs text-muted-foreground">Last accessed 2 hours ago</span>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">Advanced Technical Analysis</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Learn advanced chart patterns and indicators
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span className="text-purple-500 font-medium">65%</span>
                        </div>
                        <Progress value={65} className="h-2" />
                      </div>
                      <Button className="mt-4" size="sm">
                        Continue Course
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Available Courses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Available Courses
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    title: "Trading Fundamentals for Beginners",
                    level: "Beginner",
                    duration: "6 hours",
                    lessons: 24,
                    students: 1847,
                    rating: 4.8,
                    category: "Fundamentals"
                  },
                  {
                    title: "Risk Management Mastery",
                    level: "Intermediate",
                    duration: "4 hours",
                    lessons: 18,
                    students: 1234,
                    rating: 4.9,
                    category: "Risk"
                  },
                  {
                    title: "Chart Pattern Recognition",
                    level: "Intermediate",
                    duration: "5 hours",
                    lessons: 20,
                    students: 989,
                    rating: 4.7,
                    category: "Technical"
                  },
                  {
                    title: "Psychology of Trading",
                    level: "Advanced",
                    duration: "3 hours",
                    lessons: 12,
                    students: 756,
                    rating: 4.9,
                    category: "Psychology"
                  }
                ].map((course, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border border-border hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {course.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {course.level}
                          </Badge>
                        </div>
                        <h3 className="font-semibold group-hover:text-purple-500 transition-colors mb-2">
                          {course.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {course.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            {course.lessons} lessons
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                            {course.rating}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="flex-shrink-0">
                        Start Course
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Learning Paths */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Learning Paths</CardTitle>
                <CardDescription>Structured curriculum</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    name: "Complete Beginner",
                    courses: 8,
                    progress: 25,
                    icon: "🌱"
                  },
                  {
                    name: "Technical Trader",
                    courses: 12,
                    progress: 58,
                    icon: "📊"
                  },
                  {
                    name: "Risk Manager",
                    courses: 6,
                    progress: 83,
                    icon: "🛡️"
                  }
                ].map((path, index) => (
                  <div key={index} className="p-3 rounded-lg border border-border hover:border-purple-500/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{path.icon}</span>
                      <span className="font-medium text-sm">{path.name}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{path.courses} courses</span>
                        <span>{path.progress}%</span>
                      </div>
                      <Progress value={path.progress} className="h-1.5" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    title: "First Course Completed",
                    date: "2 days ago",
                    icon: "🎯"
                  },
                  {
                    title: "7 Day Streak",
                    date: "5 days ago",
                    icon: "🔥"
                  },
                  {
                    title: "Quiz Master",
                    date: "1 week ago",
                    icon: "🏆"
                  }
                ].map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                    <span className="text-2xl">{achievement.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">{achievement.date}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Your Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Streak</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">7</span>
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <span className="font-bold">84%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Score</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold">4.6</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Rank</span>
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Top 15%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
