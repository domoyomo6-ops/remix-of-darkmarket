import { useState, useEffect } from 'react';
import { Loader2, User } from 'lucide-react';
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
  image_url: string | null;
}

const brandColors: Record<string, string> = {
  'subway': 'bg-emerald-600',
  'onlyfans': 'bg-sky-200',
  'dollar general': 'bg-yellow-400',
  'home depot': 'bg-orange-500',
  'panda express': 'bg-red-600',
  'steak n shake': 'bg-rose-800',
  'panera': 'bg-olive-600',
  'ihg': 'bg-orange-500',
  'bloomingdales': 'bg-zinc-900',
  'grubhub': 'bg-orange-500',
  'perpay': 'bg-blue-600',
  'bank': 'bg-blue-600',
  'ulta': 'bg-orange-600',
  'papa johns': 'bg-red-600',
  'nike': 'bg-blue-600',
  'macys': 'bg-white',
  'netflix': 'bg-black',
  'spotify': 'bg-green-500',
  'amazon': 'bg-amber-400',
  'walmart': 'bg-blue-600',
  'target': 'bg-red-600',
  'starbucks': 'bg-green-700',
  'apple': 'bg-zinc-900',
  'google': 'bg-white',
  'facebook': 'bg-blue-600',
  'instagram': 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
  'twitter': 'bg-sky-500',
  'paypal': 'bg-blue-700',
  'venmo': 'bg-sky-400',
  'cashapp': 'bg-green-500',
};
const fallbackColors = [
  'bg-red-500','bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500',
  'bg-pink-500','bg-cyan-500','bg-amber-500','bg-indigo-500','bg-teal-500',
];
function getBrandColor(brand: string | null, index: number): string {
  if (!brand) return fallbackColors[index % fallbackColors.length];
  const key = brand.toLowerCase();
  return brandColors[key] || fallbackColors[index % fallbackColors.length];
}

export default function Accounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>('all');

  // NEW: Test Imgur image URL as a fake product
  const [testImageUrl, setTestImageUrl] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, title, short_description, price, country, brand, image_url')
      .eq('is_active', true)
      .eq('product_type', 'accounts')
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
      const { data, error } = await supabase.rpc('purchase_with_wallet', { p_product_id: productId });
      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        toast({ title: "Purchase successful!", description: "Check your orders page for the download." });
        fetchProducts();
      } else throw new Error(result.error || 'Purchase failed');
    } catch (error: any) {
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    } finally {
      setPurchasing(null);
    }
  };

  const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  let filteredProducts = brandFilter === 'all' 
    ? products 
    : products.filter(p => p.brand === brandFilter);

  // Add test Imgur product if URL is provided
  if (testImageUrl) {
    filteredProducts = [
      {
        id: 'test-imgur',
        title: 'Test Image',
        short_description: 'This is a test Imgur product',
        price: 0,
        country: null,
        brand: null,
        image_url: testImageUrl
      },
      ...filteredProducts
    ];
  }

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

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-mono font-bold text-primary terminal-glow">ACCOUNTS://</h1>
          </div>

          {/* Filter */}
          <div className="w-48">
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="bg-card border-border">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {uniqueBrands.map(brand => (
                  <SelectItem key={brand} value={brand!}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* NEW: Imgur Test URL Input */}
        <div className="mb-6 flex flex-col md:flex-row gap-3 items-start">
          <input 
            type="text"
            placeholder="https://imgur.com/a/xqJkjGm"
            value={testImageUrl}
            onChange={e => setTestImageUrl(e.target.value)}
            className="border border-border rounded px-3 py-2 flex-1 bg-card text-white placeholder:text-muted-foreground"
          />
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product, idx) => (
            <div
              key={product.id}
              onClick={() => handlePurchase(product.id)}
              className={`
                relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer
                transition-all duration-300 hover:scale-105 hover:shadow-2xl
                ${getBrandColor(product.brand, idx)}
                group
              `}
            >
              <Badge className="absolute top-3 right-3 z-10 bg-red-500 hover:bg-red-500 text-white font-bold text-xs px-2 py-1">
                {product.price > 0 ? `From $${product.price.toFixed(2)}` : 'Test'}
              </Badge>

              {purchasing === product.id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center p-4">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.title}
                    className="max-w-[80%] max-h-[60%] object-contain drop-shadow-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                ) : null}
                <div 
                  className="text-center" 
                  style={{ display: product.image_url ? 'none' : 'block' }}
                >
                  <h3 className="text-white font-bold text-xl md:text-2xl lg:text-3xl drop-shadow-lg uppercase tracking-wide">
                    {product.brand || product.title}
                  </h3>
                  {product.short_description && (
                    <p className="text-white/80 text-xs mt-1 font-medium">
                      {product.short_description}
                    </p>
                  )}
                </div>
              </div>

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No accounts available.
          </div>
        )}

      </div>
    </MainLayout>
  );
}


