import { useState, useEffect, useRef } from 'react';
import { 
  Music, Play, Pause, SkipForward, Volume2, VolumeX,
  ListMusic, Plus, Check, X, Youtube, Radio, Link,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface MusicRequest {
  id: string;
  user_id: string;
  title: string;
  artist: string | null;
  source_type: 'youtube' | 'soundcloud' | 'direct';
  source_url: string;
  status: 'pending' | 'approved' | 'playing' | 'played' | 'rejected';
  requested_at: string;
}

interface NowPlaying {
  id: string;
  request_id: string | null;
  source_type: string;
  source_url: string;
  title: string;
  artist: string | null;
  is_playing: boolean;
  current_position: number | null;
}

export default function SyncedMusicPlayer() {
  const { user, isAdmin } = useAuth();
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [requests, setRequests] = useState<MusicRequest[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const youtubeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetchNowPlaying();
    fetchRequests();

    // Subscribe to real-time updates
    const nowPlayingChannel = supabase
      .channel('music-now-playing')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_now_playing' }, () => {
        fetchNowPlaying();
      })
      .subscribe();

    const requestsChannel = supabase
      .channel('music-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_requests' }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(nowPlayingChannel);
      supabase.removeChannel(requestsChannel);
    };
  }, []);

  const fetchNowPlaying = async () => {
    const { data } = await supabase
      .from('music_now_playing')
      .select('*')
      .limit(1)
      .maybeSingle();
    setNowPlaying(data);
  };

  const fetchRequests = async () => {
    const { data } = await supabase
      .from('music_requests')
      .select('*')
      .in('status', ['pending', 'approved'])
      .order('requested_at', { ascending: true });
    if (data) {
      setRequests(data as MusicRequest[]);
    }
  };

  const detectSourceType = (url: string): 'youtube' | 'soundcloud' | 'direct' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('soundcloud.com')) return 'soundcloud';
    return 'direct';
  };

  const extractTitle = (url: string): string => {
    try {
      const urlObj = new URL(url);
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return 'YouTube Track';
      }
      if (url.includes('soundcloud.com')) {
        const parts = urlObj.pathname.split('/');
        return parts[parts.length - 1].replace(/-/g, ' ') || 'SoundCloud Track';
      }
      return urlObj.hostname;
    } catch {
      return 'Unknown Track';
    }
  };

  const submitRequest = async () => {
    if (!user || !newUrl.trim()) return;

    const sourceType = detectSourceType(newUrl);
    const title = extractTitle(newUrl);

    const { error } = await supabase.from('music_requests').insert({
      user_id: user.id,
      title,
      source_type: sourceType,
      source_url: newUrl.trim(),
      status: 'pending',
    });

    if (error) {
      toast.error('Failed to submit request');
    } else {
      toast.success('Track requested!');
      setNewUrl('');
    }
  };

  const approveRequest = async (request: MusicRequest) => {
    await supabase.from('music_requests').update({ status: 'approved' }).eq('id', request.id);
    toast.success('Request approved');
  };

  const rejectRequest = async (request: MusicRequest) => {
    await supabase.from('music_requests').update({ status: 'rejected' }).eq('id', request.id);
  };

  const playNow = async (request: MusicRequest) => {
    // Clear current playing
    await supabase.from('music_now_playing').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Set new track
    const { error } = await supabase.from('music_now_playing').insert({
      request_id: request.id,
      source_type: request.source_type,
      source_url: request.source_url,
      title: request.title,
      artist: request.artist,
      is_playing: true,
    });

    // Update request status
    await supabase.from('music_requests').update({ status: 'playing', played_at: new Date().toISOString() }).eq('id', request.id);

    if (!error) {
      toast.success(`Now playing: ${request.title}`);
    }
  };

  const togglePlayPause = async () => {
    if (!nowPlaying) return;
    await supabase.from('music_now_playing').update({ is_playing: !nowPlaying.is_playing }).eq('id', nowPlaying.id);
  };

  const skipTrack = async () => {
    if (!nowPlaying) return;
    await supabase.from('music_now_playing').delete().eq('id', nowPlaying.id);
    
    // Auto-play next approved track
    const nextTrack = requests.find(r => r.status === 'approved');
    if (nextTrack) {
      playNow(nextTrack);
    }
  };

  const getEmbedUrl = (source: NowPlaying) => {
    if (source.source_type === 'youtube') {
      // Extract video ID from various YouTube URL formats
      const match = source.source_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/);
      const videoId = match ? match[1] : source.source_url;
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
    }
    if (source.source_type === 'soundcloud') {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(source.source_url)}&auto_play=true`;
    }
    return source.source_url;
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-500" />;
      case 'soundcloud':
        return <Radio className="w-4 h-4 text-orange-500" />;
      default:
        return <Link className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Mini Player */}
      <div className="panel-3d overflow-hidden">
        <div 
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-primary/10 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            {nowPlaying ? getSourceIcon(nowPlaying.source_type) : <Music className="w-5 h-5 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm truncate">
              {nowPlaying?.title || 'No track playing'}
            </div>
            {nowPlaying?.artist && (
              <div className="text-xs text-muted-foreground truncate">{nowPlaying.artist}</div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && nowPlaying && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="w-8 h-8"
                onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                aria-label={nowPlaying.is_playing ? "Pause music" : "Play music"}
              >
                {nowPlaying.is_playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            )}
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-8 h-8"
              onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
              aria-label={isMuted ? "Unmute music" : "Mute music"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-8 h-8"
              aria-label={isExpanded ? "Collapse player" : "Expand player"}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="border-t border-primary/20 p-4 space-y-4 max-w-sm">
            {/* Now Playing Embed */}
            {nowPlaying && (
              <div className="space-y-2">
                <div className="aspect-video bg-black/50 rounded-lg overflow-hidden">
                  {isMuted ? (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <VolumeX className="w-8 h-8" />
                    </div>
                  ) : (
                    <iframe
                      ref={youtubeRef}
                      src={getEmbedUrl(nowPlaying)}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`Now playing: ${nowPlaying.title}`}
                    />
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center justify-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={togglePlayPause}
                      aria-label={nowPlaying.is_playing ? "Pause music" : "Play music"}
                    >
                      {nowPlaying.is_playing ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                      <span>{nowPlaying.is_playing ? 'Pause' : 'Play'}</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={skipTrack}
                      aria-label="Skip to next track"
                    >
                      <SkipForward className="w-4 h-4 mr-1" />
                      <span>Skip</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Request Form */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="YouTube or SoundCloud URL..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="flex-1 crt-input"
                  aria-label="Enter music URL"
                />
                <Button 
                  size="icon" 
                  onClick={submitRequest} 
                  disabled={!newUrl.trim()}
                  aria-label="Submit music request"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Submit a track request for the DJ queue
              </p>
            </div>

            {/* Queue Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setShowQueue(!showQueue)}
              aria-label={showQueue ? "Hide queue" : "Show queue"}
              aria-expanded={showQueue}
            >
              <span className="flex items-center gap-2">
                <ListMusic className="w-4 h-4" />
                <span>Queue ({requests.length})</span>
              </span>
              {showQueue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {/* Request Queue */}
            {showQueue && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {requests.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No tracks in queue
                  </p>
                ) : (
                  requests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-card/50 hover:bg-card/80 transition-colors"
                    >
                      {getSourceIcon(request.source_type)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate font-mono">{request.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {request.status === 'pending' ? '⏳ Pending' : '✓ Approved'}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          {request.status === 'pending' && (
                            <>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="w-6 h-6"
                                onClick={() => approveRequest(request)}
                                aria-label={`Approve ${request.title}`}
                              >
                                <Check className="w-3 h-3 text-green-500" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="w-6 h-6"
                                onClick={() => rejectRequest(request)}
                                aria-label={`Reject ${request.title}`}
                              >
                                <X className="w-3 h-3 text-red-500" />
                              </Button>
                            </>
                          )}
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="w-6 h-6"
                            onClick={() => playNow(request)}
                            aria-label={`Play ${request.title} now`}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
