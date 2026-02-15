import { useState, useEffect } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface GameSession {
  id: string;
  game_type: string;
  lobby_type: string;
  wager_amount: number;
  host_id: string;
}

interface DiceGameProps {
  session: GameSession;
  onEnd: () => void;
}

const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

export default function DiceGame({ session, onEnd }: DiceGameProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rolling, setRolling] = useState(false);
  const [playerRoll, setPlayerRoll] = useState<number | null>(null);
  const [houseRoll, setHouseRoll] = useState<number | null>(null);
  const [result, setResult] = useState<'win' | 'lose' | 'tie' | null>(null);
  const [animatingDice, setAnimatingDice] = useState<number>(1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (rolling) {
      interval = setInterval(() => {
        setAnimatingDice(Math.floor(Math.random() * 6) + 1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [rolling]);

  const rollDice = async () => {
    setRolling(true);
    setResult(null);
    setPlayerRoll(null);
    setHouseRoll(null);

    // Animate for 2 seconds
    await new Promise(r => setTimeout(r, 2000));

    const pRoll = Math.floor(Math.random() * 6) + 1;
    const hRoll = Math.floor(Math.random() * 6) + 1;

    setPlayerRoll(pRoll);
    setHouseRoll(hRoll);
    setRolling(false);

    let gameResult: 'win' | 'lose' | 'tie';
    if (pRoll > hRoll) {
      gameResult = 'win';
    } else if (pRoll < hRoll) {
      gameResult = 'lose';
    } else {
      gameResult = 'tie';
    }
    setResult(gameResult);

    // Resolve game
    try {
      const payoutMultiplier = gameResult === 'win' ? 1.5 : 1;
      const winnerId = gameResult === 'lose' ? null : user?.id;
      const { error } = await supabase.rpc('resolve_game', {
        p_game_id: session.id,
        p_winner_id: winnerId,
        p_game_data: {
          player_roll: pRoll,
          house_roll: hRoll,
          result: gameResult,
          payout_multiplier: payoutMultiplier,
          return_wager: gameResult === 'tie',
        }
      });

      if (error) throw error;

      toast({
        title: gameResult === 'win' ? '🎉 You Win!' : gameResult === 'lose' ? '😔 House Wins' : '🤝 Tie!',
        description: gameResult === 'win' 
          ? `You won $${(session.wager_amount * 1.5).toFixed(2)}!` 
          : gameResult === 'lose'
          ? 'Better luck next time!'
          : 'Your wager was returned.',
      });
    } catch (error: any) {
      console.error('Error resolving game:', error);
    }
  };

  const DiceIcon = diceIcons[(rolling ? animatingDice : (playerRoll || 1)) - 1];
  const HouseDiceIcon = diceIcons[(houseRoll || 1) - 1];

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          🎲 Dice Game
        </CardTitle>
        <p className="text-sm text-muted-foreground">Roll higher than the house to win!</p>
        <p className="text-lg font-mono text-primary">Wager: ${session.wager_amount.toFixed(2)}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-8">
          {/* Player */}
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">You</p>
            <div className={`flex justify-center ${rolling ? 'animate-bounce' : ''}`}>
              <DiceIcon className={`w-20 h-20 ${result === 'win' ? 'text-green-500' : result === 'lose' ? 'text-red-500' : 'text-primary'}`} />
            </div>
            {playerRoll && <p className="text-2xl font-bold">{playerRoll}</p>}
          </div>

          {/* House */}
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">House</p>
            <div className="flex justify-center">
              <HouseDiceIcon className={`w-20 h-20 ${result === 'lose' ? 'text-green-500' : result === 'win' ? 'text-red-500' : 'text-muted-foreground'}`} />
            </div>
            {houseRoll && <p className="text-2xl font-bold">{houseRoll}</p>}
          </div>
        </div>

        {result && (
          <div className={`text-center p-4 rounded-lg ${result === 'win' ? 'bg-green-500/20 text-green-500' : result === 'lose' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
            <p className="text-xl font-bold">
              {result === 'win' ? '🎉 YOU WIN!' : result === 'lose' ? '😔 HOUSE WINS' : '🤝 TIE'}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {!result ? (
            <Button className="flex-1" onClick={rollDice} disabled={rolling}>
              {rolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {rolling ? 'Rolling...' : 'Roll Dice'}
            </Button>
          ) : (
            <>
              <Button className="flex-1" onClick={() => { setResult(null); setPlayerRoll(null); setHouseRoll(null); }}>
                Play Again
              </Button>
              <Button variant="outline" onClick={onEnd}>
                Exit
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
