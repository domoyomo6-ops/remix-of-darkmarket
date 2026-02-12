import { useEffect, useState, useRef } from 'react';

export default function ParallaxBackground() {
  const [scrollY, setScrollY] = useState(0);
  const requestRef = useRef<number>();

  useEffect(() => {
    const handleScroll = () => {
      if (requestRef.current) return;
      requestRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        requestRef.current = undefined;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -10 }}>
      {/* Layer 1: Deep space gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-black to-background" style={{ transform: `translateY(${scrollY * 0.02}px)` }} />

      {/* Layer 2: Animated nebula orbs */}
      <div className="absolute inset-0" style={{ transform: `translateY(${scrollY * 0.05}px)` }}>
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[150px] animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(280,100%,50%)]/8 blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full bg-[hsl(195,100%,50%)]/8 blur-[100px] animate-float" style={{ animationDelay: '-5s' }} />
        <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] rounded-full bg-[hsl(45,100%,50%)]/5 blur-[100px] animate-float" style={{ animationDelay: '-7s' }} />
      </div>

      {/* Layer 3: Cyber grid overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        transform: `translateY(${scrollY * 0.1}px)`,
        backgroundImage: `linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)`,
        backgroundSize: '80px 80px'
      }} />

      {/* Layer 4: Basquiat crowns */}
      <div className="absolute inset-0" style={{ transform: `translateY(${scrollY * 0.15}px)` }}>
        {[
          { top: '10%', left: '8%', size: 'w-24 h-24', opacity: 'opacity-40', delay: '-2s' },
          { top: '25%', right: '12%', size: 'w-18 h-18', opacity: 'opacity-30', delay: '-4s' },
          { bottom: '30%', left: '15%', size: 'w-16 h-16', opacity: 'opacity-25', delay: '-6s' },
          { bottom: '15%', right: '5%', size: 'w-20 h-20', opacity: 'opacity-20', delay: '-8s' },
          { top: '55%', left: '70%', size: 'w-14 h-14', opacity: 'opacity-15', delay: '-10s' },
        ].map((pos, i) => (
          <svg key={`crown-${i}`} className={`absolute ${pos.size} text-[hsl(45,100%,50%)] ${pos.opacity} animate-float`}
            style={{ top: pos.top, left: pos.left, right: pos.right, bottom: pos.bottom, animationDelay: pos.delay }}
            viewBox="0 0 100 80">
            <path d="M10 70 L10 30 L25 50 L40 20 L55 50 L70 25 L85 45 L90 30 L90 70 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
            {i % 2 === 0 && <line x1="40" y1="50" x2="40" y2="30" stroke="currentColor" strokeWidth="2"/>}
          </svg>
        ))}
      </div>

      {/* Layer 5: Dollar signs + paint drips */}
      <div className="absolute inset-0" style={{ transform: `translateY(${scrollY * 0.2}px)` }}>
        {[
          { top: '15%', right: '20%', size: 'text-7xl', color: 'text-primary/15', delay: '-1s' },
          { top: '40%', left: '10%', size: 'text-6xl', color: 'text-[hsl(320,100%,60%)]/15', delay: '-3s' },
          { bottom: '25%', right: '8%', size: 'text-8xl', color: 'text-[hsl(195,100%,50%)]/12', delay: '-5s' },
          { top: '60%', left: '25%', size: 'text-5xl', color: 'text-[hsl(45,100%,50%)]/15', delay: '-2s' },
          { top: '75%', right: '40%', size: 'text-6xl', color: 'text-primary/10', delay: '-7s' },
          { top: '85%', left: '55%', size: 'text-9xl', color: 'text-[hsl(320,100%,60%)]/8', delay: '-9s' },
        ].map((d, i) => (
          <span key={`dollar-${i}`} className={`absolute ${d.size} font-black ${d.color} animate-float`}
            style={{ top: d.top, left: d.left, right: d.right, bottom: d.bottom, animationDelay: d.delay, fontFamily: 'serif' }}>$</span>
        ))}

        {/* Paint drips */}
        {[
          { top: '12%', left: '35%', color: 'hsl(320 100% 60%)', h: 32, opacity: 0.2 },
          { top: '30%', right: '18%', color: 'hsl(45 100% 50%)', h: 24, opacity: 0.15 },
          { top: '55%', left: '50%', color: 'hsl(var(--primary))', h: 28, opacity: 0.15 },
          { top: '70%', left: '80%', color: 'hsl(195 100% 50%)', h: 36, opacity: 0.12 },
          { top: '5%', left: '60%', color: 'hsl(0 100% 50%)', h: 40, opacity: 0.1 },
        ].map((drip, i) => (
          <svg key={`drip-${i}`} className={`absolute w-6`} style={{ top: drip.top, left: drip.left, right: (drip as any).right, height: drip.h * 4, opacity: drip.opacity }} viewBox="0 0 20 100">
            <path d="M10 0 L10 70 Q10 90 10 95 Q7 100 10 100 Q13 100 10 95" stroke={drip.color} strokeWidth="3" fill={drip.color} fillOpacity="0.3"/>
          </svg>
        ))}
      </div>

      {/* Layer 6: Skulls + graffiti words */}
      <div className="absolute inset-0" style={{ transform: `translateY(${scrollY * 0.18}px)` }}>
        {[
          { top: '45%', right: '25%', size: 'w-16 h-16', color: 'text-primary/25', delay: '-2.5s', rect: false },
          { bottom: '40%', left: '30%', size: 'w-14 h-14', color: 'text-[hsl(320,100%,60%)]/20', delay: '-4.5s', rect: false },
          { top: '18%', left: '55%', size: 'w-12 h-12', color: 'text-[hsl(45,100%,50%)]/15', delay: '-6.5s', rect: true },
        ].map((s, i) => (
          <svg key={`skull-${i}`} className={`absolute ${s.size} ${s.color} animate-float`}
            style={{ top: s.top, left: s.left, right: s.right, bottom: s.bottom, animationDelay: s.delay }}
            viewBox="0 0 50 60">
            <ellipse cx="25" cy="25" rx="20" ry="22" fill="none" stroke="currentColor" strokeWidth="2"/>
            {s.rect ? (
              <><rect x="14" y="18" width="10" height="8" fill="currentColor"/><rect x="28" y="18" width="10" height="8" fill="currentColor"/></>
            ) : (
              <><circle cx="17" cy="22" r="5" fill="currentColor"/><circle cx="33" cy="22" r="5" fill="currentColor"/></>
            )}
            <path d="M15 38 L20 35 L25 38 L30 35 L35 38" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
        ))}

        {/* Graffiti words */}
        {[
          { top: '8%', right: '30%', text: 'SAMO©', color: 'text-[hsl(45,100%,50%)]', strike: true, delay: '-3s' },
          { bottom: '20%', left: '8%', text: 'ORIGIN', color: 'text-primary', strike: false, delay: '-5s' },
          { top: '70%', right: '15%', text: 'TEETH', color: 'text-[hsl(320,100%,60%)]', strike: false, delay: '-7s' },
          { top: '35%', left: '3%', text: 'KING', color: 'text-[hsl(45,100%,50%)]', strike: true, delay: '-1s' },
          { bottom: '10%', right: '45%', text: 'CROWN', color: 'text-primary', strike: false, delay: '-8s' },
          { top: '90%', left: '40%', text: 'GOLD', color: 'text-[hsl(45,100%,50%)]', strike: true, delay: '-4s' },
        ].map((w, i) => (
          <div key={`word-${i}`} className={`absolute opacity-[0.12] animate-float`}
            style={{ top: w.top, left: w.left, right: w.right, bottom: w.bottom, animationDelay: w.delay }}>
            <span className={`text-xl font-black ${w.color} tracking-widest`}
              style={{ fontFamily: i % 2 === 0 ? 'serif' : 'monospace', textDecoration: w.strike ? 'line-through' : 'none' }}>
              {w.text}
            </span>
          </div>
        ))}
      </div>

      {/* Layer 7: Geometric shapes + spray halos + arrows + scribbles */}
      <div className="absolute inset-0" style={{ transform: `translateY(${scrollY * 0.25}px)` }}>
        {/* Rotating shapes */}
        <div className="absolute top-[20%] left-[40%] w-10 h-10 border-2 border-primary/20 rotate-45 animate-spin-slow" />
        <div className="absolute top-[55%] right-[35%] w-8 h-8 border-2 border-[hsl(320,100%,60%)]/15 rotate-12 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
        <div className="absolute bottom-[35%] left-[45%] w-12 h-12 border-2 border-[hsl(195,100%,50%)]/15 -rotate-12 animate-spin-slow" />
        <div className="absolute top-[80%] left-[20%] w-6 h-6 border-2 border-[hsl(45,100%,50%)]/20 rotate-[30deg] animate-spin-slow" />
        
        {/* Spray paint halo rings */}
        <div className="absolute top-[35%] left-[18%] w-24 h-24 rounded-full border border-primary/10 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-[35%] left-[18%] w-32 h-32 rounded-full border border-primary/5 animate-pulse" style={{ animationDuration: '4s', animationDelay: '-1s' }} />
        <div className="absolute bottom-[25%] right-[22%] w-20 h-20 rounded-full border border-[hsl(320,100%,60%)]/10 animate-pulse" style={{ animationDuration: '5s' }} />
        <div className="absolute top-[60%] left-[60%] w-28 h-28 rounded-full border border-[hsl(45,100%,50%)]/8 animate-pulse" style={{ animationDuration: '6s' }} />
        
        {/* Scribble lines */}
        <svg className="absolute top-[30%] left-[5%] w-40 h-20 opacity-30" viewBox="0 0 150 70">
          <path d="M5 35 Q15 10, 35 30 Q55 50, 75 25 Q95 5, 115 35 Q135 55, 145 30" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" className="animate-dash"/>
        </svg>
        <svg className="absolute bottom-[20%] right-[10%] w-36 h-18 opacity-25" viewBox="0 0 150 70">
          <path d="M5 50 Q25 5, 55 40 Q75 60, 95 20 Q115 5, 145 35" fill="none" stroke="hsl(320 100% 60%)" strokeWidth="2" className="animate-dash" style={{ animationDelay: '-2s' }}/>
        </svg>
        <svg className="absolute top-[65%] left-[30%] w-32 h-16 opacity-20" viewBox="0 0 150 70">
          <path d="M5 30 Q40 60, 70 20 Q100 5, 145 40" fill="none" stroke="hsl(45 100% 50%)" strokeWidth="2" className="animate-dash" style={{ animationDelay: '-4s' }}/>
        </svg>

        {/* Basquiat arrows */}
        {[
          { top: '15%', left: '65%', color: 'hsl(45 100% 50%)', delay: '-3s' },
          { bottom: '45%', right: '5%', color: 'hsl(var(--primary))', delay: '-6s' },
          { top: '80%', left: '12%', color: 'hsl(320 100% 60%)', delay: '-1s' },
        ].map((a, i) => (
          <svg key={`arrow-${i}`} className="absolute w-16 h-16 opacity-20 animate-float"
            style={{ top: a.top, left: a.left, right: a.right, bottom: a.bottom, animationDelay: a.delay }}
            viewBox="0 0 50 50">
            <line x1="10" y1="40" x2="40" y2="10" stroke={a.color} strokeWidth="3"/>
            <line x1="40" y1="10" x2="30" y2="12" stroke={a.color} strokeWidth="3"/>
            <line x1="40" y1="10" x2="38" y2="20" stroke={a.color} strokeWidth="3"/>
          </svg>
        ))}

        {/* Copyright symbols */}
        <span className="absolute top-[50%] left-[5%] text-3xl text-[hsl(45,100%,50%)]/15 animate-float" style={{ animationDelay: '-2s', fontFamily: 'serif' }}>©</span>
        <span className="absolute top-[22%] right-[42%] text-2xl text-primary/12 animate-float" style={{ animationDelay: '-5s', fontFamily: 'serif' }}>©</span>

        {/* Extra X marks - street art style */}
        {[
          { top: '25%', left: '85%', color: 'hsl(0 100% 50%)', opacity: 0.1 },
          { top: '72%', left: '48%', color: 'hsl(var(--primary))', opacity: 0.08 },
        ].map((x, i) => (
          <svg key={`x-${i}`} className="absolute w-10 h-10 animate-float" style={{ top: x.top, left: x.left, opacity: x.opacity, animationDelay: `${-i * 3}s` }} viewBox="0 0 30 30">
            <line x1="5" y1="5" x2="25" y2="25" stroke={x.color} strokeWidth="3"/>
            <line x1="25" y1="5" x2="5" y2="25" stroke={x.color} strokeWidth="3"/>
          </svg>
        ))}
      </div>

      {/* Layer 8: Noise texture */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        transform: `translateY(${scrollY * 0.03}px)`
      }} />

      {/* Vignette */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
    </div>
  );
}
