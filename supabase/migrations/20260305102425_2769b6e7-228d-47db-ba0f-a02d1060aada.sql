-- Add SELECT policy for admins on site_settings
CREATE POLICY "Admins can view site settings"
ON public.site_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));