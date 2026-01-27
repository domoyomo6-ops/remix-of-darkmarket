import { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX,
  Users, Crown, Radio, Calendar, Clock, Monitor, MonitorOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWebRTC } from '@/hooks/useWebRTC';
import { toast } from 'sonner';
import ScreenShareViewer from './ScreenShareViewer';

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

interface Participant {
  id: string;
  room_id: string;
  user_id: string;
  is_speaking: boolean;
  is_muted: boolean;
  joined_at: string;
}

interface VoiceRoomProps {
  room: VoiceRoom;
  onLeave?: () => void;
}

export default function VoiceRoomComponent({ room, onLeave }: VoiceRoomProps) {
  const { user, isAdmin } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [userAvatars, setUserAvatars] = useState<Record<string, { display_name: string; level: number }>>({});
  const [activeScreenShare, setActiveScreenShare] = useState<string | null>(null);
  const remoteAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const {
    remoteStreams,
    remoteScreenStreams,
    isMuted,
    isScreenSharing,
    initializeAudio,
    startScreenShare,
    stopScreenShare,
    toggleMute,
    setTalking,
    disconnect,
  } = useWebRTC(room.id, user?.id);

  useEffect(() => {
    fetchParticipants();

    const channel = supabase
      .channel(`voice-room-${room.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'voice_room_participants',
        filter: `room_id=eq.${room.id}`
      }, () => {
        fetchParticipants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  // Play remote audio streams
  useEffect(() => {
    remoteStreams.forEach((stream, peerId) => {
      let audio = remoteAudioRefs.current.get(peerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audio.srcObject = stream;
        remoteAudioRefs.current.set(peerId, audio);
      } else if (audio.srcObject !== stream) {
        audio.srcObject = stream;
      }
    });

    // Clean up removed streams
    remoteAudioRefs.current.forEach((audio, peerId) => {
      if (!remoteStreams.has(peerId)) {
        audio.srcObject = null;
        remoteAudioRefs.current.delete(peerId);
      }
    });
  }, [remoteStreams]);

  // Handle remote screen shares
  useEffect(() => {
    if (remoteScreenStreams.size > 0) {
      const [sharerId] = remoteScreenStreams.keys();
      setActiveScreenShare(sharerId);
    } else {
      setActiveScreenShare(null);
    }
  }, [remoteScreenStreams]);

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      toast.success('Screen share stopped');
    } else {
      try {
        await startScreenShare();
        toast.success('Screen sharing started - visible to all');
      } catch (err) {
        toast.error('Failed to start screen share');
      }
    }
  };

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('voice_room_participants')
      .select('*')
      .eq('room_id', room.id);
    if (data) {
      setParticipants(data);
      const isUserJoined = data.some(p => p.user_id === user?.id);
      setIsJoined(isUserJoined);
      
      // Fetch avatars
      const userIds = data.map(p => p.user_id);
      if (userIds.length > 0) {
        const { data: avatars } = await supabase
          .from('user_avatars')
          .select('user_id, display_name, level')
          .in('user_id', userIds);
        if (avatars) {
          const avatarMap: Record<string, { display_name: string; level: number }> = {};
          avatars.forEach(a => {
            avatarMap[a.user_id] = { display_name: a.display_name || 'User', level: a.level || 1 };
          });
          setUserAvatars(avatarMap);
        }
      }
    }
  };

  const joinRoom = async () => {
    if (!user) return;

    try {
      await initializeAudio();

      const { error } = await supabase.from('voice_room_participants').insert({
        room_id: room.id,
        user_id: user.id,
        is_muted: true,
      });

      if (error) throw error;
      setIsJoined(true);
      toast.success('Joined voice room - WebRTC connected');
    } catch (err) {
      toast.error('Could not access microphone');
      console.error(err);
    }
  };

  const leaveRoom = async () => {
    if (!user) return;

    disconnect();

    await supabase
      .from('voice_room_participants')
      .delete()
      .eq('room_id', room.id)
      .eq('user_id', user.id);

    setIsJoined(false);
    onLeave?.();
  };

  const handleToggleMute = async () => {
    if (!user) return;
    toggleMute();

    await supabase
      .from('voice_room_participants')
      .update({ is_muted: !isMuted })
      .eq('room_id', room.id)
      .eq('user_id', user.id);
  };

  // Push-to-talk handlers
  const handlePushToTalk = async (speaking: boolean) => {
    if (room.room_type !== 'push_to_talk' || !user) return;

    setTalking(speaking);

    await supabase
      .from('voice_room_participants')
      .update({ is_speaking: speaking, is_muted: !speaking })
      .eq('room_id', room.id)
      .eq('user_id', user.id);
  };

  const getRoomTypeIcon = () => {
    switch (room.room_type) {
      case 'push_to_talk':
        return <Mic className="w-4 h-4" />;
      case 'always_on':
        return <Radio className="w-4 h-4" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getRoomTypeName = () => {
    switch (room.room_type) {
      case 'push_to_talk':
        return 'Push-to-Talk';
      case 'always_on':
        return 'Always On';
      case 'scheduled':
        return 'Scheduled';
    }
  };

  return (
    <div className="panel-3d p-4 space-y-4">
      {/* Screen Share Display */}
      {activeScreenShare && remoteScreenStreams.has(activeScreenShare) && (
        <ScreenShareViewer
          stream={remoteScreenStreams.get(activeScreenShare)!}
          sharerId={activeScreenShare}
          sharerName={userAvatars[activeScreenShare]?.display_name || 'User'}
          onClose={() => setActiveScreenShare(null)}
        />
      )}

      {/* Room Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            {getRoomTypeIcon()}
          </div>
          <div>
            <h3 className="font-mono text-primary font-bold">{room.name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{getRoomTypeName()}</span>
              <span>•</span>
              <Users className="w-3 h-3" />
              <span>{participants.length}/{room.max_participants}</span>
              {isScreenSharing && (
                <>
                  <span>•</span>
                  <Monitor className="w-3 h-3 text-red-400" />
                  <span className="text-red-400">Sharing</span>
                </>
              )}
            </div>
          </div>
        </div>

        {room.room_type === 'scheduled' && room.scheduled_start && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(room.scheduled_start).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Participants Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className={`relative p-2 rounded-lg text-center transition-all ${
              participant.is_speaking 
                ? 'bg-primary/30 ring-2 ring-primary animate-pulse' 
                : 'bg-card/50'
            }`}
          >
            <div className={`w-8 h-8 mx-auto rounded-full bg-gradient-to-br from-primary/50 to-primary/20 flex items-center justify-center ${
              participant.is_speaking ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
            }`}>
              {participant.is_muted ? (
                <MicOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Mic className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="mt-1 text-[10px] font-mono truncate">
              {userAvatars[participant.user_id]?.display_name || participant.user_id.slice(0, 6)}
            </div>
            <div className="text-[8px] text-muted-foreground">
              Lv.{userAvatars[participant.user_id]?.level || 1}
            </div>
            {participant.user_id === room.created_by && (
              <Crown className="absolute -top-1 -right-1 w-3 h-3 text-amber-400" />
            )}
            {remoteStreams.has(participant.user_id) && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-green-500 animate-pulse" 
                   title="WebRTC Connected" />
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 pt-2 border-t border-primary/20">
        {!isJoined ? (
          <Button 
            onClick={joinRoom} 
            className="gap-2"
            aria-label="Join voice room"
          >
            <Phone className="w-4 h-4" />
            <span>Join Room</span>
          </Button>
        ) : (
          <>
            {room.room_type === 'push_to_talk' ? (
              <Button
                variant={isMuted ? "outline" : "default"}
                className="gap-2"
                onMouseDown={() => handlePushToTalk(true)}
                onMouseUp={() => handlePushToTalk(false)}
                onMouseLeave={() => handlePushToTalk(false)}
                onTouchStart={() => handlePushToTalk(true)}
                onTouchEnd={() => handlePushToTalk(false)}
                aria-label={isMuted ? "Hold to talk" : "Talking"}
              >
                <Mic className="w-4 h-4" />
                <span>{isMuted ? 'Hold to Talk' : 'Talking...'}</span>
              </Button>
            ) : (
              <Button
                variant={isMuted ? "outline" : "default"}
                size="icon"
                onClick={handleToggleMute}
                aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            )}

            {/* Screen Share Button */}
            <Button
              variant={isScreenSharing ? "default" : "outline"}
              size="icon"
              onClick={handleScreenShare}
              className={isScreenSharing ? 'bg-red-500 hover:bg-red-600' : ''}
              aria-label={isScreenSharing ? "Stop screen share" : "Share screen"}
            >
              {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
            </Button>

            <Button
              variant="destructive"
              size="icon"
              onClick={leaveRoom}
              aria-label="Leave voice room"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* WebRTC Status */}
      {isJoined && (
        <div className="text-center text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            WebRTC Active • {remoteStreams.size} peer{remoteStreams.size !== 1 ? 's' : ''} connected
          </span>
        </div>
      )}
    </div>
  );
}
