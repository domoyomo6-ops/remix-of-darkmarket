import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Users, TrendingUp, Clock, Pin, Lock, 
  Heart, Reply, Eye, Plus, Search, Filter, Swords,
  Lightbulb, HelpCircle, Coffee, Send, Smile, Crown,
  Trophy, Flame, Target, ArrowLeft
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
}

interface Thread {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  views_count: number;
  replies_count: number;
  created_at: string;
  last_reply_at: string;
  user_avatar?: {
    display_name: string;
    avatar_url: string;
    title: string;
    level: number;
  };
}

interface ForumReply {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  user_avatar?: {
    display_name: string;
    avatar_url: string;
    title: string;
    level: number;
  };
}

interface Sticker {
  id: string;
  name: string;
  emoji: string;
  category: string;
  price: number;
  is_premium: boolean;
}

interface WagerChallenge {
  id: string;
  challenger_id: string;
  challenged_id: string | null;
  game_type: string;
  wager_amount: number;
  message: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'message-square': <MessageSquare className="w-5 h-5" />,
  'swords': <Swords className="w-5 h-5" />,
  'lightbulb': <Lightbulb className="w-5 h-5" />,
  'help-circle': <HelpCircle className="w-5 h-5" />,
  'coffee': <Coffee className="w-5 h-5" />,
};

