import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SiteAccessContextType {
  hasAccess: boolean;
  checkPassword: (password: string) => Promise<boolean>;
  loading: boolean;
}

const SiteAccessContext = createContext<SiteAccessContextType | undefined>(undefined);

const SITE_ACCESS_KEY = 'site_access_granted';

export function SiteAccessProvider({ children }: { children: ReactNode }) {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccessRequirements = async () => {
      try {
        // Use secure RPC function that doesn't expose the password
        const { data, error } = await supabase.rpc('get_site_access_requirements');

        if (error) {
          console.error('Error fetching site settings:', error);
          // If function fails, allow access (fail open for now)
          setHasAccess(true);
        } else if (data) {
          const requireMembership = (data as { require_membership: boolean }).require_membership;
          
          if (!requireMembership) {
            setHasAccess(true);
          } else {
            // Check session storage for existing access
            const accessGranted = sessionStorage.getItem(SITE_ACCESS_KEY);
            if (accessGranted === 'true') {
              setHasAccess(true);
            }
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setHasAccess(true);
      } finally {
        setLoading(false);
      }
    };

    checkAccessRequirements();
  }, []);

  const checkPassword = async (password: string): Promise<boolean> => {
    try {
      // Use secure RPC function to validate password without exposing it
      const { data, error } = await supabase.rpc('validate_site_password', {
        input_password: password
      });

      if (error) {
        console.error('Password validation error:', error);
        return false;
      }

      const result = data as { valid: boolean; require_membership: boolean };
      
      if (result.valid) {
        sessionStorage.setItem(SITE_ACCESS_KEY, 'true');
        setHasAccess(true);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error validating password:', err);
      return false;
    }
  };

  return (
    <SiteAccessContext.Provider value={{ hasAccess, checkPassword, loading }}>
      {children}
    </SiteAccessContext.Provider>
  );
}

export function useSiteAccess() {
  const context = useContext(SiteAccessContext);
  if (context === undefined) {
    throw new Error('useSiteAccess must be used within a SiteAccessProvider');
  }
  return context;
}