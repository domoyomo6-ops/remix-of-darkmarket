import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Download, Loader2, ShoppingBag, Terminal, FileCode, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Order {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  products: {
    id: string;
    title: string;
    category: string;
    image_url: string | null;
    file_url: string | null;
  } | null;
}

export default function Orders() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchOrders();
    }
  }, [user, authLoading, navigate]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        amount,
        status,
        created_at,
        products (
          id,
          title,
          category,
          image_url,
          file_url
        )
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const handleDownload = async (productId: string) => {
    setDownloading(productId);
    try {
      const { data, error } = await supabase.rpc('get_product_download_url', {
        p_product_id: productId
      });

      const result = data as { success?: boolean; url?: string; error?: string } | null;

      if (error || !result?.success) {
        toast.error(result?.error || 'Failed to get download link');
        return;
      }

      if (result.url) {
        window.open(result.url, '_blank');
        toast.success('Download initiated');
      }
    } catch (err) {
      toast.error('Download failed');
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-primary', bg: 'bg-primary/10 border-primary/30' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
      case 'refunded':
        return { icon: RefreshCw, color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
      default:
        return { icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted/10 border-muted/30' };
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <span className="text-xs font-mono text-muted-foreground">LOADING TRANSACTIONS...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen relative">
        {/* Scanline Overlay */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px] z-10" />

        <div className="container mx-auto px-4 py-6 sm:py-8 relative z-20">
          {/* Terminal Header */}
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-primary/10 border border-primary/20 mb-4">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono text-primary">
                root@hell5tar:~/orders$ ls -la
              </span>
              <span className="w-2 h-4 bg-primary animate-pulse" />
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-primary terminal-glow mb-2">
              TRANSACTION_LOG://
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-mono">
              {orders.length} record(s) found • Last sync: {format(new Date(), 'HH:mm:ss')}
            </p>
          </div>

          {/* Empty State */}
          {orders.length === 0 ? (
            <div className="panel-3d rounded-lg p-8 sm:p-16 text-center border-dashed border-2 border-primary/20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-primary/60" />
              </div>
              <pre className="text-xs sm:text-sm font-mono text-muted-foreground mb-4">
{`> query transactions
> result: EMPTY
> status: NO_RECORDS_FOUND`}
              </pre>
              <Button onClick={() => navigate('/stock')} className="crt-button font-mono">
                <Package className="w-4 h-4 mr-2" />
                BROWSE STOCK
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table Header - Desktop Only */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-mono text-muted-foreground uppercase tracking-wider border-b border-primary/20">
                <div className="col-span-5">PRODUCT</div>
                <div className="col-span-2">STATUS</div>
                <div className="col-span-2">AMOUNT</div>
                <div className="col-span-2">DATE</div>
                <div className="col-span-1">ACTION</div>
              </div>

              {orders.map((order, index) => {
                const statusConfig = getStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <div
                    key={order.id}
                    className="panel-3d rounded-lg overflow-hidden hover:border-primary/40 transition-all group"
                  >
                    {/* Row indicator */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/60 via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="p-3 sm:p-4">
                      {/* Mobile Layout */}
                      <div className="md:hidden space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded bg-background/80 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {order.products?.image_url ? (
                              <img
                                src={order.products.image_url}
                                alt={order.products.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileCode className="w-5 h-5 text-primary/40" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm text-primary font-semibold truncate">
                              {order.products?.title || `TXN-${order.id.slice(0, 8).toUpperCase()}`}
                            </p>
                            <p className="text-xs font-mono text-muted-foreground">
                              {format(new Date(order.created_at), 'MMM d, yyyy • HH:mm')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`text-xs font-mono ${statusConfig.bg} ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {order.status.toUpperCase()}
                            </Badge>
                            <span className="font-mono font-bold text-primary text-sm">
                              ${order.amount.toFixed(2)}
                            </span>
                          </div>
                          
                          {order.status === 'completed' && order.products && (
                            <Button
                              size="sm"
                              className="crt-button font-mono text-xs"
                              onClick={() => handleDownload(order.products!.id)}
                              disabled={downloading === order.products.id}
                            >
                              {downloading === order.products.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Download className="w-3 h-3 mr-1" />
                                  GET
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-5 flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-background/80 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {order.products?.image_url ? (
                              <img
                                src={order.products.image_url}
                                alt={order.products.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileCode className="w-4 h-4 text-primary/40" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-mono text-sm text-primary font-semibold truncate">
                              {order.products?.title || `Transaction #${order.id.slice(0, 8).toUpperCase()}`}
                            </p>
                            {order.products?.category && (
                              <p className="text-xs font-mono text-muted-foreground capitalize">
                                {order.products.category}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="col-span-2">
                          <Badge variant="outline" className={`text-xs font-mono ${statusConfig.bg} ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {order.status.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="col-span-2">
                          <span className="font-mono font-bold text-primary">
                            ${order.amount.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="col-span-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {format(new Date(order.created_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                        
                        <div className="col-span-1">
                          {order.status === 'completed' && order.products ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs w-full"
                              onClick={() => handleDownload(order.products!.id)}
                              disabled={downloading === order.products.id}
                            >
                              {downloading === order.products.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                            </Button>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Footer Stats */}
              <div className="mt-6 pt-4 border-t border-primary/20">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="panel-3d rounded-lg p-3 text-center">
                    <div className="text-xl font-mono font-bold text-primary">{orders.length}</div>
                    <div className="text-xs font-mono text-muted-foreground">TOTAL</div>
                  </div>
                  <div className="panel-3d rounded-lg p-3 text-center">
                    <div className="text-xl font-mono font-bold text-primary">
                      {orders.filter(o => o.status === 'completed').length}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">COMPLETED</div>
                  </div>
                  <div className="panel-3d rounded-lg p-3 text-center">
                    <div className="text-xl font-mono font-bold text-yellow-400">
                      {orders.filter(o => o.status === 'pending').length}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">PENDING</div>
                  </div>
                  <div className="panel-3d rounded-lg p-3 text-center">
                    <div className="text-xl font-mono font-bold text-primary">
                      ${orders.reduce((sum, o) => sum + (o.status === 'completed' ? o.amount : 0), 0).toFixed(2)}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground">SPENT</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}