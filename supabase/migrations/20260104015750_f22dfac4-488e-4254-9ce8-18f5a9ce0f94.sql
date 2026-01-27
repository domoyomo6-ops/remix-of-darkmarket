-- Create admin_invites table to track invitations sent by admins
CREATE TABLE public.admin_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'customer',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  used_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage invites
CREATE POLICY "Admins can manage invites"
ON public.admin_invites
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to validate invite on signup
CREATE OR REPLACE FUNCTION public.validate_invite_on_signup(invite_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  SELECT * INTO invite_record
  FROM public.admin_invites
  WHERE email = lower(invite_email)
    AND used_at IS NULL
    AND expires_at > now();
  
  IF invite_record IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'No valid invite found for this email');
  END IF;
  
  RETURN jsonb_build_object('valid', true, 'role', invite_record.role);
END;
$$;

-- Create function to mark invite as used
CREATE OR REPLACE FUNCTION public.use_invite(invite_email text, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  SELECT * INTO invite_record
  FROM public.admin_invites
  WHERE email = lower(invite_email)
    AND used_at IS NULL
    AND expires_at > now();
  
  IF invite_record IS NOT NULL THEN
    -- Mark invite as used
    UPDATE public.admin_invites
    SET used_at = now()
    WHERE id = invite_record.id;
    
    -- If invited as admin, add admin role
    IF invite_record.role = 'admin' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (user_id, 'admin')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;

-- Update handle_new_user to check for invites
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Check if user has a valid invite
  SELECT * INTO invite_record
  FROM public.admin_invites
  WHERE email = lower(NEW.email)
    AND used_at IS NULL
    AND expires_at > now();
  
  IF invite_record IS NOT NULL THEN
    -- Mark invite as used
    UPDATE public.admin_invites
    SET used_at = now()
    WHERE id = invite_record.id;
    
    -- Assign the invited role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invite_record.role);
  ELSE
    -- Default role for non-invited users (will be rejected at signup)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer');
  END IF;
  
  RETURN NEW;
END;
$$;