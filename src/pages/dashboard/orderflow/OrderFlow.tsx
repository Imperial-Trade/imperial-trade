import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Users, TrendingUp, MessageCircle, Heart, Share2, Bell, Filter } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderFlow() {
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
                Community Forum
              </h1>
              <p className="text-muted-foreground mt-1">
                Connect, discuss, and grow with fellow traders
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <motion.div variants={itemVariants}>
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Members</p>
                    <p className="text-2xl font-bold">2,847</p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Discussions</p>
                    <p className="text-2xl font-bold">1,234</p>
                  </div>
                  <MessageCircle className="w-8 h-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-teal-500/20 bg-teal-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Online Now</p>
                    <p className="text-2xl font-bold">142</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-teal-500" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Forum Categories */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Popular Discussions
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    title: "Best Trading Strategies for Beginners",
                    category: "Strategy",
                    author: "TradeExpert",
                    replies: 45,
                    likes: 128,
                    time: "2 hours ago"
                  },
                  {
                    title: "Market Analysis: EUR/USD Breakout",
                    category: "Analysis",
                    author: "ForexMaster",
                    replies: 32,
                    likes: 94,
                    time: "4 hours ago"
                  },
                  {
                    title: "Risk Management Tips & Tricks",
                    category: "Education",
                    author: "RiskPro",
                    replies: 67,
                    likes: 201,
                    time: "5 hours ago"
                  },
                  {
                    title: "Live Trading Session Discussion",
                    category: "Live",
                    author: "LiveTrader",
                    replies: 89,
                    likes: 156,
                    time: "1 day ago"
                  }
                ].map((discussion, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border border-border hover:border-green-500/50 hover:bg-green-500/5 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {discussion.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{discussion.time}</span>
                        </div>
                        <h3 className="font-semibold group-hover:text-green-500 transition-colors mb-1">
                          {discussion.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">by {discussion.author}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {discussion.replies}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            {discussion.likes}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Start Discussion
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Bell className="w-4 h-4 mr-2" />
                  Subscribe to Topics
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Forum
                </Button>
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: "Strategy", count: 234 },
                  { name: "Analysis", count: 189 },
                  { name: "Education", count: 456 },
                  { name: "Live Trading", count: 123 },
                  { name: "General", count: 332 }
                ].map((category, index) => (
                  <button
                    key={index}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="secondary">{category.count}</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Top Contributors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Contributors</CardTitle>
                <CardDescription>This week</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "TradeExpert", posts: 45, avatar: "🥇" },
                  { name: "ForexMaster", posts: 38, avatar: "🥈" },
                  { name: "RiskPro", posts: 32, avatar: "🥉" }
                ].map((contributor, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{contributor.avatar}</span>
                      <span className="font-medium">{contributor.name}</span>
                    </div>
                    <Badge variant="outline">{contributor.posts} posts</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
