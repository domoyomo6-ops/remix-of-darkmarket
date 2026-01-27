import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Sparkles, Info, Gift, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'restock' | 'update' | 'promo' | 'info';
  priority: number;
  is_active: boolean;
  created_at: string;
}

const typeConfig = {
  restock: { icon: Gift, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  update: { icon: Bell, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  promo: { icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
  info: { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' },
};

export default function Announcements() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (data) setAnnouncements(data);
    setLoading(false);
  };

  const acknowledgeAnnouncement = (id: string) => {
    setAcknowledged(prev => new Set([...prev, id]));
  };

  const allAcknowledged = announcements.every(a => acknowledged.has(a.id));

  const handleContinue = () => {
    // Mark announcements as seen in session
    sessionStorage.setItem('announcements_seen', 'true');
    // Navigate to homepage (now the root path)
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Bell className="w-5 h-5 text-primary animate-pulse" />
            <span className="font-mono text-sm text-primary">SYSTEM UPDATES</span>
          </div>
          <h1 className="text-3xl font-bold text-primary terminal-glow font-mono mb-2">
            ANNOUNCEMENTS
          </h1>
          <p className="text-muted-foreground">
            Review the latest updates before proceeding
          </p>
        </div>

        {/* Announcements */}
        <div className="space-y-4 mb-8">
          {announcements.length === 0 ? (
            <div className="panel-3d rounded-lg p-8 text-center">
              <Info className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No announcements at this time.</p>
            </div>
          ) : (
            announcements.map((announcement, index) => {
              const config = typeConfig[announcement.type];
              const Icon = config.icon;
              const isAcked = acknowledged.has(announcement.id);

              return (
                <div
                  key={announcement.id}
                  className={`panel-3d rounded-lg p-5 transition-all duration-300 animate-fade-in-up ${config.border} ${isAcked ? 'opacity-60' : ''}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-6 h-6 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground">{announcement.title}</h3>
                        {announcement.priority >= 3 && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-mono">
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{announcement.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                        {!isAcked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => acknowledgeAnnouncement(announcement.id)}
                            className={`text-xs px-4 py-2 rounded ${config.bg} ${config.color} hover:opacity-80 transition-opacity font-mono`}
                          >
                            Acknowledge
                          </Button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-green-400 px-3 py-1">
                            <Check className="w-3 h-3" />
                            Acknowledged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Continue button */}
        <div className="text-center space-y-3">
          <Button
            onClick={handleContinue}
            size="lg"
            className="w-full sm:w-auto px-8 py-6 text-base sm:text-lg font-mono bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all"
          >
            Continue to HELL5TAR
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          {!allAcknowledged && announcements.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {acknowledged.size}/{announcements.length} acknowledged
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
