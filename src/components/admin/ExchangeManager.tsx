import { useState, useEffect } from 'react';
import { Bitcoin, Check, X, Loader2, Eye, AlertCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ExchangeRequest {
  id: string;
  user_id: string;
  payment_method: string;
  amount: number;
  fee_amount: number;
  total_amount: number;
  crypto_address: string;
  crypto_type: string;
  payment_proof_url: string | null;
  payment_link: string | null;
  status: string;
  admin_notes: string | null;
  admin_id: string | null;
  created_at: string;
  user_email?: string;
}

const PAYMENT_METHODS: Record<string, { name: string; icon: string }> = {
  venmo: { name: 'Venmo', icon: '💜' },
  paypal: { name: 'PayPal', icon: '💙' },
  cashapp: { name: 'Cash App', icon: '💚' },
  chime: { name: 'Chime', icon: '💛' },
  zelle: { name: 'Zelle', icon: '💜' },
  applepay: { name: 'Apple Pay', icon: '🍎' },
  googlepay: { name: 'Google Pay', icon: '🔴' },
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  awaiting_proof: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-green-500/20 text-green-400',
  declined: 'bg-red-500/20 text-red-400',
};

export default function ExchangeManager() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ExchangeRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();

    // Real-time subscription
    const channel = supabase
      .channel('admin_exchange_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crypto_exchange_requests' },
        () => fetchRequests()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('crypto_exchange_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      // Get user emails
      const enriched = await Promise.all(
        data.map(async (req) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', req.user_id)
            .single();
          return { ...req, user_email: profile?.email };
        })
      );
      setRequests(enriched);
    }
    setLoading(false);
  };

  const updateRequest = async (
    requestId: string, 
    status: string, 
    notes?: string, 
    link?: string
  ) => {
    if (!user) return;
    setProcessing(true);

    const updateData: any = {
      status,
      admin_id: user.id,
      updated_at: new Date().toISOString(),
    };
    if (notes) updateData.admin_notes = notes;
    if (link) updateData.payment_link = link;

    const { error } = await supabase
      .from('crypto_exchange_requests')
      .update(updateData)
      .eq('id', requestId);

    if (error) {
      toast.error('Failed to update');
    } else {
      toast.success(`Request ${status}`);
      setSelectedRequest(null);
      setAdminNotes('');
      setPaymentLink('');
      fetchRequests();
    }
    setProcessing(false);
  };

  const handleAccept = async () => {
    if (!selectedRequest) return;
    await updateRequest(
      selectedRequest.id,
      'awaiting_proof',
      adminNotes || 'Please send payment and upload proof',
      paymentLink
    );
  };

  const handleComplete = async () => {
    if (!selectedRequest) return;
    await updateRequest(selectedRequest.id, 'completed', adminNotes || 'Exchange completed');
  };

  const handleDecline = async () => {
    if (!selectedRequest || !adminNotes) {
      toast.error('Please provide a reason for declining');
      return;
    }
    await updateRequest(selectedRequest.id, 'declined', adminNotes);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getMethodInfo = (methodId: string) => 
    PAYMENT_METHODS[methodId] || { name: methodId, icon: '💰' };

  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'processing').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-400">
              {requests.filter(r => r.status === 'completed').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Volume</p>
            <p className="text-2xl font-bold text-primary">
              ${requests.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.total_amount, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Fees</p>
            <p className="text-2xl font-bold text-purple-400">
              ${requests.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.fee_amount, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bitcoin className="w-5 h-5" />
            Exchange Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No exchange requests</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2 font-mono">User</th>
                    <th className="text-left p-2 font-mono">Method</th>
                    <th className="text-right p-2 font-mono">Amount</th>
                    <th className="text-right p-2 font-mono">Fee</th>
                    <th className="text-right p-2 font-mono">Total</th>
                    <th className="text-center p-2 font-mono">Status</th>
                    <th className="text-center p-2 font-mono">Proof</th>
                    <th className="text-center p-2 font-mono">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const method = getMethodInfo(req.payment_method);
                    return (
                      <tr key={req.id} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="p-2">
                          <p className="font-mono text-xs truncate max-w-[120px]">
                            {req.user_email || 'Unknown'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(req.created_at)}
                          </p>
                        </td>
                        <td className="p-2">
                          <span className="flex items-center gap-1">
                            {method.icon} {method.name}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono">${req.amount.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono text-amber-400">+${req.fee_amount.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono text-primary font-bold">${req.total_amount.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <Badge className={statusColors[req.status]}>{req.status}</Badge>
                        </td>
                        <td className="p-2 text-center">
                          {req.payment_proof_url ? (
                            <a 
                              href={req.payment_proof_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <Eye className="w-4 h-4 inline" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedRequest(req);
                                  setAdminNotes(req.admin_notes || '');
                                  setPaymentLink(req.payment_link || '');
                                }}
                              >
                                Manage
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-zinc-900 border-primary/30 max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="text-primary font-mono">
                                  Exchange Request
                                </DialogTitle>
                              </DialogHeader>
                              
                              {selectedRequest && (
                                <div className="space-y-4 mt-4">
                                  {/* Request Details */}
                                  <div className="p-4 bg-black/50 rounded-lg space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">User:</span>
                                      <span className="font-mono">{selectedRequest.user_email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Method:</span>
                                      <span>{getMethodInfo(selectedRequest.payment_method).icon} {getMethodInfo(selectedRequest.payment_method).name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Amount:</span>
                                      <span className="font-mono">${selectedRequest.amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-amber-400">
                                      <span>Fee (5%):</span>
                                      <span className="font-mono">+${selectedRequest.fee_amount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-primary font-bold">
                                      <span>Total:</span>
                                      <span className="font-mono">${selectedRequest.total_amount.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-border">
                                      <span className="text-muted-foreground text-xs">BTC Address:</span>
                                      <p className="font-mono text-xs break-all">{selectedRequest.crypto_address}</p>
                                    </div>
                                  </div>

                                  {/* Payment Proof */}
                                  {selectedRequest.payment_proof_url && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2">Payment Proof:</p>
                                      <a 
                                        href={selectedRequest.payment_proof_url} 
                                        target="_blank"
                                        className="block"
                                      >
                                        <img 
                                          src={selectedRequest.payment_proof_url} 
                                          alt="Proof" 
                                          className="rounded-lg max-h-40 object-cover w-full"
                                        />
                                      </a>
                                    </div>
                                  )}

                                  {/* Admin Controls */}
                                  {selectedRequest.status !== 'completed' && selectedRequest.status !== 'declined' && (
                                    <>
                                      <div>
                                        <label className="text-xs text-muted-foreground">Payment Link (optional)</label>
                                        <Input
                                          value={paymentLink}
                                          onChange={(e) => setPaymentLink(e.target.value)}
                                          placeholder="Your payment link for user to pay"
                                          className="bg-black/50 border-primary/30 mt-1"
                                        />
                                      </div>

                                      <div>
                                        <label className="text-xs text-muted-foreground">Notes to User</label>
                                        <Textarea
                                          value={adminNotes}
                                          onChange={(e) => setAdminNotes(e.target.value)}
                                          placeholder="Add a note..."
                                          className="bg-black/50 border-primary/30 mt-1"
                                        />
                                      </div>

                                      <div className="flex gap-2">
                                        {selectedRequest.status === 'pending' && (
                                          <Button 
                                            className="flex-1" 
                                            onClick={handleAccept}
                                            disabled={processing}
                                          >
                                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                                            Accept & Send Link
                                          </Button>
                                        )}
                                        
                                        {(selectedRequest.status === 'awaiting_proof' || selectedRequest.status === 'processing') && (
                                          <Button 
                                            className="flex-1 bg-green-600 hover:bg-green-700" 
                                            onClick={handleComplete}
                                            disabled={processing}
                                          >
                                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                                            Complete
                                          </Button>
                                        )}

                                        <Button 
                                          variant="destructive" 
                                          onClick={handleDecline}
                                          disabled={processing}
                                        >
                                          <X className="w-4 h-4 mr-1" />
                                          Decline
                                        </Button>
                                      </div>
                                    </>
                                  )}

                                  {(selectedRequest.status === 'completed' || selectedRequest.status === 'declined') && (
                                    <div className="p-4 bg-accent/30 rounded-lg">
                                      <Badge className={statusColors[selectedRequest.status]}>
                                        {selectedRequest.status}
                                      </Badge>
                                      {selectedRequest.admin_notes && (
                                        <p className="text-sm mt-2">{selectedRequest.admin_notes}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}