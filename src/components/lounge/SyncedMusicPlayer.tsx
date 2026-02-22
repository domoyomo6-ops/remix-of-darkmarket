import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Move, Pause, Play, Square, Maximize2, Minimize2, Clapperboard } from 'lucide-react';

type NowPlaying = {
  id: string;
  source_url: string;
  source_type: string;
  title: string;
  artist: string | null;
  is_playing: boolean | null;
  current_position: number | null;
  started_at: string | null;
  updated_at: string | null;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const REQUEST_COST = 0.25;

export default function SyncedMusicPlayer() {
  const { user, isAdmin } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftType, setDraftType] = useState<'audio' | 'video'>('video');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 0 });
  const [dragging, setDragging] = useState(false);

  const isVideo = useMemo(() => {
    if (!nowPlaying?.source_url) return true;
    if (nowPlaying.source_type === 'video') return true;
    const lower = nowPlaying.source_url.toLowerCase();
    return ['.mp4', '.webm', '.ogg', '.mov', 'youtube.com', 'youtu.be', 'vimeo.com'].some((k) => lower.includes(k));
  }, [nowPlaying]);

  const fetchNowPlaying = async () => {
    const { data, error } = await supabase
      .from('music_now_playing')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error('Unable to load theater broadcast.');
      return;
    }

    setNowPlaying(data as NowPlaying | null);
  };

  useEffect(() => {
    fetchNowPlaying();

    const channel = supabase
      .channel('synced-theater-player')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_now_playing' }, () => {
        fetchNowPlaying();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !nowPlaying) return;

    const base = nowPlaying.current_position ?? 0;
    const startedAt = nowPlaying.started_at ? new Date(nowPlaying.started_at).getTime() : Date.now();
    const delta = nowPlaying.is_playing ? (Date.now() - startedAt) / 1000 : 0;
    const syncedPosition = Math.max(0, base + delta);

    if (Math.abs(el.currentTime - syncedPosition) > 2) {
      el.currentTime = syncedPosition;
    }

    if (nowPlaying.is_playing) {
      el.play().catch(() => {
        toast.message('Tap play to join synced theater playback.');
      });
    } else {
      el.pause();
    }
  }, [nowPlaying]);

  const pushNowPlaying = async (payload: Partial<NowPlaying> & { source_url: string; title: string; source_type: string }) => {
    if (!isAdmin) return;

    if (nowPlaying?.id) {
      const { error } = await supabase
        .from('music_now_playing')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', nowPlaying.id);
      if (error) toast.error('Failed to update synced broadcast.');
    } else {
      const { error } = await supabase.from('music_now_playing').insert({
        ...payload,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_playing: true,
      });
      if (error) toast.error('Failed to start synced broadcast.');
    }
  };

  const startBroadcast = async () => {
    if (!draftUrl.trim() || !draftTitle.trim()) {
      toast.error('Add a title and media URL first.');
      return;
    }

    await pushNowPlaying({
      title: draftTitle.trim(),
      source_url: draftUrl.trim(),
      source_type: draftType,
      current_position: 0,
      started_at: new Date().toISOString(),
      is_playing: true,
    });
    toast.success('Synced theater broadcast started.');
  };

  const pauseBroadcast = async () => {
    if (!nowPlaying) return;
    const currentPosition = videoRef.current?.currentTime ?? nowPlaying.current_position ?? 0;
    await pushNowPlaying({
      source_url: nowPlaying.source_url,
      source_type: nowPlaying.source_type,
      title: nowPlaying.title,
      artist: nowPlaying.artist,
      current_position: currentPosition,
      is_playing: false,
    });
  };

  const resumeBroadcast = async () => {
    if (!nowPlaying) return;
    await pushNowPlaying({
      source_url: nowPlaying.source_url,
      source_type: nowPlaying.source_type,
      title: nowPlaying.title,
      artist: nowPlaying.artist,
      current_position: videoRef.current?.currentTime ?? nowPlaying.current_position ?? 0,
      started_at: new Date().toISOString(),
      is_playing: true,
    });
  };

  const stopBroadcast = async () => {
    if (!isAdmin || !nowPlaying?.id) return;
    const { error } = await supabase.from('music_now_playing').delete().eq('id', nowPlaying.id);
    if (error) {
      toast.error('Failed to stop broadcast.');
      return;
    }
    setNowPlaying(null);
    toast.success('Broadcast ended.');
  };

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragging || isFullscreen) return;
      setPosition((prev) => ({
        x: clamp(prev.x + event.movementX, 8, window.innerWidth - 460),
        y: 0,
      }));
    };

    const onUp = () => setDragging(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, isFullscreen]);

  if (!user) return null;

  return (
    <div
      className={`z-40 border border-primary/30 bg-zinc-950/95 shadow-2xl shadow-primary/10 rounded-xl overflow-hidden ${
        isFullscreen ? 'fixed inset-3' : 'fixed w-[420px] max-w-[calc(100vw-16px)] bottom-4'
      }`}
      style={!isFullscreen ? { left: position.x } : undefined}
    >
      <div
        className="px-3 py-2 bg-zinc-900 border-b border-primary/20 flex items-center justify-between cursor-move"
        onMouseDown={() => setDragging(true)}
      >
        <div className="flex items-center gap-2 text-primary text-xs uppercase font-mono tracking-wide">
          <Move className="w-3 h-3" />
          Lounge Theater
        </div>
        <button
          className="text-zinc-300 hover:text-white"
          onClick={() => setIsFullscreen((prev) => !prev)}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div className="rounded-lg overflow-hidden border border-primary/20 bg-black/70">
          {nowPlaying ? (
            <video
              ref={videoRef}
              src={nowPlaying.source_url}
              controls
              playsInline
              className={`${isVideo ? 'aspect-video' : 'h-20'} w-full bg-black object-cover`}
            />
          ) : (
            <div className="aspect-video grid place-items-center text-muted-foreground text-sm">
              <div className="text-center space-y-1">
                <Clapperboard className="w-8 h-8 mx-auto text-primary/70" />
                <p>No live media broadcast</p>
                <p className="text-xs">Admins can start music videos or movie streams.</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          <p className="text-primary truncate">{nowPlaying?.title || 'Waiting for showtime...'}</p>
          <p>Music requests cost ${REQUEST_COST.toFixed(2)} each (4 songs = $1.00 from site balance).</p>
        </div>

        {isAdmin && (
          <div className="space-y-2">
            <Input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Broadcast title"
              className="bg-black/40 border-primary/30"
            />
            <Input
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              placeholder="Direct media URL (mp4/webm/mp3)"
              className="bg-black/40 border-primary/30"
            />
            <div className="flex gap-2">
              <Button
                variant={draftType === 'video' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDraftType('video')}
              >
                Video
              </Button>
              <Button
                variant={draftType === 'audio' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDraftType('audio')}
              >
                Audio
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={startBroadcast}><Play className="w-3 h-3 mr-1" />Start</Button>
              <Button size="sm" variant="outline" onClick={pauseBroadcast}><Pause className="w-3 h-3 mr-1" />Pause</Button>
              <Button size="sm" variant="outline" onClick={resumeBroadcast}><Play className="w-3 h-3 mr-1" />Resume</Button>
              <Button size="sm" variant="destructive" onClick={stopBroadcast}><Square className="w-3 h-3 mr-1" />Stop</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
