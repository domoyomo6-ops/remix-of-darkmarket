import { useState, useEffect, useRef } from 'react';
import {
  Eye, EyeOff, Crown, Shield, Volume2, VolumeX, Users,
  MessageSquare, Mic, MicOff, Radio,
  ChevronDown, ChevronUp,
  UserX, Megaphone, Sparkles, Lock, Unlock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VIPCommandCenterProps {
  onlineUsers: {
    id: string;
    user_id: string;
    display_name: string | null;
    is_admin: boolean;
  }[];
}

interface MutedUser {
  id: string;
  display_name: string;
}

type Vec2 = { x: number; y: number };
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

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

  // ===== DRAG / LOCK =====
  const panelRef = useRef<HTMLDivElement>(null);

  const [panelPos, setPanelPos] = useState<Vec2>(() => {
    try {
      const saved = localStorage.getItem('vip_cc_pos');
      return saved ? JSON.parse(saved) : { x: 24, y: 120 };
    } catch {
      return { x: 24, y: 120 };
    }
  });

  const [panelLocked, setPanelLocked] = useState(
    localStorage.getItem('vip_cc_locked') === 'true'
  );

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

  useEffect(() => {
    const stop = () => (dragRef.current.dragging = false);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  const clampToViewport = () => {
    const el = panelRef.current;
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();

    setPanelPos(p => ({
      x: clamp(p.x, 0, vw - rect.width),
      y: clamp(p.y, 0, vh - rect.height),
    }));
  };

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if (panelLocked) return;
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    dragRef.current.startPosX = panelPos.x;
    dragRef.current.startPosY = panelPos.y;
  };

  const onHeaderPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging || panelLocked) return;

    setPanelPos({
      x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
    });
  };

  const onHeaderPointerUp = () => {
    dragRef.current.dragging = false;
    clampToViewport();
  };
  // ===== END DRAG =====

  if (!isAdmin) return null;

  const sendAnnouncement = async () => {
    if (!announcementText.trim()) return;

    const { error } = await supabase.from('lounge_messages').insert({
      user_id: user?.id,
      content: `📢 ADMIN BROADCAST: ${announcementText}`,
      message_type: 'announcement',
    });

    if (error) toast.error('Failed to send announcement');
    else {
      toast.success('Announcement sent');
      setAnnouncementText('');
    }
  };

  return (
    <div
      ref={panelRef}
      className={`fixed w-80 z-50 select-none ${
        isExpanded ? '' : 'translate-y-[calc(100%-48px)]'
      }`}
      style={{ left: panelPos.x, top: panelPos.y }}
    >
      {/* HEADER */}
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        className="cursor-move flex items-center justify-between p-3 rounded-t-xl bg-black/80 border border-primary/40"
      >
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <span className="font-mono text-amber-400 text-sm">VIP COMMAND CENTER</span>
          <Sparkles className="w-4 h-4 text-amber-400/60" />
        </div>

        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setPanelLocked(v => !v);
            }}
          >
            {panelLocked ? <Lock /> : <Unlock />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(v => !v);
            }}
          >
            {isExpanded ? <ChevronDown /> : <ChevronUp />}
          </Button>
        </div>
      </div>

      {/* BODY */}
      <div className="bg-black/90 border border-t-0 border-primary/40 rounded-b-xl p-3">
        {vipMode === 'broadcast' && (
          <>
            <Textarea
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="Type announcement…"
              rows={2}
            />
            <Button
              onClick={sendAnnouncement}
              className="w-full mt-2 bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={!announcementText.trim()}
            >
              <Megaphone className="w-4 h-4 mr-2" />
              Broadcast
            </Button>
          </>
        )}
      </div>
    </div>
  );
}


