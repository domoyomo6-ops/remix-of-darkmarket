import { useState, useEffect } from 'react';
import { Package, Loader2, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SoldProduct {
  id: string;
  title: string;
  price: number;
  bin: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  brand: string | null;
  bank: string | null;
  created_at: string;
  updated_at: string;
}

export default function SoldProductsManager() {
  const [products, setProducts] = useState<SoldProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSoldProducts();
  }, []);

  const fetchSoldProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, title, price, bin, city, state, country, brand, bank, created_at, updated_at')
      .eq('is_active', false)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching sold products:', error);
      toast.error('Failed to load sold products');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const handleReactivate = async (id: string) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to reactivate product');
      console.error(error);
    } else {
      toast.success('Product reactivated');
      fetchSoldProducts();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="panel-3d rounded-lg p-4 sm:p-6 depth-shadow">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-red-400" />
          <h2 className="text-lg sm:text-xl font-mono font-bold text-primary terminal-glow">
            SOLD_PRODUCTS://
          </h2>
          <Badge variant="secondary" className="font-mono">
            {products.length} items
          </Badge>
        </div>
        <Button 
          variant="outline"
          className="w-full sm:w-auto"
          onClick={fetchSoldProducts}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-mono text-sm">NO_SOLD_PRODUCTS</p>
          <p className="text-muted-foreground/60 font-mono text-xs mt-1">Products appear here after purchase</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border">
                <tr>
                  <th className="text-left p-3 text-muted-foreground font-medium font-mono">BIN</th>
                  <th className="text-left p-3 text-muted-foreground font-medium font-mono">Location</th>
                  <th className="text-left p-3 text-muted-foreground font-medium font-mono">Brand</th>
                  <th className="text-left p-3 text-muted-foreground font-medium font-mono">Bank</th>
                  <th className="text-left p-3 text-muted-foreground font-medium font-mono">Sold</th>
                  <th className="text-right p-3 text-muted-foreground font-medium font-mono">Price</th>
                  <th className="text-right p-3 text-muted-foreground font-medium font-mono">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, idx) => (
                  <tr 
                    key={product.id} 
                    className={`border-b border-border/50 hover:bg-card/50 transition-colors ${idx % 2 === 0 ? 'bg-background' : 'bg-card/20'}`}
                  >
                    <td className="p-3 font-mono text-foreground">{product.bin || '-'}</td>
                    <td className="p-3 text-foreground">
                      {[product.city, product.state, product.country].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="p-3 text-foreground">{product.brand || '-'}</td>
                    <td className="p-3 text-foreground">{product.bank || '-'}</td>
                    <td className="p-3 text-muted-foreground font-mono text-xs">
                      {format(new Date(product.updated_at), 'MM/dd/yy HH:mm')}
                    </td>
                    <td className="p-3 text-right">
                      <Badge variant="outline" className="font-mono text-green-400 border-green-400/30">
                        ${product.price.toFixed(2)}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs hover:bg-primary/10"
                        onClick={() => handleReactivate(product.id)}
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Reactivate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}