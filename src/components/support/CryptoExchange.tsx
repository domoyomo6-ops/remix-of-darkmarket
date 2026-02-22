import { useState, useEffect } from 'react';
import { Bitcoin, ArrowRight, Loader2, Upload, AlertCircle, Building2, Wallet, ShieldCheck, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { id: 'venmo', name: 'Venmo', icon: '💜', rail: 'p2p' },
  { id: 'paypal', name: 'PayPal', icon: '💙', rail: 'p2p' },
  { id: 'cashapp', name: 'Cash App', icon: '💚', rail: 'p2p' },
  { id: 'chime', name: 'Chime', icon: '💛', rail: 'bank' },
  { id: 'zelle', name: 'Zelle', icon: '💜', rail: 'bank' },
  { id: 'applepay', name: 'Apple Pay', icon: '🍎', rail: 'p2p' },
  { id: 'googlepay', name: 'Google Pay', icon: '🔴', rail: 'p2p' },
  { id: 'wire', name: 'Bank Wire', icon: '🏦', rail: 'bank' },
];

const FEE_PERCENTAGE = 0.05;

interface ExchangeRequest {
  id: string;
  payment_method: string;
  amount: number;
  fee_amount: number;
  total_amount: number;
  crypto_address: string;
  status: string;
  payment_proof_url: string | null;
  admin_notes: string | null;
  created_at: string;
}

export default function CryptoExchange() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);

  const feeAmount = parseFloat(amount || '0') * FEE_PERCENTAGE;
  const totalAmount = parseFloat(amount || '0') + feeAmount;

  useEffect(() => {
    if (user) {
      fetchRequests();
      const unsubscribe = subscribeToUpdates();
      return unsubscribe;
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('crypto_exchange_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setRequests(data);
    setLoading(false);
  };

  const subscribeToUpdates = () => {
    if (!user) return () => {};

    const channel = supabase
      .channel(`exchange_requests_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crypto_exchange_requests', filter: `user_id=eq.${user.id}` },
        () => fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createRequest = async () => {
    if (!user || !amount || !paymentMethod || !cryptoAddress) {
      toast.error('Please fill all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (amountNum <= 0) {
      toast.error('Invalid amount');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('crypto_exchange_requests').insert({
      user_id: user.id,
      payment_method: paymentMethod,
      amount: amountNum,
      fee_amount: feeAmount,
      total_amount: totalAmount,
      crypto_address: cryptoAddress,
      admin_notes: memo.trim() || null,
      status: 'pending',
    });

    if (error) {
      toast.error('Failed to create request');
    } else {
      toast.success('Exchange request created and queued for admin review.');
      setAmount('');
      setPaymentMethod('');
      setCryptoAddress('');
      setMemo('');
      fetchRequests();
    }
    setSubmitting(false);
  };

  const uploadProof = async (requestId: string, file: File) => {
    if (!user) return;
    setUploadingProof(requestId);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `exchange-proofs/${user.id}/${requestId}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('exchange-proofs')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('exchange-proofs')
        .getPublicUrl(filePath);

      await supabase
        .from('crypto_exchange_requests')
        .update({ payment_proof_url: publicUrl, status: 'processing' })
        .eq('id', requestId);

      toast.success('Proof uploaded and sent to admin.');
      fetchRequests();
    } catch {
      toast.error('Failed to upload proof');
    }
    setUploadingProof(null);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    awaiting_proof: 'bg-blue-500/20 text-blue-400',
    processing: 'bg-purple-500/20 text-purple-400',
    completed: 'bg-green-500/20 text-green-400',
    declined: 'bg-red-500/20 text-red-400',
  };

  const getMethodInfo = (methodId: string) =>
    PAYMENT_METHODS.find((m) => m.id === methodId) || { name: methodId, icon: '💰', rail: 'p2p' };

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono">
        <div className="rounded border border-primary/20 bg-primary/10 p-2 flex items-center gap-2"><Wallet className="w-3 h-3" />1. Submit request</div>
        <div className="rounded border border-amber-400/30 bg-amber-500/10 p-2 flex items-center gap-2"><ShieldCheck className="w-3 h-3" />2. Admin verifies payment</div>
        <div className="rounded border border-emerald-400/30 bg-emerald-500/10 p-2 flex items-center gap-2"><BadgeCheck className="w-3 h-3" />3. Crypto payout completes</div>
      </div>

      <div className="space-y-3">
        <h3 className="font-mono text-primary text-sm flex items-center gap-2">
          <Bitcoin className="w-4 h-4" />
          P2P / Bank-to-Crypto Exchange
        </h3>

        <div className="p-3 bg-primary/10 rounded-lg border border-primary/30 text-xs text-muted-foreground space-y-1">
          <p className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />5% service fee applies to all exchanges</p>
          <p className="flex items-center gap-1"><Building2 className="w-3 h-3" />Supported rails: P2P apps + bank transfer options</p>
        </div>

        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="bg-black/50 border-primary/30">
            <SelectValue placeholder="Select payment rail" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                {method.icon} {method.name} · {method.rail.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (USD)" className="bg-black/50 border-primary/30" min="1" />
          {amount && (
            <div className="mt-2 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground"><span>Amount:</span><span>${parseFloat(amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-amber-400"><span>Fee (5%):</span><span>+${feeAmount.toFixed(2)}</span></div>
              <div className="flex justify-between text-primary font-bold"><span>Total payment:</span><span>${totalAmount.toFixed(2)}</span></div>
            </div>
          )}
        </div>

        <Input value={cryptoAddress} onChange={(e) => setCryptoAddress(e.target.value)} placeholder="Your crypto address (BTC/USDT/etc.)" className="bg-black/50 border-primary/30 text-xs font-mono" />
        <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Optional: transfer details/admin instructions" className="bg-black/50 border-primary/30 text-xs font-mono" />

        <Button onClick={createRequest} disabled={submitting || !amount || !paymentMethod || !cryptoAddress} className="w-full crt-button">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Exchange Request'}
        </Button>
      </div>

      <div className="space-y-2">
        <h4 className="font-mono text-xs text-muted-foreground">Recent Requests / Admin Status</h4>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : requests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No requests yet</p>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {requests.map((req) => {
              const method = getMethodInfo(req.payment_method);
              return (
                <div key={req.id} className="p-3 bg-black/30 rounded-lg border border-primary/20 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">{method.icon} {method.name}</span>
                    <Badge className={statusColors[req.status]}>{req.status}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>${req.amount.toFixed(2)}</span><ArrowRight className="w-3 h-3" /><span className="text-primary">Crypto Payout</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate font-mono">{req.crypto_address}</p>

                  {req.status === 'awaiting_proof' && !req.payment_proof_url && (
                    <label className="mt-2 block">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadProof(req.id, file); }} />
                      <Button size="sm" variant="outline" className="w-full text-xs cursor-pointer" disabled={uploadingProof === req.id} asChild>
                        <span>{uploadingProof === req.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}Upload Payment Proof</span>
                      </Button>
                    </label>
                  )}

                  {req.payment_proof_url && <img src={req.payment_proof_url} alt="Proof" className="mt-2 rounded w-full h-20 object-cover" />}
                  {req.admin_notes && <p className="mt-2 p-2 bg-zinc-800 rounded text-[10px]">💬 {req.admin_notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
