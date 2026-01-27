import { useEffect, useRef } from 'react';
import { Monitor, Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ScreenShareViewerProps {
  stream: MediaStream;
  sharerId: string;
  sharerName: string;
  onClose?: () => void;
}

export default function ScreenShareViewer({ stream, sharerId, sharerName, onClose }: ScreenShareViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-xl overflow-hidden border border-primary/30 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'aspect-video'
      }`}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 rounded-full border border-red-500/50">
            <Monitor className="w-3 h-3 text-red-400" />
            <span className="text-xs font-mono text-red-400 animate-pulse">LIVE</span>
          </div>
          <span className="text-sm font-mono text-foreground">
            {sharerName}'s Screen
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 bg-black/50 hover:bg-black/80"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 bg-black/50 hover:bg-red-500/50"
              onClick={onClose}
              aria-label="Close screen share"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain bg-black"
      />

      {/* Watching indicator */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/70 rounded-full backdrop-blur-sm">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs font-mono text-muted-foreground">Watching</span>
      </div>
    </div>
  );
}