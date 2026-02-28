import { useState, useEffect } from 'react';
import { CreditCard, Loader2, ToggleLeft, ToggleRight, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentSetting {
  id: string;
  payment_method: string;
  is_enabled: boolean;
  display_name: string;
  sort_order: number;
}

const PAYMENT_ICONS: Record<string, string> = {
  stripe: '💳',
  authorize_net: '🏦',
  cashapp: '💵',
  chime: '🏛️',
  crypto: '₿',
  venmo: '💜',
  paypal: '🅿️',
  zelle: '⚡',
  applepay: '🍎',
  googlepay: '🟢',
  telegram_stars: '⭐',
  wallet: '👛',
};

export default function PaymentSettingsManager() {
  const [settings, setSettings] = useState<PaymentSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error fetching payment settings:', error);
      toast.error('Failed to load payment settings');
    } else {
      setSettings(data || []);
    }
    setLoading(false);
  };

  const togglePaymentMethod = async (id: string, currentStatus: boolean) => {
    setUpdating(id);
    const { error } = await supabase
      .from('payment_settings')
      .update({ is_enabled: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update payment setting');
      console.error(error);
    } else {
      toast.success(`Payment method ${!currentStatus ? 'enabled' : 'disabled'}`);
      fetchSettings();
    }
    setUpdating(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="panel-3d rounded-lg p-4 sm:p-6 depth-shadow">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-primary" />
        <h2 className="text-lg sm:text-xl font-mono font-bold text-primary terminal-glow">
          PAYMENT_METHODS://
        </h2>
      </div>

      <p className="text-sm text-muted-foreground font-mono mb-6">
        {'>'} Toggle payment methods to enable/disable for customers
      </p>

      <div className="space-y-3">
        {settings.map((setting) => (
          <div
            key={setting.id}
            className={`p-4 rounded-lg border transition-all duration-300 ${
              setting.is_enabled
                ? 'border-primary/40 bg-primary/5'
                : 'border-muted/30 bg-muted/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{PAYMENT_ICONS[setting.payment_method] || '💰'}</span>
                <div>
                  <h3 className="font-mono font-bold text-primary">{setting.display_name}</h3>
                  <p className="text-xs text-muted-foreground font-mono uppercase">
                    {setting.payment_method.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {updating === setting.id ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <>
                    <span className={`text-xs font-mono ${setting.is_enabled ? 'text-green-400' : 'text-muted-foreground'}`}>
                      {setting.is_enabled ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    <Switch
                      checked={setting.is_enabled}
                      onCheckedChange={() => togglePaymentMethod(setting.id, setting.is_enabled)}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 border border-amber-500/30 rounded-lg bg-amber-500/5">
        <p className="text-xs font-mono text-amber-400">
          ⚠️ NOTE: API keys for external payment providers must be configured in the backend settings.
          Contact support if you need to update API credentials.
        </p>
      </div>
    </div>
  );
}
