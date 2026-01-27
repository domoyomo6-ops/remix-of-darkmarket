-- Create game types enum
CREATE TYPE game_type AS ENUM ('dice', 'blackjack', 'roulette', 'coinflip');

-- Create game status enum
CREATE TYPE game_status AS ENUM ('waiting', 'in_progress', 'completed', 'cancelled');

-- Create lobby type enum
CREATE TYPE lobby_type AS ENUM ('1v1', '2v2', 'vs_house', 'spectate');

-- Game sessions table
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_type game_type NOT NULL,
  lobby_type lobby_type NOT NULL DEFAULT 'vs_house',
  status game_status NOT NULL DEFAULT 'waiting',
  host_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wager_amount NUMERIC NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  game_data JSONB DEFAULT '{}',
  max_players INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Game participants table
CREATE TABLE public.game_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wager_amount NUMERIC NOT NULL DEFAULT 0,
  is_spectator BOOLEAN NOT NULL DEFAULT false,
  result JSONB DEFAULT '{}',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);

-- Product drops table (for admin product giveaways)
CREATE TABLE public.product_drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  max_claims INTEGER DEFAULT 1,
  claims_count INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Drop claims table
CREATE TABLE public.drop_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drop_id UUID NOT NULL REFERENCES public.product_drops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(drop_id, user_id)
);

-- Advertisement slots table
CREATE TABLE public.ad_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  link_url TEXT,
  slot_position TEXT NOT NULL DEFAULT 'banner',
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drop_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_slots ENABLE ROW LEVEL SECURITY;

-- Game sessions policies
CREATE POLICY "Anyone can view active game sessions" ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "Users can create game sessions" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Admins can manage all game sessions" ON public.game_sessions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Game participants policies
CREATE POLICY "Anyone can view game participants" ON public.game_participants FOR SELECT USING (true);
CREATE POLICY "Users can join games" ON public.game_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all participants" ON public.game_participants FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Product drops policies
CREATE POLICY "Anyone can view active drops" ON public.product_drops FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage drops" ON public.product_drops FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop claims policies
CREATE POLICY "Users can view own claims" ON public.drop_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can claim drops" ON public.drop_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all claims" ON public.drop_claims FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Ad slots policies
CREATE POLICY "Anyone can view active ads" ON public.ad_slots FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage ads" ON public.ad_slots FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for game sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_participants;

-- Create function to place wager and join game
CREATE OR REPLACE FUNCTION public.place_game_wager(p_game_id UUID, p_wager_amount NUMERIC, p_is_spectator BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
  v_game RECORD;
  v_new_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get game
  SELECT * INTO v_game FROM public.game_sessions WHERE id = p_game_id;
  IF v_game IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  IF v_game.status != 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game already started');
  END IF;
  
  -- For spectators, no wager needed
  IF p_is_spectator THEN
    INSERT INTO public.game_participants (game_id, user_id, wager_amount, is_spectator)
    VALUES (p_game_id, v_user_id, 0, true)
    ON CONFLICT (game_id, user_id) DO NOTHING;
    RETURN jsonb_build_object('success', true);
  END IF;
  
  -- Validate wager matches game wager
  IF p_wager_amount != v_game.wager_amount AND v_game.wager_amount > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wager must match game wager: $' || v_game.wager_amount);
  END IF;
  
  -- Get wallet
  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = v_user_id;
  IF v_wallet IS NULL OR v_wallet.balance < p_wager_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;
  
  -- Deduct wager from wallet
  v_new_balance := v_wallet.balance - p_wager_amount;
  UPDATE public.user_wallets SET balance = v_new_balance WHERE user_id = v_user_id;
  
  -- Add participant
  INSERT INTO public.game_participants (game_id, user_id, wager_amount, is_spectator)
  VALUES (p_game_id, v_user_id, p_wager_amount, false)
  ON CONFLICT (game_id, user_id) DO UPDATE SET wager_amount = p_wager_amount;
  
  -- Log transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, payment_method, description)
  VALUES (v_user_id, p_wager_amount, 'wager', 'wallet', 'Game wager: ' || v_game.game_type);
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- Create function to resolve game and payout winner
CREATE OR REPLACE FUNCTION public.resolve_game(p_game_id UUID, p_winner_id UUID, p_game_data JSONB DEFAULT '{}')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_game RECORD;
  v_total_pot NUMERIC;
  v_winner_wallet RECORD;
  v_new_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();
  
  -- Get game
  SELECT * INTO v_game FROM public.game_sessions WHERE id = p_game_id;
  IF v_game IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;
  
  -- Only host or admin can resolve
  IF v_game.host_id != v_user_id AND NOT has_role(v_user_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  -- Calculate total pot
  SELECT COALESCE(SUM(wager_amount), 0) INTO v_total_pot
  FROM public.game_participants WHERE game_id = p_game_id AND is_spectator = false;
  
  -- Update game status
  UPDATE public.game_sessions 
  SET status = 'completed', winner_id = p_winner_id, game_data = p_game_data, completed_at = now()
  WHERE id = p_game_id;
  
  -- If there's a winner (not house), pay out
  IF p_winner_id IS NOT NULL AND v_total_pot > 0 THEN
    SELECT * INTO v_winner_wallet FROM public.user_wallets WHERE user_id = p_winner_id;
    IF v_winner_wallet IS NOT NULL THEN
      v_new_balance := v_winner_wallet.balance + v_total_pot;
      UPDATE public.user_wallets SET balance = v_new_balance WHERE user_id = p_winner_id;
      
      -- Log winning transaction
      INSERT INTO public.wallet_transactions (user_id, amount, type, payment_method, description)
      VALUES (p_winner_id, v_total_pot, 'winnings', 'game', 'Game winnings: ' || v_game.game_type);
    END IF;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'total_pot', v_total_pot);
