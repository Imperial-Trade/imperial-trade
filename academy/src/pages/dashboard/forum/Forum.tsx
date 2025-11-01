
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Users, TrendingUp, Search, Plus } from 'lucide-react';

export default function Forum() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Categories', count: 156 },
    { id: 'trading', name: 'Trading Strategies', count: 45 },
    { id: 'analysis', name: 'Market Analysis', count: 32 },
    { id: 'education', name: 'Education', count: 28 },
    { id: 'signals', name: 'Signal Discussion', count: 51 }
  ];

  const posts = [
    {
      id: 1,
      title: 'Best practices for risk management in volatile markets',
      author: 'TradingPro',
      category: 'trading',
      replies: 24,
      likes: 56,
      lastActivity: '2 hours ago',
      isPinned: true
    },
    {
      id: 2,
      title: 'EUR/USD Technical Analysis - Weekly Outlook',
      author: 'MarketAnalyst',
      category: 'analysis',
      replies: 18,
      likes: 32,
      lastActivity: '4 hours ago',
      isPinned: false
    },
    {
      id: 3,
      title: 'Question about position sizing calculations',
      author: 'NewTrader',
      category: 'education',
      replies: 12,
      likes: 15,
      lastActivity: '6 hours ago',
      isPinned: false
    }
  ];

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6 pt-0 lg:pt-20 pb-20 md:pb-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Community Forum</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Connect with fellow traders and share insights</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 min-h-[44px] touch-manipulation self-start sm:self-auto">
            <Plus className="h-3 h-3 sm:h-4 sm:w-4 mr-2" />
            New Post
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <MessageCircle className="h-3 h-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm font-medium">Active Members</CardTitle>
              <Users className="h-3 h-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-xl sm:text-2xl font-bold">567</div>
              <p className="text-xs text-muted-foreground">+8% from last month</p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-sm font-medium">Trending Topic</CardTitle>
              <TrendingUp className="h-3 h-3 sm:h-4 sm:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-lg font-bold">Risk Management</div>
              <p className="text-xs text-muted-foreground">Most discussed this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 h-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              placeholder="Search discussions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 sm:pl-10 min-h-[44px]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap min-h-[44px] touch-manipulation text-xs sm:text-sm"
              >
                {category.name} ({category.count})
              </Button>
            ))}
          </div>
        </div>

        {/* Forum Posts */}
        <div className="space-y-3 sm:space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow touch-manipulation">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 mb-2 flex-wrap">
                      {post.isPinned && (
                        <Badge variant="secondary" className="text-xs">
                          Pinned
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {categories.find(c => c.id === post.category)?.name}
                      </Badge>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2 hover:text-primary cursor-pointer line-clamp-2">
                      {post.title}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span>by {post.author}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{post.lastActivity}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {post.replies}
                        </span>
                        <span className="flex items-center gap-1">
                          ❤️ {post.likes}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center">
          <Button variant="outline" className="min-h-[44px] touch-manipulation">Load More Posts</Button>
        </div>
      </div>
    </div>
  );
}
