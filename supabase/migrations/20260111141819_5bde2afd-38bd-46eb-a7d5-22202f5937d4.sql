-- Forum system tables

-- Forum categories
CREATE TABLE public.forum_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'message-square',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum threads
CREATE TABLE public.forum_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMP WITH TIME ZONE,
  last_reply_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Forum replies
CREATE TABLE public.forum_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_best_answer BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User stickers collection
CREATE TABLE public.stickers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  price INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User owned stickers
CREATE TABLE public.user_stickers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sticker_id UUID NOT NULL REFERENCES public.stickers(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sticker_id)
);

-- Forum reactions (likes, etc)
CREATE TABLE public.forum_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_thread_reaction UNIQUE(user_id, thread_id),
  CONSTRAINT unique_reply_reaction UNIQUE(user_id, reply_id)
);

-- Wager challenges between users
CREATE TABLE public.wager_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL,
  challenged_id UUID,
  game_type game_type NOT NULL,
  wager_amount NUMERIC NOT NULL DEFAULT 0,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User profiles extension for avatars and display
CREATE TABLE public.user_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  avatar_url TEXT,
  display_name TEXT,
  bio TEXT,
  title TEXT DEFAULT 'Rookie',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_losses INTEGER DEFAULT 0,
  total_wagered NUMERIC DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leaderboard scores
CREATE TABLE public.leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_type game_type NOT NULL,
  score INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, game_type)
);

-- Enable RLS on all tables
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wager_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Forum categories - everyone can read
CREATE POLICY "Forum categories are viewable by everyone" ON public.forum_categories FOR SELECT USING (true);
CREATE POLICY "Only admins can manage categories" ON public.forum_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Forum threads
CREATE POLICY "Threads are viewable by authenticated users" ON public.forum_threads FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create threads" ON public.forum_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own threads" ON public.forum_threads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own threads" ON public.forum_threads FOR DELETE USING (auth.uid() = user_id);

-- Forum replies
CREATE POLICY "Replies are viewable by authenticated users" ON public.forum_replies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can create replies" ON public.forum_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own replies" ON public.forum_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own replies" ON public.forum_replies FOR DELETE USING (auth.uid() = user_id);

-- Stickers - everyone can view
CREATE POLICY "Stickers are viewable by everyone" ON public.stickers FOR SELECT USING (true);
CREATE POLICY "Only admins can manage stickers" ON public.stickers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User stickers
CREATE POLICY "Users can view own stickers" ON public.user_stickers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can purchase stickers" ON public.user_stickers FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Forum reactions
CREATE POLICY "Reactions are viewable by authenticated users" ON public.forum_reactions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can add reactions" ON public.forum_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.forum_reactions FOR DELETE USING (auth.uid() = user_id);

-- Wager challenges
CREATE POLICY "Challenges viewable by participants" ON public.wager_challenges FOR SELECT USING (
  auth.uid() = challenger_id OR auth.uid() = challenged_id OR challenged_id IS NULL
);
CREATE POLICY "Users can create challenges" ON public.wager_challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "Participants can update challenges" ON public.wager_challenges FOR UPDATE USING (
  auth.uid() = challenger_id OR auth.uid() = challenged_id
);

-- User avatars
CREATE POLICY "Avatars are viewable by everyone" ON public.user_avatars FOR SELECT USING (true);
CREATE POLICY "Users can manage own avatar" ON public.user_avatars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own avatar" ON public.user_avatars FOR UPDATE USING (auth.uid() = user_id);

-- Leaderboard
CREATE POLICY "Leaderboard is viewable by everyone" ON public.leaderboard FOR SELECT USING (true);
CREATE POLICY "System can update leaderboard" ON public.leaderboard FOR ALL USING (auth.uid() IS NOT NULL);

-- Enable realtime for forum
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wager_challenges;

-- Insert default forum categories
INSERT INTO public.forum_categories (name, description, icon, sort_order) VALUES
  ('General', 'General discussion and announcements', 'message-square', 1),
  ('Wagers', 'Challenge other users and schedule matches', 'swords', 2),
  ('Strategies', 'Share tips and winning strategies', 'lightbulb', 3),
  ('Support', 'Get help from the community', 'help-circle', 4),
  ('Off-Topic', 'Random chat and memes', 'coffee', 5);

-- Insert some default stickers
INSERT INTO public.stickers (name, emoji, category, price, is_premium) VALUES
  ('Fire', '🔥', 'reactions', 0, false),
  ('Money', '💰', 'reactions', 0, false),
  ('Crown', '👑', 'status', 50, true),
  ('Skull', '💀', 'reactions', 0, false),
  ('Diamond', '💎', 'status', 100, true),
  ('Rocket', '🚀', 'reactions', 0, false),
  ('100', '💯', 'reactions', 0, false),
  ('Dice', '🎲', 'games', 25, false),
  ('Cards', '🃏', 'games', 25, false),
  ('Trophy', '🏆', 'status', 75, true);