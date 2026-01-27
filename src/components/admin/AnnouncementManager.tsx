import { useState, useEffect } from 'react';
import { Bell, Plus, Edit, Trash2, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'restock' | 'update' | 'promo' | 'info';
  priority: number;
  is_active: boolean;
  created_at: string;
}

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as 'restock' | 'update' | 'promo' | 'info',
    priority: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ title: '', message: '', type: 'info', priority: 0, is_active: true });
    setEditingAnnouncement(null);
    setShowForm(false);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      priority: announcement.priority,
      is_active: announcement.is_active,
    });
    setShowForm(true);
  };

  const handleSaveAnnouncement = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    if (editingAnnouncement) {
      const { error } = await supabase
        .from('announcements')
        .update(formData)
        .eq('id', editingAnnouncement.id);

      if (error) {
        toast.error('Failed to update announcement');
        console.error(error);
      } else {
        toast.success('Announcement updated');
        fetchAnnouncements();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('announcements')
        .insert([formData]);

      if (error) {
        toast.error('Failed to create announcement');
        console.error(error);
      } else {
        toast.success('Announcement created');
        fetchAnnouncements();
        resetForm();
      }
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete announcement');
      console.error(error);
    } else {
      toast.success('Announcement deleted');
      fetchAnnouncements();
    }
  };

  const toggleAnnouncementActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      fetchAnnouncements();
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
          <Bell className="w-6 h-6 text-primary" />
          <h2 className="text-lg sm:text-xl font-mono font-bold text-primary terminal-glow">
            ANNOUNCEMENTS_MANAGER://
          </h2>
        </div>
        <Button 
          className="crt-button w-full sm:w-auto"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          [ NEW ]
        </Button>
      </div>

      {/* Announcement Form */}
      {showForm && (
        <div className="mb-6 p-4 border border-primary/30 rounded-lg bg-background/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-mono text-primary text-sm sm:text-base">
              {editingAnnouncement ? 'EDIT_ANNOUNCEMENT' : 'NEW_ANNOUNCEMENT'}
            </h3>
            <Button variant="ghost" size="icon" onClick={resetForm}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid gap-4">
            <div>
              <Label className="font-mono text-xs text-muted-foreground">TITLE</Label>
              <Input 
                className="crt-input mt-1"
                placeholder="Announcement title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div>
              <Label className="font-mono text-xs text-muted-foreground">MESSAGE</Label>
              <Textarea 
                className="crt-input mt-1 min-h-[80px]"
                placeholder="Announcement message..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs text-muted-foreground">TYPE</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value: 'restock' | 'update' | 'promo' | 'info') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="crt-input mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restock">RESTOCK</SelectItem>
                    <SelectItem value="update">UPDATE</SelectItem>
                    <SelectItem value="promo">PROMO</SelectItem>
                    <SelectItem value="info">INFO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="font-mono text-xs text-muted-foreground">PRIORITY (0-10)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="10"
                  className="crt-input mt-1"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label className="font-mono text-xs text-muted-foreground">ACTIVE</Label>
            </div>
            
            <Button className="crt-button w-full" onClick={handleSaveAnnouncement}>
              <Check className="w-4 h-4 mr-2" />
              [ {editingAnnouncement ? 'UPDATE' : 'CREATE'} ]
            </Button>
          </div>
        </div>
      )}

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-mono text-sm">NO_ANNOUNCEMENTS_YET</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div 
              key={announcement.id}
              className={`p-3 sm:p-4 rounded-lg border ${announcement.is_active ? 'border-primary/30 bg-primary/5' : 'border-muted/30 bg-muted/5 opacity-60'}`}
            >
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded uppercase ${
                      announcement.type === 'restock' ? 'bg-green-500/20 text-green-400' :
                      announcement.type === 'update' ? 'bg-yellow-500/20 text-yellow-400' :
                      announcement.type === 'promo' ? 'bg-pink-500/20 text-pink-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {announcement.type}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      P:{announcement.priority}
                    </span>
                    {!announcement.is_active && (
                      <span className="text-xs font-mono text-red-400">INACTIVE</span>
                    )}
                  </div>
                  <h4 className="font-mono font-bold text-primary truncate text-sm sm:text-base">{announcement.title}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground font-mono line-clamp-2">{announcement.message}</p>
                  <span className="text-xs text-muted-foreground font-mono mt-1 block">
                    {format(new Date(announcement.created_at), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => toggleAnnouncementActive(announcement.id, announcement.is_active)}
                    className="h-8 w-8"
                  >
                    <div className={`w-3 h-3 rounded-full ${announcement.is_active ? 'bg-green-500' : 'bg-muted'}`} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEditAnnouncement(announcement)}
                    className="h-8 w-8 text-primary"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDeleteAnnouncement(announcement.id)}
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
