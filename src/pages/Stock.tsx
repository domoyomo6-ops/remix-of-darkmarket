import { useState, useEffect } from 'react';
import { Loader2, RotateCcw, ShoppingCart, Plus, Sparkles, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addToCart } from '@/pages/Cart';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';

interface Product {
  id: string;
  bin: string | null;
  country: string | null;
  price: number;
  short_description: string | null;
}

export default function Stock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [cart, setCart] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, bin, country, price, short_description')
      .eq('is_active', true)
      .eq('product_type', 'stock')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handlePurchase = async (productId: string) => {
    if (!user) return;
    
    setPurchasing(productId);
    try {
      const { data, error } = await supabase.rpc('purchase_with_wallet', {
        p_product_id: productId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        toast({
          title: "Purchase successful!",
          description: "Check your orders page for the download.",
        });
        fetchProducts();
      } else {
        throw new Error(result.error || 'Purchase failed');
      }
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPurchasing(null);
    }
  };

  const addToCartHandler = (productId: string) => {
    addToCart(productId);
    toast({ title: 'Added to cart' });
  };

  const addMultiple = (count: number) => {
    const available = products.filter(p => !cart.includes(p.id)).slice(0, count);
    if (cart.length + available.length > 100) {
      toast({
        title: "Cart limit",
        description: "Max 100 cards per cart.",
        variant: "destructive",
      });
      return;
    }
    available.forEach(p => addToCart(p.id));
    setCart([...cart, ...available.map(p => p.id)]);
    toast({ title: `Added ${available.length} items to cart` });
  };

  const resetFilters = () => {
    setCart([]);
  };
  const filteredProducts = products;

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-fuchsia-500/15 via-primary/10 to-cyan-500/15 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-2xl font-mono font-bold terminal-glow flex items-center gap-2"><Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />STOCK://LIVE_MARKET</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground font-mono">Immersive stock terminal with quick batch cart actions.</p>
            </div>
            <Badge className="font-mono text-xs"><Boxes className="w-3 h-3 mr-1" />{filteredProducts.length} LIVE</Badge>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={resetFilters} className="text-xs">
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={() => addMultiple(5)} className="text-xs">+5</Button>
            <Button variant="outline" size="sm" onClick={() => addMultiple(10)} className="text-xs">+10</Button>
            <Button variant="outline" size="sm" onClick={() => addMultiple(25)} className="text-xs">+25</Button>
            <span className="text-[10px] text-muted-foreground ml-1">Max 100</span>
          </div>
        </div>

        {/* Product Table */}
        <div className="rounded-xl border border-primary/30 bg-gradient-to-b from-card/80 via-background to-card/30 p-2 sm:p-3 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full border-separate border-spacing-y-1 sm:border-spacing-y-2 text-xs sm:text-sm min-w-[320px]">
              <thead className="bg-card/80">
                <tr>
                  <th className="rounded-l-md border-y border-l border-border/70 p-2 sm:p-3 text-left font-medium text-muted-foreground">Bin</th>
                  <th className="border-y border-border/70 p-2 sm:p-3 text-left font-medium text-muted-foreground">Country</th>
                  <th className="rounded-r-md border-y border-r border-border/70 p-2 sm:p-3 text-right font-medium text-muted-foreground">Purchase</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, idx) => (
                  <tr 
                    key={product.id} 
                    className={`transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(245,158,11,0.16)] ${idx % 2 === 0 ? 'bg-background/90' : 'bg-card/35'}`}
                  >
                    <td className="rounded-l-lg border border-r-0 border-border/70 p-2 sm:p-3 font-mono text-foreground text-xs">{product.bin || '-'}</td>
                    <td className="border-y border-border/70 p-2 sm:p-3 text-foreground text-xs">{product.country || '-'}</td>
                    <td className="rounded-r-lg border border-l-0 border-border/70 p-2 sm:p-3 text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
                         <Badge variant="destructive" className="font-mono text-[10px] sm:text-xs">
                          ${product.price.toFixed(2)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-primary/30 text-primary hover:bg-primary/10 text-[10px] sm:text-xs h-7 px-2"
                          onClick={() => addToCartHandler(product.id)}
                        >
                          <Plus className="w-3 h-3" />
                          <span className="hidden sm:inline ml-1">Cart</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] sm:text-xs h-7 px-2"
                          onClick={() => handlePurchase(product.id)}
                          disabled={purchasing === product.id}
                        >
                          {purchasing === product.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <span className="truncate max-w-[60px] sm:max-w-none">{product.short_description || 'Buy'}</span>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No products available.
          </div>
        )}

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="fixed bottom-4 right-4 bg-card border border-primary p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span className="font-mono">{cart.length} items</span>
              <Button size="sm" onClick={() => setCart([])}>Clear</Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
