import { useState, useEffect } from 'react';
import { Wallet, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import TopUpModal from './TopUpModal';
import RedeemGiftCard from './RedeemGiftCard';

export default function WalletBalance() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);

  useEffect(() => {
    if (!user) {
      setBalance(0);
      setLoading(false);
      return;
    }

    fetchBalance();

    // 🔥 Realtime wallet updates
    const channel = supabase
      .channel('wallet-balance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_wallets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.balance !== undefined) {
            setBalance(payload.new.balance);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchBalance = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('user_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching wallet:', error);
    }

    setBalance(data?.balance ?? 0);
    setLoading(false);
  };

  if (!user) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-primary/30 bg-primary/5">
          <Wallet className="w-4 h-4 text-primary" />

          {loading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : (
            <span className="font-mono text-sm font-bold text-primary terminal-glow">
              ${balance.toFixed(2)}
            </span>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-primary/20"
            onClick={() => setShowTopUp(true)}
            disabled={loading}
          >
            <Plus className="w-3 h-3 text-primary" />
          </Button>
        </div>

        <RedeemGiftCard onSuccess={fetchBalance} />
      </div>

      <TopUpModal
        open={showTopUp}
        onOpenChange={setShowTopUp}
        onSuccess={fetchBalance}
      />
    </>
  );
}
