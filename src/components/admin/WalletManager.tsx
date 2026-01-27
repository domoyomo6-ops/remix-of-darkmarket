import { useState, useEffect } from 'react';
import { Wallet, Loader2, Search, Plus, Minus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserWithWallet {
  user_id: string;
  email: string;
  full_name: string | null;
  balance: number;
}

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  payment_method: string | null;
  description: string | null;
  created_at: string;
}

export default function WalletManager() {
  const [users, setUsers] = useState<UserWithWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithWallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustType, setAdjustType] = useState<'admin_credit' | 'admin_debit'>('admin_credit');
  const [adjusting, setAdjusting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsersWithWallets();
  }, []);

  const fetchUsersWithWallets = async () => {
    setLoading(true);
    
    // Fetch profiles with their wallet balances
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, email, full_name');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      toast.error('Failed to load users');
      setLoading(false);
      return;
    }

    const { data: wallets, error: walletsError } = await supabase
      .from('user_wallets')
      .select('user_id, balance');

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError);
    }

    const walletMap = new Map(wallets?.map(w => [w.user_id, w.balance]) || []);

    const usersWithWallets: UserWithWallet[] = (profiles || []).map(p => ({
      user_id: p.user_id,
      email: p.email,
      full_name: p.full_name,
      balance: walletMap.get(p.user_id) || 0,
    }));

    setUsers(usersWithWallets);
    setLoading(false);
  };

  const fetchUserTransactions = async (userId: string) => {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data || []);
    }
  };

  const handleSelectUser = async (user: UserWithWallet) => {
    setSelectedUser(user);
    await fetchUserTransactions(user.user_id);
    setDialogOpen(true);
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount) return;

    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setAdjusting(true);

    const { data, error } = await supabase.rpc('admin_adjust_wallet', {
      p_target_user_id: selectedUser.user_id,
      p_amount: amount,
      p_type: adjustType,
      p_description: adjustReason || null,
    });

    const result = data as { success: boolean; error?: string; new_balance?: number } | null;

    if (error || !result?.success) {
      toast.error(result?.error || 'Failed to adjust balance');
    } else {
      toast.success(`Balance ${adjustType === 'admin_credit' ? 'added' : 'deducted'} successfully`);
      setAdjustAmount('');
      setAdjustReason('');
      await fetchUsersWithWallets();
      await fetchUserTransactions(selectedUser.user_id);
      setSelectedUser({
        ...selectedUser,
        balance: result.new_balance || 0,
      });
    }

    setAdjusting(false);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'topup':
      case 'admin_credit':
      case 'refund':
        return 'text-green-400';
      case 'purchase':
      case 'admin_debit':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Wallet className="w-6 h-6 text-primary" />
          <h2 className="text-lg sm:text-xl font-mono font-bold text-primary terminal-glow">
            WALLET_MANAGER://
          </h2>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="crt-input pl-10"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-mono text-sm">NO_USERS_FOUND</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <div
              key={user.user_id}
              className="p-3 sm:p-4 rounded-lg border border-primary/20 bg-primary/5 hover:border-primary/40 transition-all cursor-pointer"
              onClick={() => handleSelectUser(user)}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-primary text-sm truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {user.full_name || 'No name'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-mono font-bold text-primary terminal-glow">
                    ${user.balance.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">BALANCE</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg glass-3d border-primary/30">
          <DialogHeader>
            <DialogTitle className="font-mono text-primary">
              WALLET://{selectedUser?.email}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              {/* Current Balance */}
              <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-xs font-mono text-muted-foreground mb-1">CURRENT BALANCE</p>
                <p className="text-3xl font-mono font-bold text-primary terminal-glow">
                  ${selectedUser.balance.toFixed(2)}
                </p>
              </div>

              {/* Adjust Balance */}
              <div className="space-y-4">
                <Label className="font-mono text-xs text-muted-foreground">ADJUST BALANCE</Label>
                <div className="flex gap-2">
                  <Button
                    variant={adjustType === 'admin_credit' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 font-mono text-xs"
                    onClick={() => setAdjustType('admin_credit')}
                  >
                    <Plus className="w-3 h-3 mr-1" /> CREDIT
                  </Button>
                  <Button
                    variant={adjustType === 'admin_debit' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 font-mono text-xs"
                    onClick={() => setAdjustType('admin_debit')}
                  >
                    <Minus className="w-3 h-3 mr-1" /> DEBIT
                  </Button>
                </div>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="crt-input"
                  placeholder="Amount..."
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
                <Textarea
                  className="crt-input"
                  placeholder="Reason (optional)..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
                <Button
                  className="crt-button w-full"
                  onClick={handleAdjustBalance}
                  disabled={adjusting || !adjustAmount}
                >
                  {adjusting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    `[ ${adjustType === 'admin_credit' ? 'ADD' : 'DEDUCT'} BALANCE ]`
                  )}
                </Button>
              </div>

              {/* Transaction History */}
              <div>
                <Label className="font-mono text-xs text-muted-foreground">RECENT TRANSACTIONS</Label>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                  {transactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-mono text-center py-4">
                      NO_TRANSACTIONS
                    </p>
                  ) : (
                    transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2 rounded bg-background/50 border border-primary/10 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono uppercase text-muted-foreground">
                            {tx.type.replace('_', ' ')}
                          </span>
                          <span className={`font-mono font-bold ${getTransactionTypeStyle(tx.type)}`}>
                            {tx.type.includes('credit') || tx.type === 'topup' || tx.type === 'refund'
                              ? '+'
                              : '-'}
                            ${tx.amount.toFixed(2)}
                          </span>
                        </div>
                        {tx.description && (
                          <p className="text-muted-foreground mt-1">{tx.description}</p>
                        )}
                        <p className="text-muted-foreground mt-1">
                          {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
