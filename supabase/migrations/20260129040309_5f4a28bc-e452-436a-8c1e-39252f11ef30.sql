-- Update purchase_with_wallet to mark product as inactive after purchase
CREATE OR REPLACE FUNCTION public.purchase_with_wallet(p_product_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    RETURN jsonb_build_object('success', false, 'error', 'Product not found or already sold');
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
  
  -- Mark product as inactive (sold)
  UPDATE public.products SET is_active = false, updated_at = now() WHERE id = p_product_id;
  
  -- Log transaction
  INSERT INTO public.wallet_transactions (user_id, amount, type, payment_method, description)
  VALUES (v_user_id, v_product.price, 'purchase', 'wallet', 'Purchase: ' || v_product.title);
  
  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'new_balance', v_new_balance);
END;
$function$;