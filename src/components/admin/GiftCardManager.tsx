import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Gift, Copy, Trash2, Loader2, CreditCard, Wallet,
  ExternalLink, Search, Package, Star, DollarSign, Hash, Image,
  Tag, Globe, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────
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

interface StockForm {
  store: string;
  region: string;
  optionLabel: string;
  denomination: string;
  rating: string;
  cost: string;
  quantity: string;
  listingLabel: string;
  imageUrl: string;
}

// ── Helpers ───────────────────────────────────────────────────
const errMsg = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && e !== null) {
    for (const key of ['message', 'error', 'error_description', 'details', 'hint']) {
      if (key in e && typeof (e as Record<string, unknown>)[key] === 'string') {
        return (e as Record<string, string>)[key];
      }
    }
    try { return JSON.stringify(e); } catch { /* */ }
  }
  return String(e);
};

const normalizeCode = (code: string) => code.trim().toUpperCase().slice(0, 19);

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  claimed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  expired: 'bg-red-500/20 text-red-400 border-red-500/30',
  depleted: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const DEFAULT_STOCK: StockForm = {
  store: 'Amazon',
  region: 'USA',
  optionLabel: '$25 Amazon Card',
  denomination: '25',
  rating: '5.0',
  cost: '20',
  quantity: '10',
  listingLabel: '',
  imageUrl: '',
};

