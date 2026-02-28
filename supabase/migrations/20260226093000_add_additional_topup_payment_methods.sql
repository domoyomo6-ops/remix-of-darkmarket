-- Add additional wallet top-up methods for manual review flows
INSERT INTO public.payment_settings (payment_method, display_name, sort_order)
VALUES
  ('chime', 'Chime', 6),
  ('crypto', 'Crypto (Manual Review)', 7),
  ('venmo', 'Venmo', 8),
  ('paypal', 'PayPal', 9),
  ('zelle', 'Zelle', 10),
  ('applepay', 'Apple Pay', 11),
  ('googlepay', 'Google Pay', 12)
ON CONFLICT (payment_method) DO NOTHING;
