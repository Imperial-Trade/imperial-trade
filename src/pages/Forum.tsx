
import React, { useState, useEffect } from "react";
import { ForumPost, Reply } from "@/api/entities";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Plus, 
  Search, 
  ThumbsUp, 
  MessageCircle, 
  TrendingUp,
  HelpCircle,
  BarChart3,
  Newspaper,
  Target,
  Clock,
  User as UserIcon
} from "lucide-react";

const categories = [
  { id: "all", name: "All Posts", icon: MessageSquare },
  { id: "discussion", name: "Discussion", icon: MessageSquare },
  { id: "question", name: "Questions", icon: HelpCircle },
  { id: "analysis", name: "Analysis", icon: BarChart3 },
  { id: "news", name: "News", icon: Newspaper },
  { id: "strategy", name: "Strategy", icon: Target }
];

const categoryColors = {
  discussion: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  question: "bg-green-500/10 text-green-400 border-green-500/20", 
  analysis: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  news: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  strategy: "bg-red-500/10 text-red-400 border-red-500/20"
};

export default function Forum() {
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [newPost, setNewPost] = useState({ title: "", content: "", category: "discussion" });
  const [newReply, setNewReply] = useState("");
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [fetchedPosts, fetchedReplies] = await Promise.all([
        ForumPost.list("-created_date"),
        Reply.list("-created_date")
      ]);
      
      // Get current user from Supabase auth
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      setPosts(fetchedPosts);
      setReplies(fetchedReplies);
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading forum data:", error);
    }
    setIsLoading(false);
  };

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    
    try {
      await ForumPost.create(newPost);
      setNewPost({ title: "", content: "", category: "discussion" });
      setShowNewPostForm(false);
      loadData();
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const handleCreateReply = async () => {
    if (!newReply.trim() || !selectedPost) return;
    
    try {
      await Reply.create({
        post_id: selectedPost.id,
        content: newReply
      });
      setNewReply("");
      loadData();
    } catch (error) {
      console.error("Error creating reply:", error);
    }
  };

  const getPostReplies = (postId) => {
    return replies.filter(reply => reply.post_id === postId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const PostCard = ({ post }) => {
    const postReplies = getPostReplies(post.id);
    
    return (
      <Card 
        className="glass-effect hover:border-accent-green transition-all duration-300 cursor-pointer"
        onClick={() => setSelectedPost(post)}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">{post.title}</h3>
                <p className="text-sm text-secondary">
                  by {post.created_by} • {formatDate(post.created_date)}
                </p>
              </div>
            </div>
            <Badge className={`${categoryColors[post.category]} border`}>
              {post.category}
            </Badge>
          </div>
          
          <p className="text-secondary mb-4 line-clamp-3">{post.content}</p>
          
          <div className="flex items-center gap-4 text-sm text-secondary">
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              <span>{post.likes || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{postReplies.length} replies</span>
            </div>
          </div>
          
          {post.tags && post.tags.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {post.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs border-default text-secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const PostDetail = ({ post, onClose }) => {
    const postReplies = getPostReplies(post.id);
    
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full max-h-full overflow-auto">
          <Card className="glass-effect border-default">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-primary mb-2">{post.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-secondary">
                    <span>by {post.created_by}</span>
                    <span>{formatDate(post.created_date)}</span>
                    <Badge className={`${categoryColors[post.category]} border`}>
                      {post.category}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" onClick={onClose} className="text-primary hover:bg-surface">
                  ✕
                </Button>
              </div>
              
              <div className="mb-6">
                <p className="text-secondary whitespace-pre-wrap">{post.content}</p>
              </div>
              
              <div className="flex items-center gap-4 mb-6 text-sm">
                <Button variant="outline" size="sm" className="border-default text-secondary hover:bg-surface hover:text-primary">
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  Like ({post.likes || 0})
                </Button>
              </div>
              
              {/* Replies Section */}
              <div className="border-t border-default pt-6">
                <h3 className="text-lg font-semibold text-primary mb-4">
                  Replies ({postReplies.length})
                </h3>
                
                <div className="space-y-4 mb-6">
                  {postReplies.map((reply) => (
                    <div key={reply.id} className="p-4 bg-surface/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center">
                          <UserIcon className="w-4 h-4 text-secondary" />
                        </div>
                        <span className="text-sm text-secondary">{reply.created_by}</span>
                        <span className="text-xs text-secondary/70">{formatDate(reply.created_date)}</span>
                      </div>
                      <p className="text-secondary">{reply.content}</p>
                    </div>
                  ))}
                </div>
                
                {/* Reply Form */}
                {user ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Write your reply..."
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      className="bg-surface border-default text-primary placeholder-secondary"
                    />
                    <Button 
                      onClick={handleCreateReply}
                      className="bg-accent-green hover:bg-green-500 text-white"
                    >
                      Post Reply
                    </Button>
                  </div>
                ) : (
                  <p className="text-secondary text-center py-4">
                    Please log in to reply to this post.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2">
              Community <span className="gold-text-gradient">Forum</span>
            </h1>
            <p className="text-secondary text-lg">
              Share ideas, ask questions, and learn from fellow traders
            </p>
          </div>
          {user && (
            <Button 
              onClick={() => setShowNewPostForm(true)}
              className="bg-accent-green hover:bg-green-500 text-white font-semibold"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Post
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-secondary" />
            <Input
              placeholder="Search discussions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-surface border-default text-primary placeholder-secondary"
            />
          </div>
          
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="bg-surface/50 border-0 flex-wrap h-auto p-2">
              {categories.map((category) => {
                const IconComponent = category.icon;
                return (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="data-[state=active]:bg-accent-green data-[state=active]:text-white text-secondary flex items-center gap-2 m-1"
                  >
                    <IconComponent className="w-4 h-4" />
                    {category.name}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <Card key={index} className="glass-effect animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-surface rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-surface rounded w-48"></div>
                      <div className="h-3 bg-surface rounded w-32"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-surface rounded w-full"></div>
                    <div className="h-3 bg-surface rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <MessageSquare className="w-16 h-16 text-secondary/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">No posts found</h3>
            <p className="text-secondary">
              {searchTerm ? 
                "Try adjusting your search terms or filters." : 
                "Be the first to start a discussion!"
              }
            </p>
          </div>
        )}

        {/* New Post Form Modal */}
        {showNewPostForm && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <Card className="glass-effect border-default w-full max-w-2xl">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-primary">Create New Post</CardTitle>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowNewPostForm(false)}
                    className="text-primary hover:bg-surface"
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Post title..."
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  className="bg-surface border-default text-primary placeholder-secondary"
                />
                <select
                  value={newPost.category}
                  onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                  className="w-full p-3 bg-surface border border-default rounded-lg text-primary"
                >
                  <option value="discussion">Discussion</option>
                  <option value="question">Question</option>
                  <option value="analysis">Analysis</option>
                  <option value="news">News</option>
                  <option value="strategy">Strategy</option>
                </select>
                <Textarea
                  placeholder="Write your post content..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  rows={6}
                  className="bg-surface border-default text-primary placeholder-secondary"
                />
                <div className="flex gap-3 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewPostForm(false)}
                    className="border-default text-secondary hover:bg-surface hover:text-primary"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreatePost}
                    className="bg-accent-green hover:bg-green-500 text-white"
                  >
                    Create Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Post Detail Modal */}
        {selectedPost && (
          <PostDetail 
            post={selectedPost} 
            onClose={() => setSelectedPost(null)} 
          />
        )}
      </div>
    </div>
  );
}
