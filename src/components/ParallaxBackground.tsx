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
       {/* Layer 1: Deep space gradient - slowest */}
       <div 
         className="absolute inset-0 bg-gradient-to-br from-background via-black to-background"
         style={{ transform: `translateY(${scrollY * 0.02}px)` }}
       />
       
       {/* Layer 2: Animated nebula orbs */}
       <div 
         className="absolute inset-0"
         style={{ transform: `translateY(${scrollY * 0.05}px)` }}
       >
         <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[150px] animate-float" />
         <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(280,100%,50%)]/8 blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
         <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] rounded-full bg-[hsl(195,100%,50%)]/8 blur-[100px] animate-float" style={{ animationDelay: '-5s' }} />
       </div>
 
       {/* Layer 3: Cyber grid overlay */}
       <div 
         className="absolute inset-0 opacity-20"
         style={{ 
           transform: `translateY(${scrollY * 0.1}px)`,
           backgroundImage: `
             linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
             linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
           `,
           backgroundSize: '80px 80px'
         }}
       />
 
        {/* Layer 4: Basquiat-style crowns - medium speed */}
        <div 
          className="absolute inset-0"
          style={{ transform: `translateY(${scrollY * 0.15}px)` }}
        >
          <svg className="absolute top-[10%] left-[8%] w-24 h-24 text-[hsl(45,100%,50%)] opacity-40 animate-float" viewBox="0 0 100 80" style={{ animationDelay: '-2s' }}>
            <path d="M10 70 L10 30 L25 50 L40 20 L55 50 L70 25 L85 45 L90 30 L90 70 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
            <line x1="25" y1="50" x2="25" y2="35" stroke="currentColor" strokeWidth="2"/>
            <line x1="55" y1="50" x2="55" y2="30" stroke="currentColor" strokeWidth="2"/>
            <line x1="70" y1="45" x2="70" y2="35" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <svg className="absolute top-[25%] right-[12%] w-18 h-18 text-[hsl(45,100%,50%)] opacity-30 animate-float" viewBox="0 0 100 80" style={{ animationDelay: '-4s' }}>
            <path d="M10 70 L10 30 L25 50 L40 20 L55 50 L70 25 L85 45 L90 30 L90 70 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
          </svg>
          <svg className="absolute bottom-[30%] left-[15%] w-16 h-16 text-[hsl(45,100%,50%)] opacity-25 animate-float" viewBox="0 0 100 80" style={{ animationDelay: '-6s' }}>
            <path d="M10 70 L10 30 L25 50 L40 20 L55 50 L70 25 L85 45 L90 30 L90 70 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
          </svg>
          {/* Extra crown - bottom right */}
          <svg className="absolute bottom-[15%] right-[5%] w-20 h-20 text-[hsl(45,100%,50%)] opacity-20 animate-float" viewBox="0 0 100 80" style={{ animationDelay: '-8s' }}>
            <path d="M10 70 L10 30 L25 50 L40 20 L55 50 L70 25 L85 45 L90 30 L90 70 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
            <line x1="40" y1="50" x2="40" y2="30" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>

        {/* Layer 5: Warhol-style dollar signs + paint drips */}
        <div 
          className="absolute inset-0"
          style={{ transform: `translateY(${scrollY * 0.2}px)` }}
        >
          <span className="absolute top-[15%] right-[20%] text-7xl font-black text-primary/15 animate-float" style={{ animationDelay: '-1s', fontFamily: 'serif' }}>$</span>
          <span className="absolute top-[40%] left-[10%] text-6xl font-black text-[hsl(320,100%,60%)]/15 animate-float" style={{ animationDelay: '-3s', fontFamily: 'serif' }}>$</span>
          <span className="absolute bottom-[25%] right-[8%] text-8xl font-black text-[hsl(195,100%,50%)]/12 animate-float" style={{ animationDelay: '-5s', fontFamily: 'serif' }}>$</span>
          <span className="absolute top-[60%] left-[25%] text-5xl font-black text-[hsl(45,100%,50%)]/15 animate-float" style={{ animationDelay: '-2s', fontFamily: 'serif' }}>$</span>
          <span className="absolute top-[75%] right-[40%] text-6xl font-black text-primary/10 animate-float" style={{ animationDelay: '-7s', fontFamily: 'serif' }}>$</span>
          
          {/* Paint drip effects */}
          <svg className="absolute top-[12%] left-[35%] w-6 h-32 opacity-20" viewBox="0 0 20 100">
            <path d="M10 0 L10 70 Q10 90 10 95 Q7 100 10 100 Q13 100 10 95" stroke="hsl(320 100% 60%)" strokeWidth="3" fill="hsl(320 100% 60%)" fillOpacity="0.3"/>
          </svg>
          <svg className="absolute top-[30%] right-[18%] w-4 h-24 opacity-15" viewBox="0 0 20 100">
            <path d="M10 0 L10 70 Q10 90 10 95 Q7 100 10 100 Q13 100 10 95" stroke="hsl(45 100% 50%)" strokeWidth="3" fill="hsl(45 100% 50%)" fillOpacity="0.3"/>
          </svg>
          <svg className="absolute top-[55%] left-[50%] w-5 h-28 opacity-15" viewBox="0 0 20 100">
            <path d="M10 0 L10 70 Q10 90 10 95 Q7 100 10 100 Q13 100 10 95" stroke="hsl(var(--primary))" strokeWidth="3" fill="hsl(var(--primary))" fillOpacity="0.3"/>
          </svg>
        </div>

        {/* Layer 6: Basquiat skulls + graffiti words */}
        <div 
          className="absolute inset-0"
          style={{ transform: `translateY(${scrollY * 0.18}px)` }}
        >
          <svg className="absolute top-[45%] right-[25%] w-16 h-16 text-primary/25 animate-float" viewBox="0 0 50 60" style={{ animationDelay: '-2.5s' }}>
            <ellipse cx="25" cy="25" rx="20" ry="22" fill="none" stroke="currentColor" strokeWidth="2"/>
            <circle cx="17" cy="22" r="5" fill="currentColor"/>
            <circle cx="33" cy="22" r="5" fill="currentColor"/>
            <path d="M15 38 L20 35 L25 38 L30 35 L35 38" stroke="currentColor" strokeWidth="2" fill="none"/>
            <line x1="25" y1="28" x2="25" y2="33" stroke="currentColor" strokeWidth="2"/>
            <line x1="20" y1="48" x2="30" y2="48" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          <svg className="absolute bottom-[40%] left-[30%] w-14 h-14 text-[hsl(320,100%,60%)]/20 animate-float" viewBox="0 0 50 60" style={{ animationDelay: '-4.5s' }}>
            <ellipse cx="25" cy="25" rx="20" ry="22" fill="none" stroke="currentColor" strokeWidth="2"/>
            <circle cx="17" cy="22" r="5" fill="currentColor"/>
            <circle cx="33" cy="22" r="5" fill="currentColor"/>
            <path d="M15 38 L20 35 L25 38 L30 35 L35 38" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
          <svg className="absolute top-[18%] left-[55%] w-12 h-12 text-[hsl(45,100%,50%)]/15 animate-float" viewBox="0 0 50 60" style={{ animationDelay: '-6.5s' }}>
            <ellipse cx="25" cy="25" rx="20" ry="22" fill="none" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="18" width="10" height="8" fill="currentColor"/>
            <rect x="28" y="18" width="10" height="8" fill="currentColor"/>
            <path d="M15 38 L20 35 L25 38 L30 35 L35 38" stroke="currentColor" strokeWidth="2" fill="none"/>
          </svg>
          
          {/* Graffiti-style crossed-out words */}
          <div className="absolute top-[8%] right-[30%] opacity-15 animate-float" style={{ animationDelay: '-3s' }}>
            <span className="text-2xl font-black text-[hsl(45,100%,50%)] tracking-widest" style={{ fontFamily: 'serif', textDecoration: 'line-through' }}>SAMO©</span>
          </div>
          <div className="absolute bottom-[20%] left-[8%] opacity-12 animate-float" style={{ animationDelay: '-5s' }}>
            <span className="text-xl font-black text-primary tracking-[0.3em]" style={{ fontFamily: 'monospace' }}>ORIGIN</span>
          </div>
          <div className="absolute top-[70%] right-[15%] opacity-10 animate-float" style={{ animationDelay: '-7s' }}>
            <span className="text-lg font-black text-[hsl(320,100%,60%)] tracking-widest" style={{ fontFamily: 'serif' }}>TEETH</span>
          </div>
        </div>

        {/* Layer 7: Abstract geometric shapes + spray paint halos */}
        <div 
          className="absolute inset-0"
          style={{ transform: `translateY(${scrollY * 0.25}px)` }}
        >
          <div className="absolute top-[20%] left-[40%] w-10 h-10 border-2 border-primary/20 rotate-45 animate-spin-slow" />
          <div className="absolute top-[55%] right-[35%] w-8 h-8 border-2 border-[hsl(320,100%,60%)]/15 rotate-12 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
          <div className="absolute bottom-[35%] left-[45%] w-12 h-12 border-2 border-[hsl(195,100%,50%)]/15 -rotate-12 animate-spin-slow" />
          <div className="absolute top-[80%] left-[20%] w-6 h-6 border-2 border-[hsl(45,100%,50%)]/20 rotate-[30deg] animate-spin-slow" />
          
          {/* Spray paint halo rings */}
          <div className="absolute top-[35%] left-[18%] w-24 h-24 rounded-full border border-primary/10 animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute top-[35%] left-[18%] w-32 h-32 rounded-full border border-primary/5 animate-pulse" style={{ animationDuration: '4s', animationDelay: '-1s' }} />
          <div className="absolute bottom-[25%] right-[22%] w-20 h-20 rounded-full border border-[hsl(320,100%,60%)]/10 animate-pulse" style={{ animationDuration: '5s' }} />
          
          {/* Neon scribble lines - more chaotic */}
          <svg className="absolute top-[30%] left-[5%] w-40 h-20 opacity-30" viewBox="0 0 150 70">
            <path d="M5 35 Q15 10, 35 30 Q55 50, 75 25 Q95 5, 115 35 Q135 55, 145 30" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" className="animate-dash"/>
          </svg>
          <svg className="absolute bottom-[20%] right-[10%] w-36 h-18 opacity-25" viewBox="0 0 150 70">
            <path d="M5 50 Q25 5, 55 40 Q75 60, 95 20 Q115 5, 145 35" fill="none" stroke="hsl(320 100% 60%)" strokeWidth="2" className="animate-dash" style={{ animationDelay: '-2s' }}/>
          </svg>
          <svg className="absolute top-[65%] left-[30%] w-32 h-16 opacity-20" viewBox="0 0 150 70">
            <path d="M5 30 Q40 60, 70 20 Q100 5, 145 40" fill="none" stroke="hsl(45 100% 50%)" strokeWidth="2" className="animate-dash" style={{ animationDelay: '-4s' }}/>
          </svg>
          
          {/* Basquiat-style arrows */}
          <svg className="absolute top-[15%] left-[65%] w-16 h-16 opacity-20 animate-float" viewBox="0 0 50 50" style={{ animationDelay: '-3s' }}>
            <line x1="10" y1="40" x2="40" y2="10" stroke="hsl(45 100% 50%)" strokeWidth="3"/>
            <line x1="40" y1="10" x2="30" y2="12" stroke="hsl(45 100% 50%)" strokeWidth="3"/>
            <line x1="40" y1="10" x2="38" y2="20" stroke="hsl(45 100% 50%)" strokeWidth="3"/>
          </svg>
          <svg className="absolute bottom-[45%] right-[5%] w-14 h-14 opacity-15 animate-float" viewBox="0 0 50 50" style={{ animationDelay: '-6s' }}>
            <line x1="10" y1="40" x2="40" y2="10" stroke="hsl(var(--primary))" strokeWidth="3"/>
            <line x1="40" y1="10" x2="30" y2="12" stroke="hsl(var(--primary))" strokeWidth="3"/>
            <line x1="40" y1="10" x2="38" y2="20" stroke="hsl(var(--primary))" strokeWidth="3"/>
          </svg>
          
          {/* Copyright symbols - Basquiat trademark */}
          <span className="absolute top-[50%] left-[5%] text-3xl text-[hsl(45,100%,50%)]/15 animate-float" style={{ animationDelay: '-2s', fontFamily: 'serif' }}>©</span>
          <span className="absolute top-[22%] right-[42%] text-2xl text-primary/12 animate-float" style={{ animationDelay: '-5s', fontFamily: 'serif' }}>©</span>
        </div>
 
       {/* Layer 8: Noise texture overlay */}
       <div 
         className="absolute inset-0 opacity-[0.015]"
         style={{
           backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
           transform: `translateY(${scrollY * 0.03}px)`
         }}
       />
 
       {/* Vignette overlay */}
       <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
     </div>
   );
 }