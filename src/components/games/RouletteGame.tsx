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

interface RouletteGameProps {
  session: GameSession;
  onEnd: () => void;
}

type BetType = 'red' | 'black' | 'green' | 'odd' | 'even' | 'low' | 'high';

const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

function getColor(num: number): 'red' | 'black' | 'green' {
  if (num === 0) return 'green';
  return redNumbers.includes(num) ? 'red' : 'black';
}

export default function RouletteGame({ session, onEnd }: RouletteGameProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bet, setBet] = useState<BetType | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null);
  const [rotation, setRotation] = useState(0);

  const placeBet = (betType: BetType) => {
    if (!spinning) setBet(betType);
  };

  const spin = async () => {
    if (!bet) return;
    setSpinning(true);
    setOutcome(null);
    setResult(null);

    // Spin animation
    const spins = 5 + Math.random() * 3;
    const targetRotation = rotation + spins * 360;
    setRotation(targetRotation);

    await new Promise(r => setTimeout(r, 3000));

    // Get result
    const num = Math.floor(Math.random() * 37); // 0-36
    const color = getColor(num);
    setResult(num);
    setSpinning(false);

    // Check win
    let won = false;
    switch (bet) {
      case 'red': won = color === 'red'; break;
      case 'black': won = color === 'black'; break;
      case 'green': won = num === 0; break;
      case 'odd': won = num !== 0 && num % 2 === 1; break;
      case 'even': won = num !== 0 && num % 2 === 0; break;
      case 'low': won = num >= 1 && num <= 18; break;
      case 'high': won = num >= 19 && num <= 36; break;
    }

    setOutcome(won ? 'win' : 'lose');

    // Resolve game
    try {
      const multiplier = bet === 'green' ? 35 : 2;
      await supabase.rpc('resolve_game', {
        p_game_id: session.id,
        p_winner_id: won ? user?.id : null,
        p_game_data: { number: num, color, bet, won }
      });

      toast({
        title: won ? '🎉 You Win!' : '😔 You Lose',
        description: won 
          ? `${num} ${color}! You won $${(session.wager_amount * multiplier).toFixed(2)}!`
          : `${num} ${color}. Better luck next time!`,
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const resultColor = result !== null ? getColor(result) : null;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle>🎰 Roulette</CardTitle>
        <p className="text-lg font-mono text-primary">Wager: ${session.wager_amount.toFixed(2)}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Wheel */}
        <div className="relative w-48 h-48 mx-auto">
          <div 
            className="w-full h-full rounded-full border-8 border-primary/30 bg-gradient-to-br from-red-600 via-black to-green-600 transition-transform duration-[3s] ease-out"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-background border-4 border-primary flex items-center justify-center">
              {result !== null ? (
                <span className={`text-2xl font-bold ${resultColor === 'red' ? 'text-red-500' : resultColor === 'green' ? 'text-green-500' : 'text-foreground'}`}>
                  {result}
                </span>
              ) : (
                <span className="text-2xl">🎯</span>
              )}
            </div>
          </div>
        </div>

        {/* Betting Options */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={bet === 'red' ? 'default' : 'outline'}
            className={`${bet === 'red' ? 'bg-red-600' : 'border-red-600 text-red-600 hover:bg-red-600/10'}`}
            onClick={() => placeBet('red')}
            disabled={spinning}
          >
            Red (2x)
          </Button>
          <Button
            variant={bet === 'black' ? 'default' : 'outline'}
            className={`${bet === 'black' ? 'bg-gray-800' : 'border-gray-600'}`}
            onClick={() => placeBet('black')}
            disabled={spinning}
          >
            Black (2x)
          </Button>
          <Button
            variant={bet === 'green' ? 'default' : 'outline'}
            className={`${bet === 'green' ? 'bg-green-600' : 'border-green-600 text-green-600 hover:bg-green-600/10'}`}
            onClick={() => placeBet('green')}
            disabled={spinning}
          >
            0 (35x)
          </Button>
          <Button
            variant={bet === 'odd' ? 'default' : 'outline'}
            onClick={() => placeBet('odd')}
            disabled={spinning}
          >
            Odd (2x)
          </Button>
          <Button
            variant={bet === 'even' ? 'default' : 'outline'}
            onClick={() => placeBet('even')}
            disabled={spinning}
          >
            Even (2x)
          </Button>
          <Button
            variant={bet === 'low' ? 'default' : 'outline'}
            onClick={() => placeBet('low')}
            disabled={spinning}
          >
            1-18 (2x)
          </Button>
          <Button
            variant={bet === 'high' ? 'default' : 'outline'}
            onClick={() => placeBet('high')}
            disabled={spinning}
            className="col-span-3"
          >
            19-36 (2x)
          </Button>
        </div>

        {/* Result */}
        {outcome && (
          <div className={`text-center p-4 rounded-lg ${outcome === 'win' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
            <p className="text-xl font-bold">
              {outcome === 'win' ? '🎉 YOU WIN!' : '😔 YOU LOSE'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!outcome ? (
            <Button className="flex-1" onClick={spin} disabled={!bet || spinning}>
              {spinning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {spinning ? 'Spinning...' : bet ? `Spin (${bet})` : 'Select a bet'}
            </Button>
          ) : (
            <>
              <Button className="flex-1" onClick={() => { setOutcome(null); setResult(null); setBet(null); }}>
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
