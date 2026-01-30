import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteAccessSettings {
  requireMembership: boolean;
  sitePassword: string;
}

export function useSiteAccess() {
  const [settings, setSettings] = useState<SiteAccessSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('require_membership, site_password')
        .single();

      if (error) throw error;

      setSettings({
        requireMembership: data.require_membership,
        sitePassword: data.site_password,
      });

      // Check if user already has access stored
      const storedAccess = localStorage.getItem('site_access');
      if (storedAccess === 'granted') {
        setHasAccess(true);
      }
    } catch (error) {
      console.error('Error fetching site settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = async (password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('validate_site_password', {
        input_password: password,
      });

      if (error) throw error;

      const result = data as { valid?: boolean } | null;
      const isValid = result?.valid === true;
      if (isValid) {
        localStorage.setItem('site_access', 'granted');
        setHasAccess(true);
      }
      return isValid;
    } catch (error) {
      console.error('Error validating password:', error);
      return false;
    }
  };

  const revokeAccess = () => {
    localStorage.removeItem('site_access');
    setHasAccess(false);
  };

  return {
    settings,
    loading,
    hasAccess,
    validatePassword,
    revokeAccess,
  };
}
