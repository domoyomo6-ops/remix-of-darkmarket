import { useState, useEffect } from 'react';
import { Plus, Gift, Copy, Trash2, Loader2, CreditCard, Wallet, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface GiftCard {
  id: string;
  code: string;
  balance: number;
  initial_balance: number;
  status: string;
  created_by: string;
  claimed_by: string | null;
  pass2u_pass_id: string | null;
  expires_at: string | null;
  created_at: string;
  claimed_at: string | null;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
    if ('error_description' in error && typeof error.error_description === 'string') {
      return error.error_description;
    }
    if ('details' in error && typeof error.details === 'string') {
      return error.details;
    }
    if ('hint' in error && typeof error.hint === 'string') {
      return error.hint;
    }
    try {
      return JSON.stringify(error);
    } catch (stringifyError) {
      return String(error);
    }
  }
  return String(error);
};

export default function GiftCardManager() {
  const { user } = useAuth();
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [manualCode, setManualCode] = useState('');
  
  // Form state
  const [amount, setAmount] = useState('25');
  const [expiresIn, setExpiresIn] = useState('');
  const [stockStore, setStockStore] = useState('Amazon');
  const [stockRegion, setStockRegion] = useState('USA');
  const [stockOptionLabel, setStockOptionLabel] = useState('$25 Amazon Card');
  const [stockRating, setStockRating] = useState('5.0');
  const [stockAmount, setStockAmount] = useState('25');
  const [stockCost, setStockCost] = useState('20');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [stockLabel, setStockLabel] = useState('');
  const [stockImageUrl, setStockImageUrl] = useState('');
  const [creatingStock, setCreatingStock] = useState(false);

  useEffect(() => {
    fetchGiftCards();
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }

    const checkAdmin = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data));
      }
      setAdminChecked(true);
    };

    checkAdmin();
  }, [user]);

  const fetchGiftCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching gift cards:', error);
      toast.error('Failed to load gift cards');
    } else {
      setGiftCards(data || []);
    }
    setLoading(false);
  };

  const generateFallbackCode = () => {
    const bytes = new Uint8Array(5);
    globalThis.crypto.getRandomValues(bytes);
    const random = Array.from(bytes)
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    return `HELL5TAR-${random}`;
  };

  const normalizeCode = (code: string) => code.trim().toUpperCase().slice(0, 19);

  const generateCode = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_gift_card_code');
    if (!error && data) {
      return normalizeCode(data);
    }

    console.warn('Gift card code RPC failed, using fallback generator.', error);
    return normalizeCode(generateFallbackCode());
  };

  const createGiftCard = async () => {
    if (!user) {
      return;
    }
    if (!isAdmin) {
      return;
    }
    
    setCreating(true);
    try {
      const code = manualCode.trim()
        ? normalizeCode(manualCode)
        : await generateCode();
      if (!code) {
        toast.error('Please enter a valid gift card code.');
        setCreating(false);
        return;
      }
      const balanceAmount = parseFloat(amount);
      
      if (isNaN(balanceAmount) || balanceAmount <= 0) {
        toast.error('Please enter a valid amount');
        setCreating(false);
        return;
      }

      let expiresAt = null;
      if (expiresIn) {
        const days = parseInt(expiresIn);
        if (!isNaN(days) && days > 0) {
          expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      const { data: giftCard, error } = await supabase
        .from('gift_cards')
        .insert({
          code,
          balance: balanceAmount,
          initial_balance: balanceAmount,
          created_by: user.id,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      if (!giftCard) throw new Error('Gift card creation failed. No data returned.');

      // Try to create Pass2U wallet pass
      try {
        const { data: passData } = await supabase.functions.invoke('create-pass2u-card', {
          body: {
            giftCardId: giftCard.id,
            code: giftCard.code,
            balance: balanceAmount,
            expiresAt,
          },
        });

        if (passData?.passUrl) {
          toast.success('Gift card created with wallet pass!');
        } else {
          toast.success('Gift card created!');
        }
      } catch (passError) {
        console.log('Pass2U not configured:', passError);
        toast.success('Gift card created!');
      }

      fetchGiftCards();
      setShowCreateDialog(false);
      setAmount('25');
      setExpiresIn('');
      setManualCode('');
    } catch (error) {
      console.error('Error creating gift card:', error);
      toast.error(`Failed to create gift card: ${getErrorMessage(error)}`);
    }
    setCreating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const deleteGiftCard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gift card?')) return;

    const { error } = await supabase
      .from('gift_cards')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete gift card');
    } else {
      toast.success('Gift card deleted');
      fetchGiftCards();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'claimed':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Claimed</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expired</Badge>;
      case 'depleted':
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Depleted</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredCards = giftCards.filter(card =>
    card.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createGiftCardStock = async () => {
    if (!user || !isAdmin) {
      return;
    }

    const amountValue = Number(stockAmount);
    const costValue = Number(stockCost);
    const quantityValue = Number(stockQuantity);
    const ratingValue = Number(stockRating);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      toast.error('Denomination amount must be greater than 0.');
      return;
    }

    if (!Number.isFinite(costValue) || costValue <= 0) {
      toast.error('Sell cost must be greater than 0.');
      return;
    }

    if (!Number.isInteger(quantityValue) || quantityValue <= 0) {
      toast.error('Quantity must be a whole number greater than 0.');
      return;
    }

    if (!Number.isFinite(ratingValue) || ratingValue <= 0 || ratingValue > 5) {
      toast.error('Rating must be between 0.1 and 5.0.');
      return;
    }

    const storeName = stockStore.trim();
    if (!storeName) {
      toast.error('Store name is required.');
      return;
    }

    const regionName = stockRegion.trim() || 'GLOBAL';

    setCreatingStock(true);

    const amountLabel = amountValue % 1 === 0 ? `${amountValue}` : amountValue.toFixed(2);
    const listingTitle = stockLabel.trim() || `${storeName} Giftcards [${regionName}]`;
    const optionLabel = stockOptionLabel.trim() || `$${amountLabel} ${storeName} Card`;

    const rows = Array.from({ length: quantityValue }).map((_, index) => ({
      title: optionLabel,
      description: `Store listing: ${listingTitle}. Unit ${index + 1}/${quantityValue}. 24 hour replacement support included.`,
      short_description: `option:${optionLabel}|rating:${ratingValue.toFixed(1)}|denomination:${amountLabel}`,
      price: costValue,
      category: 'assets' as const,
      product_type: 'giftcards',
      brand: storeName,
      country: regionName,
      image_url: stockImageUrl.trim() || null,
      is_active: true,
    }));

    const { error } = await supabase.from('products').insert(rows);
    if (error) {
      toast.error(`Failed to create gift card stock: ${error.message}`);
      setCreatingStock(false);
      return;
    }

    toast.success(`Added ${quantityValue} x ${optionLabel} for ${storeName} at $${costValue.toFixed(2)} each.`);
    setStockLabel(listingTitle);
    setStockImageUrl('');
    setCreatingStock(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Gift className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-mono font-bold text-primary">Gift Card Manager</h2>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="crt-button font-mono">
              <Plus className="w-4 h-4 mr-2" />
              Create Gift Card
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-primary/30">
            <DialogHeader>
              <DialogTitle className="text-primary font-mono flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Create New Gift Card
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-primary font-mono">Balance Amount ($)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="25.00"
                  className="crt-input mt-1"
                  min="1"
                  step="0.01"
                />
              </div>

              <div>
                <Label className="text-primary font-mono">Gift Card Code (optional)</Label>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="crt-input mt-1"
                  maxLength={19}
                />
              </div>
              
              <div>
                <Label className="text-primary font-mono">Expires In (days, optional)</Label>
                <Input
                  type="number"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  placeholder="Leave empty for no expiry"
                  className="crt-input mt-1"
                  min="1"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={createGiftCard}
                  disabled={creating || (adminChecked && !isAdmin)}
                  className="w-full crt-button font-mono"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Generate Gift Card
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground font-mono">
                A unique code will be generated. If Pass2U is configured, a digital wallet pass will also be created.
              </p>
              {adminChecked && !isAdmin && (
                <p className="text-xs text-amber-400 font-mono">
                  Admin access required to generate gift cards.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="panel-3d rounded-lg p-5 border border-primary/20 bg-primary/5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-mono font-bold text-primary text-sm sm:text-base">Store Listing Stock Manager</h3>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              Build third-party gift card listings (Amazon, Visa, etc.) with denomination options, ratings, and inventory batches.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs font-mono text-primary">Store Name</Label>
            <Input value={stockStore} onChange={(e) => setStockStore(e.target.value)} placeholder="Amazon" className="crt-input mt-1" />
          </div>
          <div>
            <Label className="text-xs font-mono text-primary">Region</Label>
            <Input value={stockRegion} onChange={(e) => setStockRegion(e.target.value)} placeholder="USA" className="crt-input mt-1" />
          </div>
          <div>
            <Label className="text-xs font-mono text-primary">Option Label</Label>
            <Input value={stockOptionLabel} onChange={(e) => setStockOptionLabel(e.target.value)} placeholder="$25 Amazon Card" className="crt-input mt-1" />
          </div>
          <div>
            <Label className="text-xs font-mono text-primary">Denomination ($)</Label>
            <Input value={stockAmount} onChange={(e) => setStockAmount(e.target.value)} type="number" min="1" step="0.01" className="crt-input mt-1" />
          </div>
          <div>
            <Label className="text-xs font-mono text-primary">Rating (0-5)</Label>
            <Input value={stockRating} onChange={(e) => setStockRating(e.target.value)} type="number" min="0.1" max="5" step="0.1" className="crt-input mt-1" />
          </div>
          <div>
            <Label className="text-xs font-mono text-primary">Sell Cost ($)</Label>
            <Input value={stockCost} onChange={(e) => setStockCost(e.target.value)} type="number" min="0.01" step="0.01" className="crt-input mt-1" />
          </div>
          <div>
            <Label className="text-xs font-mono text-primary">Quantity</Label>
            <Input value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} type="number" min="1" step="1" className="crt-input mt-1" />
          </div>
          <div>
            <Label className="text-xs font-mono text-primary">Listing Header (optional)</Label>
            <Input value={stockLabel} onChange={(e) => setStockLabel(e.target.value)} placeholder="Amazon Giftcards [USA]" className="crt-input mt-1" />
          </div>
          <div>
            <Label className="text-xs font-mono text-primary">Image URL (optional)</Label>
            <Input value={stockImageUrl} onChange={(e) => setStockImageUrl(e.target.value)} placeholder="https://..." className="crt-input mt-1" />
          </div>
        </div>

        <Button
          onClick={createGiftCardStock}
          disabled={creatingStock || (adminChecked && !isAdmin)}
          className="crt-button font-mono"
        >
          {creatingStock ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add Listing Stock Batch
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="crt-input pl-10"
        />
      </div>

      {/* Gift Cards List */}
      {filteredCards.length === 0 ? (
        <div className="panel-3d rounded-lg p-8 text-center">
          <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-mono">
            {searchTerm ? 'No gift cards match your search' : 'No gift cards created yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="panel-3d rounded-lg p-4 hover:border-primary/50 transition-all"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <code className="text-lg font-mono font-bold text-primary terminal-glow">
                      {card.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-primary/20"
                      onClick={() => copyCode(card.code)}
                    >
                      <Copy className="w-3 h-3 text-primary" />
                    </Button>
                    {getStatusBadge(card.status)}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Wallet className="w-3 h-3" />
                      ${card.balance.toFixed(2)} / ${card.initial_balance.toFixed(2)}
                    </span>
                    <span>Created: {new Date(card.created_at).toLocaleDateString()}</span>
                    {card.expires_at && (
                      <span>Expires: {new Date(card.expires_at).toLocaleDateString()}</span>
                    )}
                    {card.claimed_at && (
                      <span className="text-blue-400">
                        Claimed: {new Date(card.claimed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {card.pass2u_pass_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-mono border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => window.open(`https://www.pass2u.net/d/${card.pass2u_pass_id}`, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Wallet Pass
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                    onClick={() => deleteGiftCard(card.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
        <div className="panel-3d rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-bold text-primary">{giftCards.length}</div>
          <div className="text-xs text-muted-foreground font-mono">Total Cards</div>
        </div>
        <div className="panel-3d rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-bold text-green-400">
            {giftCards.filter(c => c.status === 'active').length}
          </div>
          <div className="text-xs text-muted-foreground font-mono">Active</div>
        </div>
        <div className="panel-3d rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-bold text-blue-400">
            {giftCards.filter(c => c.status === 'claimed').length}
          </div>
          <div className="text-xs text-muted-foreground font-mono">Claimed</div>
        </div>
        <div className="panel-3d rounded-lg p-4 text-center">
          <div className="text-2xl font-mono font-bold text-amber-400">
            ${giftCards.reduce((sum, c) => sum + c.initial_balance, 0).toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground font-mono">Total Value</div>
        </div>
      </div>
    </div>
  );
}
