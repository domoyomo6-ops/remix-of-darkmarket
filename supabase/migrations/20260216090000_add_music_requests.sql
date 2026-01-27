CREATE TABLE public.music_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_title TEXT NOT NULL,
  track_url TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'queued')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.music_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their music requests"
  ON public.music_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create music requests"
  ON public.music_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all music requests"
  ON public.music_requests
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update music requests"
  ON public.music_requests
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
