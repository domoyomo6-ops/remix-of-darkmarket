import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Calendar } from 'lucide-react';

interface Drop {
  id: string;
  title: string;
  description: string | null;
  product_id: string | null;
  starts_at: string;
  ends_at: string | null;
  max_claims: number | null;
  claims_count: number | null;
  is_active: boolean;
  created_at: string;
}

export default function DropManager() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDrop, setNewDrop] = useState({
    title: '',
    description: '',
    starts_at: '',
    ends_at: '',
    max_claims: '',
  });

  useEffect(() => {
    fetchDrops();
  }, []);

  const fetchDrops = async () => {
    const { data, error } = await supabase
      .from('product_drops')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch drops');
    } else {
      setDrops(data || []);
    }
    setLoading(false);
  };

  const createDrop = async () => {
    if (!newDrop.title || !newDrop.starts_at) {
      toast.error('Title and start date are required');
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error('You must be logged in');
      return;
    }

    const { error } = await supabase.from('product_drops').insert({
      title: newDrop.title,
      description: newDrop.description || null,
      starts_at: newDrop.starts_at,
      ends_at: newDrop.ends_at || null,
      max_claims: newDrop.max_claims ? parseInt(newDrop.max_claims) : null,
      created_by: userData.user.id,
    });

    if (error) {
      toast.error('Failed to create drop');
    } else {
      toast.success('Drop created!');
      setNewDrop({ title: '', description: '', starts_at: '', ends_at: '', max_claims: '' });
      fetchDrops();
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    setDrops((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_active: !current } : d))
    );

    const { error } = await supabase
      .from('product_drops')
      .update({ is_active: !current })
      .eq('id', id);

    if (error) {
      setDrops((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_active: current } : d))
      );
      toast.error('Failed to update drop');
    }
  };

  const deleteDrop = async (id: string) => {
    const { error } = await supabase.from('product_drops').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete drop');
    } else {
      toast.success('Drop deleted');
      fetchDrops();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading drops...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> Create New Drop
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              value={newDrop.title}
              onChange={(e) => setNewDrop({ ...newDrop, title: e.target.value })}
              placeholder="Drop title"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={newDrop.description}
              onChange={(e) => setNewDrop({ ...newDrop, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Starts At</Label>
              <Input
                type="datetime-local"
                value={newDrop.starts_at}
                onChange={(e) => setNewDrop({ ...newDrop, starts_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Ends At (optional)</Label>
              <Input
                type="datetime-local"
                value={newDrop.ends_at}
                onChange={(e) => setNewDrop({ ...newDrop, ends_at: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Max Claims (optional)</Label>
            <Input
              type="number"
              value={newDrop.max_claims}
              onChange={(e) => setNewDrop({ ...newDrop, max_claims: e.target.value })}
              placeholder="Leave empty for unlimited"
            />
          </div>
          <Button onClick={createDrop}>Create Drop</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Existing Drops</h3>
        {drops.length === 0 ? (
          <p className="text-muted-foreground">No drops yet.</p>
        ) : (
          drops.map((drop) => (
            <Card key={drop.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <h4 className="font-medium">{drop.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {new Date(drop.starts_at).toLocaleString()}
                    {drop.ends_at && ` - ${new Date(drop.ends_at).toLocaleString()}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Claims: {drop.claims_count || 0}
                    {drop.max_claims && ` / ${drop.max_claims}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={drop.is_active}
                      onCheckedChange={() => toggleActive(drop.id, drop.is_active)}
                    />
                    <span className="text-sm">{drop.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteDrop(drop.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
