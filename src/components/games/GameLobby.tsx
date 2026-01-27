import { useState, useEffect } from 'react';
import { Users, Eye, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface GameSession {
  id: string;
  game_type: string;
  lobby_type: string;
  wager_amount: number;
  host_id: string;
  max_players: number;
  status: string;
}

interface GameLobbyProps {
  session: GameSession;
  onStart: () => void;
  onCancel: () => void;
}

interface Participant {
  user_id: string;
  is_spectator: boolean;
  profiles?: { email: string };
}

export default function GameLobby({ session, onStart, onCancel }: GameLobbyProps) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParticipants();
    
    const channel = supabase
      .channel(`game_${session.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'game_participants',
        filter: `game_id=eq.${session.id}`
      }, () => {
        fetchParticipants();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session.id]);

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from('game_participants')
      .select('user_id, is_spectator')
      .eq('game_id', session.id);

    if (!error) {
      setParticipants(data || []);
    }
    setLoading(false);
  };

  const players = participants.filter(p => !p.is_spectator);
  const spectators = participants.filter(p => p.is_spectator);
  const isHost = user?.id === session.host_id;
  const canStart = players.length >= 2 || session.lobby_type === 'vs_house';

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="capitalize">{session.game_type} Lobby</CardTitle>
        <Badge variant="outline">{session.lobby_type}</Badge>
        <p className="text-lg font-mono text-primary mt-2">
          Wager: ${session.wager_amount.toFixed(2)}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Players */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Players ({players.length}/{session.max_players})</span>
          </div>
          <div className="space-y-2">
            {players.map((p, i) => (
              <div key={p.user_id} className="flex items-center gap-2 p-2 bg-card rounded border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                  P{i + 1}
                </div>
                <span className="text-sm font-mono truncate flex-1">
                  {p.user_id === user?.id ? 'You' : `Player ${i + 1}`}
                </span>
                {p.user_id === session.host_id && (
                  <Badge variant="secondary" className="text-xs">Host</Badge>
                )}
              </div>
            ))}
            {Array.from({ length: session.max_players - players.length }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-muted/20 rounded border border-dashed border-border">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Waiting...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spectators */}
        {spectators.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Spectators ({spectators.length})
              </span>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="text-center py-4">
          {!canStart && session.lobby_type !== 'vs_house' ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for players...</span>
            </div>
          ) : (
            <p className="text-green-500">Ready to start!</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {isHost ? (
            <>
              <Button 
                className="flex-1" 
                onClick={onStart}
                disabled={!canStart}
              >
                Start Game
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Leave Lobby
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
