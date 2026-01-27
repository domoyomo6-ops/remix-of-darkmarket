import { useState, useEffect } from 'react';
import { Terminal } from 'lucide-react';

interface BootScreenProps {
  onComplete: () => void;
}

const bootSequence = [
  { text: 'HELL5TAR SYSTEMS v2.0.47', delay: 0, type: 'header' },
  { text: '================================', delay: 100, type: 'divider' },
  { text: '', delay: 200, type: 'blank' },
  { text: '[BOOT] Initializing kernel...', delay: 300, type: 'info' },
  { text: '[OK] Kernel loaded', delay: 600, type: 'success' },
  { text: '[BOOT] Loading security modules...', delay: 800, type: 'info' },
  { text: '[OK] Encryption protocols active', delay: 1100, type: 'success' },
  { text: '[BOOT] Establishing secure connection...', delay: 1300, type: 'info' },
  { text: '[OK] TLS 1.3 handshake complete', delay: 1700, type: 'success' },
  { text: '[BOOT] Authenticating gateway...', delay: 1900, type: 'info' },
  { text: '[OK] Gateway authenticated', delay: 2300, type: 'success' },
  { text: '', delay: 2400, type: 'blank' },
  { text: '[SYS] Running system diagnostics...', delay: 2500, type: 'warning' },
  { text: '  > Memory: 16384 MB [OK]', delay: 2700, type: 'detail' },
  { text: '  > Storage: 2.4 TB [OK]', delay: 2900, type: 'detail' },
  { text: '  > Network: 1 Gbps [OK]', delay: 3100, type: 'detail' },
  { text: '  > Firewall: ACTIVE [OK]', delay: 3300, type: 'detail' },
  { text: '', delay: 3400, type: 'blank' },
  { text: '[OK] All systems operational', delay: 3500, type: 'success' },
  { text: '', delay: 3600, type: 'blank' },
  { text: 'Launching VAULT interface...', delay: 3800, type: 'launch' },
];

export default function BootScreen({ onComplete }: BootScreenProps) {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const lineTimers: Array<ReturnType<typeof setTimeout>> = [];
    // Show lines progressively
    bootSequence.forEach((line, index) => {
      const timer = setTimeout(() => {
        setVisibleLines(prev => [...prev, index]);
        setProgress(Math.round(((index + 1) / bootSequence.length) * 100));
      }, line.delay);
      lineTimers.push(timer);
    });

    // Start exit animation
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 4200);

    // Complete and hide
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4800);

    return () => {
      lineTimers.forEach(timer => clearTimeout(timer));
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  const getLineClass = (type: string) => {
    switch (type) {
      case 'header':
        return 'text-primary terminal-glow-strong text-lg';
      case 'divider':
        return 'text-primary/60';
      case 'success':
        return 'text-primary';
      case 'info':
        return 'text-muted-foreground';
      case 'warning':
        return 'text-yellow-500';
      case 'detail':
        return 'text-primary/70';
      case 'launch':
        return 'text-primary terminal-glow animate-pulse';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-background flex items-center justify-center perspective-container transition-all duration-700 ${
        isExiting ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
      }`}
    >
      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px]" />
      
      {/* Moving scanline */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent scanline-animate" />
      </div>

      {/* CRT corners vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />

      <div className="w-full max-w-2xl px-6">
        {/* Terminal window */}
        <div className="panel-3d rounded-lg overflow-hidden depth-shadow animate-scale-in">
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/20 bg-primary/5">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/60 raised" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60 raised" />
              <div className="w-3 h-3 rounded-full bg-primary/60 raised" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-muted-foreground font-mono">
                hell5tar@boot-sequence ~ /system/init
              </span>
            </div>
            <Terminal className="w-4 h-4 text-primary/60" />
          </div>

          {/* Terminal content */}
          <div className="p-6 h-[400px] overflow-hidden font-mono text-sm bg-gradient-to-b from-card to-background">
            {/* ASCII Logo */}
            <pre className="text-primary/80 text-xs mb-4 leading-tight hidden sm:block terminal-glow">
{`  _    _ ______ _      _      _____ _______       _____  
 | |  | |  ____| |    | |    | ____|__   __|/\\   |  __ \\ 
 | |__| | |__  | |    | |    | |__    | |  /  \\  | |__) |
 |  __  |  __| | |    | |    |___ \\   | | / /\\ \\ |  _  / 
 | |  | | |____| |____| |____ ___) |  | |/ ____ \\| | \\ \\ 
 |_|  |_|______|______|______|____/   |_/_/    \\_\\_|  \\_\\`}
            </pre>

            {/* Boot lines */}
            <div className="space-y-1">
              {bootSequence.map((line, index) => (
                <div
                  key={index}
                  className={`transition-all duration-200 ${
                    visibleLines.includes(index)
                      ? 'opacity-100 translate-x-0 translate-z-0'
                      : 'opacity-0 -translate-x-4'
                  } ${getLineClass(line.type)}`}
                  style={{
                    transform: visibleLines.includes(index) 
                      ? 'translateX(0) translateZ(0)' 
                      : 'translateX(-16px) translateZ(-20px)'
                  }}
                >
                  {line.text || '\u00A0'}
                </div>
              ))}
            </div>

            {/* Blinking cursor */}
            <span className="inline-block w-2 h-4 bg-primary animate-blink mt-2" />
          </div>

          {/* Progress bar */}
          <div className="px-6 pb-4 bg-card/50">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
              <span>BOOT_PROGRESS</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-primary/10 rounded-full overflow-hidden inset-3d">
              <div 
                className="h-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground font-mono mt-4 terminal-glow">
          HELL5TAR SECURE SYSTEMS © 2024
        </p>
      </div>
    </div>
  );
}
