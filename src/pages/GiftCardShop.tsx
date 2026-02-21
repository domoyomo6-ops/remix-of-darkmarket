import { useEffect, useMemo, useState } from 'react';
import { Gift, Loader2, ShoppingCart, Sparkles } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { addToCart } from '@/pages/Cart';
import { toast } from 'sonner';

interface GiftCardStockItem {
  id: string;
  title: string;
  short_description: string | null;
  description: string | null;
  price: number;
  image_url: string | null;
}

interface GiftCardGroup {
  key: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  amount: number;
  stock: number;
  ids: string[];
}

const parseGiftAmount = (text: string) => {
  const match = text.match(/\$(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

export default function GiftCardShop() {
  const [items, setItems] = useState<GiftCardStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [amountFilter, setAmountFilter] = useState('all');

  useEffect(() => {
    supabase
      .from('products')
      .select('id,title,short_description,description,price,image_url')
      .eq('is_active', true)
      .eq('product_type', 'giftcards')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, []);

  const grouped = useMemo<GiftCardGroup[]>(() => {
    const map = new Map<string, GiftCardGroup>();

    items.forEach((item) => {
      const amount = parseGiftAmount(item.title) ?? parseGiftAmount(item.short_description ?? '') ?? item.price;
      const key = `${item.title}|${item.price}`;
      const existing = map.get(key);

      if (existing) {
        existing.stock += 1;
        existing.ids.push(item.id);
        return;
      }

      map.set(key, {
        key,
        title: item.title,
        description: item.short_description || item.description,
        imageUrl: item.image_url,
        price: item.price,
        amount,
        stock: 1,
        ids: [item.id],
      });
    });

    return [...map.values()].sort((a, b) => a.amount - b.amount);
  }, [items]);

  const amounts = [...new Set(grouped.map((item) => item.amount))].sort((a, b) => a - b);

  const filtered = amountFilter === 'all'
    ? grouped
    : grouped.filter((item) => item.amount === Number(amountFilter));

  const onAddToCart = (item: GiftCardGroup) => {
    const inCart = new Set<string>(JSON.parse(localStorage.getItem('hell5tar_cart') || '[]'));
    const availableId = item.ids.find((id) => !inCart.has(id));

    if (!availableId) {
      toast.error('All units of this amount are already in your cart.');
      return;
    }

    addToCart(availableId);
    toast.success(`${item.title} added to cart`);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center min-h-[60vh] items-center">
          <Loader2 className="animate-spin w-8 h-8 text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-mono font-bold terminal-glow">GIFTCARD_SHOP://SUPER_FIRE</h1>
          </div>

          <Select value={amountFilter} onValueChange={setAmountFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All Amounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Amounts</SelectItem>
              {amounts.map((amount) => (
                <SelectItem key={amount} value={String(amount)}>${amount.toFixed(2)} Balance</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="panel-3d rounded-xl p-10 text-center">
            <p className="font-mono text-muted-foreground">No gift card stock listed yet. Ask admin to add inventory.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 [perspective:1500px]">
            {filtered.map((item) => (
              <div
                key={item.key}
                className="relative rounded-xl overflow-hidden border border-primary/35 bg-gradient-to-br from-primary/15 via-background/80 to-fuchsia-500/10 shadow-[0_24px_60px_rgba(0,0,0,0.35),0_0_28px_rgba(34,211,238,0.18)]"
              >
                {item.imageUrl && (
                  <img src={item.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                )}

                <div className="relative z-10 p-5 space-y-4 backdrop-blur-[1px]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-mono text-lg font-bold text-primary">{item.title}</h2>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{item.description || 'Digital gift card balance delivery.'}</p>
                    </div>
                    <Badge className="bg-primary text-primary-foreground">${item.price.toFixed(2)}</Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono border-emerald-400/40 text-emerald-300">Balance ${item.amount.toFixed(2)}</Badge>
                    <Badge variant="outline" className="font-mono border-amber-400/40 text-amber-300">{item.stock} in stock</Badge>
                  </div>

                  <Button className="w-full crt-button font-mono" onClick={() => onAddToCart(item)}>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-fuchsia-300/90">
                    <Sparkles className="w-3 h-3" />
                    Instant checkout ready · limited batch inventory
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
