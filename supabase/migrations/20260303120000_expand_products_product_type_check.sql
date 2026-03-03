-- Allow gift card stock rows to be inserted into products
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_product_type_check;

ALTER TABLE public.products
ADD CONSTRAINT products_product_type_check
CHECK (product_type IN ('stock', 'logz', 'accounts', 'giftcards'));

COMMENT ON COLUMN public.products.product_type IS 'Type of product: stock (cards/bins), logz (logs/dumps), accounts (account logins), giftcards (gift card inventory)';
