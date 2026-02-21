import { useState, useEffect } from 'react';
import { Loader2, RotateCcw, ShoppingCart, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addToCart } from '@/pages/Cart';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';

interface Product {
  id: string;
  title: string;
  short_description: string | null;
  price: number;
  country: string | null;
  brand: string | null;
  bank: string | null;
}

export default function Logz() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [cart, setCart] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, title, short_description, price, country, brand, bank')
      .eq('is_active', true)
      .eq('product_type', 'logz')
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
        description: "Max 100 items per cart.",
        variant: "destructive",
      });
      return;
    }
    available.forEach(p => addToCart(p.id));
    setCart([...cart, ...available.map(p => p.id)]);
    toast({ title: `Added ${available.length} items to cart` });
  };

  const resetFilters = () => {
    setCountryFilter('all');
    setCart([]);
  };

  const uniqueCountries = [...new Set(products.map(p => p.country).filter(Boolean))];
  const filteredProducts = countryFilter === 'all' 
    ? products 
    : products.filter(p => p.country === countryFilter);

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
      <div className="space-y-6 [perspective:1400px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-mono font-bold text-primary terminal-glow">LOGZ://3D_TERMINAL</h1>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <label className="text-xs text-muted-foreground mb-1 block">COUNTRY</label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueCountries.map(country => (
                    <SelectItem key={country} value={country!}>{country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={resetFilters}>
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset Filters
            </Button>
            <Button variant="outline" size="sm" onClick={() => addMultiple(5)}>Add 5</Button>
            <Button variant="outline" size="sm" onClick={() => addMultiple(10)}>Add 10</Button>
            <Button variant="outline" size="sm" onClick={() => addMultiple(15)}>Add 15</Button>
            <Button variant="outline" size="sm" onClick={() => addMultiple(25)}>Add 25</Button>
            <span className="text-xs text-muted-foreground ml-2">Max 100 items per cart.</span>
          </div>
        </div>

        {/* Product Table */}
        <div className="border border-primary/40 rounded-xl overflow-hidden bg-black/60 shadow-[0_20px_70px_rgba(0,0,0,0.55),0_0_35px_rgba(34,197,94,0.14)] [transform:rotateX(5deg)] origin-top">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border">
                <tr>
                  <th className="text-left p-3 text-muted-foreground font-medium">Title</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Description</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Country</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Brand</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Bank</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Purchase</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, idx) => (
                  <tr 
                    key={product.id} 
                    className={`border-b border-border/50 hover:bg-primary/10 hover:[transform:translateZ(22px)] transition-all duration-200 ${idx % 2 === 0 ? 'bg-background/85' : 'bg-card/35'}`}
                  >
                    <td className="p-3 font-mono text-foreground">{product.title}</td>
                    <td className="p-3 text-foreground">{product.short_description || '-'}</td>
                    <td className="p-3 text-foreground">{product.country || '-'}</td>
                    <td className="p-3 text-foreground">{product.brand || '-'}</td>
                    <td className="p-3 text-foreground">{product.bank || '-'}</td>
                    <td className="p-3 text-right">
                       <div className="flex items-center justify-end gap-2">
                        <Badge variant="destructive" className="font-mono">
                          ${product.price.toFixed(2)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 text-xs"
                          onClick={() => addToCartHandler(product.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Cart
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                          onClick={() => handlePurchase(product.id)}
                          disabled={purchasing === product.id}
                        >
                          {purchasing === product.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Buy'
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
            No logz available.
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
