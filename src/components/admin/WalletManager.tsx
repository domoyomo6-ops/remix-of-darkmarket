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
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UserWithWallet {
  id: string; // ✅ profiles.id (auth.uid)
  email: string;
  full_name: string | null;
  balance: number;
}

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
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
  const [adjustType, setAdjustType] =
    useState<'admin_credit' | 'admin_debit'>('admin_credit');
  const [adjusting, setAdjusting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsersWithWallets();
  }, []);

  const fetchUsersWithWallets = async () => {
    setLoading(true);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name');

    if (profilesError) {
      toast.error('Failed to load users');
      setLoading(false);
      return;
    }

    const { data: wallets } = await supabase
      .from('user_wallets')
      .select('user_id, balance');

    const walletMap = new Map(
      wallets?.map(w => [w.user_id, w.balance]) || []
    );

    const usersWithWallets: UserWithWallet[] =
      profiles?.map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        balance: walletMap.get(p.id) || 0,
      })) || [];

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

    if (!error) {
      setTransactions(data || []);
    }
  };

  const handleSelectUser = async (user: UserWithWallet) => {
    setSelectedUser(user);
    await fetchUserTransactions(user.id);
    setDialogOpen(true);
  };

  const handleAdjustBalance = async () => {
    if (!selectedUser || !adjustAmount) return;

    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    setAdjusting(true);

    const { data, error } = await supabase.rpc('admin_adjust_wallet', {
      p_target_user_id: selectedUser.id,
      p_amount: amount,
      p_type: adjustType,
      p_description: adjustReason || null,
    });

    const result = data as
      | { success: boolean; error?: string; new_balance?: number }
      | null;

    if (error || !result?.success) {
      toast.error(result?.error || 'Adjustment failed');
    } else {
      toast.success('Balance updated');
      setAdjustAmount('');
      setAdjustReason('');

      setSelectedUser({
        ...selectedUser,
        balance: result.new_balance ?? selectedUser.balance,
      });

      await fetchUsersWithWallets();
      await fetchUserTransactions(selectedUser.id);
    }

    setAdjusting(false);
  };

  const filteredUsers = users.filter(
    u =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTransactionTypeStyle = (type: string) => {
    switch (type) {
      case 'admin_credit':
      case 'refund':
      case 'topup':
        return 'text-green-400';
      case 'admin_debit':
      case 'purchase':
        return 'text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="panel-3d rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="w-6 h-6 text-primary" />
        <h2 className="font-mono font-bold text-primary">
          WALLET_MANAGER://
        </h2>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="crt-input pl-10"
          placeholder="Search users..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="font-mono text-muted-foreground text-sm">
            NO_USERS_FOUND
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map(user => (
            <div
              key={user.id}
              className="p-4 rounded-lg border border-primary/20 bg-primary/5 hover:border-primary/40 cursor-pointer"
              onClick={() => handleSelectUser(user)}
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-mono text-primary text-sm">
                    {user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.full_name || 'No name'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-primary">
                    ${user.balance.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">BALANCE</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono text-primary">
              WALLET://{selectedUser?.email}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6">
              <div className="text-center p-4 border rounded">
                <p className="text-xs text-muted-foreground">BALANCE</p>
                <p className="text-3xl font-mono font-bold text-primary">
                  ${selectedUser.balance.toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-mono">ADJUST</Label>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={adjustType === 'admin_credit' ? 'default' : 'outline'}
                    onClick={() => setAdjustType('admin_credit')}
                  >
                    <Plus className="w-3 h-3 mr-1" /> CREDIT
                  </Button>
                  <Button
                    size="sm"
                    variant={adjustType === 'admin_debit' ? 'default' : 'outline'}
                    onClick={() => setAdjustType('admin_debit')}
                  >
                    <Minus className="w-3 h-3 mr-1" /> DEBIT
                  </Button>
                </div>

                <Input
                  type="number"
                  step="0.01"
                  className="crt-input"
                  placeholder="Amount"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(e.target.value)}
                />

                <Textarea
                  className="crt-input"
                  placeholder="Reason (optional)"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                />

                <Button
                  className="w-full"
                  disabled={adjusting}
                  onClick={handleAdjustBalance}
                >
                  {adjusting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'CONFIRM'
                  )}
                </Button>
              </div>

              <div>
                <Label className="text-xs font-mono">TRANSACTIONS</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {transactions.map(tx => (
                    <div
                      key={tx.id}
                      className="p-2 border rounded text-xs"
                    >
                      <div className="flex justify-between">
                        <span className="uppercase text-muted-foreground">
                          {tx.type}
                        </span>
                        <span
                          className={`font-mono font-bold ${getTransactionTypeStyle(
                            tx.type
                          )}`}
                        >
                          {tx.amount > 0 ? '+' : ''}
                          ${Math.abs(tx.amount).toFixed(2)}
                        </span>
                      </div>
                      {tx.description && (
                        <p className="text-muted-foreground mt-1">
                          {tx.description}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-1">
                        {format(new Date(tx.created_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

