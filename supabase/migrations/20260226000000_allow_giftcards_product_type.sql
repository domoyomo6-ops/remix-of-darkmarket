-- Allow gift card inventory rows in products.product_type.
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_product_type_check;

ALTER TABLE public.products
ADD CONSTRAINT products_product_type_check
CHECK (product_type IN ('stock', 'logz', 'accounts', 'giftcards'));
