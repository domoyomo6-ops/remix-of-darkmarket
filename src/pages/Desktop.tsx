import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal,
  ShoppingBag,
  Gamepad2,
  MessageSquare,
  Settings,
  User,
  Folder,
  Wifi,
  Battery,
  Volume2,
  ChevronUp,
  Home,
  Gift,
  Radio,
} from 'lucide-react';

interface DesktopIcon {
  id: string;
  name: string;
  icon: React.ReactNode;
  route: string;
  color: string;
}

const desktopIcons: DesktopIcon[] = [
  { id: 'homepage', name: 'HOME.html', icon: <Home className="w-8 h-8" />, route: '/', color: 'text-blue-400' },
  { id: 'store', name: 'STOCK.exe', icon: <ShoppingBag className="w-8 h-8" />, route: '/stock', color: 'text-primary' },
  { id: 'games', name: 'ARCADE.exe', icon: <Gamepad2 className="w-8 h-8" />, route: '/games', color: 'text-amber-400' },
  { id: 'lounge', name: 'LOUNGE.exe', icon: <Radio className="w-8 h-8" />, route: '/lounge', color: 'text-fuchsia-400' },
  { id: 'forum', name: 'FORUM.exe', icon: <MessageSquare className="w-8 h-8" />, route: '/forum', color: 'text-cyan-400' },
  { id: 'giftcards', name: 'GIFTS.exe', icon: <Gift className="w-8 h-8" />, route: '/giftcards', color: 'text-pink-400' },
  { id: 'orders', name: 'ORDERS.dat', icon: <Folder className="w-8 h-8" />, route: '/orders', color: 'text-purple-400' },
  { id: 'admin', name: 'ADMIN.sys', icon: <Settings className="w-8 h-8" />, route: '/admin', color: 'text-red-400' },
];

export default function Desktop() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [showStartMenu, setShowStartMenu] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const startMenuItems = useMemo(
    () => desktopIcons.map(icon => ({ ...icon, action: () => navigate(icon.route) })),
    [navigate]
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 overflow-hidden select-none">
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.04)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* Desktop Icons */}
      <div className="absolute top-6 left-6 grid grid-cols-1 gap-6 z-10">
        {desktopIcons.map(icon => (
          <button
            key={icon.id}
            onClick={() => {
              setSelectedIcon(icon.id);
              navigate(icon.route); // ✅ instant open
            }}
            className={`
              flex flex-col items-center gap-2 p-3 rounded-lg
              transition-all duration-150 ease-out
              active:scale-95 active:bg-primary/30
              group
              ${selectedIcon === icon.id
                ? 'bg-primary/20 ring-1 ring-primary/50'
                : 'hover:bg-white/5'}
            `}
          >
            <div className={`${icon.color} group-hover:scale-110 transition-transform drop-shadow-lg`}>
              {icon.icon}
            </div>
            <span className="text-xs font-mono text-primary/80 group-hover:text-primary drop-shadow-md">
              {icon.name}
            </span>
          </button>
        ))}
      </div>

      {/* Start Menu */}
      {showStartMenu && (
        <div className="absolute bottom-12 left-2 w-72 bg-zinc-900/95 border border-primary/30 rounded-lg shadow-2xl shadow-primary/20 z-50 animate-slide-up">
          <div className="p-3 border-b border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-mono text-sm text-primary">OPERATOR</p>
                <p className="text-xs text-muted-foreground">Level 1 Access</p>
              </div>
            </div>
          </div>

          <div className="p-2">
            {startMenuItems.map(icon => (
              <button
                key={icon.id}
                onClick={() => {
                  setShowStartMenu(false);
                  icon.action();
                }}
                className="w-full flex items-center gap-3 p-2 rounded hover:bg-primary/10 transition-colors"
              >
                <span className={icon.color}>{icon.icon}</span>
                <span className="font-mono text-sm text-primary/80">{icon.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Taskbar */}
      <div className="absolute bottom-0 left-0 right-0 h-11 bg-zinc-900/90 border-t border-primary/20 backdrop-blur-xl flex items-center justify-between px-2 z-40">
        <button
          onClick={() => setShowStartMenu(!showStartMenu)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all
            ${showStartMenu ? 'bg-primary/20' : 'hover:bg-white/5'}`}
        >
          <Terminal className="w-5 h-5 text-primary" />
          <span className="text-sm font-mono text-primary hidden sm:inline">HELL5TAR</span>
        </button>

        <div className="flex items-center gap-1 text-primary/70">
          <button className="p-2 rounded hover:bg-white/5">
            <ChevronUp className="w-4 h-4" />
          </button>
          <Wifi className="w-4 h-4" />
          <Volume2 className="w-4 h-4" />
          <Battery className="w-4 h-4" />
        </div>

        <div className="flex flex-col items-end text-xs font-mono text-primary/70">
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-primary/40">{time.toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

