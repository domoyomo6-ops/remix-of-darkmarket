import { useState, useEffect, useRef } from 'react';
import { 
  Send, Smile, Crown, Shield, User, Trash2, 
  MessageSquare, MoreVertical, Reply
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Message {
  id: string;
  user_id: string;
  content: string;
  message_type: string;
  reply_to: string | null;
  created_at: string;
}

interface UserInfo {
  display_name?: string;
  level?: number;
  title?: string;
}

interface LoungeChatProps {
  showComposer?: boolean;
}

export default function LoungeChat({ showComposer = true }: LoungeChatProps) {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userInfoCache, setUserInfoCache] = useState<Record<string, UserInfo>>({});
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const emojis = ['👍', '❤️', '🔥', '💯', '😂', '🎵', '🎮', '💀', '👀', '🚀', '💎', '🌟'];

  useEffect(() => {
    fetchMessages();
    fetchAdmins();

    const channel = supabase
      .channel('lounge-chat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lounge_messages' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new as Message]);
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('lounge_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (data) {
      setMessages(data);
      // Fetch user info for all unique users
      const userIds = [...new Set(data.map(m => m.user_id))];
      fetchUserInfo(userIds);
    }
  };

  const fetchAdmins = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    if (data) {
      setAdminIds(data.map(r => r.user_id));
    }
  };

  const fetchUserInfo = async (userIds: string[]) => {
    const { data } = await supabase
      .from('user_avatars')
      .select('user_id, display_name, level, title')
      .in('user_id', userIds);
    
    if (data) {
      const cache: Record<string, UserInfo> = {};
      data.forEach(u => {
        cache[u.user_id] = {
          display_name: u.display_name || undefined,
          level: u.level || 1,
          title: u.title || undefined,
        };
      });
      setUserInfoCache(prev => ({ ...prev, ...cache }));
    }
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;

    const { error } = await supabase.from('lounge_messages').insert({
      user_id: user.id,
      content: newMessage.trim(),
      message_type: 'text',
      reply_to: replyingTo?.id || null,
    });

    if (error) {
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
      setReplyingTo(null);
    }
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase
      .from('lounge_messages')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Failed to delete message');
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojis(false);
    inputRef.current?.focus();
  };

  const getUserDisplay = (userId: string) => {
    const info = userInfoCache[userId];
    return info?.display_name || `Anon_${userId.slice(0, 6)}`;
  };

  const getUserBadge = (userId: string) => {
    const isUserAdmin = adminIds.includes(userId);
    const info = userInfoCache[userId];
    
    return (
      <div className="flex items-center gap-1.5">
        {isUserAdmin && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
            <Crown className="w-2.5 h-2.5" />
            ADMIN
          </span>
        )}
        {info?.level && (
          <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-mono">
            LVL {info.level}
          </span>
        )}
        {info?.title && (
          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px]">
            {info.title}
          </span>
        )}
      </div>
    );
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getReplyMessage = (replyId: string | null) => {
    if (!replyId) return null;
    return messages.find(m => m.id === replyId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const replyMsg = getReplyMessage(msg.reply_to);
          const isMine = msg.user_id === user?.id;
          const isUserAdmin = adminIds.includes(msg.user_id);

          return (
            <div 
              key={msg.id} 
              className={`group flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
            >
              {/* Reply preview */}
              {replyMsg && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 pl-2">
                  <Reply className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">
                    {replyMsg.content}
                  </span>
                </div>
              )}

              <div className={`max-w-[85%] ${isMine ? 'text-right' : 'text-left'}`}>
                {/* User info */}
                <div className={`flex items-center gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                  <span className={`text-xs font-mono font-bold ${isUserAdmin ? 'text-red-400' : 'text-primary'}`}>
                    {getUserDisplay(msg.user_id)}
                  </span>
                  {getUserBadge(msg.user_id)}
                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                </div>

                {/* Message bubble */}
                <div className={`relative inline-block rounded-lg px-3 py-2 ${
                  isUserAdmin 
                    ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30'
                    : isMine 
                      ? 'bg-primary/20 border border-primary/30' 
                      : 'bg-black/40 border border-primary/10'
                }`}>
                  <p className="text-sm text-foreground break-words">{msg.content}</p>

                  {/* Actions */}
                  <div className={`absolute top-0 ${isMine ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-6 h-6">
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setReplyingTo(msg)}>
                          <Reply className="w-4 h-4 mr-2" />
                          Reply
                        </DropdownMenuItem>
                        {(isMine || isAdmin) && (
                          <DropdownMenuItem onClick={() => deleteMessage(msg.id)} className="text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-primary/10 border-t border-primary/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Reply className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Replying to:</span>
            <span className="truncate max-w-[200px]">{replyingTo.content}</span>
          </div>
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setReplyingTo(null)}>
            ×
          </Button>
        </div>
      )}

      {/* Input */}
      {showComposer && (
        <div className="p-4 border-t border-primary/20">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="shrink-0"
                onClick={() => setShowEmojis(!showEmojis)}
              >
                <Smile className="w-5 h-5" />
              </Button>
              
              {showEmojis && (
                <div className="absolute bottom-full left-0 mb-2 p-2 rounded-lg bg-black/90 border border-primary/30 grid grid-cols-6 gap-1">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      className="text-xl hover:scale-125 transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-black/50 border-primary/30"
            />
            
            <Button 
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              size="icon"
              className="shrink-0 crt-button"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
