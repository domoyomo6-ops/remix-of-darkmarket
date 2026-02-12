import { useState, useEffect, useRef } from 'react';
import { Loader2, User, ShoppingCart } from 'lucide-react';
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
import { toast as sonnerToast } from 'sonner';

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

const addToCart = (product: Product) => {
  const cart = JSON.parse(localStorage.getItem('hell5tar_cart') || '[]');
  if (cart.find((item: any) => item.id === product.id)) {
    sonnerToast.info('Already in cart');
    return;
  }
  cart.push({ id: product.id, title: product.title, price: product.price, brand: product.brand, type: 'accounts' });
  localStorage.setItem('hell5tar_cart', JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-update'));
  sonnerToast.success(`${product.brand || product.title} added to cart`);
};

export default function Accounts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState('all');

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
              onNavigate={() => navigate(`/accounts/${p.id}`)}
              onAddToCart={() => addToCart(p)}
            />
          ))}
        </div>
      </div>
    </MainLayout>
  );
}

function UltraCard({
  product,
  bg,
  onNavigate,
  onAddToCart,
}: {
  product: Product;
  bg: string;
  onNavigate: () => void;
  onAddToCart: () => void;
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
      transform: `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.08)`,
    });

    setGlow({
      background: `radial-gradient(600px at ${x}px ${y}px, rgba(255,255,255,.35), transparent 60%)`,
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
      className={`relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer transition-transform duration-200 ease-out ${bg} group border border-border/50`}
    >
      <div className="absolute inset-0 rounded-xl pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-60" />
        <div className="absolute inset-[1px] rounded-xl bg-background/20" />
      </div>

      {product.image_url && (
        <img
          src={product.image_url}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}

      <div className="absolute inset-0 mix-blend-overlay pointer-events-none" style={glow} />

      <Badge className="absolute top-3 right-3 z-20 bg-primary text-primary-foreground">
        ${product.price.toFixed(2)}
      </Badge>

      {!product.image_url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-foreground font-semibold text-lg">{product.brand || product.title}</span>
        </div>
      )}

      {/* ADD TO CART + BUY */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
          className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur text-foreground text-xs font-semibold tracking-wide border border-border hover:bg-accent hover:text-accent-foreground hover:border-accent transition-all flex items-center gap-1"
        >
          <ShoppingCart className="w-3 h-3" />
          CART
        </button>
      </div>
    </div>
  );
}
