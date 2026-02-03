import { useState, useEffect, useRef } from 'react';

// Typing effect hook
export function useTypingEffect(text: string, speed: number = 50) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayText, isComplete };
}

// Glitch text component
export function GlitchText({ 
  children, 
  className = '',
  intensity = 'medium'
}: { 
  children: string; 
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}) {
  const [glitchText, setGlitchText] = useState(children);
  const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`░▒▓█▄▀';
  
  useEffect(() => {
    const glitchInterval = intensity === 'high' ? 100 : intensity === 'medium' ? 200 : 400;
    const timer = setInterval(() => {
      if (Math.random() > 0.7) {
        const arr = children.split('');
        const idx = Math.floor(Math.random() * arr.length);
        arr[idx] = chars[Math.floor(Math.random() * chars.length)];
        setGlitchText(arr.join(''));
        setTimeout(() => setGlitchText(children), 50);
      }
    }, glitchInterval);
    return () => clearInterval(timer);
  }, [children, intensity]);

  return (
    <span className={`relative ${className}`}>
      <span className="relative z-10">{glitchText}</span>
      <span 
        className="absolute inset-0 text-[hsl(var(--cyber-pink))] opacity-70 animate-glitch-1"
        style={{ clipPath: 'inset(20% 0 30% 0)' }}
      >
        {children}
      </span>
      <span 
        className="absolute inset-0 text-[hsl(var(--cyber-blue))] opacity-70 animate-glitch-2"
        style={{ clipPath: 'inset(60% 0 10% 0)' }}
      >
        {children}
      </span>
    </span>
  );
}

// Terminal window chrome
export function TerminalWindow({ 
  children, 
  title = 'terminal',
  className = '',
  variant = 'default'
}: { 
  children: React.ReactNode; 
  title?: string;
  className?: string;
  variant?: 'default' | 'warning' | 'success' | 'danger';
}) {
  const borderColor = {
    default: 'border-primary/50',
    warning: 'border-warning/50',
    success: 'border-success/50',
    danger: 'border-destructive/50',
  }[variant];

  const glowColor = {
    default: 'shadow-[0_0_30px_hsl(var(--primary)/0.2)]',
    warning: 'shadow-[0_0_30px_hsl(var(--warning)/0.2)]',
    success: 'shadow-[0_0_30px_hsl(var(--success)/0.3)]',
    danger: 'shadow-[0_0_30px_hsl(var(--destructive)/0.2)]',
  }[variant];

  return (
    <div className={`
      relative rounded-lg overflow-hidden
      bg-card border ${borderColor}
      ${glowColor}
      backdrop-blur-sm
      ${className}
    `}>
      {/* Terminal chrome header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-primary/20">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/80 hover:bg-destructive transition-colors cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-warning/80 hover:bg-warning transition-colors cursor-pointer" />
          <div className="w-3 h-3 rounded-full bg-success/80 hover:bg-success transition-colors cursor-pointer" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs font-mono text-muted-foreground">
            ▸ {title} — zsh
          </span>
        </div>
        <div className="w-16" />
      </div>
      
      {/* Content */}
      <div className="relative">
        {/* Scanlines overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(0,255,136,0.15)_1px,transparent_1px)] bg-[size:100%_2px] z-10" />
        {children}
      </div>
    </div>
  );
}

// Command prompt line
export function CommandPrompt({ 
  command, 
  output,
  status = 'success',
  animate = true
}: { 
  command: string; 
  output?: string;
  status?: 'success' | 'error' | 'pending';
  animate?: boolean;
}) {
  const { displayText, isComplete } = useTypingEffect(command, animate ? 30 : 0);
  const statusColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    pending: 'text-yellow-400 animate-pulse',
  };

  return (
    <div className="font-mono text-sm">
      <div className="flex items-center gap-2">
        <span className="text-primary">❯</span>
        <span className="text-foreground">
          {animate ? displayText : command}
          {animate && !isComplete && <span className="animate-blink text-primary">▋</span>}
        </span>
      </div>
      {output && isComplete && (
        <div className={`mt-1 ml-4 ${statusColors[status]}`}>
          {output}
        </div>
      )}
    </div>
  );
}

// Hacking progress bar
export function HackingProgress({ 
  label, 
  progress, 
  status = 'active'
}: { 
  label: string; 
  progress: number;
  status?: 'active' | 'complete' | 'failed';
}) {
  const statusStyles = {
    active: 'bg-primary animate-pulse',
    complete: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div className="font-mono text-xs">
      <div className="flex justify-between mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={status === 'complete' ? 'text-green-400' : status === 'failed' ? 'text-red-400' : 'text-primary'}>
          {status === 'complete' ? 'DONE' : status === 'failed' ? 'FAIL' : `${progress}%`}
        </span>
      </div>
      <div className="h-1.5 bg-background rounded-full overflow-hidden border border-primary/20">
        <div 
          className={`h-full ${statusStyles[status]} transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ASCII art border component
export function AsciiBorder({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute -top-3 left-4 text-xs font-mono text-primary/60">
        ╔══════════════════════════════════════╗
      </div>
      <div className="absolute -bottom-3 left-4 text-xs font-mono text-primary/60">
        ╚══════════════════════════════════════╝
      </div>
      <div className="absolute top-0 -left-1 bottom-0 text-xs font-mono text-primary/60 flex flex-col justify-center">
        ║
      </div>
      <div className="absolute top-0 -right-1 bottom-0 text-xs font-mono text-primary/60 flex flex-col justify-center">
        ║
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

// Scan line effect on hover
export function ScanEffect({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isHovered && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(transparent 50%, hsl(142 100% 50% / 0.1) 50%)',
            backgroundSize: '100% 4px',
            animation: 'scan 0.5s linear infinite',
          }}
        />
      )}
    </div>
  );
}

// Random data generator for visual effect
export function RandomDataStream({ lines = 5 }: { lines?: number }) {
  const [data, setData] = useState<string[]>([]);
  const chars = '0123456789ABCDEF';

  useEffect(() => {
    const generateLine = () => {
      return Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    setData(Array.from({ length: lines }, generateLine));

    const timer = setInterval(() => {
      setData(prev => {
        const newData = [...prev];
        const idx = Math.floor(Math.random() * lines);
        newData[idx] = generateLine();
        return newData;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [lines]);

  return (
    <div className="font-mono text-[10px] text-primary/40 leading-tight overflow-hidden">
      {data.map((line, i) => (
        <div key={i} className="whitespace-nowrap">{line}</div>
      ))}
    </div>
  );
}

// 3D text effect CSS-based
export function Text3D({ children, className = '' }: { children: string; className?: string }) {
  return (
    <span 
      className={`relative inline-block ${className}`}
      style={{
        textShadow: `
          0 1px 0 hsl(142 100% 40%),
          0 2px 0 hsl(142 100% 35%),
          0 3px 0 hsl(142 100% 30%),
          0 4px 0 hsl(142 100% 25%),
          0 5px 0 hsl(142 100% 20%),
          0 6px 0 hsl(142 100% 15%),
          0 7px 0 hsl(142 100% 10%),
          0 8px 8px rgba(0, 0, 0, 0.4),
          0 10px 20px rgba(0, 255, 136, 0.3),
          0 15px 40px rgba(0, 255, 136, 0.2)
        `,
        transform: 'perspective(500px) rotateX(10deg)',
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </span>
  );
}
