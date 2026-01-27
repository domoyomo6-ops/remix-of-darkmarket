-- Extend products table with card metadata fields
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS bin TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS expire TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS card_type TEXT,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS bank TEXT;

-- Create user wallets table
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on user_wallets
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_wallets
CREATE POLICY "Users can view own wallet"
ON public.user_wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all wallets"
ON public.user_wallets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create wallet transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup', 'purchase', 'refund', 'admin_credit', 'admin_debit')),
  payment_method TEXT,
  payment_reference TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for wallet_transactions
CREATE POLICY "Users can view own transactions"
ON public.wallet_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions"
ON public.wallet_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create payment settings table
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT NOT NULL,
  configuration JSONB DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on payment_settings
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_settings
CREATE POLICY "Anyone can view enabled payment settings"
ON public.payment_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage payment settings"
ON public.payment_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default payment methods
INSERT INTO public.payment_settings (payment_method, display_name, sort_order) VALUES
  ('stripe', 'Stripe', 1),
  ('authorize_net', 'Authorize.net', 2),
  ('cashapp', 'Cash App', 3),
  ('telegram_stars', 'Telegram Stars', 4),
  ('wallet', 'Wallet Balance', 5)
ON CONFLICT (payment_method) DO NOTHING;

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_user_wallets_updated_at
BEFORE UPDATE ON public.user_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON public.payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create RPC function to get or create user wallet
CREATE OR REPLACE FUNCTION public.get_or_create_wallet(p_user_id UUID)
RETURNS public.user_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.user_wallets;
BEGIN
  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = p_user_id;
  
  IF v_wallet IS NULL THEN
    INSERT INTO public.user_wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;
  
  RETURN v_wallet;
END;
$$;

-- Create RPC function for admin to adjust wallet balance
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  p_target_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_wallet public.user_wallets;
  v_new_balance NUMERIC;
BEGIN
  v_admin_id := auth.uid();
  
  -- Check if caller is admin
  IF NOT has_role(v_admin_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;
  
  -- Validate type
  IF p_type NOT IN ('admin_credit', 'admin_debit') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid transaction type');
  END IF;
  
  -- Get or create wallet
  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = p_target_user_id;
  IF v_wallet IS NULL THEN
    INSERT INTO public.user_wallets (user_id, balance)
    VALUES (p_target_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;
  
  -- Calculate new balance
  IF p_type = 'admin_credit' THEN
    v_new_balance := v_wallet.balance + ABS(p_amount);
  ELSE
    v_new_balance := v_wallet.balance - ABS(p_amount);
  END IF;
  
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance for debit');
  END IF;
  
  -- Update wallet balance
  UPDATE public.user_wallets SET balance = v_new_balance WHERE user_id = p_target_user_id;
  
  -- Log transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, payment_method, description)
  VALUES (p_target_user_id, ABS(p_amount), p_type, 'admin', p_description);
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- Create RPC function to process wallet purchase
CREATE OR REPLACE FUNCTION public.purchase_with_wallet(p_product_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_product RECORD;
  v_wallet RECORD;
  v_new_balance NUMERIC;
  v_order_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Get product
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND is_active = true;
  IF v_product IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found or inactive');
  END IF;
  
  -- Check if already purchased
  IF EXISTS (SELECT 1 FROM public.orders WHERE user_id = v_user_id AND product_id = p_product_id AND status = 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already own this product');
  END IF;
  
  -- Get wallet
  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = v_user_id;
  IF v_wallet IS NULL OR v_wallet.balance < v_product.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;
  
  -- Deduct from wallet
  v_new_balance := v_wallet.balance - v_product.price;
  UPDATE public.user_wallets SET balance = v_new_balance WHERE user_id = v_user_id;
  
  -- Create order
  INSERT INTO public.orders (user_id, product_id, amount, status, customer_email)
  SELECT v_user_id, p_product_id, v_product.price, 'completed', email
  FROM public.profiles WHERE user_id = v_user_id
  RETURNING id INTO v_order_id;
  
  -- Log transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, payment_method, description)
  VALUES (v_user_id, v_product.price, 'purchase', 'wallet', 'Purchase: ' || v_product.title);
  
  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'new_balance', v_new_balance);
END;
$$;

-- Create RPC function to add balance after successful payment
CREATE OR REPLACE FUNCTION public.add_wallet_balance(
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_payment_reference TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_wallet RECORD;
  v_new_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;
  
  -- Get or create wallet
  SELECT * INTO v_wallet FROM public.user_wallets WHERE user_id = v_user_id;
  IF v_wallet IS NULL THEN
    INSERT INTO public.user_wallets (user_id, balance)
    VALUES (v_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;
  
  -- Add balance
  v_new_balance := v_wallet.balance + p_amount;
  UPDATE public.user_wallets SET balance = v_new_balance WHERE user_id = v_user_id;
  
  -- Log transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, payment_method, payment_reference)
  VALUES (v_user_id, p_amount, 'topup', p_payment_method, p_payment_reference);
  
  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;