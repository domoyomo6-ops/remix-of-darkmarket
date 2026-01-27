import { useState } from 'react';
import { Gift, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface RedeemGiftCardProps {
  onSuccess?: () => void;
}

export default function RedeemGiftCard({ onSuccess }: RedeemGiftCardProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; amount?: number } | null>(null);

  const handleRedeem = async () => {
    if (!user || !code.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc('redeem_gift_card', {
        p_code: code.trim().toUpperCase(),
      });

      if (error) throw error;

      const response = data as { success: boolean; error?: string; message?: string; amount?: number };
      
      if (response.success) {
        setResult({
          success: true,
          message: response.message || 'Gift card redeemed!',
          amount: response.amount,
        });
        toast.success(response.message || 'Gift card redeemed successfully!');
        onSuccess?.();
        
        // Close dialog after delay
        setTimeout(() => {
          setOpen(false);
          setCode('');
          setResult(null);
        }, 2000);
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to redeem gift card',
        });
      }
    } catch (error) {
      console.error('Error redeeming gift card:', error);
      setResult({
        success: false,
        message: 'An error occurred while redeeming the gift card',
      });
    }

    setLoading(false);
  };

  const formatCode = (value: string) => {
    // Auto-format as H5-XXXX-XXXX-XXXX
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let formatted = '';
    
    if (cleaned.length > 0) {
      formatted = cleaned.slice(0, 2);
      if (cleaned.length > 2) formatted += '-' + cleaned.slice(2, 6);
      if (cleaned.length > 6) formatted += '-' + cleaned.slice(6, 10);
      if (cleaned.length > 10) formatted += '-' + cleaned.slice(10, 14);
    }
    
    return formatted;
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-mono border-primary/30 text-primary hover:bg-primary/10"
        >
          <Gift className="w-4 h-4 mr-2" />
          Redeem Gift Card
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-primary/30">
        <DialogHeader>
          <DialogTitle className="text-primary font-mono flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Redeem Gift Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {!result ? (
            <>
              <div>
                <label className="text-sm text-muted-foreground font-mono mb-2 block">
                  Enter your gift card code:
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(formatCode(e.target.value))}
                  placeholder="H5-XXXX-XXXX-XXXX"
                  className="crt-input font-mono text-center text-lg tracking-wider"
                  maxLength={19}
                  disabled={loading}
                />
              </div>

              <Button
                onClick={handleRedeem}
                disabled={loading || code.length < 10}
                className="w-full crt-button font-mono"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Redeeming...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Redeem Code
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className={`p-6 rounded-lg text-center ${
              result.success 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              {result.success ? (
                <>
                  <Check className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-green-400 font-mono text-lg mb-2">{result.message}</p>
                  {result.amount && (
                    <p className="text-3xl font-mono font-bold text-green-400 terminal-glow">
                      +${result.amount.toFixed(2)}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                  <p className="text-red-400 font-mono">{result.message}</p>
                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="mt-4 font-mono border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    Try Again
                  </Button>
                </>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground font-mono text-center">
            Gift cards add funds directly to your wallet balance.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}