END;
$$;

-- Add sample products matching reference image
INSERT INTO public.products (title, bin, city, state, zip, expire, country, card_type, brand, bank, price, category, is_active, short_description)
VALUES 
  ('CC Entry', '537993', 'Willis', 'TX', '77318', '01/29', 'USA', '-', '-', '-', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '404602', 'LONGVIEW', 'TX', '75601', '03/27', 'USA', '-', '-', '-', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '403163', 'Morgantown', 'PA', '19543', '06/30', 'USA', '-', '-', '-', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '435173', 'Saint Louis', 'MO', '63135', '05/26', 'USA', '-', '-', '-', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '533248', 'Richboro', 'PA', '18954', '05/29', 'USA', 'prepaid', 'Mastercard Prepaid Govt', 'Comerica Bank', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '403163', 'Buffalo', 'NY', '14212', '10/29', 'USA', '-', '-', '-', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '409758', 'Stony Point', 'NC', '28678', '08/32', 'USA', 'prepaid', 'Visa Classic', 'Pathward, N.A.', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '409758', 'Leander', 'TX', '78641', '06/30', 'USA', 'prepaid', 'Visa Classic', 'Pathward, N.A.', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '409758', 'Odessa', 'TX', '79762', '10/30', 'USA', 'prepaid', 'Visa Classic', 'Pathward, N.A.', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '462406', 'Birmingham', 'AL', '98198', '01/27', 'USA', '-', '-', '-', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '426428', 'Houston', 'TX', '77096', '01/28', 'USA', '-', '-', '-', 1.00, 'software', true, 'Second Hand'),
  ('CC Entry', '512345', 'Miami', 'FL', '33101', '02/28', 'USA', 'prepaid', 'Visa Classic', 'Chase Bank', 2.50, 'software', true, 'Second Hand'),
  ('CC Entry', '523456', 'Denver', 'CO', '80201', '04/29', 'USA', 'prepaid', 'Mastercard', 'Wells Fargo', 2.50, 'software', true, 'Second Hand'),
  ('CC Entry', '534567', 'Seattle', 'WA', '98101', '06/30', 'USA', '-', '-', '-', 2.50, 'software', true, 'Second Hand'),
  ('CC Entry', '545678', 'Portland', 'OR', '97201', '08/29', 'USA', 'prepaid', 'Visa Classic', 'US Bank', 2.50, 'software', true, 'Second Hand')
ON CONFLICT DO NOTHING;