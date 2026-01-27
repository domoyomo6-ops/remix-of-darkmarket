-- Fix 1: Remove public access to site_settings and create secure password validation function
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;

-- Create a function to validate site password without exposing it
-- This allows checking password without returning the actual value
CREATE OR REPLACE FUNCTION public.validate_site_password(input_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_record RECORD;
BEGIN
  SELECT site_password, require_membership 
  INTO settings_record
  FROM public.site_settings
  LIMIT 1;
  
  -- If no settings or membership not required, grant access
  IF settings_record IS NULL OR NOT settings_record.require_membership THEN
    RETURN jsonb_build_object('valid', true, 'require_membership', false);
  END IF;
  
  -- Check if password matches
  IF input_password = settings_record.site_password THEN
    RETURN jsonb_build_object('valid', true, 'require_membership', true);
  ELSE
    RETURN jsonb_build_object('valid', false, 'require_membership', true);
  END IF;
END;
$$;

-- Create function to check if site requires membership (without exposing password)
CREATE OR REPLACE FUNCTION public.get_site_access_requirements()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings_record RECORD;
BEGIN
  SELECT require_membership 
  INTO settings_record
  FROM public.site_settings
  LIMIT 1;
  
  IF settings_record IS NULL THEN
    RETURN jsonb_build_object('require_membership', false);
  END IF;
  
  RETURN jsonb_build_object('require_membership', settings_record.require_membership);
END;
$$;

-- Fix 2: Create secure order creation function that validates price server-side
CREATE OR REPLACE FUNCTION public.create_order(
  p_product_id UUID,
  p_customer_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_product RECORD;
  v_order_id UUID;
  v_existing_order RECORD;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Fetch product details server-side (not from client)
  SELECT id, price, title, is_active, file_url
  INTO v_product
  FROM public.products
  WHERE id = p_product_id;
  
  IF v_product IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product not found');
  END IF;
  
  IF NOT v_product.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Product is not available');
  END IF;
  
  -- Check if user already owns this product
  SELECT id INTO v_existing_order
  FROM public.orders
  WHERE user_id = v_user_id
    AND product_id = p_product_id
    AND status = 'completed';
    
  IF v_existing_order IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already own this product');
  END IF;
  
  -- Create order with server-validated price
  -- For now, status is 'completed' for demo (when Stripe is added, use 'pending')
  INSERT INTO public.orders (
    user_id,
    product_id,
    amount,
    status,
    customer_email
  ) VALUES (
    v_user_id,
    p_product_id,
    v_product.price,  -- Price from database, not client
    'completed',      -- Demo mode - would be 'pending' with Stripe
    p_customer_email
  )
  RETURNING id INTO v_order_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'order_id', v_order_id,
    'amount', v_product.price,
    'product_title', v_product.title
  );
END;
$$;

-- Fix 3: Create function to get download URL only for purchased products
CREATE OR REPLACE FUNCTION public.get_product_download_url(p_product_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_order RECORD;
  v_product RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;
  
  -- Check if user has a completed order for this product
  SELECT id INTO v_order
  FROM public.orders
  WHERE user_id = v_user_id
    AND product_id = p_product_id
    AND status = 'completed';
    
  IF v_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have not purchased this product');
  END IF;
  
  -- Get the file URL from products table
  SELECT file_url, title INTO v_product
  FROM public.products
  WHERE id = p_product_id;
  
  IF v_product.file_url IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No download available for this product');
  END IF;
  
  -- Return the download URL (in production, this would be a signed URL)
  RETURN jsonb_build_object(
    'success', true, 
    'url', v_product.file_url,
    'title', v_product.title
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_site_password(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_access_requirements() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_download_url(UUID) TO authenticated;