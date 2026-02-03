import { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Zap, Package, ArrowRight, Bell, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
const Scene3D = lazy(() => import('@/components/Scene3D'));
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
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    fetchProducts();
    fetchAnnouncements();
  }, []);
  const fetchProducts = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from('products').select('id, title, short_description, price, category, image_url, created_at').eq('is_active', true).order('created_at', {
      ascending: false
    }).limit(6);
    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };
  const fetchAnnouncements = async () => {
    const {
      data,
      error
    } = await supabase.from('announcements').select('*').eq('is_active', true).order('priority', {
      ascending: false
    }).order('created_at', {
      ascending: false
    }).limit(5);
    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements(data || []);
    }
  };
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'software':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'courses':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'templates':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'assets':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-primary/20 text-primary border-primary/30';
    }
  };
  const getPriorityClass = (priority: number) => {
    return priority >= 5 ? 'border-red-500/50 bg-red-500/10' : 'border-primary/30 bg-primary/5';
  };
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'restock':
        return <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />;
      case 'update':
        return <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />;
      case 'promo':
        return <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />;
      default:
        return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />;
    }
  };
  return <MainLayout>
      {/* 3D Background */}
      <div className="fixed inset-0 -z-10">
        <Suspense fallback={null}>
          <Scene3D />
        </Suspense>
      </div>

      <div className="min-h-screen relative">
        {/* Scanline overlay */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px] z-10" />
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top,#0f172a,transparent_55%),radial-gradient(circle_at_center,#0f172a,transparent_35%),radial-gradient(circle_at_bottom,#02030a,transparent_60%)] opacity-80" />
        <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[#05060b]/40 via-transparent to-[#02030a]/80" />

        <div className="container mx-auto px-4 py-6 sm:py-8 relative z-20 border-dotted">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 border border-primary/30 mb-4 sm:mb-6">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs font-mono text-primary uppercase tracking-wider">System Online</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-mono font-bold text-primary terminal-glow mb-3 sm:mb-4 px-2">
              HELL5TAR_NETWORK://
            </h1>
            <p className="text-muted-foreground font-mono text-sm sm:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
              Premium digital assets • Secure transactions • Instant delivery
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Button className="crt-button px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-mono group w-full sm:w-auto" onClick={() => navigate('/stock')}>
                <Terminal className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                BROWSE CATALOG
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" className="px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-mono border-primary/50 text-primary hover:bg-primary/10 w-full sm:w-auto" onClick={() => navigate('/orders')}>
                VIEW MY ORDERS
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-12">
            {[{
            label: 'PRODUCTS',
            value: products.length.toString(),
            icon: Package
          }, {
            label: 'UPTIME',
            value: '99.9%',
            icon: TrendingUp
          }, {
            label: 'DELIVERY',
            value: 'INSTANT',
            icon: Zap
          }, {
            label: 'SECURITY',
            value: 'MAX',
            icon: Terminal
          }].map(stat => <div key={stat.label} className="panel-3d rounded-lg p-3 sm:p-4 text-center">
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-1.5 sm:mb-2" />
                <div className="text-lg sm:text-2xl font-mono font-bold text-primary terminal-glow">{stat.value}</div>
                <div className="text-xs font-mono text-muted-foreground uppercase">{stat.label}</div>
              </div>)}
          </div>

          {/* Announcements Section */}
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              <h2 className="text-lg sm:text-xl font-mono font-bold text-primary terminal-glow">
                SYSTEM_UPDATES://
              </h2>
              <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 font-mono text-xs animate-pulse">
                NEW
              </Badge>
            </div>

            {announcements.length === 0 ? <div className="panel-3d rounded-lg p-6 sm:p-8 text-center">
                <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground mx-auto mb-2 sm:mb-3" />
                <p className="text-muted-foreground font-mono text-xs sm:text-sm">NO_ANNOUNCEMENTS</p>
              </div> : <div className="grid gap-3 sm:gap-4">
                {announcements.map(announcement => <div key={announcement.id} className={`panel-3d rounded-lg p-4 sm:p-5 border-l-4 ${getPriorityClass(announcement.priority)} hover:bg-primary/5 transition-colors cursor-pointer`}>
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-background/50 border border-primary/20 flex-shrink-0">
                        {getTypeIcon(announcement.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-mono font-bold text-primary text-sm sm:text-base truncate">{announcement.title}</h3>
                          {announcement.priority >= 5 && <Badge className="bg-red-500/30 text-red-400 border-0 text-xs font-mono flex-shrink-0">
                              URGENT
                            </Badge>}
                        </div>
                        <p className="text-muted-foreground font-mono text-xs sm:text-sm mb-2 line-clamp-2">
                          {announcement.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>)}
              </div>}
          </div>

          {/* Featured Products Section */}
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <h2 className="text-lg sm:text-xl font-mono font-bold text-primary terminal-glow">
                  FEATURED_PRODUCTS://
                </h2>
              </div>
              <Button variant="ghost" className="font-mono text-primary hover:bg-primary/10 text-xs sm:text-sm px-2 sm:px-4" onClick={() => navigate('/stock')}>
                View All <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
              </Button>
            </div>

            {loading ? <div className="flex items-center justify-center py-8 sm:py-12">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div> : products.length === 0 ? <div className="panel-3d rounded-lg p-8 sm:p-12 text-center">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                <p className="text-muted-foreground font-mono text-sm">NO_PRODUCTS_AVAILABLE</p>
              </div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {products.map(product => <div key={product.id} className="panel-3d rounded-lg overflow-hidden group cursor-pointer hover:border-primary/50 transition-all" onClick={() => navigate(`/product/${product.id}`)}>
                    {/* Product Image */}
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-transparent relative overflow-hidden">
                      {product.image_url ? <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 sm:w-12 sm:h-12 text-primary/40" />
                        </div>}
                      <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                        <Badge variant="outline" className={`text-xs font-mono uppercase ${getCategoryBadgeClass(product.category)}`}>
                          {product.category}
                        </Badge>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-3 sm:p-4">
                      <h3 className="font-mono font-bold text-primary group-hover:terminal-glow transition-all mb-1.5 sm:mb-2 truncate text-sm sm:text-base">
                        {product.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground font-mono mb-3 sm:mb-4 line-clamp-2">
                        {product.short_description || 'No description available'}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="px-2 sm:px-3 py-1 bg-primary/20 text-primary font-mono font-bold rounded terminal-glow text-sm sm:text-base">
                          ${product.price}
                        </span>
                        <Button size="sm" className="crt-button font-mono text-xs" onClick={e => {
                    e.stopPropagation();
                    navigate(`/product/${product.id}`);
                  }}>
                          ACQUIRE
                        </Button>
                      </div>
                    </div>
                  </div>)}
              </div>}
          </div>

          {/* Call to Action */}
          <div className="panel-3d rounded-lg p-6 sm:p-8 text-center bg-gradient-to-r from-primary/10 via-transparent to-primary/10">
            <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-primary mx-auto mb-3 sm:mb-4 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-mono font-bold text-primary terminal-glow mb-2">
              READY TO ACCESS?
            </h2>
            <p className="text-muted-foreground font-mono text-sm mb-4 sm:mb-6 max-w-lg mx-auto px-4">
              Join the network and unlock premium digital assets with secure, instant delivery.
            </p>
            <Button className="crt-button px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-mono w-full sm:w-auto" onClick={() => navigate('/stock')}>
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              ENTER THE CATALOG
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>;
}
