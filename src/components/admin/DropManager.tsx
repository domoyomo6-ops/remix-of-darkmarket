import { useState, useEffect } from 'react';
import { Plus, Trash2, Gift, Users, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Product {
  id: string;
  title: string;
}

interface Drop {
  id: string;
  product_id: string | null;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  max_claims: number | null;
  claims_count: number | null;
  is_active: boolean;
  products?: Product;
}

export default function DropManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [drops, setDrops] = useState<Drop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    title: '',
    description: '',
    starts_at: '',
    ends_at: '',
    max_claims: 1,
  });

  useEffect(() => {
    fetchDrops();
    fetchProducts();
  }, []);

  const fetchDrops = async () => {
    const { data, error } = await supabase
      .from('product_drops')
      .select('*, products(id, title)')
      .order('created_at', { ascending: false });

    if (!error) {
      setDrops(data || []);
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, title')
      .eq('is_active', true);
    setProducts(data || []);
  };

  const handleCreate = async () => {
    if (!user) return;

    const { error } = await supabase.from('product_drops').insert({
      product_id: formData.product_id || null,
      title: formData.title,
      description: formData.description || null,
      starts_at: formData.starts_at || new Date().toISOString(),
      ends_at: formData.ends_at || null,
      max_claims: formData.max_claims,
      created_by: user.id,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Drop created' });
      setShowForm(false);
      setFormData({ product_id: '', title: '', description: '', starts_at: '', ends_at: '', max_claims: 1 });
      fetchDrops();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('product_drops').update({ is_active: !current }).eq('id', id);
    if (!error) fetchDrops();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('product_drops').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchDrops();
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Product Drops</h2>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="w-4 h-4 mr-2" />
          Create Drop
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">New Product Drop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Drop title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label>Product (optional)</Label>
              <Select value={formData.product_id} onValueChange={(v) => setFormData({ ...formData, product_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No product (custom drop)</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Starts At</Label>
                <Input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Ends At</Label>
                <Input
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Max Claims</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.max_claims}
                  onChange={(e) => setFormData({ ...formData, max_claims: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Create Drop</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {drops.map((drop) => (
          <Card key={drop.id} className={!drop.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{drop.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {drop.products && <span>{drop.products.title}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {drop.claims_count || 0}/{drop.max_claims}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(drop.starts_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={drop.is_active ? 'default' : 'secondary'}>
                    {drop.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(drop.id, drop.is_active)}>
                    {drop.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(drop.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {drops.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No drops yet. Create one to start a product giveaway.
          </div>
        )}
      </div>
    </div>
  );
}
