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
  v_winner_wager NUMERIC;
  v_new_balance NUMERIC;
  v_payout_multiplier NUMERIC;
  v_return_wager BOOLEAN;
  v_payout_amount NUMERIC;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_game FROM public.game_sessions WHERE id = p_game_id;
  IF v_game IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Game not found');
  END IF;

  IF v_game.host_id != v_user_id AND NOT has_role(v_user_id, 'admin'::app_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT COALESCE(SUM(wager_amount), 0) INTO v_total_pot
  FROM public.game_participants
  WHERE game_id = p_game_id AND is_spectator = false;

  v_payout_multiplier := LEAST(1.5, GREATEST(1.0, COALESCE((p_game_data ->> 'payout_multiplier')::NUMERIC, 1.0)));
  v_return_wager := COALESCE((p_game_data ->> 'return_wager')::BOOLEAN, false);

  UPDATE public.game_sessions
  SET status = 'completed', winner_id = p_winner_id, game_data = p_game_data, completed_at = now()
  WHERE id = p_game_id;

  IF p_winner_id IS NOT NULL AND v_total_pot > 0 THEN
    SELECT * INTO v_winner_wallet FROM public.user_wallets WHERE user_id = p_winner_id;
    SELECT COALESCE(wager_amount, 0) INTO v_winner_wager
    FROM public.game_participants
    WHERE game_id = p_game_id AND user_id = p_winner_id
    LIMIT 1;

    IF v_winner_wallet IS NOT NULL AND v_winner_wager > 0 THEN
      IF v_return_wager THEN
        v_payout_amount := LEAST(v_total_pot, v_winner_wager);
      ELSE
        v_payout_amount := v_winner_wager * v_payout_multiplier;
      END IF;

      v_new_balance := v_winner_wallet.balance + v_payout_amount;
      UPDATE public.user_wallets SET balance = v_new_balance WHERE user_id = p_winner_id;

      INSERT INTO public.wallet_transactions (user_id, amount, type, payment_method, description)
      VALUES (p_winner_id, v_payout_amount, 'winnings', 'game', 'Game payout: ' || v_game.game_type || ' (' || v_payout_multiplier || 'x)');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'total_pot', v_total_pot, 'payout_multiplier', v_payout_multiplier);
END;
$$;
