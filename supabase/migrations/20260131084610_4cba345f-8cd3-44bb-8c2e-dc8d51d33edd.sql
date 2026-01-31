-- Add product_type column to distinguish between different product types
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'stock' 
CHECK (product_type IN ('stock', 'logz', 'accounts'));

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);

-- Add comment for documentation
COMMENT ON COLUMN public.products.product_type IS 'Type of product: stock (cards/bins), logz (logs/dumps), accounts (account logins)';