import { useState, useEffect } from 'react';
import { Dice1, Dice5, CircleDot, Spade, Users, Eye, Trophy, Plus, Loader2, Terminal, Sparkles, Landmark, ShieldCheck, Coins, Rocket } from 'lucide-react';
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
import Scene3D from '@/components/Scene3D';

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
  const { user, isAdmin } = useAuth();
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
  const [walletBalance, setWalletBalance] = useState(0);
  const [chipBalance, setChipBalance] = useState(0);
  const [hasRoomAccess, setHasRoomAccess] = useState(false);

  const chipPacks = [
    { id: 'starter', chips: 50, price: 5, vibe: 'Starter stack' },
    { id: 'pro', chips: 150, price: 12, vibe: 'High roller warmup' },
    { id: 'legend', chips: 400, price: 25, vibe: 'Legendary party mode' },
  ] as const;

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

  useEffect(() => {
    if (!user) return;

    const accessKey = `game-room-chip-pass:${user.id}`;
    const savedAccess = localStorage.getItem(accessKey);
    if (savedAccess) {
      const parsed = JSON.parse(savedAccess) as { chips: number };
      if (parsed?.chips > 0) {
        setChipBalance(parsed.chips);
        setHasRoomAccess(true);
      }
    }

    const fetchWallet = async () => {
      const { data } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      setWalletBalance(Number(data?.balance || 0));
    };

    fetchWallet();
  }, [user]);

  const saveChipPass = (chips: number) => {
    if (!user) return;
    localStorage.setItem(`game-room-chip-pass:${user.id}`, JSON.stringify({ chips }));
  };

  const requireChips = (amount: number) => {
    if (amount <= 0) return true;
    if (chipBalance < amount) {
      toast({
        title: 'More chips needed',
        description: `You need ${amount.toFixed(2)} chips to join this action.`,
        variant: 'destructive',
      });
      setHasRoomAccess(false);
      return false;
    }

    return true;
  };

  const consumeChips = (amount: number) => {
    if (amount <= 0) return;
    const updated = Math.max(0, chipBalance - amount);
    setChipBalance(updated);
    saveChipPass(updated);
    if (updated <= 0) {
      setHasRoomAccess(false);
      toast({ title: 'Chip stack empty', description: 'Buy another stack to keep playing in the 3D room.' });
    }
  };

  const buyChipPack = (pack: (typeof chipPacks)[number]) => {
    if (walletBalance < pack.price) {
      toast({
        title: 'Insufficient wallet balance',
        description: `You need $${pack.price} in your wallet for this chip pack.`,
        variant: 'destructive',
      });
      return;
    }

    setChipBalance(pack.chips);
    saveChipPass(pack.chips);
    setHasRoomAccess(true);
    toast({ title: 'Chip pack activated', description: `${pack.chips} chips loaded. Welcome to the super game room!` });
  };

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
    if (!requireChips(newGame.wager_amount)) return;
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

      consumeChips(newGame.wager_amount);
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
    if (!asSpectator && !requireChips(session.wager_amount)) return;

    try {
      const { data, error } = await supabase.rpc('place_game_wager', {
        p_game_id: session.id,
        p_wager_amount: asSpectator ? 0 : session.wager_amount,
        p_is_spectator: asSpectator,
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);

      if (!asSpectator) consumeChips(session.wager_amount);
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

  if (!hasRoomAccess) {
    return (
      <MainLayout>
        <div className="min-h-screen relative overflow-hidden">
          <Scene3D />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,255,170,0.2),transparent_40%),radial-gradient(circle_at_bottom,rgba(130,80,255,0.18),transparent_55%)]" />
          <div className="container mx-auto px-4 py-10 relative z-20">
            <Card className="panel-3d border-primary/40 bg-black/55 max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle className="text-primary font-mono text-2xl flex items-center gap-2"><Rocket className="w-6 h-6" />SUPER_GAME_ROOM://ACCESS_GATE</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="font-mono text-sm text-muted-foreground">Everyone must buy a chip stack before entering the Unity-style 3D game room.</p>
                <div className="text-xs font-mono text-primary/90 flex items-center gap-2"><Coins className="w-4 h-4" />Wallet balance detected: ${walletBalance.toFixed(2)}</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {chipPacks.map((pack) => (
                    <Card key={pack.id} className="panel-3d border-primary/30 bg-black/45">
                      <CardContent className="p-4 space-y-2">
                        <p className="font-mono text-primary text-sm">{pack.vibe}</p>
                        <p className="font-mono text-2xl font-bold">{pack.chips}<span className="text-xs ml-1 text-muted-foreground">chips</span></p>
                        <p className="font-mono text-xs text-muted-foreground">Entry price: ${pack.price}</p>
                        <Button className="w-full crt-button font-mono" onClick={() => buyChipPack(pack)}>BUY CHIPS</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen relative overflow-hidden">
        <Scene3D />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,0,200,0.15),transparent_45%),radial-gradient(circle_at_bottom,rgba(0,255,255,0.12),transparent_55%)]" />
        {/* Scanline overlay */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px] z-10" />
        
        <div className="container mx-auto px-4 py-6 sm:py-8 relative z-20 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-primary/10 border border-primary/20 mb-3">
                <Terminal className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-primary">CASINO://ACTIVE</span>
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-mono font-bold text-primary terminal-glow">GAME_ROOM://</h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-1">Casino floor active • Live tables • Wallet settles each outcome</p>
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

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="panel-3d border-primary/25 bg-black/35">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-mono text-sm"><Coins className="w-4 h-4" />CHIP_STACK</div>
                <p className="text-xs text-muted-foreground font-mono">{chipBalance.toFixed(2)} chips ready. Bets consume chips before joining tables.</p>
              </CardContent>
            </Card>
            <Card className="panel-3d border-primary/25 bg-black/35">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-mono text-sm"><Sparkles className="w-4 h-4" />IMMERSIVE_FLOOR</div>
                <p className="text-xs text-muted-foreground font-mono">Walk table-to-table via quick play, open lobbies, and live spectator mode.</p>
              </CardContent>
            </Card>
            <Card className="panel-3d border-primary/25 bg-black/35">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-mono text-sm"><Landmark className="w-4 h-4" />HOUSE_RULES</div>
                <p className="text-xs text-muted-foreground font-mono">All games now pay controlled returns between 1x and 1.5x wager for wins/ties.</p>
              </CardContent>
            </Card>
            <Card className="panel-3d border-primary/25 bg-black/35">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-mono text-sm"><ShieldCheck className="w-4 h-4" />WALLET_SYNC</div>
                <p className="text-xs text-muted-foreground font-mono">Wallet updates server-side when a table is resolved by host or admin dealer.</p>
              </CardContent>
            </Card>
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

          {isAdmin && (
            <div>
              <h2 className="text-lg font-mono font-semibold text-primary mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                DEALER_CONSOLE://
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {lobbies.slice(0, 4).map((table) => (
                  <Card key={`dealer-${table.id}`} className="panel-3d border-primary/30 bg-black/35">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-primary text-sm uppercase">{table.game_type} table</p>
                        <p className="text-xs text-muted-foreground font-mono">{table.status} • Wager ${table.wager_amount.toFixed(2)}</p>
                      </div>
                      <Button size="sm" variant="outline" className="border-primary/40 text-primary" onClick={() => joinGame(table, true)}>
                        <Eye className="w-4 h-4 mr-1" /> Spectate
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

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
