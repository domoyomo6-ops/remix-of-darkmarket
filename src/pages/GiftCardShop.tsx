import { useEffect, useMemo, useState } from 'react';
import { Gift, Loader2, ShoppingCart, Star } from 'lucide-react';
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
  brand: string | null;
  country: string | null;
}

interface ListingOption {
  key: string;
  label: string;
  denomination: number;
  rating: number;
  price: number;
  stock: number;
  ids: string[];
}

interface StoreListing {
  key: string;
  store: string;
  region: string;
  title: string;
  description: string;
  imageUrl: string | null;
  options: ListingOption[];
}

const parseDollarAmount = (text: string) => {
  const match = text.match(/\$(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

const parseStockMeta = (shortDescription: string | null) => {
  if (!shortDescription) {
    return null;
  }

  const values = shortDescription.split('|').reduce<Record<string, string>>((acc, token) => {
    const [rawKey, ...rest] = token.split(':');
    if (!rawKey || rest.length === 0) {
      return acc;
    }

    acc[rawKey.trim().toLowerCase()] = rest.join(':').trim();
    return acc;
  }, {});

  if (!values.option) {
    return null;
  }

  return {
    option: values.option,
    rating: Number(values.rating || 5),
    denomination: Number(values.denomination || 0),
  };
};

export default function GiftCardShop() {
  const [items, setItems] = useState<GiftCardStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeFilter, setStoreFilter] = useState('all');

  useEffect(() => {
    supabase
      .from('products')
      .select('id,title,short_description,description,price,image_url,brand,country')
      .eq('is_active', true)
      .eq('product_type', 'giftcards')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, []);

  const listings = useMemo<StoreListing[]>(() => {
    const map = new Map<string, StoreListing>();

    items.forEach((item) => {
      const stockMeta = parseStockMeta(item.short_description);
      const store = item.brand || item.title.replace(/\s*Gift\s*Cards?.*/i, '').trim() || 'Gift Card Store';
      const region = item.country || 'GLOBAL';
      const listingTitle = `${store} Giftcards [${region}]`;
      const listingKey = `${store}|${region}`;
      const optionLabel = stockMeta?.option || item.title;
      const denomination = stockMeta?.denomination || parseDollarAmount(optionLabel) || parseDollarAmount(item.title) || item.price;
      const rating = Number.isFinite(stockMeta?.rating) ? Number(stockMeta?.rating) : 5;

      const existingListing = map.get(listingKey);
      if (!existingListing) {
        map.set(listingKey, {
          key: listingKey,
          store,
          region,
          title: listingTitle,
          description: item.description || 'Instant digital delivery with secure replacement support.',
          imageUrl: item.image_url,
          options: [
            {
              key: `${optionLabel}|${item.price}`,
              label: optionLabel,
              denomination,
              rating,
              price: item.price,
              stock: 1,
              ids: [item.id],
            },
          ],
        });
        return;
      }

      const existingOption = existingListing.options.find((option) => option.key === `${optionLabel}|${item.price}`);
      if (existingOption) {
        existingOption.stock += 1;
        existingOption.ids.push(item.id);
        return;
      }

      existingListing.options.push({
        key: `${optionLabel}|${item.price}`,
        label: optionLabel,
        denomination,
        rating,
        price: item.price,
        stock: 1,
        ids: [item.id],
      });
    });

    return [...map.values()]
      .map((listing) => ({
        ...listing,
        options: listing.options.sort((a, b) => a.denomination - b.denomination),
      }))
      .sort((a, b) => a.store.localeCompare(b.store));
  }, [items]);

  const stores = [...new Set(listings.map((listing) => listing.store))].sort((a, b) => a.localeCompare(b));

  const filtered = storeFilter === 'all'
    ? listings
    : listings.filter((listing) => listing.store === storeFilter);

  const onAddToCart = (option: ListingOption) => {
    const inCart = new Set<string>(JSON.parse(localStorage.getItem('hell5tar_cart') || '[]'));
    const availableId = option.ids.find((id) => !inCart.has(id));

    if (!availableId) {
      toast.error('All units for this option are already in your cart.');
      return;
    }

    addToCart(availableId);
    toast.success(`${option.label} added to cart`);
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
            <h1 className="text-2xl font-mono font-bold terminal-glow">STORE_GIFTCARDS://LISTINGS</h1>
          </div>

          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store} value={store}>{store}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="panel-3d rounded-xl p-10 text-center">
            <p className="font-mono text-muted-foreground">No store gift card listings yet. Ask admin to add listing inventory.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((listing) => (
              <div key={listing.key} className="rounded-xl overflow-hidden border border-primary/35 bg-[#070f23] shadow-[0_24px_60px_rgba(0,0,0,0.35),0_0_28px_rgba(34,211,238,0.16)]">
                <div className="relative border-b border-primary/35 bg-[#13203c] px-4 py-3">
                  {listing.imageUrl && <img src={listing.imageUrl} className="absolute inset-0 h-full w-full object-cover opacity-25" />}
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <h2 className="font-mono text-lg sm:text-xl font-bold text-white">{listing.title}</h2>
                    <Badge variant="outline" className="border-sky-300/40 text-sky-200 font-mono">{listing.options.length} options</Badge>
                  </div>
                </div>

                <div className="p-4 sm:p-5 bg-[#0b1430]">
                  <p className="text-xs font-mono text-slate-300/80 mb-3">{listing.description}</p>

                  <div className="space-y-2">
                    {listing.options.map((option) => (
                      <div key={option.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 bg-[#0e1b3f]">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-mono text-base sm:text-lg text-slate-100 truncate">{option.label}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold">
                            <Star className="w-3 h-3 mr-1" />
                            {option.rating.toFixed(1)}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-300">{option.stock} in stock</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/25">
                            ${option.price.toFixed(2)} USD
                          </span>
                          <Button className="h-8 px-3 crt-button font-mono" onClick={() => onAddToCart(option)}>
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    ))}
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
