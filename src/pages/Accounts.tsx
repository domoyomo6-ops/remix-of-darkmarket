import { useState, useEffect, useRef } from 'react';
import { Loader2, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  title: string;
  short_description: string | null;
  price: number;
  brand: string | null;
  image_url: string | null;
}

const fallbackColors = [
  'bg-red-600',
  'bg-blue-600',
  'bg-green-600',
  'bg-purple-600',
  'bg-orange-600',
];

const getColor = (_brand: string | null, i: number) =>
  fallbackColors[i % fallbackColors.length];

export default function Accounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState('all');
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('id,title,short_description,price,brand,image_url')
      .eq('is_active', true)
      .eq('product_type', 'accounts')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts(data || []);
        setLoading(false);
      });
  }, []);

  const handlePurchase = async (productId: string) => {
    if (!user) return;

    setPurchasing(productId);
    try {
      const { data, error } = await supabase.rpc('purchase_with_wallet', {
        p_product_id: productId,
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Purchase successful',
          description: 'Check your orders page.',
        });
      }
    } catch (e: any) {
      toast({
        title: 'Purchase failed',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setPurchasing(null);
    }
  };

  const filtered =
    brandFilter === 'all'
      ? products
      : products.filter(p => p.brand === brandFilter);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center min-h-[60vh] items-center">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
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
              {[...new Set(products.map(p => p.brand).filter(Boolean))].map(b => (
                <SelectItem key={b} value={b!}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((p, i) => (
            <UltraCard
              key={p.id}
              product={p}
              bg={getColor(p.brand, i)}
              purchasing={purchasing === p.id}
              onNavigate={() => navigate(`/accounts/${p.id}`)}
              onBuy={() => handlePurchase(p.id)}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

/* ========================== */
/* ===== ULTRA CARD ========= */
/* ========================== */

function UltraCard({
  product,
  bg,
  purchasing,
  onNavigate,
  onBuy,
}: {
  product: Product;
  bg: string;
  purchasing: boolean;
  onNavigate: () => void;
  onBuy: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<any>({});
  const [glow, setGlow] = useState<any>({});

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    const rx = ((y / r.height) - 0.5) * -18;
    const ry = ((x / r.width) - 0.5) * 18;

    setStyle({
      transform: `
        perspective(1200px)
        rotateX(${rx}deg)
        rotateY(${ry}deg)
        scale(1.08)
      `,
    });

    setGlow({
      background: `radial-gradient(
        600px at ${x}px ${y}px,
        rgba(255,255,255,.35),
        transparent 60%
      )`,
    });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => {
        setStyle({ transform: 'perspective(1200px) rotateX(0) rotateY(0)' });
        setGlow({});
      }}
      onClick={onNavigate}
      style={style}
      className={`
        relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer
        transition-transform duration-200 ease-out
        ${bg}
        group
      `}
    >
      {/* Neon Border */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none">
        <div className="absolute inset-0 animate-spin-slow bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-purple-600 opacity-70 blur-md" />
        <div className="absolute inset-[2px] rounded-2xl bg-black/30" />
      </div>

      {/* Image */}
      {product.image_url && (
        <img
          src={product.image_url}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      )}

      {/* Cursor Light */}
      <div
        className="absolute inset-0 mix-blend-overlay pointer-events-none"
        style={glow}
      />

      {/* Price */}
      <Badge className="absolute top-3 right-3 z-20 bg-red-500">
        ${product.price.toFixed(2)}
      </Badge>

      {/* BUY BUTTON */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // 🔥 keeps navigation intact
          onBuy();
        }}
        className="
          absolute bottom-3 left-1/2 -translate-x-1/2 z-30
          px-5 py-1.5 rounded-full
          bg-black/70 backdrop-blur
          text-white text-xs font-bold tracking-wide
          border border-white/20
          hover:bg-white hover:text-black
          transition-all
        "
      >
        BUY
      </button>

      {/* Purchasing Overlay */}
      {purchasing && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}


