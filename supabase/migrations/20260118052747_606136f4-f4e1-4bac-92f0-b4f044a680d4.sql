-- Create music request queue table
CREATE TABLE public.music_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN ('youtube', 'soundcloud', 'direct')),
    source_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'playing', 'played', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    played_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create current playing track table (singleton for sync)
CREATE TABLE public.music_now_playing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.music_requests(id),
    source_type TEXT NOT NULL,
    source_url TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    current_position INTEGER DEFAULT 0,
    is_playing BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create voice rooms table
CREATE TABLE public.voice_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    room_type TEXT NOT NULL DEFAULT 'push_to_talk' CHECK (room_type IN ('push_to_talk', 'always_on', 'scheduled')),
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 50,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create voice room participants table
CREATE TABLE public.voice_room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.voice_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    is_speaking BOOLEAN DEFAULT false,
    is_muted BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(room_id, user_id)
);

-- Create lounge messages table (real-time chat)
CREATE TABLE public.lounge_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'sticker', 'system')),
    reply_to UUID REFERENCES public.lounge_messages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.music_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_now_playing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_messages ENABLE ROW LEVEL SECURITY;

-- Music requests policies
CREATE POLICY "Anyone can view music requests" ON public.music_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create music requests" ON public.music_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update music requests" ON public.music_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete music requests" ON public.music_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Now playing policies
CREATE POLICY "Anyone can view now playing" ON public.music_now_playing FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage now playing" ON public.music_now_playing FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Voice rooms policies
CREATE POLICY "Anyone can view voice rooms" ON public.voice_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage voice rooms" ON public.voice_rooms FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Voice room participants policies
CREATE POLICY "Anyone can view participants" ON public.voice_room_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join rooms" ON public.voice_room_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own status" ON public.voice_room_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can leave rooms" ON public.voice_room_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Lounge messages policies
CREATE POLICY "Anyone can view lounge messages" ON public.lounge_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can send lounge messages" ON public.lounge_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.lounge_messages FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_now_playing;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lounge_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_room_participants;