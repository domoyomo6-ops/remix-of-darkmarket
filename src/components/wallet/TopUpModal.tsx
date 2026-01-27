import { useState, useEffect } from 'react';
import { Loader2, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  payment_method: string;
  display_name: string;
  is_enabled: boolean;
}

interface TopUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PAYMENT_ICONS: Record<string, string> = {
  stripe: '💳',
  authorize_net: '🏦',
  cashapp: '💵',
  telegram_stars: '⭐',
};

export default function TopUpModal({ open, onOpenChange, onSuccess }: TopUpModalProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchPaymentMethods();
    }
  }, [open]);

  const fetchPaymentMethods = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('is_enabled', true)
      .neq('payment_method', 'wallet')
      .order('sort_order');

    if (error) {
      console.error('Error fetching payment methods:', error);
    } else {
      setPaymentMethods(data || []);
    }
    setLoading(false);
  };

  const handleTopUp = async () => {
    if (!selectedMethod || !amount) {
      toast.error('Please select a payment method and enter an amount');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setProcessing(true);

    try {
      if (selectedMethod === 'stripe') {
        // Call Stripe checkout edge function
        const { data, error } = await supabase.functions.invoke('create-stripe-topup', {
          body: { amount: numAmount },
        });

        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success('Redirecting to Stripe checkout...');
          onOpenChange(false);
        }
      } else if (selectedMethod === 'cashapp') {
        // Call Cash App payment edge function
        const { data, error } = await supabase.functions.invoke('create-cashapp-payment', {
          body: { amount: numAmount },
        });

        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success('Redirecting to Cash App...');
          onOpenChange(false);
        }
      } else if (selectedMethod === 'telegram_stars') {
        // Call Telegram Stars edge function
        const { data, error } = await supabase.functions.invoke('create-telegram-stars-link', {
          body: { amount: numAmount },
        });

        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
          toast.success(`Opening Telegram bot @${data.botUsername}...`);
          onOpenChange(false);
        }
      } else if (selectedMethod === 'authorize_net') {
        toast.info('Authorize.net integration coming soon');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    }

    setProcessing(false);
  };

  const presetAmounts = [10, 25, 50, 100];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md glass-3d border-primary/30">
        <DialogHeader>
          <DialogTitle className="font-mono text-primary flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            TOP_UP://WALLET
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Selection */}
          <div>
            <Label className="font-mono text-xs text-muted-foreground">SELECT AMOUNT</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {presetAmounts.map((preset) => (
                <Button
                  key={preset}
                  variant={amount === preset.toString() ? 'default' : 'outline'}
                  size="sm"
                  className="font-mono"
                  onClick={() => setAmount(preset.toString())}
                >
                  ${preset}
                </Button>
              ))}
            </div>
            <div className="mt-3">
              <Input
                type="number"
                min="1"
                step="0.01"
                className="crt-input"
                placeholder="Custom amount..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <Label className="font-mono text-xs text-muted-foreground">PAYMENT METHOD</Label>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-mono">
                  No payment methods available
                </p>
              </div>
            ) : (
              <div className="space-y-2 mt-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.payment_method)}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      selectedMethod === method.payment_method
                        ? 'border-primary bg-primary/10'
                        : 'border-primary/20 hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {PAYMENT_ICONS[method.payment_method] || '💰'}
                      </span>
                      <span className="font-mono text-primary">{method.display_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            className="crt-button w-full"
            onClick={handleTopUp}
            disabled={processing || !selectedMethod || !amount}
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `[ TOP UP $${amount || '0'} ]`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
