import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, Send, Loader2, User, X,
  Clock, ClipboardList
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Chat {
  id: string;
  user_id: string;
  status: 'open' | 'closed' | 'pending';
  subject: string | null;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  last_message?: string;
  user_email?: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_type: 'user' | 'admin' | 'telegram';
  message: string;
  message_type: string;
  file_url: string | null;
  is_read: boolean;
  created_at: string;
}

export default function SupportManager() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [supportStatus, setSupportStatus] = useState<'open' | 'closed' | 'busy'>('open');
  const [chatFilter, setChatFilter] = useState<'all' | 'open' | 'pending' | 'closed'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChats();
    fetchSupportStatus();

    // Subscribe to new messages across all chats
    const channel = supabase
      .channel('admin_support_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        () => fetchChats()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_chats' },
        () => fetchChats()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      markAsRead(selectedChat.id);

      // Subscribe to this chat's messages
      const channel = supabase
        .channel(`admin_chat_${selectedChat.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${selectedChat.id}` },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSupportStatus = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('support_status')
      .single();
    if (data?.support_status) {
      setSupportStatus(data.support_status as any);
    }
  };

  const updateSupportStatus = async (status: 'open' | 'closed' | 'busy') => {
    const { error } = await supabase
      .from('site_settings')
      .update({ support_status: status })
      .eq('id', (await supabase.from('site_settings').select('id').single()).data?.id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      setSupportStatus(status);
      toast.success(`Support is now ${status}`);
    }
  };

  const fetchChats = async () => {
    const { data } = await supabase
      .from('support_chats')
      .select('*')
      .order('updated_at', { ascending: false });

    if (data) {
      // Get unread counts and last messages
      const enrichedChats = await Promise.all(
        data.map(async (chat) => {
          const { count } = await supabase
            .from('support_messages')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('is_read', false)
            .eq('sender_type', 'user');

          const { data: lastMsg } = await supabase
            .from('support_messages')
            .select('message')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get user email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', chat.user_id)
            .single();

          return {
            ...chat,
            unread_count: count || 0,
            last_message: lastMsg?.message,
            user_email: profile?.email,
          };
        })
      );

      setChats(enrichedChats as Chat[]);
    }
    setLoading(false);
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as Message[]);
  };

  const markAsRead = async (chatId: string) => {
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    if (!user || !selectedChat || !newMessage.trim()) return;
    setSending(true);

    const { error } = await supabase.from('support_messages').insert({
      chat_id: selectedChat.id,
      sender_id: user.id,
      sender_type: 'admin',
      message: newMessage.trim(),
    });

    if (error) {
      toast.error('Failed to send');
    } else {
      setNewMessage('');
    }
    setSending(false);
  };

  const closeChat = async (chatId: string) => {
    await supabase
      .from('support_chats')
      .update({ status: 'closed' })
      .eq('id', chatId);
    
    fetchChats();
    if (selectedChat?.id === chatId) {
      setSelectedChat(null);
    }
    toast.success('Chat closed');
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const statusColors = {
    open: 'bg-green-500',
    closed: 'bg-zinc-500',
    pending: 'bg-amber-500',
  };

  const filteredChats = chats.filter(chat => chatFilter === 'all' ? true : chat.status === chatFilter);
  const chatCounts = {
    all: chats.length,
    open: chats.filter(chat => chat.status === 'open').length,
    pending: chats.filter(chat => chat.status === 'pending').length,
    closed: chats.filter(chat => chat.status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      {/* Status Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Support Control
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${supportStatus === 'open' ? 'bg-green-500' : supportStatus === 'closed' ? 'bg-red-500' : 'bg-amber-500'}`} />
              <Select value={supportStatus} onValueChange={(v: any) => updateSupportStatus(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">🟢 Open</SelectItem>
                  <SelectItem value="busy">🟡 Busy</SelectItem>
                  <SelectItem value="closed">🔴 Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Chat List */}
        <Card className="lg:col-span-1 overflow-hidden">
          <CardHeader className="py-3 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Support Queue</CardTitle>
              <span className="text-xs text-muted-foreground">Total: {chatCounts.all}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[11px]">
              {(['all', 'open', 'pending', 'closed'] as const).map(filter => (
                <Button
                  key={filter}
                  type="button"
                  variant={chatFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChatFilter(filter)}
                  className="h-7 px-2 text-[11px]"
                >
                  {filter.toUpperCase()} ({chatCounts[filter]})
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto h-[calc(100%-60px)]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredChats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No chats</p>
            ) : (
              <div className="divide-y divide-border">
                {filteredChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-3 text-left hover:bg-accent/50 transition-colors ${
                      selectedChat?.id === chat.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusColors[chat.status]}`} />
                        <span className="text-sm font-mono truncate max-w-[120px]">
                          {chat.user_email || 'Unknown'}
                        </span>
                      </div>
                      {(chat.unread_count || 0) > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {chat.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.last_message || 'No messages'}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(chat.updated_at)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          {selectedChat ? (
            <>
              <CardHeader className="py-3 border-b border-border shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{selectedChat.user_email}</span>
                    <Badge className={`text-xs ${statusColors[selectedChat.status]}`}>
                      {selectedChat.status}
                    </Badge>
                  </div>
                  {selectedChat.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => closeChat(selectedChat.id)}
                      className="text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Close
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                        msg.sender_type === 'admin'
                          ? 'bg-primary/20 text-primary'
                          : msg.sender_type === 'telegram'
                          ? 'bg-blue-500/20 text-blue-400'
                          : msg.message_type === 'order'
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                          : 'bg-zinc-800 text-foreground'
                      }`}
                    >
                      {msg.sender_type !== 'admin' && (
                        <p className="text-[10px] text-muted-foreground mb-1">
                          {msg.sender_type === 'telegram'
                            ? '📱 Via Telegram'
                            : msg.message_type === 'order'
                            ? '🧾 Order Intake'
                            : '👤 User'}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      {msg.message_type === 'order' && (
                        <p className="text-[10px] text-amber-100 mt-1 flex items-center gap-1">
                          <ClipboardList className="w-3 h-3" />
                          Routed from support orders tab
                        </p>
                      )}
                      {msg.file_url && (
                        <img src={msg.file_url} alt="attachment" className="mt-2 rounded max-w-full" />
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </CardContent>

              <div className="p-3 border-t border-border shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    placeholder="Type a reply..."
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a chat to view messages</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
