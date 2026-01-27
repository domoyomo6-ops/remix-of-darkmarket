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

interface BlackjackGameProps {
  session: GameSession;
  onEnd: () => void;
}

type CardType = { suit: string; value: string; numValue: number };

const suits = ['♠', '♥', '♦', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck(): CardType[] {
  const deck: CardType[] = [];
  for (const suit of suits) {
    for (const value of values) {
      let numValue = parseInt(value);
      if (isNaN(numValue)) numValue = value === 'A' ? 11 : 10;
      deck.push({ suit, value, numValue });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function calculateHand(cards: CardType[]): number {
  let sum = cards.reduce((a, c) => a + c.numValue, 0);
  let aces = cards.filter(c => c.value === 'A').length;
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

function CardDisplay({ card, hidden = false }: { card: CardType; hidden?: boolean }) {
  const isRed = card.suit === '♥' || card.suit === '♦';
  if (hidden) {
    return (
      <div className="w-14 h-20 bg-primary/20 border-2 border-primary rounded-lg flex items-center justify-center">
        <span className="text-2xl">?</span>
      </div>
    );
  }
  return (
    <div className={`w-14 h-20 bg-card border-2 border-border rounded-lg flex flex-col items-center justify-center ${isRed ? 'text-red-500' : 'text-foreground'}`}>
      <span className="text-lg font-bold">{card.value}</span>
      <span className="text-xl">{card.suit}</span>
    </div>
  );
}

export default function BlackjackGame({ session, onEnd }: BlackjackGameProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deck, setDeck] = useState<CardType[]>([]);
  const [playerHand, setPlayerHand] = useState<CardType[]>([]);
  const [dealerHand, setDealerHand] = useState<CardType[]>([]);
  const [gameState, setGameState] = useState<'betting' | 'playing' | 'dealer' | 'ended'>('betting');
  const [result, setResult] = useState<'win' | 'lose' | 'push' | 'blackjack' | null>(null);

  const startGame = () => {
    const newDeck = createDeck();
    const pHand = [newDeck.pop()!, newDeck.pop()!];
    const dHand = [newDeck.pop()!, newDeck.pop()!];
    
    setDeck(newDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setGameState('playing');
    setResult(null);

    // Check for blackjack
    if (calculateHand(pHand) === 21) {
      setTimeout(() => endGame(pHand, dHand, newDeck, true), 500);
    }
  };

  const hit = () => {
    const newDeck = [...deck];
    const newCard = newDeck.pop()!;
    const newHand = [...playerHand, newCard];
    setPlayerHand(newHand);
    setDeck(newDeck);

    if (calculateHand(newHand) > 21) {
      endGame(newHand, dealerHand, newDeck);
    }
  };

  const stand = () => {
    setGameState('dealer');
    dealerPlay();
  };

  const dealerPlay = async () => {
    let dHand = [...dealerHand];
    let d = [...deck];

    while (calculateHand(dHand) < 17) {
      await new Promise(r => setTimeout(r, 500));
      const newCard = d.pop()!;
      dHand = [...dHand, newCard];
      setDealerHand(dHand);
      setDeck(d);
    }

    endGame(playerHand, dHand, d);
  };

  const endGame = async (pHand: CardType[], dHand: CardType[], d: CardType[], isBlackjack = false) => {
    setGameState('ended');
    const pScore = calculateHand(pHand);
    const dScore = calculateHand(dHand);

    let gameResult: 'win' | 'lose' | 'push' | 'blackjack';
    if (pScore > 21) {
      gameResult = 'lose';
    } else if (dScore > 21) {
      gameResult = 'win';
    } else if (isBlackjack && pScore === 21) {
      gameResult = 'blackjack';
    } else if (pScore > dScore) {
      gameResult = 'win';
    } else if (pScore < dScore) {
      gameResult = 'lose';
    } else {
      gameResult = 'push';
    }

    setResult(gameResult);

    try {
      const winnerId = gameResult === 'lose' ? null : user?.id;
      await supabase.rpc('resolve_game', {
        p_game_id: session.id,
        p_winner_id: winnerId,
        p_game_data: { player_score: pScore, dealer_score: dScore, result: gameResult }
      });

      toast({
        title: gameResult === 'blackjack' ? '🎰 BLACKJACK!' : gameResult === 'win' ? '🎉 You Win!' : gameResult === 'lose' ? '😔 Dealer Wins' : '🤝 Push',
        description: gameResult === 'blackjack' 
          ? `You won $${(session.wager_amount * 2.5).toFixed(2)}!`
          : gameResult === 'win'
          ? `You won $${(session.wager_amount * 2).toFixed(2)}!`
          : gameResult === 'push'
          ? 'Your wager was returned.'
          : 'Better luck next time!',
      });
    } catch (error) {
      console.error('Error resolving game:', error);
    }
  };

  const playerScore = calculateHand(playerHand);
  const dealerScore = gameState === 'ended' ? calculateHand(dealerHand) : calculateHand([dealerHand[0]]);

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle>🃏 Blackjack</CardTitle>
        <p className="text-lg font-mono text-primary">Wager: ${session.wager_amount.toFixed(2)}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {gameState === 'betting' ? (
          <div className="text-center py-8">
            <p className="mb-4 text-muted-foreground">Ready to play?</p>
            <Button onClick={startGame} size="lg">Deal Cards</Button>
          </div>
        ) : (
          <>
            {/* Dealer Hand */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Dealer</span>
                <span className="text-sm font-mono">{gameState === 'ended' ? calculateHand(dealerHand) : '?'}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {dealerHand.map((card, i) => (
                  <CardDisplay key={i} card={card} hidden={i === 1 && gameState === 'playing'} />
                ))}
              </div>
            </div>

            {/* Player Hand */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">You</span>
                <span className={`text-sm font-mono ${playerScore > 21 ? 'text-red-500' : playerScore === 21 ? 'text-green-500' : ''}`}>
                  {playerScore}
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {playerHand.map((card, i) => (
                  <CardDisplay key={i} card={card} />
                ))}
              </div>
            </div>

            {/* Result */}
            {result && (
              <div className={`text-center p-4 rounded-lg ${
                result === 'win' || result === 'blackjack' ? 'bg-green-500/20 text-green-500' 
                : result === 'lose' ? 'bg-red-500/20 text-red-500' 
                : 'bg-yellow-500/20 text-yellow-500'
              }`}>
                <p className="text-xl font-bold">
                  {result === 'blackjack' ? '🎰 BLACKJACK!' : result === 'win' ? '🎉 YOU WIN!' : result === 'lose' ? '😔 DEALER WINS' : '🤝 PUSH'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {gameState === 'playing' && (
                <>
                  <Button className="flex-1" onClick={hit} disabled={playerScore >= 21}>Hit</Button>
                  <Button className="flex-1" variant="secondary" onClick={stand}>Stand</Button>
                </>
              )}
              {gameState === 'dealer' && (
                <Button className="flex-1" disabled>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Dealer playing...
                </Button>
              )}
              {gameState === 'ended' && (
                <>
                  <Button className="flex-1" onClick={startGame}>Play Again</Button>
                  <Button variant="outline" onClick={onEnd}>Exit</Button>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
