import { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, Crown, Shield, Volume2, VolumeX, Users,
  MessageSquare, Mic, MicOff, Monitor, MonitorOff, Radio,
  AlertTriangle, Zap, Settings, ChevronDown, ChevronUp,
  UserX, Ban, Megaphone, Sparkles, Lock, Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VIPCommandCenterProps {
  onlineUsers: { id: string; user_id: string; display_name: string | null; is_admin: boolean }[];
}

interface MutedUser {
  id: string;
  display_name: string;
}

type Vec2 = { x: number; y: number };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function VIPCommandCenter({ onlineUsers }: VIPCommandCenterProps) {
  const { user, isAdmin } = useAuth();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSpectating, setIsSpectating] = useState(false);
  const [spectateAudio, setSpectateAudio] = useState(true);
  const [spectateChat, setSpectateChat] = useState(true);
  const [announcementText, setAnnouncementText] = useState('');
  const [mutedUsers, setMutedUsers] = useState<MutedUser[]>([]);
  const [globalMute, setGlobalMute] = useState(false);
  const [loungeState, setLoungeState] = useState<'open' | 'restricted' | 'locked'>('open');
  const [vipMode, setVipMode] = useState<'observe' | 'broadcast' | 'moderate'>('observe');
  const glowRef = useRef<HTMLDivElement>(null);

  // ====== MOVEABLE (DRAG) + LOCKDOWN (CLAMP TO SCREEN) ======
  const panelRef = useRef<HTMLDivElement>(null);

  const [panelPos, setPanelPos] = useState<Vec2>(() => {
    try {
      const saved = localStorage.getItem('vip_cc_pos');
      return saved ? JSON.parse(saved) : { x: 24, y: 120 };
    } catch {
      return { x: 24, y: 120 };
    }
  });

  const [panelLocked, setPanelLocked] = useState(() => {
    return localStorage.getItem('vip_cc_locked') === 'true';
  });

  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  useEffect(() => {
    localStorage.setItem('vip_cc_pos', JSON.stringify(panelPos));
  }, [panelPos]);

  useEffect(() => {
    localStorage.setItem('vip_cc_locked', String(panelLocked));
  }, [panelLocked]);

  const clampToViewport = () => {
    const el = panelRef.current;
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();

    const maxX = Math.max(0, vw - rect.width);
    const maxY = Math.max(0, vh - rect.height);

    setPanelPos((p) => ({
      x: clamp(p.x, 0, maxX),
      y: clamp(p.y, 0, maxY),
    }));
  };

  useEffect(() => {
    const onResize = () => clampToViewport();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if (panelLocked) return;

    const el = panelRef.current;
    if (!el) return;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.startPosX = panelPos.x;
    dragRef.current.startPosY = panelPos.y;
  };

  const onHeaderPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging || panelLocked) return;

    const el = panelRef.current;
    if (!el) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    const nextX = dragRef.current.startPosX + dx;
    const nextY = dragRef.current.startPosY + dy;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();

    const maxX = Math.max(0, vw - rect.width);
    const maxY = Math.max(0, vh - rect.height);

    setPanelPos({
      x: clamp(nextX, 0, maxX),
      y: clamp(nextY, 0, maxY),
    });
  };

  const onHeaderPointerUp = () => {
    dragRef.current.dragging = false;
  };
  // ====== END MOVEABLE ======

  if (!isAdmin) return null;

  const sendAnnouncement = async () => {
    if (!announcementText.trim()) return;

    // Send as a special system message
    const { error } = await supabase.from('lounge_messages').insert({
      user_id: user?.id,
      content: `📢 ADMIN BROADCAST: ${announcementText}`,
      message_type: 'announcement',
    });

    if (error) {
      toast.error('Failed to send announcement');
    } else {
      toast.success('Announcement sent to lounge');
      setAnnouncementText('');
    }
  };

  const toggleUserMute = (userId: string, displayName: string) => {
    const isMuted = mutedUsers.some(u => u.id === userId);
    if (isMuted) {
      setMutedUsers(prev => prev.filter(u => u.id !== userId));
      toast.success(`Unmuted ${displayName}`);
    } else {
      setMutedUsers(prev => [...prev, { id: userId, display_name: displayName }]);
      toast.success(`Muted ${displayName}`);
    }
  };

  const toggleGlobalMute = () => {
    setGlobalMute(!globalMute);
    toast.success(globalMute ? 'Lounge unmuted' : 'Lounge muted - Only VIP can speak');
  };

  const cycleLoungeState = () => {
    const states: Array<'open' | 'restricted' | 'locked'> = ['open', 'restricted', 'locked'];
    const currentIdx = states.indexOf(loungeState);
    const nextState = states[(currentIdx + 1) % states.length];
    setLoungeState(nextState);

    const messages = {
      open: 'Lounge is now open to all',
      restricted: 'Lounge restricted - Invite only',
      locked: 'Lounge locked - VIP access only',
    };
    toast.success(messages[nextState]);
  };

  const kickUser = async (userId: string, displayName: string) => {
    // Remove from all voice rooms
    await supabase
      .from('voice_room_participants')
      .delete()
      .eq('user_id', userId);

    toast.success(`${displayName} kicked from voice rooms`);
  };

  const getModeIcon = () => {
    switch (vipMode) {
      case 'observe': return <Eye className="w-4 h-4" />;
      case 'broadcast': return <Megaphone className="w-4 h-4" />;
      case 'moderate': return <Shield className="w-4 h-4" />;
    }
  };

  const getModeColor = () => {
    switch (vipMode) {
      case 'observe': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/50';
      case 'broadcast': return 'from-purple-500/20 to-pink-500/20 border-purple-500/50';
      case 'moderate': return 'from-red-500/20 to-orange-500/20 border-red-500/50';
    }
  };

  return (
    <div
      ref={panelRef}
      className={`fixed w-80 z-50 transition-all duration-300 select-none ${
        isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-48px)]'
      }`}
      style={{
        left: panelPos.x,
        top: panelPos.y,
      }}
    >
      {/* VIP Header (DRAG HANDLE) */}
      {/* VIP Header (DRAG HANDLE) */}
<div
  onPointerDown={onHeaderPointerDown}
  onPointerMove={onHeaderPointerMove}
  onPointerUp={onHeaderPointerUp}
  onPointerCancel={onHeaderPointerUp}
  className={`w-full flex items-center justify-between p-3 rounded-t-xl bg-gradient-to-r ${getModeColor()} border-t border-x backdrop-blur-xl cursor-move`}
>
  <div className="flex items-center gap-2">
    <div className="relative">
      <Crown className="w-5 h-5 text-amber-400 animate-pulse" />
      <div className="absolute inset-0 w-5 h-5 bg-amber-400/50 blur-md animate-pulse" />
    </div>
    <span className="font-mono font-bold text-amber-400 text-sm tracking-wider">
      VIP COMMAND CENTER
    </span>
    <Sparkles className="w-4 h-4 text-amber-400/60" />
  </div>

  <div className="flex items-center gap-2">
    {/* LOCK BUTTON */}
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="w-7 h-7"
      onClick={(e) => {
        e.stopPropagation();
        setPanelLocked((v) => !v);
        requestAnimationFrame(() => clampToViewport());
      }}
      aria-label={panelLocked ? 'Unlock panel' : 'Lock panel'}
    >
      {panelLocked
        ? <Lock className="w-4 h-4 text-amber-400" />
        : <Unlock className="w-4 h-4 text-amber-400" />
      }
    </Button>

    {/* EXPAND/COLLAPSE BUTTON (separate from drag) */}
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="w-7 h-7"
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded((v) => !v);
        requestAnimationFrame(() => clampToViewport());
      }}
      aria-label={isExpanded ? 'Collapse' : 'Expand'}
    >
      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
    </Button>
  </div>