// ── Component ─────────────────────────────────────────────────
export default function GiftCardManager() {
  const { user } = useAuth();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // Create form
  const [amount, setAmount] = useState('25');
  const [manualCode, setManualCode] = useState('');
  const [expiresIn, setExpiresIn] = useState('');

  // Stock form
  const [stock, setStock] = useState<StockForm>({ ...DEFAULT_STOCK });
  const [creatingStock, setCreatingStock] = useState(false);

  const updateStock = useCallback(
    (patch: Partial<StockForm>) => setStock((p) => ({ ...p, ...patch })),
    [],
  );

  // ── Init ────────────────────────────────────────────────────
  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  // ── Data fetching ───────────────────────────────────────────
  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load gift cards');
    } else {
      setCards(data || []);
    }
    setLoading(false);
  };

  // ── Generate code ───────────────────────────────────────────
  const generateCode = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_gift_card_code');
    if (!error && data) return normalizeCode(data);
    // Fallback
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return normalizeCode(`HELL5TAR-${hex}`);
  };

  // ── Create gift card ────────────────────────────────────────
  const createGiftCard = async () => {
    if (!user || !isAdmin) return;
    setCreating(true);

    try {
      const code = manualCode.trim() ? normalizeCode(manualCode) : await generateCode();
      const bal = parseFloat(amount);
      if (!code || isNaN(bal) || bal <= 0) {
        toast.error('Enter a valid code and amount');
        setCreating(false);
        return;
      }

      let expiresAt: string | null = null;
      if (expiresIn) {
        const days = parseInt(expiresIn);
        if (!isNaN(days) && days > 0) {
          expiresAt = new Date(Date.now() + days * 86400000).toISOString();
        }
      }

      const { data: card, error } = await supabase
        .from('gift_cards')
        .insert({ code, balance: bal, initial_balance: bal, created_by: user.id, expires_at: expiresAt })
        .select()
        .single();
      if (error) throw error;
      if (!card) throw new Error('No data returned');

      // Try Pass2U (optional)
      try {
        await supabase.functions.invoke('create-pass2u-card', {
          body: { giftCardId: card.id, code, balance: bal, expiresAt },
        });
      } catch { /* Pass2U not configured */ }

      toast.success('Gift card created!');
      fetchCards();
      setShowCreate(false);
      setAmount('25');
      setManualCode('');
      setExpiresIn('');
    } catch (e) {
      toast.error(`Failed: ${errMsg(e)}`);
    }
    setCreating(false);
  };

  // ── Delete ──────────────────────────────────────────────────
  const deleteCard = async (id: string) => {
    if (!confirm('Delete this gift card?')) return;
    const { error } = await supabase.from('gift_cards').delete().eq('id', id);
    if (error) toast.error('Delete failed');
    else { toast.success('Deleted'); fetchCards(); }
  };

  // ── Create stock batch ──────────────────────────────────────
  const createStockBatch = async () => {
    if (!user || !isAdmin) return;

    const denom = Number(stock.denomination);
    const cost = Number(stock.cost);
    const qty = Number(stock.quantity);
    const rating = Number(stock.rating);
    const store = stock.store.trim();

    if (!store) { toast.error('Store name required'); return; }
    if (!Number.isFinite(denom) || denom <= 0) { toast.error('Valid denomination required'); return; }
    if (!Number.isFinite(cost) || cost <= 0) { toast.error('Valid cost required'); return; }
    if (!Number.isInteger(qty) || qty <= 0) { toast.error('Valid quantity required'); return; }
    if (!Number.isFinite(rating) || rating < 0 || rating > 5) { toast.error('Rating 0–5'); return; }

    setCreatingStock(true);

    const region = stock.region.trim() || 'GLOBAL';
    const denomLabel = denom % 1 === 0 ? `${denom}` : denom.toFixed(2);
    const listingTitle = stock.listingLabel.trim() || `${store} Giftcards [${region}]`;
    const optLabel = stock.optionLabel.trim() || `$${denomLabel} ${store} Card`;

    const rows = Array.from({ length: qty }, (_, i) => ({
      title: optLabel,
      description: `Store listing: ${listingTitle}. Unit ${i + 1}/${qty}. 24hr replacement support.`,
      short_description: `option:${optLabel}|rating:${rating.toFixed(1)}|denomination:${denomLabel}`,
      price: cost,
      category: 'assets' as const,
      product_type: 'giftcards',
      brand: store,
      country: region,
      image_url: stock.imageUrl.trim() || null,
      is_active: true,
    }));

    const { error } = await supabase.from('products').insert(rows);
    if (error) {
      toast.error(`Stock creation failed: ${error.message}`);
    } else {
      toast.success(`Added ${qty}× ${optLabel} at $${cost.toFixed(2)} each`);
    }
    setCreatingStock(false);
  };

  // ── Derived ─────────────────────────────────────────────────
  const filtered = cards.filter((c) => c.code.toLowerCase().includes(search.toLowerCase()));
  const stats = {
    total: cards.length,
    active: cards.filter((c) => c.status === 'active').length,
    claimed: cards.filter((c) => c.status === 'claimed').length,
    value: cards.reduce((s, c) => s + c.initial_balance, 0),
  };

  // ── Render ──────────────────────────────────────────────────
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
          <h2 className="text-lg font-mono font-bold text-primary terminal-glow">GIFTCARD_MANAGER://</h2>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="crt-button font-mono">
              <Plus className="w-4 h-4 mr-2" /> Create Gift Card
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-primary/30">
            <DialogHeader>
              <DialogTitle className="text-primary font-mono flex items-center gap-2">
                <CreditCard className="w-5 h-5" /> Create Gift Card
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-primary font-mono text-xs">BALANCE ($)</Label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25.00" className="crt-input mt-1" min="1" step="0.01" />
              </div>
              <div>
                <Label className="text-primary font-mono text-xs">CODE (optional)</Label>
                <Input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Auto-generate if empty" className="crt-input mt-1" maxLength={19} />
              </div>
              <div>
                <Label className="text-primary font-mono text-xs">EXPIRES IN (days, optional)</Label>
                <Input type="number" value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} placeholder="No expiry" className="crt-input mt-1" min="1" />
              </div>
              <Button onClick={createGiftCard} disabled={creating || !isAdmin} className="w-full crt-button font-mono">
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Gift className="w-4 h-4 mr-2" />}
                {creating ? 'Creating...' : 'Generate Gift Card'}
              </Button>
              {!isAdmin && (
                <p className="text-xs text-amber-400 font-mono text-center">Admin access required.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stock" className="font-mono text-xs">
            <Package className="h-3.5 w-3.5 mr-1.5" /> Stock Manager
          </TabsTrigger>
          <TabsTrigger value="cards" className="font-mono text-xs">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Gift Cards ({cards.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Stock Manager Tab ── */}
        <TabsContent value="stock" className="space-y-4 pt-2">
          <div className="panel-3d rounded-lg p-5 border border-primary/20 bg-primary/5 space-y-4">
            <div>
              <h3 className="font-mono font-bold text-primary text-sm">STORE LISTING STOCK</h3>
              <p className="font-mono text-xs text-muted-foreground mt-1">
                Add third-party gift card inventory (Amazon, Visa, etc.) with denomination tiers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-mono text-primary flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Store Name
                </Label>
                <Input value={stock.store} onChange={(e) => updateStock({ store: e.target.value })} placeholder="Amazon" className="crt-input mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono text-primary flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Region
                </Label>
                <Input value={stock.region} onChange={(e) => updateStock({ region: e.target.value })} placeholder="USA" className="crt-input mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono text-primary flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Option Label
                </Label>
                <Input value={stock.optionLabel} onChange={(e) => updateStock({ optionLabel: e.target.value })} placeholder="$25 Amazon Card" className="crt-input mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono text-primary flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Denomination ($)
                </Label>
                <Input value={stock.denomination} onChange={(e) => updateStock({ denomination: e.target.value })} type="number" min="1" step="0.01" className="crt-input mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono text-primary flex items-center gap-1">
                  <Star className="h-3 w-3" /> Rating (0–5)
                </Label>
                <Input value={stock.rating} onChange={(e) => updateStock({ rating: e.target.value })} type="number" min="0" max="5" step="0.1" className="crt-input mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono text-primary flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Sell Cost ($)
                </Label>
                <Input value={stock.cost} onChange={(e) => updateStock({ cost: e.target.value })} type="number" min="0.01" step="0.01" className="crt-input mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono text-primary flex items-center gap-1">
                  <Hash className="h-3 w-3" /> Quantity
                </Label>
                <Input value={stock.quantity} onChange={(e) => updateStock({ quantity: e.target.value })} type="number" min="1" step="1" className="crt-input mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono text-primary">Listing Header (optional)</Label>
                <Input value={stock.listingLabel} onChange={(e) => updateStock({ listingLabel: e.target.value })} placeholder="Amazon Giftcards [USA]" className="crt-input mt-1" />
              </div>
              <div>
                <Label className="text-xs font-mono text-primary flex items-center gap-1">
                  <Image className="h-3 w-3" /> Image URL (optional)
                </Label>
                <Input value={stock.imageUrl} onChange={(e) => updateStock({ imageUrl: e.target.value })} placeholder="https://..." className="crt-input mt-1" />
              </div>
            </div>

            <Button onClick={createStockBatch} disabled={creatingStock || !isAdmin} className="crt-button font-mono w-full sm:w-auto">
              {creatingStock ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Stock Batch
            </Button>
          </div>
        </TabsContent>

        {/* ── Gift Cards Tab ── */}
        <TabsContent value="cards" className="space-y-4 pt-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="crt-input pl-10"
            />
          </div>

          {/* Cards list */}
          {filtered.length === 0 ? (
            <div className="panel-3d rounded-lg p-8 text-center">
              <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-mono">
                {search ? 'No matching cards' : 'No gift cards yet'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((card) => (
                <div key={card.id} className="panel-3d rounded-lg p-4 hover:border-primary/50 transition-all">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <code className="text-lg font-mono font-bold text-primary terminal-glow">{card.code}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/20" onClick={() => { navigator.clipboard.writeText(card.code); toast.success('Copied!'); }}>
                          <Copy className="w-3 h-3 text-primary" />
                        </Button>
                        <Badge className={STATUS_STYLES[card.status] || ''}>{card.status}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono">
                        <span className="flex items-center gap-1">
                          <Wallet className="w-3 h-3" /> ${card.balance.toFixed(2)} / ${card.initial_balance.toFixed(2)}
                        </span>
                        <span>Created: {new Date(card.created_at).toLocaleDateString()}</span>
                        {card.expires_at && <span>Expires: {new Date(card.expires_at).toLocaleDateString()}</span>}
                        {card.claimed_at && <span className="text-blue-400">Claimed: {new Date(card.claimed_at).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {card.pass2u_pass_id && (
                        <Button variant="outline" size="sm" className="font-mono border-primary/30 text-primary hover:bg-primary/10" onClick={() => window.open(`https://www.pass2u.net/d/${card.pass2u_pass_id}`, '_blank')}>
                          <ExternalLink className="w-3 h-3 mr-1" /> Pass
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-500/20" onClick={() => deleteCard(card.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { label: 'Total', value: stats.total, color: 'text-primary' },
              { label: 'Active', value: stats.active, color: 'text-emerald-400' },
              { label: 'Claimed', value: stats.claimed, color: 'text-blue-400' },
              { label: 'Value', value: `$${stats.value.toFixed(2)}`, color: 'text-amber-400' },
            ].map((s) => (
              <div key={s.label} className="panel-3d rounded-lg p-4 text-center">
                <div className={`text-2xl font-mono font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground font-mono">{s.label}</div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
