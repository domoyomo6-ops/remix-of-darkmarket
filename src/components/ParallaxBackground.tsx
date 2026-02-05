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
         <svg className="absolute top-[10%] left-[8%] w-20 h-20 text-[hsl(45,100%,50%)] opacity-40 animate-float" viewBox="0 0 100 80" style={{ animationDelay: '-2s' }}>
           <path d="M10 70 L10 30 L25 50 L40 20 L55 50 L70 25 L85 45 L90 30 L90 70 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
           <line x1="25" y1="50" x2="25" y2="35" stroke="currentColor" strokeWidth="2"/>
           <line x1="55" y1="50" x2="55" y2="30" stroke="currentColor" strokeWidth="2"/>
           <line x1="70" y1="45" x2="70" y2="35" stroke="currentColor" strokeWidth="2"/>
         </svg>
         <svg className="absolute top-[25%] right-[12%] w-16 h-16 text-[hsl(45,100%,50%)] opacity-30 animate-float" viewBox="0 0 100 80" style={{ animationDelay: '-4s' }}>
           <path d="M10 70 L10 30 L25 50 L40 20 L55 50 L70 25 L85 45 L90 30 L90 70 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
         </svg>
         <svg className="absolute bottom-[30%] left-[15%] w-14 h-14 text-[hsl(45,100%,50%)] opacity-25 animate-float" viewBox="0 0 100 80" style={{ animationDelay: '-6s' }}>
           <path d="M10 70 L10 30 L25 50 L40 20 L55 50 L70 25 L85 45 L90 30 L90 70 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
         </svg>
       </div>
 
       {/* Layer 5: Warhol-style dollar signs - faster */}
       <div 
         className="absolute inset-0"
         style={{ transform: `translateY(${scrollY * 0.2}px)` }}
       >
         <span className="absolute top-[15%] right-[20%] text-6xl font-bold text-primary/15 animate-float" style={{ animationDelay: '-1s' }}>$</span>
         <span className="absolute top-[40%] left-[10%] text-5xl font-bold text-[hsl(320,100%,60%)]/15 animate-float" style={{ animationDelay: '-3s' }}>$</span>
         <span className="absolute bottom-[25%] right-[8%] text-7xl font-bold text-[hsl(195,100%,50%)]/12 animate-float" style={{ animationDelay: '-5s' }}>$</span>
         <span className="absolute top-[60%] left-[25%] text-4xl font-bold text-[hsl(45,100%,50%)]/15 animate-float" style={{ animationDelay: '-2s' }}>$</span>
       </div>
 
       {/* Layer 6: Basquiat skulls - medium-fast */}
       <div 
         className="absolute inset-0"
         style={{ transform: `translateY(${scrollY * 0.18}px)` }}
       >
         <svg className="absolute top-[45%] right-[25%] w-12 h-12 text-primary/20 animate-float" viewBox="0 0 50 60" style={{ animationDelay: '-2.5s' }}>
           <ellipse cx="25" cy="25" rx="20" ry="22" fill="none" stroke="currentColor" strokeWidth="2"/>
           <circle cx="17" cy="22" r="5" fill="currentColor"/>
           <circle cx="33" cy="22" r="5" fill="currentColor"/>
           <path d="M15 38 L20 35 L25 38 L30 35 L35 38" stroke="currentColor" strokeWidth="2" fill="none"/>
           <line x1="25" y1="28" x2="25" y2="33" stroke="currentColor" strokeWidth="2"/>
         </svg>
         <svg className="absolute bottom-[40%] left-[30%] w-10 h-10 text-[hsl(320,100%,60%)]/15 animate-float" viewBox="0 0 50 60" style={{ animationDelay: '-4.5s' }}>
           <ellipse cx="25" cy="25" rx="20" ry="22" fill="none" stroke="currentColor" strokeWidth="2"/>
           <circle cx="17" cy="22" r="5" fill="currentColor"/>
           <circle cx="33" cy="22" r="5" fill="currentColor"/>
           <path d="M15 38 L20 35 L25 38 L30 35 L35 38" stroke="currentColor" strokeWidth="2" fill="none"/>
         </svg>
       </div>
 
       {/* Layer 7: Abstract geometric shapes - fastest */}
       <div 
         className="absolute inset-0"
         style={{ transform: `translateY(${scrollY * 0.25}px)` }}
       >
         <div className="absolute top-[20%] left-[40%] w-8 h-8 border-2 border-primary/20 rotate-45 animate-spin-slow" />
         <div className="absolute top-[55%] right-[35%] w-6 h-6 border-2 border-[hsl(320,100%,60%)]/15 rotate-12 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
         <div className="absolute bottom-[35%] left-[45%] w-10 h-10 border-2 border-[hsl(195,100%,50%)]/15 -rotate-12 animate-spin-slow" />
         
         {/* Neon scribble lines */}
         <svg className="absolute top-[30%] left-[5%] w-32 h-16 opacity-30" viewBox="0 0 120 60">
           <path d="M5 30 Q20 10, 40 30 T80 30 T115 30" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" className="animate-dash"/>
         </svg>
         <svg className="absolute bottom-[20%] right-[10%] w-28 h-14 opacity-25" viewBox="0 0 120 60">
           <path d="M5 40 Q30 5, 60 35 T115 25" fill="none" stroke="hsl(320 100% 60%)" strokeWidth="2" className="animate-dash" style={{ animationDelay: '-2s' }}/>
         </svg>
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