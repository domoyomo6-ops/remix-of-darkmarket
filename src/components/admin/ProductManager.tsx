import { useState, useEffect, type ChangeEvent } from 'react';
import { Package, Plus, Edit, Trash2, X, Check, Loader2, Image, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Product {
  id: string;
  title: string;
  description: string | null;
  short_description: string | null;
  price: number;
  category: 'software' | 'courses' | 'templates' | 'assets';
  product_type: 'stock' | 'logz' | 'accounts' | 'giftcards';
  image_url: string | null;
  file_url: string | null;
  is_active: boolean;
  created_at: string;
  bin: string | null;
  country: string | null;
}

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    price: 0,
    category: 'software' as 'software' | 'courses' | 'templates' | 'assets',
    product_type: 'stock' as 'stock' | 'logz' | 'accounts' | 'giftcards',
    image_url: '',
    file_url: '',
    is_active: true,
    bin: '',
    country: '',
  });
  const [bulkStockText, setBulkStockText] = useState('');
  const [giftCardBulkText, setGiftCardBulkText] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } else {
      setProducts((data || []) as Product[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      short_description: '',
      price: 0,
      category: 'software',
      product_type: 'stock',
      image_url: '',
      file_url: '',
      is_active: true,
      bin: '',
      country: '',
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description || '',
      short_description: product.short_description || '',
      price: product.price,
      category: product.category,
      product_type: product.product_type || 'stock',
      image_url: product.image_url || '',
      file_url: product.file_url || '',
      is_active: product.is_active,
      bin: product.bin || '',
      country: product.country || '',
    });
    setShowForm(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    const productData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      short_description: formData.short_description.trim() || null,
      price: formData.price,
      category: formData.category,
      product_type: formData.product_type,
      image_url: formData.image_url.trim() || null,
      file_url: formData.file_url.trim() || null,
      is_active: formData.is_active,
      bin: formData.bin.trim() || null,
      country: formData.country.trim() || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast.error('Failed to update product');
        console.error(error);
      } else {
        toast.success('Product updated');
        fetchProducts();
        resetForm();
      }
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select('id, title, price, product_type')
        .single();

      if (error) {
        toast.error('Failed to create product');
        console.error(error);
      } else {
        if (data?.product_type === 'stock') {
          const productLink = `${window.location.origin}/product/${data.id}`;
          await supabase.functions.invoke('broadcast-site-update', {
            body: {
              title: '🎉 Great News! Items Are Back In Stock!',
              message: `The following products have been restocked:

• ${data.title} - $${Number(data.price).toFixed(2)}

Hurry! Limited quantities available.`,
              type: 'product',
              link: '/stock',
              sendPush: true,
              ctaLabel: '🛒 View Product',
              ctaUrl: productLink,
              secondaryCtaLabel: '🏪 Visit Our Shop',
              secondaryCtaUrl: `${window.location.origin}/stock`,
            },
          });
        }
        toast.success('Product created');
        fetchProducts();
        resetForm();
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete product');
      console.error(error);
    } else {
      toast.success('Product deleted');
      fetchProducts();
    }
  };

  const toggleProductActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      fetchProducts();
    }
  };

  const handleBulkFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const content = await file.text();
    setBulkStockText(content);
  };

  type ParsedStockLine = {
    bin: string;
    country: string;
    price: string;
  };

  const parseDelimitedLine = (line: string): ParsedStockLine | null => {
    const delimiter = line.includes('|') ? '|' : ',';
    const parts = line.split(delimiter).map((part) => part.trim());
    if (parts.length < 2) {
      return null;
    }

    const [bin = '', country = '', price = '0'] = parts;
    return { bin, country, price };
  };

  const fieldAliases: Record<string, keyof ParsedStockLine> = {
    bin: 'bin',
    country: 'country',
    price: 'price',
  };

  const parseLabelBlocks = (input: string): ParsedStockLine[] => {
    const blocks = input
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean);

    return blocks
      .map((block) => {
        const parsed: ParsedStockLine = {
          bin: '',
          country: '',
          price: '0',
        };

        block
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((line) => {
            const [rawLabel, ...rawValue] = line.split(/[:=-]/);
            if (!rawLabel || rawValue.length === 0) return;
            const alias = rawLabel.toLowerCase().replace(/\s+/g, '');
            const key = fieldAliases[alias];
            if (!key) return;
            parsed[key] = rawValue.join(':').trim();
          });

        return parsed.bin ? parsed : null;
      })
      .filter((item): item is ParsedStockLine => Boolean(item));
  };

  const parseStockLines = (input: string) => {
    const rows = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsedRows = rows
      .map(parseDelimitedLine)
      .filter((row): row is ParsedStockLine => Boolean(row));

    const labelRows = parsedRows.length > 0 ? [] : parseLabelBlocks(input);
    const normalizedRows = parsedRows.length > 0 ? parsedRows : labelRows;

    return normalizedRows.map((row, idx) => ({
      title: `Stock ${row.bin || idx + 1}`,
      description: `BIN ${row.bin}${row.country ? ` - ${row.country}` : ''}`,
      short_description: 'Buy',
      price: Number(row.price) || 0,
      category: 'assets' as const,
      product_type: 'stock' as const,
      image_url: null,
      file_url: null,
      is_active: true,
      bin: row.bin || null,
      country: row.country || null,
    }));
  };

  const handleBulkCreate = async () => {
    if (!bulkStockText.trim()) {
      toast.error('Paste or upload stock lines first.');
      return;
    }

    const parsedProducts = parseStockLines(bulkStockText);
    if (parsedProducts.length === 0) {
      toast.error('No valid stock listings found. Use CSV/pipe lines or label blocks (Bin: ..., Country: ...).');
      return;
    }
    const { error } = await supabase.from('products').insert(parsedProducts);
    if (error) {
      toast.error('Failed to import stock lines');
      return;
    }

    toast.success(`Imported ${parsedProducts.length} stock products`);
    setBulkStockText('');
    fetchProducts();
  };

  type ParsedGiftCardLine = {
    store: string;
    region: string;
    amount: string;
    sell: string;
    quantity: string;
    rating: string;
    image: string;
  };

  const parseGiftCardDelimitedLine = (line: string): ParsedGiftCardLine | null => {
    const delimiter = line.includes('|') ? '|' : ',';
    const parts = line.split(delimiter).map((part) => part.trim());
    if (parts.length < 4) {
      return null;
    }

    const [store = '', region = 'GLOBAL', amount = '0', sell = '0', quantity = '1', rating = '5', image = ''] = parts;
    return { store, region, amount, sell, quantity, rating, image };
  };

  const giftCardFieldAliases: Record<string, keyof ParsedGiftCardLine> = {
    store: 'store',
    brand: 'store',
    shop: 'store',
    region: 'region',
    country: 'region',
    amount: 'amount',
    denomination: 'amount',
    value: 'amount',
    sell: 'sell',
    selling: 'sell',
    price: 'sell',
    quantity: 'quantity',
    qty: 'quantity',
    rating: 'rating',
    stars: 'rating',
    image: 'image',
    imageurl: 'image',
  };

  const parseGiftCardLabelBlocks = (input: string): ParsedGiftCardLine[] => {
    const blocks = input
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean);

    return blocks
      .map((block) => {
        const parsed: ParsedGiftCardLine = {
          store: '',
          region: 'GLOBAL',
          amount: '0',
          sell: '0',
          quantity: '1',
          rating: '5',
          image: '',
        };

        block
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .forEach((line) => {
            const [rawLabel, ...rawValue] = line.split(/[:=-]/);
            if (!rawLabel || rawValue.length === 0) return;
            const alias = rawLabel.toLowerCase().replace(/\s+/g, '');
            const key = giftCardFieldAliases[alias];
            if (!key) return;
            parsed[key] = rawValue.join(':').trim();
          });

        return parsed.store ? parsed : null;
      })
      .filter((item): item is ParsedGiftCardLine => Boolean(item));
  };

  const parseGiftCardLines = (input: string) => {
    const rows = input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const parsedRows = rows
      .map(parseGiftCardDelimitedLine)
      .filter((row): row is ParsedGiftCardLine => Boolean(row));

    const labelRows = parsedRows.length > 0 ? [] : parseGiftCardLabelBlocks(input);
    const normalizedRows = parsedRows.length > 0 ? parsedRows : labelRows;

    return normalizedRows.flatMap((row) => {
      const store = row.store.trim();
      const region = row.region.trim() || 'GLOBAL';
      const denomination = Number(row.amount);
      const sellPrice = Number(row.sell);
      const quantity = Math.max(1, Number.parseInt(row.quantity, 10) || 1);
      const rating = Number(row.rating);
      const safeRating = Number.isFinite(rating) && rating > 0 && rating <= 5 ? rating : 5;
      const amountLabel = Number.isInteger(denomination) ? `${denomination}` : denomination.toFixed(2);

      if (!store || !Number.isFinite(denomination) || denomination <= 0 || !Number.isFinite(sellPrice) || sellPrice <= 0) {
        return [];
      }

      return Array.from({ length: quantity }, (_, index) => ({
        title: `$${amountLabel} ${store} Card`,
        description: `${store} Giftcards [${region}] listing. Unit ${index + 1}/${quantity}. Instant delivery with replacement support.`,
        short_description: `option:$${amountLabel} ${store} Card|rating:${safeRating.toFixed(1)}|denomination:${amountLabel}`,
        price: sellPrice,
        category: 'assets' as const,
        product_type: 'giftcards' as const,
        image_url: row.image.trim() || null,
        file_url: null,
        is_active: true,
        bin: null,
        country: region,
        brand: store,
      }));
    });
  };

  const handleGiftCardBulkCreate = async () => {
    if (!giftCardBulkText.trim()) {
      toast.error('Paste or upload gift card lines first.');
      return;
    }

    const parsedGiftCardProducts = parseGiftCardLines(giftCardBulkText);
    if (parsedGiftCardProducts.length === 0) {
      toast.error('No valid gift card listings found. Use CSV/pipe lines or label blocks (Store: ..., Amount: ..., Sell: ...).');
      return;
    }

    const { error } = await supabase.from('products').insert(parsedGiftCardProducts);
    if (error) {
      toast.error('Failed to import gift card listings');
      return;
    }

    toast.success(`Imported ${parsedGiftCardProducts.length} gift card listings`);
    setGiftCardBulkText('');
    fetchProducts();
  };

  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'software': return 'bg-blue-500/20 text-blue-400';
      case 'courses': return 'bg-purple-500/20 text-purple-400';
      case 'templates': return 'bg-orange-500/20 text-orange-400';
      case 'assets': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-primary/20 text-primary';
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
          <Package className="w-6 h-6 text-primary" />
          <h2 className="text-lg sm:text-xl font-mono font-bold text-primary terminal-glow">
            PRODUCTS_MANAGER://
          </h2>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            className="flex-1 sm:flex-none"
            asChild
          >
            <Link to="/stock">
              <ExternalLink className="w-4 h-4 mr-2" />
              VIEW STOCK
            </Link>
          </Button>
          <Button 
            className="crt-button flex-1 sm:w-auto"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            [ NEW PRODUCT ]
          </Button>
        </div>
      </div>

      {/* Product Form */}
      {showForm && (
        <div className="mb-6 p-4 border border-primary/30 rounded-lg bg-background/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-primary text-sm sm:text-base">
              {editingProduct ? 'EDIT_PRODUCT' : 'NEW_PRODUCT'}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid gap-4">
            <div>
              <Label className="font-mono text-xs text-muted-foreground">TITLE *</Label>
              <Input 
                className="crt-input mt-1"
                placeholder="Product title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div>
              <Label className="font-mono text-xs text-muted-foreground">SHORT DESCRIPTION</Label>
              <Input 
                className="crt-input mt-1"
                placeholder="Brief description for cards..."
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
              />
            </div>
            
            <div>
              <Label className="font-mono text-xs text-muted-foreground">FULL DESCRIPTION</Label>
              <Textarea 
                className="crt-input mt-1 min-h-[80px]"
                placeholder="Detailed product description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {formData.product_type === 'stock' && (
              <div className="space-y-2 border border-primary/20 rounded-md p-3">
                <Label className="font-mono text-xs text-muted-foreground">BULK STOCK IMPORT (CSV OR PIPE)</Label>
                <Input type="file" accept=".txt,.csv" onChange={handleBulkFile} />
                <Textarea
                  className="crt-input min-h-[120px]"
                  value={bulkStockText}
                  onChange={(e) => setBulkStockText(e.target.value)}
                  placeholder="bin,country,price\nOR\nbin|country|price\nOR\nBin: 457173\nCountry: US\nPrice: 5"
                />
                <Button type="button" variant="outline" onClick={handleBulkCreate}>
                  Import Lines as Listings
                </Button>
              </div>
            )}

            {formData.product_type === 'giftcards' && (
              <div className="space-y-2 border border-primary/20 rounded-md p-3">
                <Label className="font-mono text-xs text-muted-foreground">GIFT CARD BULK LISTING IMPORT</Label>
                <Textarea
                  className="crt-input min-h-[140px]"
                  value={giftCardBulkText}
                  onChange={(e) => setGiftCardBulkText(e.target.value)}
                  placeholder={"store,region,amount,sell,quantity,rating,image\nAmazon,USA,25,22,10,5,https://...\nAmazon|USA|50|45|6|4.9|https://...\n\nOR\nStore: eBay\nRegion: USA\nAmount: 100\nSell: 88\nQuantity: 4\nRating: 4.8"}
                />
                <p className="text-[11px] text-muted-foreground">
                  Creates multiple gift card SKUs with metadata for amount, rating, region, and sell price so they render as grouped listing options on the gift card page.
                </p>
                <Button type="button" variant="outline" onClick={handleGiftCardBulkCreate}>
                  Import Gift Card Listing Batch
                </Button>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs text-muted-foreground">PRICE ($)</Label>
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  className="crt-input mt-1"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div>
                <Label className="font-mono text-xs text-muted-foreground">CATEGORY</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value: 'software' | 'courses' | 'templates' | 'assets') => 
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="crt-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="software">SOFTWARE</SelectItem>
                    <SelectItem value="courses">COURSES</SelectItem>
                    <SelectItem value="templates">TEMPLATES</SelectItem>
                    <SelectItem value="assets">ASSETS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="font-mono text-xs text-muted-foreground">PRODUCT TYPE</Label>
                <Select 
                  value={formData.product_type} 
                  onValueChange={(value: 'stock' | 'logz' | 'accounts' | 'giftcards') => 
                    setFormData({ ...formData, product_type: value })
                  }
                >
                  <SelectTrigger className="crt-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">STOCK (Cards/BINs)</SelectItem>
                    <SelectItem value="logz">LOGZ (Logs/Dumps)</SelectItem>
                    <SelectItem value="accounts">ACCOUNTS (Logins)</SelectItem>
                    <SelectItem value="giftcards">GIFT CARDS (Store Listings)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label className="font-mono text-xs text-muted-foreground">IMAGE URL</Label>
              <Input 
                className="crt-input mt-1"
                placeholder="https://example.com/image.jpg"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              />
            </div>
            
            <div>
              <Label className="font-mono text-xs text-muted-foreground">FILE/DOWNLOAD URL</Label>
              <p className="text-[11px] text-muted-foreground mt-1">Use this for digital products so customers can instantly open/download after checkout.</p>
              <Input 
                className="crt-input mt-1"
                placeholder="https://example.com/file.zip"
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label className="font-mono text-xs text-muted-foreground">ACTIVE</Label>
            </div>

            {/* Stock Metadata Fields */}
            {formData.product_type === 'stock' && (
              <div className="border-t border-primary/20 pt-4 mt-4">
                <Label className="font-mono text-xs text-muted-foreground mb-3 block">STOCK METADATA</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">BIN</Label>
                    <Input
                      className="crt-input mt-1"
                      placeholder="123456"
                      value={formData.bin}
                      onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="font-mono text-xs text-muted-foreground">COUNTRY</Label>
                    <Input
                      className="crt-input mt-1"
                      placeholder="US"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
            
            <Button className="crt-button w-full" onClick={handleSaveProduct}>
              <Check className="w-4 h-4 mr-2" />
              [ {editingProduct ? 'UPDATE' : 'CREATE'} PRODUCT ]
            </Button>
          </div>
        </div>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <div className="text-center py-8">
          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-mono text-sm">NO_PRODUCTS_YET</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div 
              key={product.id}
              className={`p-3 sm:p-4 rounded-lg border ${product.is_active ? 'border-primary/30 bg-primary/5' : 'border-muted/30 bg-muted/5 opacity-60'}`}
            >
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                {/* Image preview */}
                <div className="w-full sm:w-16 h-24 sm:h-16 rounded bg-background/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded uppercase ${getCategoryClass(product.category)}`}>
                      {product.category}
                    </span>
                    <span className="text-xs font-mono text-primary font-bold">${product.price}</span>
                    {!product.is_active && (
                      <span className="text-xs font-mono text-red-400">INACTIVE</span>
                    )}
                  </div>
                  <h4 className="font-mono font-bold text-primary truncate text-sm sm:text-base">{product.title}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground font-mono line-clamp-1">
                    {product.short_description || 'No description'}
                  </p>
                  <span className="text-xs text-muted-foreground font-mono">
                    {format(new Date(product.created_at), 'MMM dd, yyyy')}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => toggleProductActive(product.id, product.is_active)}
                    className="h-8 w-8"
                  >
                    <div className={`w-3 h-3 rounded-full ${product.is_active ? 'bg-green-500' : 'bg-muted'}`} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEditProduct(product)}
                    className="h-8 w-8 text-primary"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteProduct(product.id)}
                    className="h-8 w-8 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
