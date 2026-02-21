import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Users, Mic, Radio, Crown, Plus,
  Calendar, ArrowLeft, MonitorUp
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import LoungeChat from '@/components/lounge/LoungeChat';
import VoiceRoomComponent from '@/components/lounge/VoiceRoom';
import SyncedMusicPlayer from '@/components/lounge/SyncedMusicPlayer';
import VIPCommandCenter from '@/components/lounge/VIPCommandCenter';

interface VoiceRoom {
  id: string;
  name: string;
  room_type: 'push_to_talk' | 'always_on' | 'scheduled';
  scheduled_start: string | null;
  scheduled_end: string | null;
  is_active: boolean;
  max_participants: number;
  created_by: string;
}

interface OnlineUser {
  id: string;
  user_id: string;
  display_name: string | null;
  is_admin: boolean;
}

export default function Lounge() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [selectedVoiceRoom, setSelectedVoiceRoom] = useState<VoiceRoom | null>(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', type: 'push_to_talk' as VoiceRoom['room_type'] });
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [theaterMode, setTheaterMode] = useState(false);

  useEffect(() => {
    fetchVoiceRooms();
    fetchAdmins();
    setupPresence();
  }, [user]);

  const fetchVoiceRooms = async () => {
    const { data } = await supabase
      .from('voice_rooms')
      .select('*')
      .eq('is_active', true)
      .order('created_at');
    if (data) setVoiceRooms(data as VoiceRoom[]);
  };

  const fetchAdmins = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    if (data) setAdminIds(data.map(r => r.user_id));
  };

  const setupPresence = () => {
    if (!user) return;

    const channel = supabase.channel('lounge-presence');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: OnlineUser[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            users.push({
              id: presence.presence_ref,
              user_id: presence.user_id,
              display_name: presence.display_name,
              is_admin: adminIds.includes(presence.user_id),
            });
          });
        });
        
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            display_name: null,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createVoiceRoom = async () => {
    if (!user || !newRoom.name) return;

    const { error } = await supabase.from('voice_rooms').insert({
      name: newRoom.name,
      room_type: newRoom.type,
      created_by: user.id,
    });

    if (error) {
      toast.error('Failed to create room');
    } else {
      toast.success('Voice room created');
      setNewRoom({ name: '', type: 'push_to_talk' });
      setShowCreateRoom(false);
      fetchVoiceRooms();
    }
  };

  const deleteVoiceRoom = async (id: string) => {
    const { error } = await supabase.from('voice_rooms').delete().eq('id', id);
    if (!error) {
      toast.success('Room deleted');
      fetchVoiceRooms();
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.18),_transparent_55%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.18),_transparent_45%),linear-gradient(180deg,_rgba(4,6,12,0.96),_rgba(2,2,8,0.98))]">
        {/* Header */}
        <div className="p-4 border-b border-fuchsia-400/30 bg-black/60 backdrop-blur-xl shadow-[0_0_40px_rgba(217,70,239,0.15)]">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/forum')}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-mono text-sm hidden sm:inline">Forum</span>
              </button>
              <div className="h-6 w-px bg-primary/20" />
              <h1 className="text-xl sm:text-2xl font-bold text-primary terminal-glow font-mono">
                [ LOUNGE://NIGHTCLUB ]
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-primary font-mono">{onlineUsers.length} online</span>
              </div>

              <Button
                variant={theaterMode ? 'default' : 'outline'}
                size="sm"
                className="gap-2"
                onClick={() => setTheaterMode((prev) => !prev)}
              >
                <MonitorUp className="w-4 h-4" />
                {theaterMode ? 'Exit Theater' : 'Theater'}
              </Button>
              
              {isAdmin && (
                <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Voice Room</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-900 border-primary/30">
                    <DialogHeader>
                      <DialogTitle className="text-primary font-mono">Create Voice Room</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Input
                        placeholder="Room name"
                        value={newRoom.name}
                        onChange={(e) => setNewRoom(p => ({ ...p, name: e.target.value }))}
                        className="bg-black/50 border-primary/30"
                      />
                      <Select 
                        value={newRoom.type} 
                        onValueChange={(v) => setNewRoom(p => ({ ...p, type: v as VoiceRoom['room_type'] }))}
                      >
                        <SelectTrigger className="bg-black/50 border-primary/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="push_to_talk">Push-to-Talk</SelectItem>
                          <SelectItem value="always_on">Always On</SelectItem>
                          <SelectItem value="scheduled">Scheduled Event</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={createVoiceRoom} className="w-full crt-button">
                        Create Room
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Chat area */}
          <div className={`flex-1 flex flex-col min-h-0 bg-black/30 ${theaterMode ? '' : 'lg:border-r border-fuchsia-400/25'}`}>
            <LoungeChat showComposer={!theaterMode} />
          </div>

          {!theaterMode && (
            <div className="w-full lg:w-80 border-t lg:border-t-0 border-fuchsia-400/25 bg-black/40 backdrop-blur-md overflow-y-auto">
              {/* Online users */}
              <div className="p-4 border-b border-fuchsia-400/20">
                <h3 className="text-sm font-mono text-primary mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Online ({onlineUsers.length})
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {onlineUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className={`font-mono ${u.is_admin ? 'text-red-400' : 'text-foreground'}`}>
                        {u.display_name || `User_${u.user_id.slice(0, 6)}`}
                      </span>
                      {u.is_admin && <Crown className="w-3 h-3 text-red-400" />}
                    </div>
                  ))}
                  {onlineUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground">No users online</p>
                  )}
                </div>
              </div>

              {/* Voice rooms */}
              <div className="p-4">
                <h3 className="text-sm font-mono text-primary mb-3 flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Voice Rooms
                </h3>
                <div className="space-y-3">
                  {voiceRooms.map((room) => (
                    <div key={room.id}>
                      {selectedVoiceRoom?.id === room.id ? (
                        <VoiceRoomComponent 
                          room={room} 
                          onLeave={() => setSelectedVoiceRoom(null)}
                        />
                      ) : (
                        <button
                          onClick={() => setSelectedVoiceRoom(room)}
                          className="w-full p-3 rounded-lg bg-gradient-to-br from-fuchsia-950/40 via-black/70 to-cyan-950/30 border border-fuchsia-400/20 hover:border-fuchsia-300/60 hover:shadow-[0_0_24px_rgba(217,70,239,0.25)] transition-all duration-300 text-left group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {room.room_type === 'push_to_talk' && <Mic className="w-4 h-4 text-primary" />}
                              {room.room_type === 'always_on' && <Radio className="w-4 h-4 text-green-500" />}
                              {room.room_type === 'scheduled' && <Calendar className="w-4 h-4 text-yellow-500" />}
                              <span className="text-sm font-medium">{room.name}</span>
                            </div>
                            {isAdmin && room.created_by === user?.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteVoiceRoom(room.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity text-xs"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </button>
                      )}
                    </div>
                  ))}
                  {voiceRooms.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      No voice rooms active
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Synced music player */}
        <SyncedMusicPlayer />

        {/* VIP Admin Command Center */}
        <VIPCommandCenter onlineUsers={onlineUsers} />
      </div>
    </MainLayout>
  );
}
