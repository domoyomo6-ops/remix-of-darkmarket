import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const emailSchema = z.string().trim().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().trim().min(1, "Name is required");

const SiteGate = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [phosphorPulse, setPhosphorPulse] = useState(false);
  const [alertState, setAlertState] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [showSignUp, setShowSignUp] = useState(false);
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpFullName, setSignUpFullName] = useState("");
  const [signUpErrors, setSignUpErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const timeRef = useRef<HTMLSpanElement>(null);

  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  useEffect(() => {
    const handleAdminShortcut = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "a") {
        navigate("/admin-auth");
      }
    };

    window.addEventListener("keydown", handleAdminShortcut);
    return () => window.removeEventListener("keydown", handleAdminShortcut);
  }, [navigate]);

  const COLORS = {
    main: "118,255,180",
    highlight: "0,200,255",
    alert: "255,40,0",
    background: "#000000",
    header: "rgba(118,255,180,0.12)",
  };

  // Secret click pattern: Click the "5" in HELL5TAR 5 times
  const [secretClicks, setSecretClicks] = useState(0);
  const secretTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSecretClick = () => {
    setSecretClicks(prev => {
      const newCount = prev + 1;
      if (secretTimeoutRef.current) clearTimeout(secretTimeoutRef.current);
      
      if (newCount >= 5) {
        navigate('/auth');
        return 0;
      }
      
      secretTimeoutRef.current = setTimeout(() => setSecretClicks(0), 2000);
      return newCount;
    });
  };

  const asciiLogo = `
██╗  ██╗███████╗██╗     ██╗     ███████╗████████╗ █████╗ ██████╗
██║  ██║██╔════╝██║     ██║     ██╔════╝╚══██╔══╝██╔══██╗██╔══██╗
███████║█████╗  ██║     ██║     ███████╗   ██║   ███████║██████╔╝
██╔══██║██╔══╝  ██║     ██║     ╚════██║   ██║   ██╔══██║██╔══██╗
██║  ██║███████╗███████╗███████╗███████║   ██║   ██║  ██║██║  ██║
╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
`;

  const unityGateNotice = [
    "> GAME ROOM SITE GATE WORDING: STEEL-LOCKED",
    "> CHAINS + STEEL OVERLAY ACTIVE ON EVERY PAGE + TERMINAL BOX",
    "> WALLET LINK REQUIRED BEFORE ANY PURCHASE",
    "> CASHOUT + BUY ACCESS ROUTES ARE WALLET-GATED ONLY",
  ];

  // --- Clock pulse ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setPhosphorPulse(true);
      setTimeout(() => setPhosphorPulse(false), 150);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Loading bar ---
  useEffect(() => {
    const interval = setInterval(() => {
      setBootProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setBootComplete(true);
          return 100;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast({
        title: "ACCESS DENIED",
        description: error.message,
        variant: "destructive",
      });
      setAlertState(true);
      setTimeout(() => setAlertState(false), 400);
    }

    setIsLoading(false);
  };

  const validateSignUpForm = (): boolean => {
    const errors: { email?: string; password?: string; fullName?: string } = {};

    const emailResult = emailSchema.safeParse(signUpEmail);
    if (!emailResult.success) {
      errors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(signUpPassword);
    if (!passwordResult.success) {
      errors.password = passwordResult.error.errors[0].message;
    }

    const nameResult = nameSchema.safeParse(signUpFullName);
    if (!nameResult.success) {
      errors.fullName = nameResult.error.errors[0].message;
    }

    setSignUpErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSignUpForm()) return;

    setIsLoading(true);

    const { error } = await signUp(signUpEmail, signUpPassword, signUpFullName);

    if (error) {
      if (error.message.includes("already registered") || error.message.includes("already exists")) {
        toast({
          title: "USER EXISTS",
          description: "This email is already registered. Try logging in.",
          variant: "destructive",
        });
        setShowSignUp(false);
      } else {
        toast({
          title: "REGISTRATION FAILED",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "ACCESS GRANTED",
        description: "Account created successfully!",
      });
    }

    setIsLoading(false);
    setSignUpEmail("");
    setSignUpPassword("");
    setSignUpFullName("");
    setSignUpErrors({});
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 font-mono overflow-hidden">
      {/* ORIGINAL DARK BACKGROUND */}
      <div 
        className="fixed inset-0 -z-30"
        style={{ 
          background: `radial-gradient(ellipse 80% 60% at 50% 40%, #0a0a0c 0%, #030304 100%)`
        }} 
      />

      {/* MAIN CRT MONITOR AREA */}
      <div className="w-full max-w-xl relative z-10" style={{ perspective: "1000px" }}>
        <div className="relative rounded-xl p-3 sm:p-4 steel-terminal-box"
          style={{
            background: `linear-gradient(145deg, #1a1a1e 0%, #0d0d0f 50%, #080809 100%)`,
            boxShadow: "0 30px 60px rgba(0,0,0,0.8),0 50px 100px rgba(0,0,0,0.6)",
            border: `1px solid rgba(40,40,45,0.8)`,
          }}
        >
          {/* CRT SCREEN */}
          <div className="relative rounded-lg overflow-hidden" style={{ background: '#050506', border: `1px solid rgba(0,0,0,0.9)` }}>
            <div className="relative crt-screen" style={{ background: '#000000', borderRadius: '4px' }}>
              
              {/* ANIMATED WORLD MAP BACKGROUND */}
              <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
                <svg 
                  viewBox="0 0 1000 500" 
                  className="w-full h-full world-map-glow"
                  style={{ filter: 'blur(0.5px)' }}
                >
                  {/* Grid lines */}
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke={`rgba(${COLORS.main},0.15)`} strokeWidth="0.5"/>
                    </pattern>
                    <linearGradient id="mapGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={`rgba(${COLORS.main},0.3)`} />
                      <stop offset="50%" stopColor={`rgba(${COLORS.highlight},0.2)`} />
                      <stop offset="100%" stopColor={`rgba(${COLORS.main},0.3)`} />
                    </linearGradient>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  {/* Simplified continent outlines */}
                  <g className="animate-pulse" style={{ animationDuration: '4s' }}>
                    {/* North America */}
                    <path 
                      d="M150,80 Q180,70 220,75 L250,90 Q280,100 290,130 L270,160 Q250,180 220,190 L180,185 Q150,170 140,140 Q130,110 150,80Z"
                      fill="none" 
                      stroke={`rgba(${COLORS.main},0.6)`} 
                      strokeWidth="1"
                      className="continent-path"
                    />
                    {/* South America */}
                    <path 
                      d="M250,220 Q270,210 280,230 L290,280 Q285,320 270,350 L250,370 Q230,360 225,320 L230,270 Q235,240 250,220Z"
                      fill="none" 
                      stroke={`rgba(${COLORS.main},0.6)`} 
                      strokeWidth="1"
                      className="continent-path"
                    />
                    {/* Europe */}
                    <path 
                      d="M480,80 Q510,70 540,75 L560,90 Q570,110 560,130 L530,140 Q500,135 480,120 Q470,100 480,80Z"
                      fill="none" 
                      stroke={`rgba(${COLORS.main},0.6)`} 
                      strokeWidth="1"
                      className="continent-path"
                    />
                    {/* Africa */}
                    <path 
                      d="M500,160 Q530,150 550,170 L560,220 Q555,280 530,320 L500,340 Q470,320 465,270 L470,210 Q480,175 500,160Z"
                      fill="none" 
                      stroke={`rgba(${COLORS.main},0.6)`} 
                      strokeWidth="1"
                      className="continent-path"
                    />
                    {/* Asia */}
                    <path 
                      d="M600,60 Q680,50 750,70 L820,100 Q850,130 840,170 L800,200 Q740,210 680,190 L620,160 Q580,130 580,100 Q585,70 600,60Z"
                      fill="none" 
                      stroke={`rgba(${COLORS.main},0.6)`} 
                      strokeWidth="1"
                      className="continent-path"
                    />
                    {/* Australia */}
                    <path 
                      d="M780,280 Q820,270 850,290 L860,330 Q850,360 820,370 L780,360 Q760,340 765,310 Q770,285 780,280Z"
                      fill="none" 
                      stroke={`rgba(${COLORS.main},0.6)`} 
                      strokeWidth="1"
                      className="continent-path"
                    />
                  </g>
                  
                  {/* Animated connection lines */}
                  <g className="data-lines">
                    <line x1="200" y1="120" x2="500" y2="100" stroke={`rgba(${COLORS.highlight},0.4)`} strokeWidth="0.5" strokeDasharray="4,4">
                      <animate attributeName="stroke-dashoffset" from="0" to="8" dur="1s" repeatCount="indefinite"/>
                    </line>
                    <line x1="520" y1="130" x2="700" y2="150" stroke={`rgba(${COLORS.highlight},0.4)`} strokeWidth="0.5" strokeDasharray="4,4">
                      <animate attributeName="stroke-dashoffset" from="0" to="8" dur="1.2s" repeatCount="indefinite"/>
                    </line>
                    <line x1="260" y1="250" x2="480" y2="220" stroke={`rgba(${COLORS.highlight},0.4)`} strokeWidth="0.5" strokeDasharray="4,4">
                      <animate attributeName="stroke-dashoffset" from="0" to="8" dur="0.8s" repeatCount="indefinite"/>
                    </line>
                    <line x1="700" y1="180" x2="800" y2="300" stroke={`rgba(${COLORS.highlight},0.4)`} strokeWidth="0.5" strokeDasharray="4,4">
                      <animate attributeName="stroke-dashoffset" from="0" to="8" dur="1.5s" repeatCount="indefinite"/>
                    </line>
                  </g>
                  
                  {/* Pulsing nodes */}
                  <g className="nodes">
                    <circle cx="200" cy="120" r="3" fill={`rgba(${COLORS.main},0.8)`}>
                      <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="500" cy="100" r="3" fill={`rgba(${COLORS.highlight},0.8)`}>
                      <animate attributeName="r" values="2;4;2" dur="2.5s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2.5s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="700" cy="150" r="3" fill={`rgba(${COLORS.main},0.8)`}>
                      <animate attributeName="r" values="2;4;2" dur="1.8s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.8s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="260" cy="250" r="3" fill={`rgba(${COLORS.highlight},0.8)`}>
                      <animate attributeName="r" values="2;4;2" dur="2.2s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2.2s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="800" cy="300" r="3" fill={`rgba(${COLORS.main},0.8)`}>
                      <animate attributeName="r" values="2;4;2" dur="1.6s" repeatCount="indefinite"/>
                      <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.6s" repeatCount="indefinite"/>
                    </circle>
                  </g>
                </svg>
              </div>
              {/* HEADER */}
              <div className="px-4 py-2 flex items-center gap-2 border-b relative z-20"
                style={{ background: `rgba(${COLORS.main},0.05)`, borderColor: `rgba(${COLORS.main},0.15)` }}
              >
                <span className="text-xs" style={{ color: `rgba(${COLORS.main},0.8)`, textShadow: `0 0 8px rgba(${COLORS.main},0.6)` }}>
                  hell5tar@game-room-site-gate ~{" "}
                  <span className={`phosphor-trail ${phosphorPulse ? "phosphor-pulse" : ""}`}>
                    {formatTime(currentTime)}
                  </span>
                </span>
              </div>

              {/* CONTENT */}
              <div className="relative z-20 p-6 space-y-4">
                {/* ASCII Logo with secret click area */}
                <div className="relative">
                  <pre className="text-[9px] sm:text-[11px] leading-tight whitespace-pre" style={{ color: `rgba(${COLORS.main},0.95)`, textShadow: `0 0 1px rgba(${COLORS.main},1),0 0 2px rgba(${COLORS.main},0.8)` }}>
                    {asciiLogo}
                  </pre>
                  {/* Hidden clickable area over the "5" and star area in HELL5TAR */}
                  <button
                    onClick={handleSecretClick}
                    className="absolute opacity-0 cursor-default"
                    style={{
                      top: '35%',
                      left: '55%',
                      width: '15%',
                      height: '30%',
                    }}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  {/* Visual feedback for secret clicks (subtle) */}
                  {secretClicks > 0 && secretClicks < 5 && (
                    <div 
                      className="absolute bottom-0 right-0 text-[8px] opacity-30"
                      style={{ color: `rgba(${COLORS.main},0.5)` }}
                    >
                      {'.'.repeat(secretClicks)}
                    </div>
                  )}
                </div>

                <div
                  className="rounded-md px-3 py-2 space-y-1 border"
                  style={{
                    background: `linear-gradient(145deg, rgba(${COLORS.highlight},0.08) 0%, rgba(${COLORS.main},0.06) 100%)`,
                    borderColor: `rgba(${COLORS.highlight},0.35)`,
                    boxShadow: `inset 0 0 20px rgba(${COLORS.highlight},0.08), 0 0 16px rgba(${COLORS.main},0.15)`,
                  }}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: `rgba(${COLORS.highlight},0.85)` }}>
                    SiteGate // Steel Chain 3D Game Room Console
                  </p>
                  {unityGateNotice.map((line) => (
                    <p key={line} className="text-[10px] sm:text-[11px] leading-tight" style={{ color: `rgba(${COLORS.main},0.78)` }}>
                      {line}
                    </p>
                  ))}
                </div>

                {/* LOADING BAR */}
                {!bootComplete && (
                  <div className="w-full h-4 rounded-sm overflow-hidden mt-4 relative" style={{ background: `rgba(${COLORS.main},0.08)`, border: `1px solid rgba(${COLORS.main},0.2)` }}>
                    <div className="h-full absolute left-0 top-0" style={{ width: `${bootProgress}%`, background: `rgba(${COLORS.main},0.7)`, boxShadow: `0 0 10px rgba(${COLORS.main},0.8)` }} />
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: `rgba(${COLORS.main},0.9)` }}>
                      LOADING SYSTEM... {bootProgress}%
                    </div>
                  </div>
                )}

                {/* LOGIN FORM */}
                {bootComplete && !showSignUp && (
                  <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider block" style={{ color: `rgba(${COLORS.main},0.5)` }}>
                        &gt; User ID
                      </label>
                      <Input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="crt-input w-full" 
                        placeholder="user@hell5tar.net" 
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider block" style={{ color: `rgba(${COLORS.main},0.5)` }}>
                        &gt; Access Code
                      </label>
                      <Input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="crt-input w-full" 
                        placeholder="••••••••" 
                        required 
                      />
                    </div>
                    <div className="pt-2 space-y-2">
                      <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="crt-button w-full"
                      >
                        {isLoading ? "AUTHENTICATING..." : "[ AUTHENTICATE ]"}
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setShowSignUp(true); setSignUpErrors({}); }} 
                        className="crt-button-secondary w-full"
                      >
                        [ REQUEST ACCESS ]
                      </button>
                    </div>
                  </form>
                )}

                {/* SIGN UP FORM */}
                {bootComplete && showSignUp && (
                  <form onSubmit={handleSignUp} className="space-y-5 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider block" style={{ color: `rgba(${COLORS.main},0.5)` }}>
                        &gt; Callsign
                      </label>
                      <Input 
                        type="text" 
                        value={signUpFullName} 
                        onChange={(e) => setSignUpFullName(e.target.value)} 
                        className="crt-input w-full" 
                        placeholder="Agent Smith"
                        required 
                      />
                      {signUpErrors.fullName && (
                        <p className="text-[9px] mt-1" style={{ color: `rgba(${COLORS.alert},0.9)` }}>{signUpErrors.fullName}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider block" style={{ color: `rgba(${COLORS.main},0.5)` }}>
                        &gt; Secure Email
                      </label>
                      <Input 
                        type="email" 
                        value={signUpEmail} 
                        onChange={(e) => setSignUpEmail(e.target.value)} 
                        className="crt-input w-full" 
                        placeholder="user@hell5tar.net"
                        required 
                      />
                      {signUpErrors.email && (
                        <p className="text-[9px] mt-1" style={{ color: `rgba(${COLORS.alert},0.9)` }}>{signUpErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider block" style={{ color: `rgba(${COLORS.main},0.5)` }}>
                        &gt; Encryption Key
                      </label>
                      <Input 
                        type="password" 
                        value={signUpPassword} 
                        onChange={(e) => setSignUpPassword(e.target.value)} 
                        className="crt-input w-full" 
                        placeholder="••••••••"
                        required 
                      />
                      {signUpErrors.password && (
                        <p className="text-[9px] mt-1" style={{ color: `rgba(${COLORS.alert},0.9)` }}>{signUpErrors.password}</p>
                      )}
                    </div>
                    <div className="pt-2 space-y-2">
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="crt-button w-full"
                      >
                        {isLoading ? "INITIALIZING..." : "[ CREATE IDENTITY ]"}
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setShowSignUp(false); setSignUpErrors({}); }} 
                        className="crt-button-secondary w-full"
                      >
                        [ CANCEL ]
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CRT Monitor Label */}
      <div className="absolute bottom-2 left-4 text-[8px] uppercase tracking-[0.2em]" style={{ color: 'rgba(100,100,105,0.5)' }}>
        H5-CRT
      </div>
      <button
        type="button"
        onClick={() => navigate("/admin-auth")}
        className="absolute bottom-2 right-4 h-4 w-10 opacity-0"
        aria-label="Admin access"
        tabIndex={-1}
      />
    </div>
  );
};

export default SiteGate;









 