export default function Forum() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [challenges, setChallenges] = useState<WagerChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newReply, setNewReply] = useState('');
  const [showNewThread, setShowNewThread] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [onlineUsers] = useState(Math.floor(Math.random() * 50) + 10);

  useEffect(() => {
    fetchCategories();
    fetchStickers();
    fetchChallenges();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchThreads(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedThread) {
      fetchReplies(selectedThread.id);
    }
  }, [selectedThread]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('forum_categories')
      .select('*')
      .order('sort_order');
    if (data) setCategories(data);
    setLoading(false);
  };

  const fetchThreads = async (categoryId: string) => {
    const { data } = await supabase
      .from('forum_threads')
      .select('*')
      .eq('category_id', categoryId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setThreads(data);
  };

  const fetchReplies = async (threadId: string) => {
    const { data } = await supabase
      .from('forum_replies')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at');
    if (data) setReplies(data);
  };

  const fetchStickers = async () => {
    const { data } = await supabase.from('stickers').select('*');
    if (data) setStickers(data);
  };

  const fetchChallenges = async () => {
    const { data } = await supabase
      .from('wager_challenges')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setChallenges(data);
  };

  const createThread = async () => {
    if (!user || !selectedCategory || !newThreadTitle.trim() || !newThreadContent.trim()) return;
    
    const { error } = await supabase.from('forum_threads').insert({
      category_id: selectedCategory,
      user_id: user.id,
      title: newThreadTitle,
      content: newThreadContent,
    });

    if (error) {
      toast.error('Failed to create thread');
    } else {
      toast.success('Thread created!');
      setNewThreadTitle('');
      setNewThreadContent('');
      setShowNewThread(false);
      fetchThreads(selectedCategory);
    }
  };

  const postReply = async () => {
    if (!user || !selectedThread || !newReply.trim()) return;

    const { error } = await supabase.from('forum_replies').insert({
      thread_id: selectedThread.id,
      user_id: user.id,
      content: newReply,
    });

    if (error) {
      toast.error('Failed to post reply');
    } else {
      toast.success('Reply posted!');
      setNewReply('');
      fetchReplies(selectedThread.id);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Thread detail view
  if (selectedThread) {
    return (
      <MainLayout>
        <div className="min-h-screen py-6 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Back button */}
            <button
              onClick={() => setSelectedThread(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-mono text-sm">Back to threads</span>
            </button>

            {/* Thread */}
            <div className="panel-3d rounded-lg p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-2xl">
                  👤
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-primary font-bold">Anonymous</span>
                    {user?.id === selectedThread.user_id && (
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-mono">
                        {isAdmin ? 'ADMIN' : 'YOU'}
                      </span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-mono">LVL 1</span>
                  </div>
                  <h1 className="text-xl font-bold text-foreground mb-4">{selectedThread.title}</h1>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedThread.content}</p>
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {selectedThread.views_count} views
                    </span>
                    <span className="flex items-center gap-1">
                      <Reply className="w-4 h-4" />
                      {selectedThread.replies_count} replies
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTime(selectedThread.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Replies */}
            <div className="space-y-4 mb-6">
              {replies.map((reply) => (
                <div key={reply.id} className="panel-3d rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center text-xl">
                      👤
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-primary text-sm">Anonymous</span>
                        {user?.id === reply.user_id && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-mono">
                            {isAdmin ? 'ADMIN' : 'YOU'}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{formatTime(reply.created_at)}</span>
                      </div>
                      <p className="text-muted-foreground text-sm">{reply.content}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <button className="flex items-center gap-1 text-muted-foreground hover:text-red-400 transition-colors text-xs">
                          <Heart className="w-3.5 h-3.5" />
                          {reply.likes_count}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply form */}
            <div className="panel-3d rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 bg-black/50 border-primary/30 min-h-[100px]"
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => setShowStickers(!showStickers)}
                  className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  <Smile className="w-4 h-4" />
                  Stickers
                </button>
                <Button onClick={postReply} className="crt-button">
                  <Send className="w-4 h-4 mr-2" />
                  Post Reply
                </Button>
              </div>
              
              {showStickers && (
                <div className="mt-4 p-4 bg-black/30 rounded-lg">
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {stickers.map((sticker) => (
                      <button
                        key={sticker.id}
                        onClick={() => setNewReply(prev => prev + sticker.emoji)}
                        className="text-2xl hover:scale-125 transition-transform p-2 rounded hover:bg-primary/10"
                        title={sticker.name}
                      >
                        {sticker.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen py-6 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary terminal-glow font-mono">
                [ LOUNGE://MAINFRAME ]
              </h1>
              <p className="text-muted-foreground mt-1">Settle in, share threads, and keep the lounge alive.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-muted-foreground font-mono">{onlineUsers} online</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main content */}
            <div className="lg:col-span-3">
              <Tabs defaultValue="categories" className="w-full">
                <TabsList className="w-full bg-black/50 border border-primary/30 mb-6">
                  <TabsTrigger value="categories" className="flex-1 font-mono">Categories</TabsTrigger>
                  <TabsTrigger value="trending" className="flex-1 font-mono">Trending</TabsTrigger>
                  <TabsTrigger value="challenges" className="flex-1 font-mono">Challenges</TabsTrigger>
                </TabsList>

                <TabsContent value="categories">
                  {!selectedCategory ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className="panel-3d rounded-lg p-5 text-left hover:border-primary/50 transition-all group"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary/30 transition-colors">
                              {categoryIcons[cat.icon] || <MessageSquare className="w-5 h-5" />}
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                                {cat.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">{cat.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {/* Category header */}
                      <div className="flex items-center justify-between mb-6">
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span className="font-mono text-sm">All Categories</span>
                        </button>
                        <Dialog open={showNewThread} onOpenChange={setShowNewThread}>
                          <DialogTrigger asChild>
                            <Button className="crt-button">
                              <Plus className="w-4 h-4 mr-2" />
                              New Thread
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-zinc-900 border-primary/30">
                            <DialogHeader>
                              <DialogTitle className="text-primary font-mono">Create New Thread</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <Input
                                value={newThreadTitle}
                                onChange={(e) => setNewThreadTitle(e.target.value)}
                                placeholder="Thread title..."
                                className="bg-black/50 border-primary/30"
                              />
                              <Textarea
                                value={newThreadContent}
                                onChange={(e) => setNewThreadContent(e.target.value)}
                                placeholder="Write your post..."
                                className="bg-black/50 border-primary/30 min-h-[150px]"
                              />
                              <Button onClick={createThread} className="w-full crt-button">
                                Create Thread
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Threads list */}
                      <div className="space-y-3">
                        {threads.length === 0 ? (
                          <div className="panel-3d rounded-lg p-8 text-center">
                            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No threads yet. Be the first to post!</p>
                          </div>
                        ) : (
                          threads.map((thread) => (
                            <button
                              key={thread.id}
                              onClick={() => setSelectedThread(thread)}
                              className="w-full panel-3d rounded-lg p-4 text-left hover:border-primary/50 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-xl shrink-0">
                                  👤
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {thread.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-400" />}
                                    {thread.is_locked && <Lock className="w-3.5 h-3.5 text-red-400" />}
                                    <h3 className="font-bold text-foreground truncate">{thread.title}</h3>
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate mt-1">{thread.content}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Eye className="w-3 h-3" />
                                      {thread.views_count}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Reply className="w-3 h-3" />
                                      {thread.replies_count}
                                    </span>
                                    <span>{formatTime(thread.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="trending">
                  <div className="panel-3d rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <Flame className="w-6 h-6 text-orange-400" />
                      <h2 className="text-xl font-bold">Hot Topics</h2>
                    </div>
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-black/30 hover:bg-black/50 transition-colors cursor-pointer">
                          <span className="text-2xl font-bold text-primary/50">#{i}</span>
                          <div>
                            <h3 className="font-bold text-foreground">Sample trending topic {i}</h3>
                            <p className="text-sm text-muted-foreground">{Math.floor(Math.random() * 100)} replies • {Math.floor(Math.random() * 500)} views</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="challenges">
                  <div className="panel-3d rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Target className="w-6 h-6 text-red-400" />
                        <h2 className="text-xl font-bold">Open Challenges</h2>
                      </div>
                      <Button className="crt-button">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Challenge
                      </Button>
                    </div>
                    
                    {challenges.length === 0 ? (
                      <div className="text-center py-8">
                        <Swords className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No open challenges. Create one!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {challenges.map((challenge) => (
                          <div key={challenge.id} className="p-4 rounded-lg bg-black/30 border border-primary/20">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary font-mono uppercase">
                                  {challenge.game_type}
                                </span>
                                <p className="mt-2 text-foreground">{challenge.message || 'Open challenge!'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-primary">${challenge.wager_amount}</p>
                                <Button size="sm" variant="outline" className="mt-2 border-primary/30">
                                  Accept
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Leaderboard */}
              <div className="panel-3d rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-foreground">Top Players</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'CryptoKing', score: 15420, rank: 1 },
                    { name: 'DarkMaster', score: 12350, rank: 2 },
                    { name: 'NightOwl', score: 9870, rank: 3 },
                    { name: 'ShadowX', score: 8540, rank: 4 },
                    { name: 'GhostRider', score: 7210, rank: 5 },
                  ].map((player) => (
                    <div key={player.rank} className="flex items-center gap-3 p-2 rounded bg-black/30">
                      <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold
                        ${player.rank === 1 ? 'bg-amber-500 text-black' : 
                          player.rank === 2 ? 'bg-gray-400 text-black' :
                          player.rank === 3 ? 'bg-amber-700 text-white' : 'bg-zinc-700'}`}>
                        {player.rank}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-mono text-foreground">{player.name}</p>
                      </div>
                      <span className="text-xs text-primary font-mono">{player.score.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticker shop preview */}
              <div className="panel-3d rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Smile className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Stickers</h3>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {stickers.slice(0, 10).map((sticker) => (
                    <div
                      key={sticker.id}
                      className="aspect-square flex items-center justify-center text-2xl bg-black/30 rounded hover:bg-primary/20 transition-colors cursor-pointer"
                      title={`${sticker.name} - ${sticker.price > 0 ? `$${sticker.price}` : 'Free'}`}
                    >
                      {sticker.emoji}
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full border-primary/30 text-primary hover:bg-primary/10">
                  View All Stickers
                </Button>
              </div>

              {/* Quick stats */}
              <div className="panel-3d rounded-lg p-4">
                <h3 className="font-bold text-foreground mb-4">Forum Stats</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Threads</span>
                    <span className="text-primary font-mono">{threads.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Categories</span>
                    <span className="text-primary font-mono">{categories.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Online Now</span>
                    <span className="text-primary font-mono">{onlineUsers}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
