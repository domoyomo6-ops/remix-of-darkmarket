import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Mail, Clock, CheckCircle, XCircle, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';

interface Invite {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  invited_by: string;
  token: string;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

const emailSchema = z.string().email('Invalid email address');

export default function UserInviteManager() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'customer'>('customer');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_invites')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
      toast.error('Failed to load invites');
    } else {
      setInvites(data || []);
    }
    setLoading(false);
  };

  const handleSendInvite = async () => {
    try {
      emailSchema.parse(email);
    } catch {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase
      .from('admin_invites')
      .insert([{
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
      }])
      .select('email, role, token')
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('An invite for this email already exists');
      } else {
        toast.error('Failed to send invite');
        console.error(error);
      }
    } else {
      toast.success(`Invite sent to ${email}`);
      if (data?.role === 'admin') {
        const inviteLink = `${window.location.origin}/auth?invite=${data.token}`;
        const { error: inviteEmailError } = await supabase.functions.invoke('send-admin-invite', {
          body: {
            email: data.email,
            inviteLink,
          },
        });
        if (inviteEmailError) {
          console.error(inviteEmailError);
          navigator.clipboard.writeText(inviteLink);
          toast.error('Invite sent, but bot failed. Invite link copied to clipboard.');
        } else {
          toast.success('Admin invite sent via bot');
        }
      }
      setEmail('');
      fetchInvites();
    }
    
    setSubmitting(false);
  };

  const handleDeleteInvite = async (id: string) => {
    const { error } = await supabase
      .from('admin_invites')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete invite');
      console.error(error);
    } else {
      toast.success('Invite deleted');
      fetchInvites();
    }
  };

  const copyInviteLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/auth?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard');
  };

  const getInviteStatus = (invite: Invite) => {
    if (invite.used_at) {
      return { status: 'used', color: 'text-blue-400', icon: CheckCircle, text: 'USED' };
    }
    if (new Date(invite.expires_at) < new Date()) {
      return { status: 'expired', color: 'text-red-400', icon: XCircle, text: 'EXPIRED' };
    }
    return { status: 'pending', color: 'text-yellow-400', icon: Clock, text: 'PENDING' };
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
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-6 h-6 text-primary" />
        <h2 className="text-lg sm:text-xl font-mono font-bold text-primary terminal-glow">
          USER_INVITES://
        </h2>
      </div>

      {/* Invite Form */}
      <div className="mb-6 p-4 border border-primary/30 rounded-lg bg-background/50">
        <h3 className="font-mono text-primary text-sm mb-4">SEND_NEW_INVITE</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="font-mono text-xs text-muted-foreground">EMAIL</Label>
            <Input 
              type="email"
              className="crt-input mt-1"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-32">
            <Label className="font-mono text-xs text-muted-foreground">ROLE</Label>
            <Select value={role} onValueChange={(v: 'admin' | 'customer') => setRole(v)}>
              <SelectTrigger className="crt-input mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">CUSTOMER</SelectItem>
                <SelectItem value="admin">ADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              className="crt-button w-full sm:w-auto"
              onClick={handleSendInvite}
              disabled={submitting || !email.trim()}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              [ INVITE ]
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-mono mt-2">
          Only invited users can sign up. Invites expire in 7 days.
        </p>
      </div>

      {/* Invites List */}
      {invites.length === 0 ? (
        <div className="text-center py-8">
          <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground font-mono text-sm">NO_INVITES_SENT</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => {
            const { status, color, icon: StatusIcon, text } = getInviteStatus(invite);
            
            return (
              <div 
                key={invite.id}
                className={`p-3 sm:p-4 rounded-lg border ${
                  status === 'pending' ? 'border-primary/30 bg-primary/5' : 'border-muted/30 bg-muted/5'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded uppercase ${
                        invite.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-primary/20 text-primary'
                      }`}>
                        {invite.role}
                      </span>
                      <span className={`text-xs font-mono flex items-center gap-1 ${color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {text}
                      </span>
                    </div>
                    <p className="font-mono text-primary truncate text-sm">{invite.email}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono mt-1">
                      <span>Sent: {format(new Date(invite.created_at), 'MMM dd')}</span>
                      {!invite.used_at && (
                        <span>Expires: {format(new Date(invite.expires_at), 'MMM dd')}</span>
                      )}
                      {invite.used_at && (
                        <span>Used: {format(new Date(invite.used_at), 'MMM dd')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                    {status === 'pending' && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => copyInviteLink(invite.token)}
                        className="h-8 w-8 text-primary"
                        title="Copy invite link"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteInvite(invite.id)}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
