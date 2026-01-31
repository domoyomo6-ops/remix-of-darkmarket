import { useState, useEffect } from 'react';
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
  image_url: string | null;
  file_url: string | null;
  is_active: boolean;
  created_at: string;
  bin: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  expire: string | null;
  country: string | null;
  card_type: string | null;
  brand: string | null;
  bank: string | null;
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
    image_url: '',
    file_url: '',
    is_active: true,
    bin: '',
    city: '',
    state: '',
    zip: '',
    expire: '',
    country: '',
    card_type: '',
    brand: '',
    bank: '',
  });

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
      setProducts(data || []);
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
      image_url: '',
      file_url: '',
      is_active: true,
      bin: '',
      city: '',
      state: '',
      zip: '',
      expire: '',
      country: '',
      card_type: '',
      brand: '',
      bank: '',
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
      image_url: product.image_url || '',
      file_url: product.file_url || '',
      is_active: product.is_active,
      bin: product.bin || '',
      city: product.city || '',
      state: product.state || '',
      zip: product.zip || '',
      expire: product.expire || '',
      country: product.country || '',
      card_type: product.card_type || '',
      brand: product.brand || '',
      bank: product.bank || '',
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
      image_url: formData.image_url.trim() || null,
      file_url: formData.file_url.trim() || null,
      is_active: formData.is_active,
      bin: formData.bin.trim() || null,
      city: formData.city.trim() || null,
      state: formData.state.trim() || null,
      zip: formData.zip.trim() || null,
      expire: formData.expire.trim() || null,
      country: formData.country.trim() || null,
      card_type: formData.card_type.trim() || null,
      brand: formData.brand.trim() || null,
      bank: formData.bank.trim() || null,
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
      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) {
        toast.error('Failed to create product');
        console.error(error);
      } else {
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

            {/* Card Metadata Fields */}
            <div className="border-t border-primary/20 pt-4 mt-4">
              <Label className="font-mono text-xs text-muted-foreground mb-3 block">CARD METADATA (OPTIONAL)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                  <Label className="font-mono text-xs text-muted-foreground">CITY</Label>
                  <Input 
                    className="crt-input mt-1"
                    placeholder="New York"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="font-mono text-xs text-muted-foreground">STATE</Label>
                  <Input 
                    className="crt-input mt-1"
                    placeholder="NY"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="font-mono text-xs text-muted-foreground">ZIP</Label>
                  <Input 
                    className="crt-input mt-1"
                    placeholder="10001"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="font-mono text-xs text-muted-foreground">EXPIRE</Label>
                  <Input 
                    className="crt-input mt-1"
                    placeholder="12/25"
                    value={formData.expire}
                    onChange={(e) => setFormData({ ...formData, expire: e.target.value })}
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
                <div>
                  <Label className="font-mono text-xs text-muted-foreground">CARD TYPE</Label>
                  <Input 
                    className="crt-input mt-1"
                    placeholder="credit"
                    value={formData.card_type}
                    onChange={(e) => setFormData({ ...formData, card_type: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="font-mono text-xs text-muted-foreground">BRAND</Label>
                  <Input 
                    className="crt-input mt-1"
                    placeholder="Visa"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="font-mono text-xs text-muted-foreground">BANK</Label>
                  <Input 
                    className="crt-input mt-1"
                    placeholder="Chase"
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
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
