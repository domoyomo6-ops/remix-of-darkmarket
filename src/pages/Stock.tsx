import { useState, useEffect } from 'react';
import { Loader2, RotateCcw, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';

interface Product {
  id: string;
  bin: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  expire: string | null;
  country: string | null;
  card_type: string | null;
  brand: string | null;
  bank: string | null;
  price: number;
  short_description: string | null;
}

export default function Stock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [bankFilter, setBankFilter] = useState<string>('all');
  const [cart, setCart] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, bin, city, state, zip, expire, country, card_type, brand, bank, price, short_description')
      .eq('is_active', true)
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

  const addToCart = (productId: string) => {
    if (cart.length >= 100) {
      toast({
        title: "Cart full",
        description: "Max 100 cards per cart.",
        variant: "destructive",
      });
      return;
    }
    setCart([...cart, productId]);
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
    setCart([...cart, ...available.map(p => p.id)]);
  };

  const resetFilters = () => {
    setBankFilter('all');
    setCart([]);
  };

  const uniqueBanks = [...new Set(products.map(p => p.bank).filter(Boolean))];
  const filteredProducts = bankFilter === 'all' 
    ? products 
    : products.filter(p => p.bank === bankFilter);

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
      <div className="space-y-6">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">BANK</label>
              <Select value={bankFilter} onValueChange={setBankFilter}>
                <SelectTrigger className="bg-card border-border">
                  <SelectValue placeholder="All Banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks</SelectItem>
                  {uniqueBanks.map(bank => (
                    <SelectItem key={bank} value={bank!}>{bank}</SelectItem>
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
            <span className="text-xs text-muted-foreground ml-2">Max 100 cards per cart.</span>
          </div>
        </div>

        {/* Product Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border">
                <tr>
                  <th className="text-left p-3 text-muted-foreground font-medium">Bin</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">City</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">State</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Zip</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Expire</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Country</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Card Type</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Brand</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">Bank</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">Purchase</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, idx) => (
                  <tr 
                    key={product.id} 
                    className={`border-b border-border/50 hover:bg-card/50 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-card/20'}`}
                  >
                    <td className="p-3 font-mono text-foreground">{product.bin || '-'}</td>
                    <td className="p-3 text-foreground">{product.city || '-'}</td>
                    <td className="p-3 text-foreground">{product.state || '-'}</td>
                    <td className="p-3 font-mono text-foreground">{product.zip || '-'}</td>
                    <td className="p-3 font-mono text-foreground">{product.expire || '-'}</td>
                    <td className="p-3 text-foreground">{product.country || '-'}</td>
                    <td className="p-3 text-foreground">{product.card_type || '-'}</td>
                    <td className="p-3 text-foreground">{product.brand || '-'}</td>
                    <td className="p-3 text-foreground">{product.bank || '-'}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge variant="destructive" className="font-mono">
                          ${product.price.toFixed(2)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs"
                          onClick={() => handlePurchase(product.id)}
                          disabled={purchasing === product.id}
                        >
                          {purchasing === product.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            product.short_description || 'Buy'
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
