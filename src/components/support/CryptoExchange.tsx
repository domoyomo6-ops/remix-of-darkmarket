import { useState, useEffect } from 'react';
import { Bitcoin, ArrowRight, Loader2, Check, X, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const PAYMENT_METHODS = [
  { id: 'venmo', name: 'Venmo', icon: '💜' },
  { id: 'paypal', name: 'PayPal', icon: '💙' },
  { id: 'cashapp', name: 'Cash App', icon: '💚' },
  { id: 'chime', name: 'Chime', icon: '💛' },
  { id: 'zelle', name: 'Zelle', icon: '💜' },
  { id: 'applepay', name: 'Apple Pay', icon: '🍎' },
  { id: 'googlepay', name: 'Google Pay', icon: '🔴' },
];

const FEE_PERCENTAGE = 0.05; // 5%

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
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);

  const feeAmount = parseFloat(amount || '0') * FEE_PERCENTAGE;
  const totalAmount = parseFloat(amount || '0') + feeAmount;

  useEffect(() => {
    if (user) {
      fetchRequests();
      subscribeToUpdates();
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('crypto_exchange_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setRequests(data);
    setLoading(false);
  };

  const subscribeToUpdates = () => {
    if (!user) return;

    const channel = supabase
      .channel(`exchange_requests_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crypto_exchange_requests', filter: `user_id=eq.${user.id}` },
        () => fetchRequests()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
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
    });

    if (error) {
      toast.error('Failed to create request');
    } else {
      toast.success('Exchange request created!');
      setAmount('');
      setPaymentMethod('');
      setCryptoAddress('');
      fetchRequests();
    }
    setSubmitting(false);
  };

  const uploadProof = async (requestId: string, file: File) => {
    if (!user) return;
    setUploadingProof(requestId);

    try {
      // Upload to storage (you'd need to set up a bucket)
      const fileExt = file.name.split('.').pop();
      const filePath = `exchange-proofs/${user.id}/${requestId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('exchange-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('exchange-proofs')
        .getPublicUrl(filePath);

      // Update request with proof URL
      await supabase
        .from('crypto_exchange_requests')
        .update({ 
          payment_proof_url: publicUrl,
          status: 'processing'
        })
        .eq('id', requestId);

      toast.success('Proof uploaded!');
      fetchRequests();
    } catch (error) {
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
    PAYMENT_METHODS.find(m => m.id === methodId) || { name: methodId, icon: '💰' };

  return (
    <div className="p-4 space-y-4">
      {/* Create Request Form */}
      <div className="space-y-3">
        <h3 className="font-mono text-primary text-sm flex items-center gap-2">
          <Bitcoin className="w-4 h-4" />
          Exchange to Crypto
        </h3>
        
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/30 text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            5% service fee applies to all exchanges
          </p>
        </div>

        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="bg-black/50 border-primary/30">
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((method) => (
              <SelectItem key={method.id} value={method.id}>
                {method.icon} {method.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (USD)"
            className="bg-black/50 border-primary/30"
            min="1"
          />
          {amount && (
            <div className="mt-2 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Amount:</span>
                <span>${parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Fee (5%):</span>
                <span>+${feeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-primary font-bold">
                <span>You pay:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <Input
          value={cryptoAddress}
          onChange={(e) => setCryptoAddress(e.target.value)}
          placeholder="Your Bitcoin address"
          className="bg-black/50 border-primary/30 text-xs font-mono"
        />

        <Button 
          onClick={createRequest} 
          disabled={submitting || !amount || !paymentMethod || !cryptoAddress}
          className="w-full crt-button"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Request Exchange'}
        </Button>
      </div>

      {/* Previous Requests */}
      <div className="space-y-2">
        <h4 className="font-mono text-xs text-muted-foreground">Recent Requests</h4>
        
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No requests yet</p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {requests.map((req) => {
              const method = getMethodInfo(req.payment_method);
              return (
                <div key={req.id} className="p-3 bg-black/30 rounded-lg border border-primary/20 text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-1">
                      {method.icon} {method.name}
                    </span>
                    <Badge className={statusColors[req.status]}>{req.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>${req.amount.toFixed(2)}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="text-primary">BTC</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate font-mono">
                    {req.crypto_address}
                  </p>
                  
                  {/* Upload proof button for pending requests */}
                  {req.status === 'awaiting_proof' && !req.payment_proof_url && (
                    <label className="mt-2 block">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadProof(req.id, file);
                        }}
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-xs cursor-pointer"
                        disabled={uploadingProof === req.id}
                        asChild
                      >
                        <span>
                          {uploadingProof === req.id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Upload className="w-3 h-3 mr-1" />
                          )}
                          Upload Payment Proof
                        </span>
                      </Button>
                    </label>
                  )}

                  {req.payment_proof_url && (
                    <img 
                      src={req.payment_proof_url} 
                      alt="Proof" 
                      className="mt-2 rounded w-full h-20 object-cover"
                    />
                  )}

                  {req.admin_notes && (
                    <p className="mt-2 p-2 bg-zinc-800 rounded text-[10px]">
                      💬 {req.admin_notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}