import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Users, ShoppingCart, DollarSign, Loader2, Terminal, Bell, CreditCard, Wallet, MessageCircle, Bitcoin, Gift, ArchiveX, Bot } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MainLayout from '@/components/layout/MainLayout';
import ProductManager from '@/components/admin/ProductManager';
import SoldProductsManager from '@/components/admin/SoldProductsManager';
import UserInviteManager from '@/components/admin/UserInviteManager';
import AnnouncementManager from '@/components/admin/AnnouncementManager';
import PaymentSettingsManager from '@/components/admin/PaymentSettingsManager';
import WalletManager from '@/components/admin/WalletManager';
import SupportManager from '@/components/admin/SupportManager';
import ExchangeManager from '@/components/admin/ExchangeManager';
import GiftCardManager from '@/components/admin/GiftCardManager';
import TelegramBotManager from '@/components/admin/TelegramBotManager';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        toast.error('ACCESS_DENIED: Admin clearance required');
        navigate('/');
      } else {
        fetchStats();
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchStats = async () => {
    const [productsRes, ordersRes, usersRes] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('orders').select('id, amount, status'),
      supabase.from('profiles').select('id', { count: 'exact' }),
    ]);

    const completedOrders = ordersRes.data?.filter(o => o.status === 'completed') || [];
    const revenue = completedOrders.reduce((sum, o) => sum + Number(o.amount), 0);

    setStats({
      products: productsRes.count || 0,
      orders: ordersRes.data?.length || 0,
      users: usersRes.count || 0,
      revenue,
    });
    setLoading(false);
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) return null;

  const statCards = [
    { label: 'PRODUCTS', value: stats.products, icon: Package },
    { label: 'ORDERS', value: stats.orders, icon: ShoppingCart },
    { label: 'REVENUE', value: `$${stats.revenue}`, icon: DollarSign },
    { label: 'MEMBERS', value: stats.users, icon: Users },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen relative perspective-container">
        {/* Scanline overlay */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.04] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px]" />

        <div className="container mx-auto px-4 py-6 sm:py-8 relative z-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-primary/20">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-5 h-5 text-primary" />
                <span className="text-xs text-muted-foreground font-mono">
                  hell5tar@admin ~ {format(new Date(), 'HH:mm:ss')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-mono font-bold text-primary terminal-glow float-3d">
                ADMIN_DASHBOARD
              </h1>
              <p className="text-muted-foreground font-mono text-sm mt-1">
                {'>'} System control interface
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            {statCards.map((stat, index) => (
              <div
                key={stat.label}
                className="card-3d panel-3d rounded-lg p-4 sm:p-6 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <span className="text-xs font-mono text-muted-foreground truncate">{stat.label}://</span>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded border border-primary/30 flex items-center justify-center raised flex-shrink-0">
                    <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary/60" />
                  </div>
                </div>
                <div className="text-xl sm:text-3xl font-mono font-bold text-primary terminal-glow">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Tabs for different sections */}
          <Tabs defaultValue="products" className="space-y-6">
            <TabsList className="bg-background/50 border border-primary/20 p-1 w-full overflow-x-auto flex-nowrap">
              <TabsTrigger 
                value="products" 
                className="flex-1 sm:flex-none font-mono text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Package className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">PRODUCTS</span>
                <span className="sm:hidden">PROD</span>
              </TabsTrigger>
              <TabsTrigger 
                value="sold" 
                className="flex-1 sm:flex-none font-mono text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <ArchiveX className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">SOLD</span>
                <span className="sm:hidden">SOLD</span>
              </TabsTrigger>
              <TabsTrigger 
                value="support" 
                className="flex-1 sm:flex-none font-mono text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <MessageCircle className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">SUPPORT</span>
                <span className="sm:hidden">SUP</span>
              </TabsTrigger>
              <TabsTrigger 
                value="exchange" 
                className="flex-1 sm:flex-none font-mono text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Bitcoin className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">EXCHANGE</span>
                <span className="sm:hidden">EXCH</span>
              </TabsTrigger>
              <TabsTrigger 
                value="announcements" 
                className="flex-1 sm:flex-none font-mono text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Bell className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">NEWS</span>
                <span className="sm:hidden">NEWS</span>
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="flex-1 sm:flex-none font-mono text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <CreditCard className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">PAYMENTS</span>
                <span className="sm:hidden">PAY</span>
              </TabsTrigger>
              <TabsTrigger 
                value="wallets" 
                className="flex-1 sm:flex-none font-mono text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Wallet className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">WALLETS</span>
                <span className="sm:hidden">WALL</span>
              </TabsTrigger>
              <TabsTrigger 
                value="giftcards" 
                className="flex-1 sm:flex-none font-mono text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Gift className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">GIFT CARDS</span>
                <span className="sm:hidden">GIFT</span>
              </TabsTrigger>
              <TabsTrigger 
                value="telegram" 
                className="flex-1 sm:flex-none font-mono text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Bot className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">TELEGRAM</span>
                <span className="sm:hidden">BOT</span>
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="flex-1 sm:flex-none font-mono text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Users className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">INVITES</span>
                <span className="sm:hidden">INV</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              <ProductManager />
            </TabsContent>

            <TabsContent value="sold">
              <SoldProductsManager />
            </TabsContent>

            <TabsContent value="support">
              <SupportManager />
            </TabsContent>

            <TabsContent value="exchange">
              <ExchangeManager />
            </TabsContent>

            <TabsContent value="announcements">
              <AnnouncementManager />
            </TabsContent>

            <TabsContent value="payments">
              <PaymentSettingsManager />
            </TabsContent>

            <TabsContent value="wallets">
              <WalletManager />
            </TabsContent>

            <TabsContent value="giftcards">
              <GiftCardManager />
            </TabsContent>

            <TabsContent value="telegram">
              <TelegramBotManager />
            </TabsContent>

            <TabsContent value="users">
              <UserInviteManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
