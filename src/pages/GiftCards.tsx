import { useState, useEffect } from 'react';
import { Gift, Wallet, Clock, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';
import RedeemGiftCard from '@/components/wallet/RedeemGiftCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface GiftCard {
  id: string;
  code: string;
  name?: string | null;
  description?: string | null;
  balance: number;
  initial_balance: number;
  status: string;
  pass2u_pass_id: string | null;
  expires_at: string | null;
  claimed_at: string | null;
}

export default function GiftCards() {
  const { user } = useAuth();
  const [myCards, setMyCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyCards();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchMyCards = async () => {
    const { data, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('claimed_by', user?.id)
      .order('claimed_at', { ascending: false });

    if (error) {
      console.error('Error fetching gift cards:', error);
    } else {
      setMyCards(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'claimed':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Redeemed</Badge>;
      case 'depleted':
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Used</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen relative">
        {/* Scanline overlay */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px] z-10" />

        <div className="container mx-auto px-4 py-6 sm:py-8 relative z-20">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                <h1 className="text-2xl sm:text-3xl font-mono font-bold text-primary terminal-glow">
                  GIFT_CARDS://
                </h1>
              </div>
              <p className="text-muted-foreground font-mono text-sm mt-2">
                Redeem gift cards to add funds to your wallet
              </p>
            </div>
            
            <RedeemGiftCard onSuccess={fetchMyCards} />
          </div>

          {/* Redeem Card Section */}
          <div className="panel-3d rounded-lg p-6 sm:p-8 mb-8 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <Gift className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-mono font-bold text-primary mb-2">Have a Gift Card?</h2>
                <p className="text-muted-foreground font-mono text-sm mb-4">
                  Enter your code to instantly add funds to your wallet. Gift cards can be used for any purchase on the site.
                </p>
                <RedeemGiftCard onSuccess={fetchMyCards} />
              </div>
            </div>
          </div>

          {/* My Redeemed Cards */}
          <div>
            <h2 className="text-lg font-mono font-bold text-primary mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              My Redeemed Cards
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : !user ? (
              <div className="panel-3d rounded-lg p-8 text-center">
                <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-mono mb-4">
                  Sign in to view your redeemed gift cards
                </p>
                <Button
                  onClick={() => window.location.href = '/auth'}
                  className="crt-button font-mono"
                >
                  Sign In
                </Button>
              </div>
            ) : myCards.length === 0 ? (
              <div className="panel-3d rounded-lg p-8 text-center">
                <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-mono">
                  No gift cards redeemed yet
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {myCards.map((card) => (
                  <div
                    key={card.id}
                    className="panel-3d rounded-lg p-4 hover:border-primary/50 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="space-y-1">
                            <p className="text-sm font-mono text-primary/90">{card.name || 'Gift Card'}</p>
                            <code className="text-lg font-mono font-bold text-primary terminal-glow">
                              {card.code}
                            </code>
                            <p className="text-xs text-muted-foreground">{card.description || 'Digital balance card redeemable in wallet.'}</p>
                          </div>
                          {getStatusBadge(card.status)}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground font-mono">
                          <span className="flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            ${card.initial_balance.toFixed(2)} redeemed
                          </span>
                          {card.claimed_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(card.claimed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {card.pass2u_pass_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-mono border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => window.open(`https://www.pass2u.net/d/${card.pass2u_pass_id}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Pass
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="mt-8 panel-3d rounded-lg p-6">
            <h3 className="text-sm font-mono font-bold text-primary mb-3">How Gift Cards Work</h3>
            <ul className="space-y-2 text-sm text-muted-foreground font-mono">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Enter your gift card code to redeem it instantly
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Funds are added directly to your wallet balance
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Use your wallet balance for any purchase on the site
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Some gift cards include a digital wallet pass for Apple/Google Wallet
              </li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}