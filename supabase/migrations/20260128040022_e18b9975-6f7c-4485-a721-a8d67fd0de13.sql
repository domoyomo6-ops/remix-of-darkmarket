CREATE OR REPLACE FUNCTION public.redeem_gift_card(p_code character varying)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_gift_card RECORD;
  v_user_id UUID := auth.uid();
  v_wallet RECORD;
  v_input_norm TEXT;
  v_code_norm TEXT;
  v_amount NUMERIC;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Normalize input: remove all non-alphanumeric characters and uppercase
  v_input_norm := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');

  IF v_input_norm = '' THEN
    RETURN json_build_object('success', false, 'error', 'Please enter a gift card code');
  END IF;

  -- Find the gift card by normalized code (tolerate dashes/spaces)
  SELECT *
    INTO v_gift_card
  FROM public.gift_cards
  WHERE regexp_replace(upper(code), '[^A-Z0-9]', '', 'g') = v_input_norm
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid gift card code');
  END IF;

  -- If expired, mark expired and stop
  IF v_gift_card.expires_at IS NOT NULL AND v_gift_card.expires_at < now() THEN
    UPDATE public.gift_cards SET status = 'expired', updated_at = now() WHERE id = v_gift_card.id;
    RETURN json_build_object('success', false, 'error', 'Gift card has expired');
  END IF;

  -- If not active, it has already been used/invalidated
  IF v_gift_card.status IS DISTINCT FROM 'active' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Gift card already used (' || coalesce(v_gift_card.status, 'unknown') || ')'
    );
  END IF;

  -- If already claimed by someone else
  IF v_gift_card.claimed_by IS NOT NULL AND v_gift_card.claimed_by != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Gift card already claimed');
  END IF;

  -- No value left
  IF coalesce(v_gift_card.balance, 0) <= 0 THEN
    UPDATE public.gift_cards
    SET status = 'depleted', updated_at = now()
    WHERE id = v_gift_card.id;

    RETURN json_build_object('success', false, 'error', 'Gift card has no remaining balance');
  END IF;

  v_amount := v_gift_card.balance;

  -- Get or create wallet
  SELECT * INTO v_wallet FROM public.get_or_create_wallet(v_user_id);

  -- Add balance to wallet
  UPDATE public.user_wallets
  SET balance = balance + v_amount,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Record wallet transaction
  v_code_norm := v_gift_card.code;
  INSERT INTO public.wallet_transactions (user_id, amount, type, description, payment_method)
  VALUES (v_user_id, v_amount, 'credit', 'Gift card redemption: ' || v_code_norm, 'gift_card');

  -- Record gift card transaction
  INSERT INTO public.gift_card_transactions (gift_card_id, user_id, amount, type, description)
  VALUES (v_gift_card.id, v_user_id, v_amount, 'redeem', 'Full redemption to wallet');

  -- Update gift card status
  UPDATE public.gift_cards
  SET status = 'claimed',
      claimed_by = v_user_id,
      claimed_at = now(),
      balance = 0,
      updated_at = now()
  WHERE id = v_gift_card.id;

  RETURN json_build_object(
    'success', true,
    'amount', v_amount,
    'message', 'Gift card redeemed successfully! $' || v_amount || ' added to your wallet.'
  );
END;
$function$;