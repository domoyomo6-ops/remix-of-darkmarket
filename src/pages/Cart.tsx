import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Loader2, Terminal, Zap, Package, CreditCard, Shield, X, Skull, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { TerminalWindow, GlitchText, Text3D, HackingProgress, RandomDataStream } from '@/components/ui/terminal-effects';

interface CartProduct {
  id: string;
  title: string;
  short_description: string | null;
  price: number;
  brand: string | null;
  image_url: string | null;
  product_type: string | null;
  category: string;
}

// Cart stored in localStorage
function getCart(): string[] {
  try {
    return JSON.parse(localStorage.getItem('hell5tar_cart') || '[]');
  } catch { return []; }
}

function setCartStorage(ids: string[]) {
  localStorage.setItem('hell5tar_cart', JSON.stringify(ids));
  window.dispatchEvent(new Event('cart-update'));
}

export function addToCart(id: string) {
  const cart = getCart();
  if (!cart.includes(id)) {
    setCartStorage([...cart, id]);
  }
}

export function removeFromCart(id: string) {
  setCartStorage(getCart().filter(i => i !== id));
}

export function clearCart() {
  setCartStorage([]);
}

export function getCartCount(): number {
  return getCart().length;
}

export default function Cart() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseProgress, setPurchaseProgress] = useState(0);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCartProducts();
  }, []);

  const fetchCartProducts = async () => {
    const cartIds = getCart();
    if (cartIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('products')
      .select('id, title, short_description, price, brand, image_url, product_type, category')
      .in('id', cartIds)
      .eq('is_active', true);

    setProducts(data || []);
    // Clean up any products that are no longer active
    if (data) {
      const activeIds = data.map(p => p.id);
      const cleaned = cartIds.filter(id => activeIds.includes(id));
      if (cleaned.length !== cartIds.length) {
        setCartStorage(cleaned);
      }
    }
    setLoading(false);
  };

  const handleRemove = (id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      removeFromCart(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setRemovingId(null);
      toast({ title: 'Removed from cart' });
    }, 300);
  };

  const handleClearAll = () => {
    clearCart();
    setProducts([]);
    toast({ title: 'Cart cleared' });
  };

  const handleBulkPurchase = async () => {
    if (!user || products.length === 0) return;
    setPurchasing(true);
    setPurchaseProgress(0);

    let successes = 0;
    let failures = 0;

    for (let i = 0; i < products.length; i++) {
      try {
        const { data, error } = await supabase.rpc('purchase_with_wallet', {
          p_product_id: products[i].id,
        });
        if (error) throw error;
        const result = data as { success?: boolean } | null;
        if (result?.success) successes++;
        else failures++;
      } catch {
        failures++;
      }
      setPurchaseProgress(Math.round(((i + 1) / products.length) * 100));
    }

    clearCart();
    setPurchasing(false);
    toast({
      title: `Purchase complete`,
      description: `${successes} succeeded, ${failures} failed. Check your orders.`,
    });
    navigate('/orders');
  };

  const total = products.reduce((sum, p) => sum + p.price, 0);
  const typeLabel = (t: string | null) => {
    if (t === 'stock') return { label: 'STOCK', color: 'text-primary border-primary/30' };
    if (t === 'logz') return { label: 'LOGZ', color: 'text-purple-400 border-purple-400/30' };
    if (t === 'accounts') return { label: 'ACCOUNTS', color: 'text-emerald-400 border-emerald-400/30' };
    return { label: 'ITEM', color: 'text-muted-foreground border-border' };
  };

  return (
    <MainLayout>
      <div className="min-h-screen relative">
        {/* Scan line */}
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-20">
          <div className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
        </div>

        <div className="container mx-auto px-4 py-6 sm:py-8 relative z-20 max-w-5xl">

          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-primary/10 border border-primary/20 mb-4">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono text-primary">root@hell5tar:~/cart$</span>
              <span className="w-2 h-4 bg-primary animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-mono font-bold mb-2">
              <Text3D className="text-primary">SHOPPING_CART://</Text3D>
            </h1>
            <p className="text-muted-foreground text-sm font-mono">
              {products.length} item(s) in queue • Total: ${total.toFixed(2)}
            </p>
          </div>

          {loading ? (
            <TerminalWindow title="loading_cart">
              <div className="p-8 flex flex-col items-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <span className="text-xs font-mono text-muted-foreground">SCANNING INVENTORY...</span>
              </div>
            </TerminalWindow>
          ) : products.length === 0 ? (
            /* Empty state */
            <TerminalWindow title="cart_empty" className="mb-8">
              <div className="p-12 sm:p-16 text-center">
                <div className="relative inline-block mb-6">
                  <ShoppingCart className="w-20 h-20 text-primary/20 mx-auto" />
                  <Skull className="w-8 h-8 text-primary/40 absolute -top-2 -right-2 animate-float" />
                </div>
                <pre className="text-sm font-mono text-muted-foreground mb-6 max-w-xs mx-auto">
{`> scan cart
> result: EMPTY
> status: NOTHING_HERE
> suggestion: GO_SHOPPING`}
                </pre>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button className="crt-button" onClick={() => navigate('/stock')}>
                    <Package className="w-4 h-4 mr-2" /> BROWSE STOCK
                  </Button>
                  <Button variant="outline" className="border-purple-500/40 text-purple-400 hover:bg-purple-500/10" onClick={() => navigate('/logz')}>
                    BROWSE LOGZ
                  </Button>
                  <Button variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" onClick={() => navigate('/accounts')}>
                    BROWSE ACCOUNTS
                  </Button>
                </div>
              </div>
            </TerminalWindow>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-3">
                <TerminalWindow title="cart_items">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono text-muted-foreground uppercase">
                        {products.length} ITEMS QUEUED
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs font-mono"
                        onClick={handleClearAll}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> CLEAR ALL
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {products.map((product, idx) => {
                        const tl = typeLabel(product.product_type);
                        const isRemoving = removingId === product.id;
                        return (
                          <div
                            key={product.id}
                            className={`
                              group relative flex items-center gap-4 p-3 rounded-lg
                              border border-border/50 bg-card/30
                              hover:border-primary/30 hover:bg-card/60
                              transition-all duration-300
                              ${isRemoving ? 'opacity-0 scale-95 -translate-x-4' : 'opacity-100'}
                            `}
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            {/* Product image/icon */}
                            <div className="w-14 h-14 rounded-lg border border-primary/20 bg-background/80 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-6 h-6 text-primary/40" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm text-primary font-semibold truncate">
                                  {product.title}
                                </span>
                                <Badge variant="outline" className={`text-[10px] font-mono ${tl.color}`}>
                                  {tl.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {product.short_description || product.brand || 'Digital asset'}
                              </p>
                            </div>

                            {/* Price */}
                            <span className="font-mono font-bold text-primary text-sm whitespace-nowrap">
                              ${product.price.toFixed(2)}
                            </span>

                            {/* Remove */}
                            <button
                              onClick={() => handleRemove(product.id)}
                              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TerminalWindow>
              </div>

              {/* Checkout Panel */}
              <div className="lg:col-span-1">
                <div className="sticky top-20 space-y-4">
                  <TerminalWindow title="checkout" variant="success">
                    <div className="p-5 space-y-5">
                      {/* Crown decoration */}
                      <div className="text-center">
                        <Crown className="w-8 h-8 text-[hsl(45,100%,50%)] mx-auto mb-2 animate-float" />
                        <span className="text-xs font-mono text-muted-foreground">ORDER SUMMARY</span>
                      </div>

                      {/* Summary */}
                      <div className="space-y-2 text-sm font-mono">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Items ({products.length})</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Processing</span>
                          <span className="text-primary">FREE</span>
                        </div>
                        <div className="border-t border-primary/20 pt-2 flex justify-between text-lg font-bold text-primary">
                          <span>TOTAL</span>
                          <span className="terminal-glow">${total.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Security badges */}
                      <div className="flex items-center gap-2 justify-center">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                          <Shield className="w-3 h-3 text-primary" /> ENCRYPTED
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                          <Zap className="w-3 h-3 text-yellow-400" /> INSTANT
                        </div>
                      </div>

                      {/* Purchase progress */}
                      {purchasing && (
                        <div className="space-y-2">
                          <HackingProgress label="PROCESSING" progress={purchaseProgress} status="active" />
                          <RandomDataStream lines={2} />
                        </div>
                      )}

                      {/* Checkout button */}
                      <Button
                        className="w-full crt-button py-6 text-base relative overflow-hidden group"
                        onClick={handleBulkPurchase}
                        disabled={purchasing || products.length === 0}
                      >
                        {purchasing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            PROCESSING...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-5 h-5 mr-2" />
                            <GlitchText>{`CHECKOUT — $${total.toFixed(2)}`}</GlitchText>
                          </>
                        )}
                        {/* Sweep effect */}
                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
                      </Button>

                      <p className="text-[10px] text-center text-muted-foreground font-mono">
                        Funds deducted from wallet balance
                      </p>
                    </div>
                  </TerminalWindow>

                  {/* Continue shopping */}
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/10 font-mono text-sm"
                    onClick={() => navigate('/stock')}
                  >
                    ← CONTINUE SHOPPING
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
