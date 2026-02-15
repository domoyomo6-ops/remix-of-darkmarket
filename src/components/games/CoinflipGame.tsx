import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface GameSession {
  id: string;
  wager_amount: number;
}

interface CoinflipGameProps {
  session: GameSession;
  onEnd: () => void;
}

export default function CoinflipGame({ session, onEnd }: CoinflipGameProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [choice, setChoice] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null);
  const [flipCount, setFlipCount] = useState(0);

  const flip = async () => {
    if (!choice) return;
    setFlipping(true);
    setOutcome(null);
    setResult(null);

    // Animate
    setFlipCount(prev => prev + 10);
    await new Promise(r => setTimeout(r, 2000));

    const flipResult: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
    setResult(flipResult);
    setFlipping(false);

    const won = flipResult === choice;
    setOutcome(won ? 'win' : 'lose');
    const payoutMultiplier = won ? 1.5 : 0;

    try {
      await supabase.rpc('resolve_game', {
        p_game_id: session.id,
        p_winner_id: won ? user?.id : null,
        p_game_data: { choice, result: flipResult, won, payout_multiplier: payoutMultiplier }
      });

      toast({
        title: won ? '🎉 You Win!' : '😔 You Lose',
        description: won 
          ? `It was ${flipResult}! You won $${(session.wager_amount * 1.5).toFixed(2)}!`
          : `It was ${flipResult}. Better luck next time!`,
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>🪙 Coinflip</CardTitle>
        <p className="text-sm text-muted-foreground">Call it in the air!</p>
        <p className="text-lg font-mono text-primary">Wager: ${session.wager_amount.toFixed(2)}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Coin */}
        <div className="flex justify-center perspective-1000">
          <div 
            className={`w-32 h-32 rounded-full relative transition-transform duration-[2s] ${flipping ? '' : ''}`}
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateY(${flipping ? flipCount * 360 : result === 'tails' ? 180 : 0}deg)`,
              transition: flipping ? 'transform 2s ease-out' : 'transform 0.5s ease-out',
            }}
          >
            {/* Heads */}
            <div 
              className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-4 border-yellow-300 flex items-center justify-center backface-hidden"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="text-4xl">👑</span>
            </div>
            {/* Tails */}
            <div 
              className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-700 border-4 border-yellow-400 flex items-center justify-center"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <span className="text-4xl">🦅</span>
            </div>
          </div>
        </div>

        {/* Choice */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant={choice === 'heads' ? 'default' : 'outline'}
            size="lg"
            onClick={() => !flipping && !outcome && setChoice('heads')}
            disabled={flipping || !!outcome}
            className="h-16"
          >
            <span className="text-2xl mr-2">👑</span> Heads
          </Button>
          <Button
            variant={choice === 'tails' ? 'default' : 'outline'}
            size="lg"
            onClick={() => !flipping && !outcome && setChoice('tails')}
            disabled={flipping || !!outcome}
            className="h-16"
          >
            <span className="text-2xl mr-2">🦅</span> Tails
          </Button>
        </div>

        {/* Result */}
        {outcome && (
          <div className={`text-center p-4 rounded-lg ${outcome === 'win' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            <p className="text-xl font-bold">
              {outcome === 'win' ? '🎉 YOU WIN!' : '😔 YOU LOSE'}
            </p>
            <p className="text-sm mt-1">It was {result}!</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!outcome ? (
            <Button className="flex-1" onClick={flip} disabled={!choice || flipping}>
              {flipping ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {flipping ? 'Flipping...' : 'Flip Coin'}
            </Button>
          ) : (
            <>
              <Button className="flex-1" onClick={() => { setOutcome(null); setResult(null); setChoice(null); }}>
                Play Again
              </Button>
              <Button variant="outline" onClick={onEnd}>Exit</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
