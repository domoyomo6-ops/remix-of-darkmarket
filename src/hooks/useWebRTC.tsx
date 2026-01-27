import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
  screenStream?: MediaStream;
}

interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'screen-offer' | 'screen-answer';
  from: string;
  to: string;
  roomId: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTC(roomId: string, userId: string | undefined) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const screenPeerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize local audio stream
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      // Start muted
      stream.getAudioTracks().forEach(track => track.enabled = false);
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Failed to get audio stream:', error);
      throw error;
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      screenStreamRef.current = stream;
      setScreenStream(stream);
      setIsScreenSharing(true);

      // Broadcast screen to all connected peers
      if (channelRef.current && userId) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'screen-share-started',
          payload: { peerId: userId },
        });
      }

      return stream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }, [userId]);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setScreenStream(null);
      setIsScreenSharing(false);

      // Close screen peer connections
      screenPeerConnectionsRef.current.forEach(pc => pc.close());
      screenPeerConnectionsRef.current.clear();
      setRemoteScreenStreams(new Map());

      // Notify peers
      if (channelRef.current && userId) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'screen-share-stopped',
          payload: { peerId: userId },
        });
      }
    }
  }, [userId]);

  // Create peer connection for a specific user
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => {
        const updated = new Map(prev);
        updated.set(peerId, remoteStream);
        return updated;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && userId) {
        sendSignal({
          type: 'ice-candidate',
          from: userId,
          to: peerId,
          roomId,
          data: event.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
      }
    };

    peerConnectionsRef.current.set(peerId, { peerId, connection: pc });
    return pc;
  }, [roomId, userId]);

  // Create screen share peer connection
  const createScreenPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add screen stream tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, screenStreamRef.current!);
      });
    }

    // Handle incoming screen tracks (for receivers)
    pc.ontrack = (event) => {
      const [remoteScreen] = event.streams;
      setRemoteScreenStreams(prev => {
        const updated = new Map(prev);
        updated.set(peerId, remoteScreen);
        return updated;
      });
    };

    // Handle ICE candidates for screen share
    pc.onicecandidate = (event) => {
      if (event.candidate && userId) {
        sendSignal({
          type: 'ice-candidate',
          from: userId,
          to: peerId,
          roomId,
          data: event.candidate.toJSON(),
        });
      }
    };

    screenPeerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [roomId, userId]);

  // Send signaling message via Supabase realtime
  const sendSignal = useCallback((signal: SignalMessage) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: signal,
      });
    }
  }, []);

  // Handle incoming signaling messages
  const handleSignal = useCallback(async (signal: SignalMessage) => {
    if (!userId || signal.to !== userId) return;

    let pc = peerConnectionsRef.current.get(signal.from)?.connection;

    if (signal.type === 'offer') {
      if (!pc) {
        pc = createPeerConnection(signal.from);
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      sendSignal({
        type: 'answer',
        from: userId,
        to: signal.from,
        roomId,
        data: answer,
      });
    } else if (signal.type === 'answer') {
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
      }
    } else if (signal.type === 'screen-offer') {
      // Handle incoming screen share offer
      const screenPc = createScreenPeerConnection(signal.from);
      await screenPc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
      const answer = await screenPc.createAnswer();
      await screenPc.setLocalDescription(answer);
      
      sendSignal({
        type: 'screen-answer',
        from: userId,
        to: signal.from,
        roomId,
        data: answer,
      });
    } else if (signal.type === 'screen-answer') {
      const screenPc = screenPeerConnectionsRef.current.get(signal.from);
      if (screenPc) {
        await screenPc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
      }
    } else if (signal.type === 'ice-candidate') {
      if (pc && signal.data) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.data as RTCIceCandidateInit));
      }
    }
  }, [userId, roomId, createPeerConnection, createScreenPeerConnection, sendSignal]);

  // Initiate connection to a peer
  const connectToPeer = useCallback(async (peerId: string) => {
    if (!userId || peerId === userId) return;

    const pc = createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal({
      type: 'offer',
      from: userId,
      to: peerId,
      roomId,
      data: offer,
    });
  }, [userId, roomId, createPeerConnection, sendSignal]);

  // Share screen with a specific peer
  const shareScreenToPeer = useCallback(async (peerId: string) => {
    if (!userId || peerId === userId || !screenStreamRef.current) return;

    const pc = createScreenPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal({
      type: 'screen-offer',
      from: userId,
      to: peerId,
      roomId,
      data: offer,
    });
  }, [userId, roomId, createScreenPeerConnection, sendSignal]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const newMuted = !isMuted;
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMuted;
      });
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  // Push-to-talk
  const setTalking = useCallback((talking: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = talking;
      });
      setIsMuted(!talking);
    }
  }, []);

  // Initialize signaling channel
  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase.channel(`voice-rtc-${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
        handleSignal(payload as SignalMessage);
      })
      .on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
        if (payload.peerId !== userId) {
          connectToPeer(payload.peerId);
        }
      })
      .on('broadcast', { event: 'screen-share-started' }, ({ payload }) => {
        // Request screen share from peer
        if (payload.peerId !== userId) {
          // The sharer will send the screen offer
        }
      })
      .on('broadcast', { event: 'screen-share-stopped' }, ({ payload }) => {
        setRemoteScreenStreams(prev => {
          const updated = new Map(prev);
          updated.delete(payload.peerId);
          return updated;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'peer-joined',
            payload: { peerId: userId },
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId, handleSignal, connectToPeer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnectionsRef.current.forEach(({ connection }) => {
        connection.close();
      });
      peerConnectionsRef.current.clear();
      screenPeerConnectionsRef.current.forEach(pc => pc.close());
      screenPeerConnectionsRef.current.clear();
    };
  }, []);

  // Disconnect from room
  const disconnect = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    stopScreenShare();
    
    peerConnectionsRef.current.forEach(({ connection }) => {
      connection.close();
    });
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());
    setIsConnected(false);
  }, [stopScreenShare]);

  return {
    localStream,
    screenStream,
    remoteStreams,
    remoteScreenStreams,
    isConnected,
    isMuted,
    isScreenSharing,
    initializeAudio,
    startScreenShare,
    stopScreenShare,
    shareScreenToPeer,
    toggleMute,
    setTalking,
    connectToPeer,
    disconnect,
  };
}
