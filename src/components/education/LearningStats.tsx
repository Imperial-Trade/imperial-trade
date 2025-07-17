
import React from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Star, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LearningStatsProps {
  learningStreak: number;
  tradingPoints: number;
  tradingIdentityLevel: string;
}

export default function LearningStats({ learningStreak, tradingPoints, tradingIdentityLevel }: LearningStatsProps) {
  const getIdentityIcon = (level: string) => {
    if (level.includes('Expert') || level.includes('Master')) return Trophy;
    if (level.includes('Advanced') || level.includes('Pro')) return Star;
    return TrendingUp;
  };

  const IdentityIcon = getIdentityIcon(tradingIdentityLevel);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Learning Streak</p>
                <p className="text-3xl font-bold text-foreground">{learningStreak}</p>
                <p className="text-sm text-orange-400">days in a row</p>
              </div>
              <div className="p-3 bg-orange-500/20 rounded-full">
                <Flame className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Trading Points</p>
                <p className="text-3xl font-bold text-foreground">{tradingPoints.toLocaleString()}</p>
                <p className="text-sm text-accent">total earned</p>
              </div>
              <div className="p-3 bg-accent/20 rounded-full">
                <Star className="w-8 h-8 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Trading Identity</p>
                <p className="text-lg font-bold text-foreground">{tradingIdentityLevel}</p>
                <p className="text-sm text-primary">current level</p>
              </div>
              <div className="p-3 bg-primary/20 rounded-full">
                <IdentityIcon className="w-8 h-8 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
