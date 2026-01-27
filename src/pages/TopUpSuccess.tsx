import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function TopUpSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(true);
  const amount = searchParams.get('amount');

  useEffect(() => {
    const processTopUp = async () => {
      if (!user || !amount) {
        setProcessing(false);
        return;
      }

      // The webhook will handle adding the balance
      // Just wait a moment for it to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`$${amount} added to your wallet!`);
      setProcessing(false);
    };

    processTopUp();
  }, [user, amount]);

  return (
    <MainLayout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center p-8 panel-3d rounded-lg max-w-md mx-auto">
          {processing ? (
            <>
              <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-mono font-bold text-primary terminal-glow mb-2">
                PROCESSING...
              </h1>
              <p className="text-muted-foreground font-mono">
                Adding funds to your wallet
              </p>
            </>
          ) : (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-mono font-bold text-primary terminal-glow mb-2">
                TOP-UP COMPLETE!
              </h1>
              <p className="text-muted-foreground font-mono mb-6">
                ${amount || '0'} has been added to your wallet
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="font-mono"
                >
                  [ BROWSE ]
                </Button>
                <Button
                  className="crt-button"
                  onClick={() => navigate('/orders')}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  [ VIEW ORDERS ]
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
