import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, GraduationCap, MessageSquare, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getOrderFlowAppUrl } from '@/utils/environment';
interface EconomicSidebarProps {
  className?: string;
}
interface WidgetCard {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  bgColor: string;
  iconBgColor: string;
  iconBorderStyle?: string;
  path: string;
  delay: number;
  fullWidth?: boolean;
  external?: boolean;
}
export default function EconomicSidebar({
  className = ''
}: EconomicSidebarProps) {
  const navigate = useNavigate();
  const widgetCards: WidgetCard[] = [{
    id: 'pattern-stream',
    title: 'Pattern Stream',
    icon: Bell,
    bgColor: 'bg-blue-50/80 dark:bg-blue-950/20',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
    iconBorderStyle: 'border-2 border-dashed border-blue-400 dark:border-blue-600',
    path: '/dashboard/signal-stream',
    delay: 0,
    fullWidth: true
  }, {
    id: 'classroom',
    title: 'Classroom',
    icon: GraduationCap,
    bgColor: 'bg-purple-50/80 dark:bg-purple-950/20',
    iconBgColor: 'bg-purple-100 dark:bg-purple-900/30',
    path: '/dashboard/insight/classroom',
    delay: 0.15
  }, {
    id: 'community',
    title: 'Community',
    icon: MessageSquare,
    bgColor: 'bg-green-50/80 dark:bg-green-950/20',
    iconBgColor: 'bg-green-100 dark:bg-green-900/30',
    path: getOrderFlowAppUrl(),
    external: true,
    delay: 0.3
  }, {
    id: 'tools',
    title: 'Tools',
    icon: Target,
    bgColor: 'bg-orange-50/80 dark:bg-orange-950/20',
    iconBgColor: 'bg-orange-100 dark:bg-orange-900/30',
    iconBorderStyle: 'border-2 border-dashed border-orange-400 dark:border-orange-600',
    path: '/dashboard/journal-xx',
    delay: 0.45,
    fullWidth: true
  }];
  const handleCardClick = (card: WidgetCard) => {
    if (card.external) {
      window.location.href = card.path;
    } else {
      navigate(card.path);
    }
  };
  return <div className={cn('space-y-3', className)}>
      {/* Pattern Stream - Full Width */}
      {widgetCards.filter(card => card.fullWidth && card.id === 'pattern-stream').map(card => <motion.div key={card.id} initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6,
      delay: card.delay,
      ease: [0.22, 1, 0.36, 1]
    }} whileHover={{
      scale: 1.02,
      transition: {
        duration: 0.2
      }
    }} onClick={() => handleCardClick(card)} className="cursor-pointer">
            
          </motion.div>)}

      {/* Education & Community - Grid */}
      <div className="grid grid-cols-2 gap-3">
        {widgetCards.filter(card => !card.fullWidth).map(card => <motion.div key={card.id} initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.6,
        delay: card.delay,
        ease: [0.22, 1, 0.36, 1]
      }} whileHover={{
        scale: 1.05,
        transition: {
          duration: 0.2
        }
      }} onClick={() => handleCardClick(card)} className="cursor-pointer">
              
            </motion.div>)}
      </div>

      {/* Tools - Full Width */}
      {widgetCards.filter(card => card.fullWidth && card.id === 'tools').map(card => <motion.div key={card.id} initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.6,
      delay: card.delay,
      ease: [0.22, 1, 0.36, 1]
    }} whileHover={{
      scale: 1.02,
      transition: {
        duration: 0.2
      }
    }} onClick={() => handleCardClick(card)} className="cursor-pointer">
            
          </motion.div>)}
    </div>;
}