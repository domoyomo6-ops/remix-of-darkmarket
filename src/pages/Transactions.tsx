import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, Gift, Loader2, CreditCard, Gamepad2, ShoppingBag, Receipt } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
}

export default function Transactions() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchTransactions();
    }
  }, [user, authLoading, navigate]);

  const fetchTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const getTypeIcon = (type: string, paymentMethod: string | null) => {
    if (paymentMethod === 'gift_card' || type === 'credit') {
      return <Gift className="w-4 h-4" />;
    }
    if (type === 'wager') {
      return <Gamepad2 className="w-4 h-4" />;
    }
    if (type === 'purchase') {
      return <ShoppingBag className="w-4 h-4" />;
    }
    if (type === 'topup') {
      return <CreditCard className="w-4 h-4" />;
    }
    if (type === 'winnings') {
      return <ArrowDownLeft className="w-4 h-4" />;
    }
    if (type === 'admin_credit') {
      return <ArrowDownLeft className="w-4 h-4" />;
    }
    if (type === 'admin_debit') {
      return <ArrowUpRight className="w-4 h-4" />;
    }
    return <Receipt className="w-4 h-4" />;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; className: string }> = {
      credit: { label: 'Credit', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      topup: { label: 'Top Up', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      purchase: { label: 'Purchase', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      wager: { label: 'Wager', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      winnings: { label: 'Winnings', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      admin_credit: { label: 'Admin Credit', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
      admin_debit: { label: 'Admin Debit', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    };

    const config = typeConfig[type] || { label: type, className: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const isCredit = (type: string) => {
    return ['credit', 'topup', 'winnings', 'admin_credit'].includes(type);
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!user) return null;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Receipt className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-mono font-bold text-primary terminal-glow">
            TRANSACTION_HISTORY://
          </h1>
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="panel-3d rounded-lg p-12 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-mono">No transactions yet</p>
            <p className="text-sm text-muted-foreground/60 font-mono mt-2">
              Your wallet activity will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="panel-3d rounded-lg p-4 hover:border-primary/40 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCredit(tx.type) 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {getTypeIcon(tx.type, tx.payment_method)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeBadge(tx.type)}
                        {tx.payment_method && (
                          <span className="text-xs text-muted-foreground font-mono">
                            via {tx.payment_method}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        {tx.description || 'Transaction'}
                      </p>
                      <p className="text-xs text-muted-foreground/60 font-mono mt-1">
                        {format(new Date(tx.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-mono font-bold ${
                    isCredit(tx.type) ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {isCredit(tx.type) ? '+' : '-'}${Math.abs(tx.amount).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="panel-3d rounded-lg p-4 text-center">
              <div className="text-2xl font-mono font-bold text-primary">{transactions.length}</div>
              <div className="text-xs text-muted-foreground font-mono">Total Transactions</div>
            </div>
            <div className="panel-3d rounded-lg p-4 text-center">
              <div className="text-2xl font-mono font-bold text-green-400">
                ${transactions
                  .filter(t => isCredit(t.type))
                  .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                  .toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground font-mono">Total Credits</div>
            </div>
            <div className="panel-3d rounded-lg p-4 text-center">
              <div className="text-2xl font-mono font-bold text-red-400">
                ${transactions
                  .filter(t => !isCredit(t.type))
                  .reduce((sum, t) => sum + Math.abs(t.amount), 0)
                  .toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground font-mono">Total Debits</div>
            </div>
            <div className="panel-3d rounded-lg p-4 text-center">
              <div className="text-2xl font-mono font-bold text-amber-400">
                {transactions.filter(t => t.payment_method === 'gift_card').length}
              </div>
              <div className="text-xs text-muted-foreground font-mono">Gift Cards Redeemed</div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
