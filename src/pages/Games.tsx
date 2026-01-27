import { useState, useEffect } from 'react';
import { Dice1, Dice5, CircleDot, Spade, Users, Eye, Trophy, Plus, Loader2, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/MainLayout';
import DiceGame from '@/components/games/DiceGame';
import BlackjackGame from '@/components/games/BlackjackGame';
import RouletteGame from '@/components/games/RouletteGame';
import CoinflipGame from '@/components/games/CoinflipGame';

type GameType = 'dice' | 'blackjack' | 'roulette' | 'coinflip';
type LobbyType = '1v1' | '2v2' | 'vs_house' | 'spectate';

interface GameSession {
  id: string;
  game_type: GameType;
  lobby_type: LobbyType;
  status: string;
  host_id: string;
  wager_amount: number;
  max_players: number;
  created_at: string;
  participants?: { user_id: string; is_spectator: boolean }[];
}

export default function Games() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [lobbies, setLobbies] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newGame, setNewGame] = useState({
    game_type: 'dice' as GameType,
    lobby_type: 'vs_house' as LobbyType,
    wager_amount: 1,
  });

  useEffect(() => {
    fetchLobbies();
    
    const channel = supabase
      .channel('game_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () => {
        fetchLobbies();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLobbies = async () => {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*, game_participants(user_id, is_spectator)')
      .in('status', ['waiting', 'in_progress'])
      .order('created_at', { ascending: false });

    if (!error) {
      setLobbies(data?.map(g => ({ ...g, participants: g.game_participants })) || []);
    }
    setLoading(false);
  };

  const createGame = async () => {
    if (!user) return;
    setCreating(true);
    
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          game_type: newGame.game_type,
          lobby_type: newGame.lobby_type,
          wager_amount: newGame.wager_amount,
          host_id: user.id,
          max_players: newGame.lobby_type === '2v2' ? 4 : 2,
        })
        .select()
        .single();

      if (error) throw error;

      const wagerResult = await supabase.rpc('place_game_wager', {
        p_game_id: data.id,
        p_wager_amount: newGame.wager_amount,
        p_is_spectator: false,
      });

      if (wagerResult.error) throw wagerResult.error;
      const wagerData = wagerResult.data as { success: boolean; error?: string };
      if (!wagerData.success) throw new Error(wagerData.error);

      setActiveSession(data);
      setActiveGame(newGame.game_type);
      setShowCreate(false);
      toast({ title: "Game created!", description: "Waiting for opponents..." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const joinGame = async (session: GameSession, asSpectator: boolean = false) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('place_game_wager', {
        p_game_id: session.id,
        p_wager_amount: asSpectator ? 0 : session.wager_amount,
        p_is_spectator: asSpectator,
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);

      setActiveSession(session);
      setActiveGame(session.game_type);
      toast({ title: asSpectator ? "Now spectating" : "Joined game!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const gameIcons = {
    dice: Dice5,
    blackjack: Spade,
    roulette: CircleDot,
    coinflip: Dice1,
  };

  const lobbyTypeLabels = {
    '1v1': { label: '1v1', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    '2v2': { label: '2v2', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    'vs_house': { label: 'vs House', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    'spectate': { label: 'Spectate', color: 'bg-primary/20 text-primary border-primary/30' },
  };

  if (activeGame && activeSession) {
    const GameComponent = {
      dice: DiceGame,
      blackjack: BlackjackGame,
      roulette: RouletteGame,
      coinflip: CoinflipGame,
    }[activeGame];

    return (
      <MainLayout>
        <div className="min-h-screen relative">
          <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px] z-10" />
          <div className="container mx-auto px-4 py-6 relative z-20 space-y-4">
            <Button 
              variant="outline" 
              className="font-mono border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => { setActiveGame(null); setActiveSession(null); }}
            >
              ← BACK TO LOBBY
            </Button>
            <GameComponent session={activeSession} onEnd={() => { setActiveGame(null); setActiveSession(null); fetchLobbies(); }} />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen relative">
        {/* Scanline overlay */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px] z-10" />
        
        <div className="container mx-auto px-4 py-6 sm:py-8 relative z-20 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-primary/10 border border-primary/20 mb-3">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-primary">CASINO://ACTIVE</span>
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-mono font-bold text-primary terminal-glow">GAME_ROOM://</h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">Wager your balance • Play to win</p>
            </div>
            
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="crt-button font-mono gap-2">
                  <Plus className="w-4 h-4" />
                  CREATE GAME
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-primary/30">
                <DialogHeader>
                  <DialogTitle className="font-mono text-primary">Create New Game</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm text-muted-foreground font-mono">Game Type</label>
                    <Select value={newGame.game_type} onValueChange={(v: GameType) => setNewGame({ ...newGame, game_type: v })}>
                      <SelectTrigger className="crt-input"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dice">🎲 Dice</SelectItem>
                        <SelectItem value="blackjack">🃏 Blackjack</SelectItem>
                        <SelectItem value="roulette">🎰 Roulette</SelectItem>
                        <SelectItem value="coinflip">🪙 Coinflip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground font-mono">Lobby Type</label>
                    <Select value={newGame.lobby_type} onValueChange={(v: LobbyType) => setNewGame({ ...newGame, lobby_type: v })}>
                      <SelectTrigger className="crt-input"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vs_house">🏠 vs House</SelectItem>
                        <SelectItem value="1v1">👥 1v1</SelectItem>
                        <SelectItem value="2v2">👥 2v2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground font-mono">Wager Amount ($)</label>
                    <Input 
                      type="number" 
                      min="0.01" 
                      step="0.01"
                      value={newGame.wager_amount}
                      onChange={(e) => setNewGame({ ...newGame, wager_amount: parseFloat(e.target.value) || 0 })}
                      className="crt-input"
                    />
                  </div>
                  <Button className="w-full crt-button font-mono" onClick={createGame} disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CREATE & JOIN'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Quick Play */}
          <div>
            <h2 className="text-lg font-mono font-semibold text-primary mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              QUICK_PLAY://
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {(['dice', 'blackjack', 'roulette', 'coinflip'] as GameType[]).map((type) => {
                const Icon = gameIcons[type];
                return (
                  <div 
                    key={type} 
                    className="panel-3d rounded-lg p-4 sm:p-6 cursor-pointer hover:border-primary/50 transition-all group text-center"
                    onClick={() => {
                      setNewGame({ ...newGame, game_type: type, lobby_type: 'vs_house' });
                      setShowCreate(true);
                    }}
                  >
                    <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-mono font-bold capitalize text-primary text-sm sm:text-base">{type}</span>
                    <p className="text-xs text-muted-foreground font-mono mt-1">vs House</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Lobbies */}
          <div>
            <h2 className="text-lg font-mono font-semibold text-primary mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              OPEN_LOBBIES://
            </h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  <span className="text-xs font-mono text-muted-foreground">SCANNING...</span>
                </div>
              </div>
            ) : lobbies.length === 0 ? (
              <div className="panel-3d rounded-lg p-8 sm:p-12 text-center border-dashed border-2 border-primary/20">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-mono text-muted-foreground text-sm">NO_ACTIVE_LOBBIES</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">Create a game to get started</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {lobbies.map((lobby) => {
                  const Icon = gameIcons[lobby.game_type];
                  const lobbyInfo = lobbyTypeLabels[lobby.lobby_type];
                  const playerCount = lobby.participants?.filter(p => !p.is_spectator).length || 0;
                  const spectatorCount = lobby.participants?.filter(p => p.is_spectator).length || 0;

                  return (
                    <div key={lobby.id} className="panel-3d rounded-lg overflow-hidden hover:border-primary/50 transition-all">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="w-5 h-5 text-primary" />
                            <span className="font-mono font-bold text-primary capitalize">{lobby.game_type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {lobby.status === 'in_progress' && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse font-mono text-xs">
                                LIVE
                              </Badge>
                            )}
                            <Badge variant="outline" className={`${lobbyInfo.color} font-mono text-xs`}>
                              {lobbyInfo.label}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm font-mono">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Wager:</span>
                            <span className="font-bold text-primary">${lobby.wager_amount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Players:</span>
                            <span>{playerCount}/{lobby.max_players}</span>
                          </div>
                          {spectatorCount > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Spectators:</span>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" /> {spectatorCount}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                          {lobby.status === 'waiting' && (
                            <Button 
                              className="flex-1 crt-button font-mono text-xs" 
                              size="sm"
                              onClick={() => joinGame(lobby)}
                              disabled={playerCount >= lobby.max_players}
                            >
                              JOIN (${lobby.wager_amount})
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            className={`${lobby.status === 'waiting' ? '' : 'flex-1'} border-primary/30 text-primary hover:bg-primary/10 font-mono text-xs`}
                            onClick={() => joinGame(lobby, true)}
                            title="Spectate this game"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="ml-1">SPECTATE</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}