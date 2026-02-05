import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Zap, Package, ArrowRight, Bell, Sparkles, Clock, TrendingUp, Shield, Wifi, Database, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TerminalWindow, GlitchText, Text3D, CommandPrompt, HackingProgress, RandomDataStream } from '@/components/ui/terminal-effects';

interface Product {
  id: string;
  title: string;
  short_description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'restock' | 'update' | 'promo' | 'info';
  priority: number;
  is_active: boolean;
  created_at: string;
}

export default function Homepage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootComplete, setBootComplete] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchAnnouncements();
    // Boot sequence
    const timer = setTimeout(() => setBootComplete(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, title, short_description, price, category, image_url, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6);
    if (!error) setProducts(data || []);
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);
    if (!error) setAnnouncements(data || []);
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'software': return 'bg-primary/20 text-primary border-primary/30';
      case 'courses': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'templates': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'assets': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default: return 'bg-primary/20 text-primary border-primary/30';
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen relative">
        {/* Moving scan line */}
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-30">
          <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
        </div>

        <div className="container mx-auto px-4 py-8 relative z-20">
          
          {/* HERO SECTION - Terminal Style */}
          <TerminalWindow title="hellstar_network" className="mb-8">
            <div className="p-6 md:p-10">
              {/* System status bar */}
              <div className="flex flex-wrap items-center gap-4 mb-6 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-primary">SYSTEM ONLINE</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-3 h-3" />
                  <span>ENCRYPTED</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wifi className="w-3 h-3" />
                  <span>CONNECTED</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Database className="w-3 h-3" />
                  <span>SYNCED</span>
                </div>
              </div>

              {/* 3D Title */}
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4">
                  <Text3D className="text-primary">
                    HELL5TAR://
                  </Text3D>
                </h1>
                <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto mb-6">
                  {'>'} Premium digital assets • Secure transactions • Instant delivery
                </p>

                {/* Boot sequence commands */}
                <div className="max-w-md mx-auto text-left space-y-2 mb-8">
                  <CommandPrompt command="./init_network.sh" output="Network initialized..." status="success" />
                  <CommandPrompt command="sudo access --grant user" output="Access granted." status="success" />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    className="crt-button px-8 py-6 text-lg font-mono group relative overflow-hidden" 
                    onClick={() => navigate('/stock')}
                  >
                    <Terminal className="w-5 h-5 mr-2" />
                    <GlitchText>BROWSE CATALOG</GlitchText>
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="px-8 py-6 text-lg font-mono border-primary/50 text-primary hover:bg-primary/10" 
                    onClick={() => navigate('/orders')}
                  >
                    VIEW MY ORDERS
                  </Button>
                </div>
              </div>
            </div>
          </TerminalWindow>

          {/* STATS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'PRODUCTS', value: products.length.toString(), icon: Package, color: 'text-primary' },
              { label: 'UPTIME', value: '99.9%', icon: TrendingUp, color: 'text-primary' },
              { label: 'DELIVERY', value: 'INSTANT', icon: Zap, color: 'text-yellow-400' },
              { label: 'SECURITY', value: 'MAX', icon: Shield, color: 'text-primary' },
            ].map((stat, i) => (
              <TerminalWindow key={stat.label} title={`stat_${i}`} className="group hover:scale-105 transition-transform">
                <div className="p-4 text-center relative overflow-hidden">
                  <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                  <div className="text-2xl font-bold text-primary terminal-glow-strong">{stat.value}</div>
                  <div className="text-xs text-muted-foreground uppercase">{stat.label}</div>
                  
                  {/* Background data stream */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none overflow-hidden">
                    <RandomDataStream lines={3} />
                  </div>
                </div>
              </TerminalWindow>
            ))}
          </div>

          {/* LIVE SYSTEM STATUS */}
          <TerminalWindow title="system_status" variant="success" className="mb-8">
            <div className="p-4 space-y-3">
              <HackingProgress label="NETWORK_INTEGRITY" progress={100} status="complete" />
              <HackingProgress label="ENCRYPTION_LAYER" progress={100} status="complete" />
              <HackingProgress label="DATABASE_SYNC" progress={100} status="complete" />
              <HackingProgress label="CACHE_WARM" progress={87} status="active" />
            </div>
          </TerminalWindow>

          {/* ANNOUNCEMENTS */}
          <TerminalWindow title="system_updates" className="mb-8">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-primary terminal-glow">SYSTEM_UPDATES://</h2>
                <Badge className="bg-destructive/30 text-destructive border-destructive/30 animate-pulse">LIVE</Badge>
              </div>

              {announcements.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-mono text-sm">NO_ANNOUNCEMENTS</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((announcement) => (
                    <div 
                      key={announcement.id} 
                      className="p-4 rounded border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded bg-background/50 border border-primary/20">
                          {announcement.type === 'restock' && <Package className="w-4 h-4 text-primary" />}
                          {announcement.type === 'update' && <Zap className="w-4 h-4 text-warning" />}
                          {announcement.type === 'promo' && <Sparkles className="w-4 h-4 text-accent-foreground" />}
                          {announcement.type === 'info' && <Bell className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-primary group-hover:terminal-glow transition-all">
                              <GlitchText intensity="low">{announcement.title}</GlitchText>
                            </h3>
                            {announcement.priority >= 5 && (
                              <Badge className="bg-destructive/30 text-destructive text-xs">URGENT</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">{announcement.message}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {new Date(announcement.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TerminalWindow>

          {/* FEATURED PRODUCTS */}
          <TerminalWindow title="featured_products" className="mb-8">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-primary terminal-glow">FEATURED_PRODUCTS://</h2>
                </div>
                <Button variant="ghost" className="text-primary hover:bg-primary/10 text-sm" onClick={() => navigate('/stock')}>
                  View All <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground font-mono">NO_PRODUCTS_AVAILABLE</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div 
                      key={product.id} 
                      className="group cursor-pointer rounded-lg border border-primary/20 bg-card/50 overflow-hidden hover:border-primary/50 hover:shadow-[0_0_30px_hsl(142_100%_50%/0.15)] transition-all"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      {/* Product Image */}
                      <div className="aspect-video bg-gradient-to-br from-primary/10 to-transparent relative overflow-hidden">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-primary/40" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <Badge variant="outline" className={`text-xs uppercase ${getCategoryBadgeClass(product.category)}`}>
                            {product.category}
                          </Badge>
                        </div>
                        
                        {/* Scan effect on hover */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent animate-scan" />
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <h3 className="font-bold text-primary group-hover:terminal-glow transition-all mb-2 truncate">
                          {product.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {product.short_description || 'No description available'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-primary/20 text-primary font-bold rounded terminal-glow">
                            ${product.price}
                          </span>
                          <Button 
                            size="sm" 
                            className="crt-button text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/product/${product.id}`);
                            }}
                          >
                            ACQUIRE
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TerminalWindow>

          {/* CTA */}
          <TerminalWindow title="access_portal" variant="success" className="mb-8">
            <div className="p-8 text-center bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
              <Cpu className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold mb-2">
                <Text3D className="text-primary">READY TO ACCESS?</Text3D>
              </h2>
              <p className="text-muted-foreground text-sm mb-6 max-w-lg mx-auto">
                {'>'} Join the network and unlock premium digital assets with secure, instant delivery.
              </p>
              <Button className="crt-button px-8 py-6 text-lg" onClick={() => navigate('/stock')}>
                <Terminal className="w-5 h-5 mr-2" />
                <GlitchText>ENTER THE CATALOG</GlitchText>
              </Button>
            </div>
          </TerminalWindow>

        </div>
      </div>
    </MainLayout>
  );
}
