import { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Music, Plus, Trash2, ListMusic, Repeat, Shuffle, X,
  ChevronUp, ChevronDown, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Track {
  id: string;
  title: string;
  artist: string | null;
  url: string;
  duration: number | null;
}

interface Playlist {
  id: string;
  name: string;
  user_id: string;
  is_public: boolean | null;
  tracks: Track[];
}

export default function MusicPlayer() {
  const { user, isAdmin } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [publicPlaylists, setPublicPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [newTrack, setNewTrack] = useState({ title: '', artist: '', url: '' });
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({
    title: '',
    url: '',
    amount: '2.00',
  });
  const ownsCurrentPlaylist = !!currentPlaylist && currentPlaylist.user_id === user?.id;
  const playbackLocked = !isAdmin;

  useEffect(() => {
    if (user) {
      fetchPlaylists();
      fetchPublicPlaylists();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin || publicPlaylists.length === 0) return;
    if (!currentPlaylist || currentPlaylist.id !== publicPlaylists[0].id) {
      setCurrentPlaylist(publicPlaylists[0]);
    }
  }, [publicPlaylists, currentPlaylist, isAdmin]);

  useEffect(() => {
    if (isAdmin || !currentPlaylist || currentTrack) return;
    if (currentPlaylist.tracks[0]) {
      playTrack(currentPlaylist.tracks[0], 0);
    }
  }, [currentPlaylist, currentTrack, isAdmin]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const onEnded = () => {
      if (repeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [repeat]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const fetchPlaylists = async () => {
    if (!user) return;
    setLoading(true);

    const { data: playlistsData } = await supabase
      .from('user_playlists')
      .select('*')
      .eq('user_id', user.id);

    if (playlistsData) {
      const playlistsWithTracks = await Promise.all(
        playlistsData.map(async (playlist) => {
          const { data: tracks } = await supabase
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', playlist.id)
            .order('sort_order');
          return { ...playlist, tracks: tracks || [] };
        })
      );
      setPlaylists(playlistsWithTracks);
      
      // Auto-load first playlist if exists
      if (playlistsWithTracks.length > 0 && !currentPlaylist) {
        setCurrentPlaylist(playlistsWithTracks[0]);
      }
    }
    setLoading(false);
  };

  const fetchPublicPlaylists = async () => {
    const { data: playlistsData } = await supabase
      .from('user_playlists')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (playlistsData) {
      const playlistsWithTracks = await Promise.all(
        playlistsData.map(async (playlist) => {
          const { data: tracks } = await supabase
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', playlist.id)
            .order('sort_order');
          return { ...playlist, tracks: tracks || [] };
        })
      );
      setPublicPlaylists(playlistsWithTracks);
    }
  };

  const createPlaylist = async () => {
    if (!user || !newPlaylistName.trim()) return;
    if (!isAdmin) {
      toast.error('Only admins can manage playlists.');
      return;
    }

    const { data, error } = await supabase
      .from('user_playlists')
      .insert({ user_id: user.id, name: newPlaylistName.trim() })
      .select()
      .single();

    if (error) {
      toast.error('Failed to create playlist');
    } else {
      toast.success('Playlist created!');
      setPlaylists([...playlists, { ...data, tracks: [] }]);
      setNewPlaylistName('');
    }
  };

  const addTrack = async () => {
    if (!currentPlaylist || !newTrack.title || !newTrack.url) return;
    if (!isAdmin) {
      toast.error('Only admins can manage playlists.');
      return;
    }
    if (!ownsCurrentPlaylist) {
      toast.error('You can only add tracks to your own playlists.');
      return;
    }

    const { data, error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: currentPlaylist.id,
        title: newTrack.title,
        artist: newTrack.artist || null,
        url: newTrack.url,
        sort_order: currentPlaylist.tracks.length,
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to add track');
    } else {
      const updatedPlaylist = {
        ...currentPlaylist,
        tracks: [...currentPlaylist.tracks, data],
      };
      setCurrentPlaylist(updatedPlaylist);
      setPlaylists(playlists.map(p => p.id === currentPlaylist.id ? updatedPlaylist : p));
      setPublicPlaylists((prev) => prev.map(p => p.id === currentPlaylist.id ? updatedPlaylist : p));
      setNewTrack({ title: '', artist: '', url: '' });
      setShowAddTrack(false);
      toast.success('Track added!');
    }
  };

  const deleteTrack = async (trackId: string) => {
    if (!currentPlaylist) return;
    if (!isAdmin) {
      toast.error('Only admins can manage playlists.');
      return;
    }
    if (!ownsCurrentPlaylist) {
      toast.error('You can only edit your own playlists.');
      return;
    }

    const { error } = await supabase.from('playlist_tracks').delete().eq('id', trackId);
    if (error) {
      toast.error('Failed to delete track');
      return;
    }
    
    const updatedPlaylist = {
      ...currentPlaylist,
      tracks: currentPlaylist.tracks.filter(t => t.id !== trackId),
    };
    setCurrentPlaylist(updatedPlaylist);
    setPlaylists(playlists.map(p => p.id === currentPlaylist.id ? updatedPlaylist : p));
    setPublicPlaylists((prev) => prev.map(p => p.id === currentPlaylist.id ? updatedPlaylist : p));
  };

  const togglePlaylistSharing = async (playlistId: string, shouldShare: boolean) => {
    if (!isAdmin) return;
    if (!ownsCurrentPlaylist) {
      toast.error('You can only share playlists you own.');
      return;
    }

    const { error } = await supabase
      .from('user_playlists')
      .update({ is_public: shouldShare })
      .eq('id', playlistId);

    if (error) {
      toast.error('Failed to update lounge broadcast');
      return;
    }

    setPlaylists((prev) =>
      prev.map((playlist) =>
        playlist.id === playlistId ? { ...playlist, is_public: shouldShare } : playlist
      )
    );
    setCurrentPlaylist((prev) =>
      prev?.id === playlistId ? { ...prev, is_public: shouldShare } : prev
    );
    fetchPublicPlaylists();
    toast.success(shouldShare ? 'Lounge broadcast enabled' : 'Lounge broadcast disabled');
  };

  const playTrack = (track: Track, index: number) => {
    setCurrentTrack(track);
    setTrackIndex(index);
    setIsPlaying(true);
    
    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.play().catch(() => {
        toast.error('Playback blocked until you interact with the page.');
      });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (playbackLocked) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playNext = () => {
    if (!currentPlaylist || currentPlaylist.tracks.length === 0) return;
    if (playbackLocked) return;
    
    let nextIndex: number;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * currentPlaylist.tracks.length);
    } else {
      nextIndex = (trackIndex + 1) % currentPlaylist.tracks.length;
    }
    
    playTrack(currentPlaylist.tracks[nextIndex], nextIndex);
  };

  const playPrev = () => {
    if (!currentPlaylist || currentPlaylist.tracks.length === 0) return;
    if (playbackLocked) return;
    
    const prevIndex = trackIndex === 0 ? currentPlaylist.tracks.length - 1 : trackIndex - 1;
    playTrack(currentPlaylist.tracks[prevIndex], prevIndex);
  };

  const seek = (value: number[]) => {
    if (audioRef.current) {
      if (playbackLocked) return;
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const submitRequest = async () => {
    if (!user) return;
    if (!requestForm.title.trim()) {
      toast.error('Add a track title to request.');
      return;
    }
    const amountValue = Number(requestForm.amount);
    if (Number.isNaN(amountValue) || amountValue <= 0) {
      toast.error('Enter a valid request amount.');
      return;
    }

    const { data: wallet } = await supabase
      .from('user_wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!wallet || wallet.balance < amountValue) {
      toast.error('Insufficient balance for this request.');
      return;
    }

    const { error: requestError } = await supabase.from('music_requests').insert({
      user_id: user.id,
      title: requestForm.title.trim(),
      source_url: requestForm.url.trim() || '',
      source_type: 'url',
      status: 'pending',
    });

    if (requestError) {
      toast.error('Failed to submit request.');
      return;
    }

    const { error: walletError } = await supabase
      .from('user_wallets')
      .update({ balance: wallet.balance - amountValue })
      .eq('id', wallet.id);

    if (walletError) {
      toast.error('Request saved, but balance update failed.');
    } else {
      toast.success('Request submitted to admin queue.');
    }

    setRequestForm({ title: '', url: '', amount: requestForm.amount });
    setShowRequest(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) return null;

  return (
    <>
      <audio ref={audioRef} />
      
      {/* Minimized Player Bar */}
      <div 
        className={`fixed bottom-20 left-4 right-4 sm:left-auto sm:right-20 sm:w-80 z-40 transition-all duration-300
          ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div 
          onClick={() => setIsExpanded(true)}
          className="bg-zinc-900/95 border border-primary/30 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-all shadow-lg"
        >
          <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono text-primary truncate">
              {currentTrack?.title || 'No track selected'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack?.artist || 'Select a track to play'}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Expanded Player */}
      {isExpanded && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-20 sm:w-96 z-40 bg-zinc-900 border border-primary/30 rounded-lg shadow-2xl shadow-primary/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-primary/20">
            <span className="font-mono text-primary text-sm flex items-center gap-2">
              <Music className="w-4 h-4" />
              MUSIC PLAYER
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Now Playing */}
          <div className="p-4 border-b border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <Music className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-primary truncate">
                  {currentTrack?.title || 'No track'}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {currentTrack?.artist || 'Unknown artist'}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4 space-y-2">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={1}
                onValueChange={seek}
                className={`w-full ${playbackLocked ? 'opacity-60 pointer-events-none' : ''}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => setShuffle(!shuffle)}
                className={`p-2 rounded ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-primary'} ${playbackLocked ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                onClick={playPrev}
                className={`p-2 rounded text-muted-foreground hover:text-primary ${playbackLocked ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className={`w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-transform ${playbackLocked ? 'opacity-40 pointer-events-none' : 'hover:scale-105'}`}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button
                onClick={playNext}
                className={`p-2 rounded text-muted-foreground hover:text-primary ${playbackLocked ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={() => setRepeat(!repeat)}
                className={`p-2 rounded ${repeat ? 'text-primary' : 'text-muted-foreground hover:text-primary'} ${playbackLocked ? 'opacity-40 pointer-events-none' : ''}`}
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-muted-foreground hover:text-primary"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={(v) => setVolume(v[0] / 100)}
                className="w-24"
              />
            </div>
          </div>

          {/* Playlist */}
          <div className="p-4 max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-muted-foreground" />
                <select
                  value={currentPlaylist?.id || ''}
                  onChange={(e) => {
                    const pl = playlists.find(p => p.id === e.target.value);
                    setCurrentPlaylist(pl || null);
                  }}
                  className="bg-transparent text-sm font-mono text-primary border-none focus:outline-none disabled:opacity-40"
                  disabled={!isAdmin}
                >
                  <option value="">Select playlist</option>
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>{pl.name}</option>
                  ))}
                </select>
              </div>
              {isAdmin && currentPlaylist && (
                <button
                  onClick={() => togglePlaylistSharing(currentPlaylist.id, !currentPlaylist.is_public)}
                  className="text-[10px] uppercase font-mono px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                  disabled={!ownsCurrentPlaylist}
                >
                  {currentPlaylist.is_public ? 'Unshare' : 'Share'}
                </button>
              )}
              {!isAdmin && (
                <Dialog open={showRequest} onOpenChange={setShowRequest}>
                  <DialogTrigger asChild>
                    <button className="text-[10px] uppercase font-mono px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                      Request
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-900 border-primary/30">
                    <DialogHeader>
                      <DialogTitle className="text-primary font-mono">Request a Track</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-4">
                      <Input
                        value={requestForm.title}
                        onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                        placeholder="Track title"
                        className="bg-black/50 border-primary/30"
                      />
                      <Input
                        value={requestForm.url}
                        onChange={(e) => setRequestForm({ ...requestForm, url: e.target.value })}
                        placeholder="Track link (optional)"
                        className="bg-black/50 border-primary/30"
                      />
                      <Input
                        value={requestForm.amount}
                        onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
                        placeholder="Request fee"
                        className="bg-black/50 border-primary/30"
                      />
                      <p className="text-[10px] text-muted-foreground font-mono">
                        Requests charge your wallet balance and queue for admin approval.
                      </p>
                      <Button onClick={submitRequest} className="w-full crt-button">
                        Submit Request
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog open={showAddTrack} onOpenChange={setShowAddTrack}>
                <DialogTrigger asChild>
                  <button
                    className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-primary disabled:opacity-40 disabled:hover:text-muted-foreground"
                    disabled={!isAdmin || !ownsCurrentPlaylist}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-primary/30">
                  <DialogHeader>
                    <DialogTitle className="text-primary font-mono">Add Track</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-4">
                    <Input
                      value={newTrack.title}
                      onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
                      placeholder="Track title"
                      className="bg-black/50 border-primary/30"
                    />
                    <Input
                      value={newTrack.artist}
                      onChange={(e) => setNewTrack({ ...newTrack, artist: e.target.value })}
                      placeholder="Artist (optional)"
                      className="bg-black/50 border-primary/30"
                    />
                    <Input
                      value={newTrack.url}
                      onChange={(e) => setNewTrack({ ...newTrack, url: e.target.value })}
                      placeholder="Audio URL (mp3, etc.)"
                      className="bg-black/50 border-primary/30"
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Use direct audio stream URLs for reliable playback.
                    </p>
                    <Button onClick={addTrack} className="w-full crt-button" disabled={!isAdmin || !ownsCurrentPlaylist}>
                      Add Track
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {!isAdmin && (
              <p className="text-[10px] uppercase font-mono text-muted-foreground mb-3">
                Admin broadcast controls the lounge playlist.
              </p>
            )}

            {publicPlaylists.length > 0 && (
              <div className="mb-3 rounded-lg border border-primary/20 bg-black/30 p-3">
                <p className="text-[10px] uppercase font-mono text-muted-foreground mb-2">
                  Lounge Broadcasts
                </p>
                <div className="space-y-2">
                  {publicPlaylists.map((playlist) => (
                    <button
                      key={playlist.id}
                      onClick={() => {
                        if (isAdmin) {
                          setCurrentPlaylist(playlist);
                          if (playlist.tracks[0]) {
                            playTrack(playlist.tracks[0], 0);
                          }
                        }
                      }}
                      className={`w-full text-left text-xs font-mono px-2 py-1 rounded border transition-colors
                        ${currentPlaylist?.id === playlist.id
                          ? 'border-primary/60 text-primary bg-primary/10'
                          : 'border-transparent text-muted-foreground hover:text-primary hover:border-primary/30'} ${!isAdmin ? 'pointer-events-none opacity-60' : ''}`}
                    >
                      {playlist.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!currentPlaylist ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-3">Create a playlist to get started</p>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Input
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Playlist name"
                      className="flex-1 bg-black/50 border-primary/30 text-xs"
                    />
                    <Button size="sm" onClick={createPlaylist}>Create</Button>
                  </div>
                )}
              </div>
            ) : currentPlaylist.tracks.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No tracks yet. Add some music!
              </p>
            ) : (
              <div className="space-y-1">
                {currentPlaylist.tracks.map((track, index) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      if (!playbackLocked) {
                        playTrack(track, index);
                      }
                    }}
                    className={`w-full flex items-center gap-3 p-2 rounded text-left transition-all
                      ${currentTrack?.id === track.id 
                        ? 'bg-primary/20 text-primary' 
                        : 'hover:bg-white/5 text-foreground'} ${playbackLocked ? 'pointer-events-none opacity-70' : ''}`}
                  >
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      {currentTrack?.id === track.id && isPlaying ? (
                        <div className="flex gap-0.5">
                          <span className="w-0.5 h-3 bg-primary animate-pulse" />
                          <span className="w-0.5 h-4 bg-primary animate-pulse delay-75" />
                          <span className="w-0.5 h-2 bg-primary animate-pulse delay-150" />
                        </div>
                      ) : (
                        <Music className="w-3 h-3" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.artist || 'Unknown'}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }}
                      className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 disabled:opacity-40 disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
                      disabled={!isAdmin || !ownsCurrentPlaylist}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
