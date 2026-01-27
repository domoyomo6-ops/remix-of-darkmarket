-- Create gift cards table
CREATE TABLE public.gift_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  initial_balance NUMERIC(10,2) NOT NULL,
  created_by UUID NOT NULL,
  claimed_by UUID,
  pass2u_pass_id VARCHAR(100),
  pass2u_model_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'expired', 'depleted')),
  claimed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create gift card transactions table for tracking usage
CREATE TABLE public.gift_card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('redeem', 'spend', 'refund')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for gift_cards
CREATE POLICY "Admins can manage all gift cards"
ON public.gift_cards
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view their claimed gift cards"
ON public.gift_cards
FOR SELECT
USING (claimed_by = auth.uid());

-- Policies for gift_card_transactions
CREATE POLICY "Admins can view all transactions"
ON public.gift_card_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view their own transactions"
ON public.gift_card_transactions
FOR SELECT
USING (user_id = auth.uid());

-- Function to redeem a gift card
CREATE OR REPLACE FUNCTION public.redeem_gift_card(p_code VARCHAR)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift_card RECORD;
  v_user_id UUID := auth.uid();
  v_wallet RECORD;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find the gift card
  SELECT * INTO v_gift_card
  FROM gift_cards
  WHERE code = UPPER(p_code) AND status = 'active';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or already used gift card code');
  END IF;

  -- Check if expired
  IF v_gift_card.expires_at IS NOT NULL AND v_gift_card.expires_at < now() THEN
    UPDATE gift_cards SET status = 'expired' WHERE id = v_gift_card.id;
    RETURN json_build_object('success', false, 'error', 'Gift card has expired');
  END IF;

  -- Check if already claimed by someone else
  IF v_gift_card.claimed_by IS NOT NULL AND v_gift_card.claimed_by != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Gift card already claimed');
  END IF;

  -- Get or create wallet
  SELECT * INTO v_wallet FROM get_or_create_wallet(v_user_id);

  -- Add balance to wallet
  UPDATE user_wallets 
  SET balance = balance + v_gift_card.balance, updated_at = now()
  WHERE user_id = v_user_id;

  -- Record transaction
  INSERT INTO wallet_transactions (user_id, amount, type, description, payment_method)
  VALUES (v_user_id, v_gift_card.balance, 'credit', 'Gift card redemption: ' || p_code, 'gift_card');

  -- Record gift card transaction
  INSERT INTO gift_card_transactions (gift_card_id, user_id, amount, type, description)
  VALUES (v_gift_card.id, v_user_id, v_gift_card.balance, 'redeem', 'Full redemption to wallet');

  -- Update gift card status
  UPDATE gift_cards 
  SET 
    status = 'claimed',
    claimed_by = v_user_id,
    claimed_at = now(),
    balance = 0,
    updated_at = now()
  WHERE id = v_gift_card.id;

  RETURN json_build_object(
    'success', true, 
    'amount', v_gift_card.balance,
    'message', 'Gift card redeemed successfully! $' || v_gift_card.balance || ' added to your wallet.'
  );
END;
$$;

-- Function to generate a unique gift card code
CREATE OR REPLACE FUNCTION public.generate_gift_card_code()
RETURNS VARCHAR(16)
LANGUAGE plpgsql
AS $$
DECLARE
  v_code VARCHAR(16);
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate code like: H5-XXXX-XXXX-XXXX
    v_code := 'H5-' || 
      UPPER(substr(md5(random()::text), 1, 4)) || '-' ||
      UPPER(substr(md5(random()::text), 5, 4)) || '-' ||
      UPPER(substr(md5(random()::text), 9, 4));
    
    SELECT EXISTS(SELECT 1 FROM gift_cards WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_code;
END;
$$;

-- Create index for faster lookups
CREATE INDEX idx_gift_cards_code ON public.gift_cards(code);
CREATE INDEX idx_gift_cards_claimed_by ON public.gift_cards(claimed_by);
CREATE INDEX idx_gift_card_transactions_gift_card ON public.gift_card_transactions(gift_card_id);