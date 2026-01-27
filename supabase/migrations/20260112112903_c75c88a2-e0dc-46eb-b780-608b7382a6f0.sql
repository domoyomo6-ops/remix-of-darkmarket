-- Avatar Items (frames, profile pics, badges users can unlock)
CREATE TABLE public.avatar_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('frame', 'picture', 'badge')),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  unlock_type TEXT NOT NULL DEFAULT 'purchase' CHECK (unlock_type IN ('purchase', 'level', 'achievement', 'event')),
  unlock_requirement JSONB DEFAULT '{}',
  price NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User unlocked avatar items
CREATE TABLE public.user_avatar_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.avatar_items(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Update user_avatars to track equipped items
ALTER TABLE public.user_avatars
ADD COLUMN IF NOT EXISTS equipped_frame UUID REFERENCES public.avatar_items(id),
ADD COLUMN IF NOT EXISTS equipped_picture UUID REFERENCES public.avatar_items(id),
ADD COLUMN IF NOT EXISTS equipped_badges UUID[] DEFAULT '{}';

-- Support Chat Messages (user <-> admin)
CREATE TABLE public.support_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'telegram')),
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  file_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Support chat settings (queue, availability)
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS support_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS support_queue_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS support_status TEXT DEFAULT 'open' CHECK (support_status IN ('open', 'closed', 'busy'));

-- Crypto Exchange Requests
CREATE TABLE public.crypto_exchange_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('venmo', 'paypal', 'cashapp', 'chime', 'zelle', 'applepay', 'googlepay')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  fee_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  crypto_address TEXT,
  crypto_type TEXT DEFAULT 'bitcoin',
  payment_proof_url TEXT,
  payment_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_proof', 'processing', 'completed', 'declined')),
  admin_notes TEXT,
  admin_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Music Playlists
CREATE TABLE public.user_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.user_playlists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  url TEXT NOT NULL,
  duration INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avatar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_avatar_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Avatar items policies (public read, admin write)
CREATE POLICY "Anyone can view avatar items" ON public.avatar_items FOR SELECT USING (true);
CREATE POLICY "Admins can manage avatar items" ON public.avatar_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User avatar items policies
CREATE POLICY "Users can view their unlocked items" ON public.user_avatar_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can unlock items" ON public.user_avatar_items FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Support chat policies
CREATE POLICY "Users can view their chats" ON public.support_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create chats" ON public.support_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all chats" ON public.support_chats FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update chats" ON public.support_chats FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Support messages policies
CREATE POLICY "Users can view their chat messages" ON public.support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_chats WHERE id = chat_id AND user_id = auth.uid())
);
CREATE POLICY "Users can send messages in their chats" ON public.support_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.support_chats WHERE id = chat_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all messages" ON public.support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can send messages" ON public.support_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update messages" ON public.support_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Crypto exchange policies
CREATE POLICY "Users can view their exchange requests" ON public.crypto_exchange_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create exchange requests" ON public.crypto_exchange_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their pending requests" ON public.crypto_exchange_requests FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins can view all exchange requests" ON public.crypto_exchange_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update exchange requests" ON public.crypto_exchange_requests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Playlist policies
CREATE POLICY "Users can view their playlists" ON public.user_playlists FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can create playlists" ON public.user_playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their playlists" ON public.user_playlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their playlists" ON public.user_playlists FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their playlist tracks" ON public.playlist_tracks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_playlists WHERE id = playlist_id AND user_id = auth.uid())
);
CREATE POLICY "Anyone can view public playlist tracks" ON public.playlist_tracks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_playlists WHERE id = playlist_id AND is_public = true)
);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crypto_exchange_requests;

-- Insert default avatar items
INSERT INTO public.avatar_items (type, name, description, rarity, unlock_type, price) VALUES
('frame', 'Default Frame', 'Basic profile frame', 'common', 'purchase', 0),
('frame', 'Neon Green', 'Glowing green terminal frame', 'rare', 'purchase', 5),
('frame', 'Cyber Gold', 'Premium golden cyber frame', 'epic', 'purchase', 15),
('frame', 'Legendary Fire', 'Animated fire frame', 'legendary', 'level', 0),
('picture', 'Hacker', 'Anonymous hacker avatar', 'common', 'purchase', 0),
('picture', 'Skull', 'Digital skull avatar', 'rare', 'purchase', 3),
('picture', 'Robot', 'Cybernetic robot avatar', 'epic', 'purchase', 10),
('picture', 'Ghost', 'Ethereal ghost avatar', 'legendary', 'achievement', 0),
('badge', 'Newbie', 'First day on HELL5TAR', 'common', 'achievement', 0),
('badge', 'Gambler', 'Won 10 games', 'rare', 'achievement', 0),
('badge', 'Whale', 'Spent $100+', 'epic', 'achievement', 0),
('badge', 'VIP', 'Exclusive VIP member', 'legendary', 'event', 0),
('badge', 'OG', 'Early adopter', 'legendary', 'event', 0);