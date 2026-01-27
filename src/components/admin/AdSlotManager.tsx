import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, Loader2, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdSlot {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  link_url: string | null;
  slot_position: string;
  priority: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
}

export default function AdSlotManager() {
  const { toast } = useToast();
  const [slots, setSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    link_url: '',
    slot_position: 'banner',
    priority: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    const { data, error } = await supabase
      .from('ad_slots')
      .select('*')
      .order('priority', { ascending: false });

    if (error) {
      console.error('Error fetching ad slots:', error);
    } else {
      setSlots(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    const { error } = await supabase.from('ad_slots').insert({
      title: formData.title,
      content: formData.content || null,
      image_url: formData.image_url || null,
      link_url: formData.link_url || null,
      slot_position: formData.slot_position,
      priority: formData.priority,
      is_active: formData.is_active,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Ad slot created' });
      setShowForm(false);
      resetForm();
      fetchSlots();
    }
  };

  const handleUpdate = async (id: string) => {
    const { error } = await supabase.from('ad_slots').update({
      title: formData.title,
      content: formData.content || null,
      image_url: formData.image_url || null,
      link_url: formData.link_url || null,
      slot_position: formData.slot_position,
      priority: formData.priority,
      is_active: formData.is_active,
    }).eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Ad slot updated' });
      setEditingId(null);
      fetchSlots();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('ad_slots').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Ad slot deleted' });
      fetchSlots();
    }
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase.from('ad_slots').update({ is_active: !currentState }).eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchSlots();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      image_url: '',
      link_url: '',
      slot_position: 'banner',
      priority: 0,
      is_active: true,
    });
  };

  const startEdit = (slot: AdSlot) => {
    setEditingId(slot.id);
    setFormData({
      title: slot.title,
      content: slot.content || '',
      image_url: slot.image_url || '',
      link_url: slot.link_url || '',
      slot_position: slot.slot_position,
      priority: slot.priority,
      is_active: slot.is_active,
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Advertisement Slots</h2>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="w-4 h-4 mr-2" />
          Add Ad Slot
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">New Ad Slot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ad title"
                />
              </div>
              <div>
                <Label>Position</Label>
                <Select value={formData.slot_position} onValueChange={(v) => setFormData({ ...formData, slot_position: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="popup">Popup</SelectItem>
                    <SelectItem value="footer">Footer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Ad content/message"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Image URL</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Link URL</Label>
                <Input
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  className="w-24"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Create</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slots List */}
      <div className="space-y-3">
        {slots.map((slot) => (
          <Card key={slot.id} className={!slot.is_active ? 'opacity-50' : ''}>
            <CardContent className="p-4">
              {editingId === slot.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <Select value={formData.slot_position} onValueChange={(v) => setFormData({ ...formData, slot_position: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="banner">Banner</SelectItem>
                        <SelectItem value="sidebar">Sidebar</SelectItem>
                        <SelectItem value="popup">Popup</SelectItem>
                        <SelectItem value="footer">Footer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleUpdate(slot.id)}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {slot.image_url ? (
                      <img src={slot.image_url} alt={slot.title} className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Image className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{slot.title}</p>
                      <p className="text-sm text-muted-foreground">{slot.slot_position} • Priority: {slot.priority}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={slot.is_active}
                      onCheckedChange={() => toggleActive(slot.id, slot.is_active)}
                    />
                    <Button size="sm" variant="ghost" onClick={() => startEdit(slot)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(slot.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {slots.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No ad slots yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
