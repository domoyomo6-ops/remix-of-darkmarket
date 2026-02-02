import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, ShoppingCart, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
interface Product {
  id: string;
  title: string;
  description: string | null;
  short_description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  file_url: string | null;
}
export default function ProductDetail() {
  const {
    id
  } = useParams();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  useEffect(() => {
    if (id) {
      fetchProduct();
      if (user) {
        checkPurchaseStatus();
      }
    }
  }, [id, user]);
  const fetchProduct = async () => {
    const {
      data,
      error
    } = await supabase.from('products').select('*').eq('id', id).eq('is_active', true).maybeSingle();
    if (error || !data) {
      toast.error('Product not found');
      navigate('/');
      return;
    }
    setProduct(data);
    setLoading(false);
  };
  const checkPurchaseStatus = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from('orders').select('id').eq('user_id', user.id).eq('product_id', id).eq('status', 'completed').maybeSingle();
    setHasPurchased(!!data);
  };
  const handlePurchase = async () => {
    if (!user) {
      toast.error('Please sign in to purchase');
      navigate('/auth');
      return;
    }
    if (!product) return;
    setPurchasing(true);

    // Use secure RPC function - price is validated server-side
    const {
      data,
      error
    } = await supabase.rpc('create_order', {
      p_product_id: product.id,
      p_customer_email: user.email!
    });
    if (error) {
      toast.error('Failed to process order');
    } else {
      const result = data as {
        success: boolean;
        error?: string;
        product_title?: string;
      };
      if (result.success) {
        toast.success('Purchase successful!');
        setHasPurchased(true);
      } else {
        toast.error(result.error || 'Failed to process order');
      }
    }
    setPurchasing(false);
  };
  const handleDownload = async () => {
    if (!product) return;

    // Use secure RPC function to get download URL with server-side verification
    const {
      data,
      error
    } = await supabase.rpc('get_product_download_url', {
      p_product_id: product.id
    });
    if (error) {
      toast.error('Failed to get download link');
      return;
    }
    const result = data as {
      success: boolean;
      url?: string;
      error?: string;
    };
    if (result.success && result.url) {
      window.open(result.url, '_blank');
    } else {
      toast.error(result.error || 'Download not available');
    }
  };
  const categoryColors: Record<string, string> = {
    software: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    courses: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    templates: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    assets: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
  };
  if (loading) {
    return <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="relative">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <div className="absolute inset-0 blur-xl bg-emerald-500/20 animate-pulse" />
          </div>
        </div>
      </MainLayout>;
  }
  if (!product) {
    return null;
  }
  return <MainLayout>
      <div className="relative min-h-screen">
        {/* Darknet ambient background */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />
          <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,100,0.03) 2px, rgba(0,255,100,0.03) 4px)`
        }} />
          {/* Subtle grid */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `linear-gradient(rgba(0,255,100,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,100,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
        </div>

        <div className="container mx-auto px-4 py-8 relative z-10">
          {/* Terminal-style back button */}
          <button onClick={() => navigate(-1)} className="mb-6 text-emerald-500/60 hover:text-emerald-400 transition-colors font-mono text-sm flex items-center gap-2 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="opacity-60">[</span> cd .. <span className="opacity-60">]</span>
          </button>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Product Image with darknet frame */}
            <div className="relative group">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/20 via-transparent to-cyan-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 mr-0 pr-0 pl-0 ml-0 mt-0 mb-[199px]" />
              <div className="relative rounded-lg overflow-hidden border border-emerald-500/10 bg-black/50 backdrop-blur-sm">
                {/* Scanline overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-10 z-10" style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)`
              }} />
                {product.image_url ? <img src={product.image_url} alt={product.title} className="w-full aspect-video object-cover opacity-90 group-hover:opacity-100 transition-opacity" /> : <div className="w-full aspect-video flex items-center justify-center bg-zinc-950">
                    <Package className="w-20 h-20 text-emerald-500/30" />
                  </div>}
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-emerald-500/30" />
                <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-emerald-500/30" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-emerald-500/30" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-emerald-500/30" />
              </div>
            </div>

            {/* Product Info - Terminal style */}
            <div className="space-y-6">
              <div>
                {/* Category badge */}
                <div className="mb-4 inline-flex items-center gap-2">
                  <span className="text-emerald-500/40 font-mono text-xs">TYPE://</span>
                  <Badge variant="outline" className={`uppercase font-mono text-[10px] tracking-wider ${categoryColors[product.category] || ''}`}>
                    {product.category}
                  </Badge>
                </div>

                {/* Title with glitch potential */}
                <h1 className="text-3xl md:text-4xl font-mono font-bold text-emerald-50 mb-4 tracking-tight">
                  <span className="text-emerald-500/60">&gt;</span> {product.title}
                </h1>

                {product.short_description && <p className="text-zinc-400 font-mono text-sm leading-relaxed border-l-2 border-emerald-500/20 pl-4">
                    {product.short_description}
                  </p>}
              </div>

              {/* Price display */}
              <div className="flex items-baseline gap-3 py-4 border-y border-emerald-500/10">
                <span className="text-emerald-500/50 font-mono text-sm">PRICE:</span>
                <span className="text-4xl font-mono font-bold text-emerald-400" style={{
                textShadow: '0 0 20px rgba(16,185,129,0.3)'
              }}>
                  ${product.price}
                </span>
                <span className="text-zinc-600 font-mono text-xs uppercase tracking-wider">/ one-time</span>
              </div>

              {/* Action buttons */}
              {hasPurchased ? <div className="space-y-4">
                  <div className="p-4 rounded border border-emerald-500/20 bg-emerald-500/5 font-mono">
                    <p className="text-emerald-400 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      ACCESS GRANTED — ASSET UNLOCKED
                    </p>
                  </div>
                  <button onClick={handleDownload} className="w-full py-4 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-sm uppercase tracking-wider hover:bg-emerald-500/20 hover:border-emerald-500/60 transition-all flex items-center justify-center gap-2 group">
                    <Download className="w-5 h-5 group-hover:animate-bounce" />
                    [ DOWNLOAD ASSET ]
                  </button>
                </div> : <button onClick={handlePurchase} disabled={purchasing} className="w-full py-4 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-mono text-sm uppercase tracking-wider hover:bg-emerald-500/20 hover:border-emerald-500/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" style={{
              boxShadow: '0 0 30px rgba(16,185,129,0.1)'
            }}>
                  {purchasing ? <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      PROCESSING TRANSACTION...
                    </> : <>
                      <ShoppingCart className="w-5 h-5" />
                      [ ACQUIRE ACCESS ]
                    </>}
                </button>}

              {/* Description section */}
              {product.description && <div className="pt-6 border-t border-emerald-500/10">
                  <h2 className="text-sm font-mono text-emerald-500/60 uppercase tracking-wider mb-4">
                    // INTEL
                  </h2>
                  <div className="font-mono text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap bg-zinc-950/50 p-4 rounded border border-zinc-800/50">
                    {product.description}
                  </div>
                </div>}

              {/* Subtle footer info */}
              <div className="pt-4 text-[10px] font-mono text-zinc-700 uppercase tracking-widest">
                <span className="text-emerald-500/30">ID:</span> {product.id.slice(0, 8)}...
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>;
}