</div>

      {/* Content */}
      <div className={`bg-gradient-to-b from-black/95 to-zinc-900/95 border border-t-0 ${getModeColor().split(' ').slice(2).join(' ')} rounded-b-xl backdrop-blur-xl overflow-hidden`}>
        {/* Mode Selector */}
        <div className="p-3 border-b border-primary/20">
          <div className="flex gap-1 p-1 bg-black/50 rounded-lg">
            {(['observe', 'broadcast', 'moderate'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setVipMode(mode)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-mono uppercase transition-all ${
                  vipMode === mode
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : 'hover:bg-primary/20 text-muted-foreground'
                }`}
              >
                {mode === 'observe' && <Eye className="w-3 h-3" />}
                {mode === 'broadcast' && <Megaphone className="w-3 h-3" />}
                {mode === 'moderate' && <Shield className="w-3 h-3" />}
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Spectate Controls */}
        {vipMode === 'observe' && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">SPECTATE MODE</span>
              <Button
                variant={isSpectating ? "default" : "outline"}
                size="sm"
                onClick={() => setIsSpectating(!isSpectating)}
                className="gap-1.5"
              >
                {isSpectating ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {isSpectating ? 'Visible' : 'Hidden'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={spectateChat ? "default" : "outline"}
                size="sm"
                onClick={() => setSpectateChat(!spectateChat)}
                className="gap-1.5 text-xs"
              >
                <MessageSquare className="w-3 h-3" />
                Chat
              </Button>
              <Button
                variant={spectateAudio ? "default" : "outline"}
                size="sm"
                onClick={() => setSpectateAudio(!spectateAudio)}
                className="gap-1.5 text-xs"
              >
                {spectateAudio ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                Audio
              </Button>
            </div>

            {isSpectating && (
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-blue-400 text-center font-mono animate-pulse">
                  👁️ STEALTH MODE ACTIVE - You are invisible
                </p>
              </div>
            )}
          </div>
        )}

        {/* Broadcast Controls */}
        {vipMode === 'broadcast' && (
          <div className="p-3 space-y-3">
            <div>
              <span className="text-xs font-mono text-muted-foreground">ADMIN ANNOUNCEMENT</span>
              <Textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Type your announcement..."
                className="mt-2 bg-black/50 border-primary/30 resize-none text-sm"
                rows={2}
              />
              <Button
                onClick={sendAnnouncement}
                className="w-full mt-2 gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                disabled={!announcementText.trim()}
              >
                <Megaphone className="w-4 h-4" />
                Broadcast
              </Button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-green-400" />
                <span className="text-xs font-mono">VIP Voice Active</span>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        )}

        {/* Moderate Controls */}
        {vipMode === 'moderate' && (
          <div className="p-3 space-y-3">
            <div className="flex gap-2">
              <Button
                variant={globalMute ? "destructive" : "outline"}
                size="sm"
                onClick={toggleGlobalMute}
                className="flex-1 gap-1.5 text-xs"
              >
                {globalMute ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                {globalMute ? 'Unmute All' : 'Mute All'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={cycleLoungeState}
                className="flex-1 gap-1.5 text-xs"
              >
                {loungeState === 'open' && <Unlock className="w-3 h-3" />}
                {loungeState === 'restricted' && <Shield className="w-3 h-3" />}
                {loungeState === 'locked' && <Lock className="w-3 h-3" />}
                {loungeState.toUpperCase()}
              </Button>
            </div>

            {/* Online Users List */}
            <div>
              <span className="text-xs font-mono text-muted-foreground mb-2 block">
                ONLINE USERS ({onlineUsers.filter(u => !u.is_admin).length})
              </span>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {onlineUsers.filter(u => !u.is_admin && u.user_id !== user?.id).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-black/30 hover:bg-black/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        mutedUsers.some(m => m.id === u.user_id) ? 'bg-red-500' : 'bg-green-500'
                      }`} />
                      <span className="text-xs font-mono truncate max-w-[100px]">
                        {u.display_name || `User_${u.user_id.slice(0, 6)}`}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={() => toggleUserMute(u.user_id, u.display_name || 'User')}
                        aria-label={mutedUsers.some(m => m.id === u.user_id) ? "Unmute user" : "Mute user"}
                      >
                        {mutedUsers.some(m => m.id === u.user_id)
                          ? <MicOff className="w-3 h-3 text-red-400" />
                          : <Mic className="w-3 h-3" />
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6 hover:text-red-400"
                        onClick={() => kickUser(u.user_id, u.display_name || 'User')}
                        aria-label="Kick user"
                      >
                        <UserX className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {onlineUsers.filter(u => !u.is_admin).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No users to moderate</p>
                )}
              </div>
            </div>

            {/* Muted Users */}
            {mutedUsers.length > 0 && (
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                <span className="text-xs font-mono text-red-400">
                  MUTED: {mutedUsers.map(u => u.display_name).join(', ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Status Bar */}
        <div className="p-2 border-t border-primary/20 bg-black/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getModeIcon()}
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              {vipMode} MODE
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground">
              {onlineUsers.length} online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

}
