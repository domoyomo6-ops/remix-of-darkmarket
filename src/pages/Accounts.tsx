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
  subway: 'bg-emerald-600',
  onlyfans: 'bg-sky-200',
  'dollar general': 'bg-yellow-400',
  'home depot': 'bg-orange-500',
  netflix: 'bg-black',
  spotify: 'bg-green-500',
  amazon: 'bg-amber-400',
  walmart: 'bg-blue-600',
  target: 'bg-red-600',
  apple: 'bg-zinc-900',
};

const fallbackColors = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
];

function getBrandColor(brand: string | null, index: number) {
  if (!brand) return fallbackColors[index % fallbackColors.length];
  return brandColors[brand.toLowerCase()] || fallbackColors[index % fallbackColors.length];
}

export default function Accounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('id, title, short_description, price, country, brand, image_url')
      .eq('is_active', true)
      .eq('product_type', 'accounts')
      .order('created_at', { ascending: false });

    setProducts(data || []);
    setLoading(false);
  };

  const handlePurchase = async (productId: string) => {
    if (!user) return;
    setPurchasing(productId);

    try {
      const { data, error } = await supabase.rpc('purchase_with_wallet', {
        p_product_id: productId,
      });
      if (error) throw error;

      if (data?.success) {
        toast({ title: 'Purchase successful!' });
        fetchProducts();
      }
    } catch (e: any) {
      toast({ title: 'Purchase failed', description: e.message, variant: 'destructive' });
    } finally {
      setPurchasing(null);
    }
  };

  const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  const filtered = brandFilter === 'all'
    ? products
    : products.filter(p => p.brand === brandFilter);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <User className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-mono font-bold terminal-glow">
              ACCOUNTS://
            </h1>
          </div>

          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {uniqueBrands.map(b => (
                <SelectItem key={b} value={b!}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((product, idx) => (
            <TiltCard
              key={product.id}
              product={product}
              idx={idx}
              purchasing={purchasing === product.id}
              onClick={() => handlePurchase(product.id)}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

/* ========================= */
/* ===== TILT CARD ========= */
/* ========================= */

function TiltCard({
  product,
  idx,
  purchasing,
  onClick,
}: {
  product: Product;
  idx: number;
  purchasing: boolean;
  onClick: () => void;
}) {
  const [style, setStyle] = useState({});

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX = ((y / rect.height) - 0.5) * -14;
    const rotateY = ((x / rect.width) - 0.5) * 14;

    setStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.06)`,
    });
  };

  return (
    <div
      onMouseMove={handleMove}
      onMouseLeave={() => setStyle({ transform: 'perspective(900px) rotateX(0) rotateY(0)' })}
      onClick={onClick}
      style={style}
      className={`
        relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer
        transition-transform duration-200 ease-out
        shadow-[0_10px_30px_rgba(0,0,0,0.45)]
        ${getBrandColor(product.brand, idx)}
        group
      `}
    >
      {/* 3D Border */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/30 before:to-black/50" />

      {/* Image */}
      {product.image_url && (
        <img
          src={product.image_url}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Price */}
      <Badge className="absolute top-3 right-3 z-10 bg-red-500">
        ${product.price.toFixed(2)}
      </Badge>

      {purchasing && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
          <Loader2 className="animate-spin w-8 h-8 text-white" />
        </div>
      )}

      {/* Light Sweep */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

