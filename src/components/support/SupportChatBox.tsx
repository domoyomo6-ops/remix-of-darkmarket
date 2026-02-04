import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Send, Minus, Maximize2, Bitcoin, Loader2, 
  Users, ClipboardList, Sparkles, Terminal, Zap, CheckCircle2,
  Clock, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import CryptoExchange from './CryptoExchange';

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

interface Chat {
  id: string;
  user_id: string;
  status: string;
  subject: string | null;
  created_at: string;
}

export default function SupportChatBox() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [supportStatus, setSupportStatus] = useState<'open' | 'closed' | 'busy'>('open');
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newOrderText, setNewOrderText] = useState('');

  // Drag state
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const dragRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // DRAG EVENTS
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };
  
  const onMouseUp = () => { dragging.current = false; };

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (user) {
      checkExistingChat();
      fetchSupportStatus();
    }
  }, [user]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!chat?.id) return;

    const channel = supabase
      .channel(`support_chat_${chat.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages', 
          filter: `chat_id=eq.${chat.id}` 
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          if (newMsg.sender_type !== 'user') {
            setUnreadCount(prev => prev + 1);
            setHasNewMessage(true);
            if (!isOpen) {
              toast.success('New message from support!');
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chat?.id, isOpen]);

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);
  
  useEffect(() => {
    if (unreadCount > 0 && !isOpen) setIsOpen(true);
  }, [unreadCount]);

  const fetchSupportStatus = async () => {
    const { data } = await supabase.from('site_settings').select('support_status').single();
    if (data?.support_status) setSupportStatus(data.support_status as any);
  };

  const checkExistingChat = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('support_chats')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setChat(data);
      fetchMessages(data.id);
    }
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data as Message[]);
      const unread = data.filter(m => !m.is_read && m.sender_type !== 'user').length;
      setUnreadCount(unread);
      if (unread > 0) {
        setHasNewMessage(true);
        setIsOpen(true);
      }
    }
  };

  const createChat = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('support_chats')
      .insert({ user_id: user.id })
      .select()
      .single();
    if (error) { toast.error('Failed to start chat'); return null; }
    setChat(data);
    return data;
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    setSending(true);
    let currentChat = chat;
    if (!currentChat) {
      currentChat = await createChat();
      if (!currentChat) { setSending(false); return; }
    }

    const { error } = await supabase.from('support_messages').insert({
      chat_id: currentChat.id,
      sender_id: user.id,
      sender_type: 'user',
      message: newMessage.trim()
    });

    if (error) toast.error('Failed to send message');
    else {
      setNewMessage('');
      setUnreadCount(0);
      setHasNewMessage(false);
    }
    setSending(false);
  };

  const markAsRead = async () => {
    if (!chat) return;
    await supabase
      .from('support_messages')
      .update({ is_read: true })
      .eq('chat_id', chat.id)
      .eq('is_read', false);
    setUnreadCount(0);
    setHasNewMessage(false);
  };

  const addManualOrder = async () => {
    if (!newOrderText.trim() || !user) return;
    setSending(true);

    let currentChat = chat;
    if (!currentChat) {
      currentChat = await createChat();
      if (!currentChat) { setSending(false); return; }
    }

    const orderItems = newOrderText
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .join(', ');

    const { error } = await supabase.from('support_messages').insert({
      chat_id: currentChat.id,
      sender_id: user.id,
      sender_type: 'user',
      message_type: 'order',
      message: `🧾 ORDER REQUEST:\n${orderItems}`
    });

    if (error) {
      toast.error('Failed to send order');
    } else {
      toast.success('Order sent to admin!');
      setNewOrderText('');
      setActiveTab('chat'); // Switch to chat to see the order in context
    }
    setSending(false);
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const orderMessages = messages.filter(m => m.message_type === 'order');
  const chatMessages = messages; // Show all messages in chat including orders

  const getOrderStatus = (order: Message) => {
    // Check if there's an admin response after the order
    const orderIndex = messages.findIndex(m => m.id === order.id);
    const hasAdminResponse = messages.slice(orderIndex + 1).some(m => m.sender_type === 'admin');
    return hasAdminResponse ? 'processing' : 'pending';
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => { setIsOpen(true); setIsMinimized(false); markAsRead(); }}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-xl bg-gradient-to-br from-primary/90 to-primary text-primary-foreground flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_50px_hsl(var(--primary)/0.7)] transition-all border border-primary/50 group"
      >
        <Terminal className="w-7 h-7 group-hover:scale-110 transition-transform" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white text-xs flex items-center justify-center font-bold animate-bounce shadow-lg">
            {unreadCount}
          </span>
        )}
        {hasNewMessage && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-primary px-2 py-0.5 rounded-full text-primary-foreground font-mono animate-pulse">
            NEW
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          ref={dragRef}
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          className={`fixed top-0 left-0 z-50 select-none w-[380px] sm:w-[420px] ${isMinimized ? 'h-14' : 'h-[560px]'} transition-all`}
        >
          {/* Terminal Chrome Header */}
          <div
            onMouseDown={onMouseDown}
            className="cursor-move flex items-center justify-between px-4 py-3 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-b border-primary/30 rounded-t-xl"
          >
            <div className="flex items-center gap-3">
              {/* Window controls */}
              <div className="flex gap-1.5">
                <button onClick={() => setIsOpen(false)} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors" />
                <button onClick={() => setIsMinimized(!isMinimized)} className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${supportStatus === 'open' ? 'bg-green-500 animate-pulse' : supportStatus === 'busy' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="font-mono text-primary text-sm tracking-wider">SUPPORT://TERMINAL</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100%-56px)] flex flex-col bg-gradient-to-b from-zinc-900 to-black rounded-b-xl border border-t-0 border-primary/20 overflow-hidden">
              {/* Tab Navigation */}
              <TabsList className="flex shrink-0 bg-black/80 border-b border-primary/20 p-1 gap-1">
                <TabsTrigger value="chat" className="flex-1 font-mono text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded transition-all">
                  <MessageCircle className="w-3 h-3 mr-1.5" />
                  CHAT
                  {unreadCount > 0 && (
                    <span className="ml-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unreadCount}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex-1 font-mono text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded transition-all">
                  <ClipboardList className="w-3 h-3 mr-1.5" />
                  ORDERS
                  {orderMessages.length > 0 && (
                    <span className="ml-1.5 text-[10px] text-amber-400">({orderMessages.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="exchange" className="flex-1 font-mono text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary rounded transition-all">
                  <Bitcoin className="w-3 h-3 mr-1.5" />
                  EXCHANGE
                </TabsTrigger>
              </TabsList>

              {/* CHAT TAB */}
              <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
                {/* Status Banner */}
                <div className="px-4 py-2 border-b border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Zap className={`w-3 h-3 ${supportStatus === 'open' ? 'text-green-400' : 'text-amber-400'}`} />
                      <span className="text-muted-foreground">
                        Status: <span className={supportStatus === 'open' ? 'text-green-400' : 'text-amber-400'}>{supportStatus.toUpperCase()}</span>
                      </span>
                    </div>
                    {chat && <span className="text-primary/60">Session: {chat.id.slice(0, 8)}</span>}
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <Terminal className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p className="font-mono text-sm mb-1">AWAITING_INPUT://</p>
                      <p className="text-xs opacity-70">Start a conversation with support</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-4 py-3 rounded-xl text-sm relative ${
                          msg.sender_type === 'user'
                            ? msg.message_type === 'order'
                              ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-200 border border-amber-500/30'
                              : 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary border border-primary/20'
                            : msg.sender_type === 'telegram'
                              ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-zinc-800/80 text-foreground border border-zinc-700/50'
                        }`}>
                          {msg.sender_type !== 'user' && (
                            <p className="text-[10px] text-muted-foreground mb-1 font-mono flex items-center gap-1">
                              {msg.sender_type === 'telegram' ? '📱 TELEGRAM' : '⚡ ADMIN'}
                            </p>
                          )}
                          {msg.message_type === 'order' && msg.sender_type === 'user' && (
                            <p className="text-[10px] text-amber-400 mb-1 font-mono flex items-center gap-1">
                              <ClipboardList className="w-3 h-3" /> ORDER REQUEST
                            </p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          {msg.file_url && <img src={msg.file_url} alt="attachment" className="mt-2 rounded max-w-full" />}
                          <p className="text-[10px] text-muted-foreground mt-2 text-right flex items-center justify-end gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="shrink-0 p-3 border-t border-primary/20 bg-zinc-900/80">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder={supportStatus === 'closed' ? '// Support offline' : '// Type message...'}
                      className="flex-1 bg-black/50 border-primary/30 text-sm font-mono focus:border-primary/50 focus:ring-primary/20"
                      disabled={supportStatus === 'closed'}
                    />
                    <Button onClick={sendMessage} disabled={sending || !newMessage.trim() || supportStatus === 'closed'} size="sm" className="px-4 bg-primary/80 hover:bg-primary">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* ORDERS TAB */}
              <TabsContent value="orders" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
                {/* Info Banner */}
                <div className="px-4 py-3 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-300">
                    <Sparkles className="w-4 h-4" />
                    <span>Orders are sent directly to admin support queue</span>
                  </div>
                </div>

                {/* Order Input */}
                <div className="p-4 border-b border-primary/10">
                  <textarea
                    placeholder="// Enter order details (items separated by commas)&#10;// Example: Item 1, Item 2, Special request..."
                    value={newOrderText}
                    onChange={e => setNewOrderText(e.target.value)}
                    className="w-full h-24 px-4 py-3 text-sm bg-black/60 border-2 border-primary/40 rounded-lg resize-none font-mono placeholder:text-primary/40 focus:outline-none focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)] transition-all"
                  />
                  <Button
                    onClick={addManualOrder}
                    disabled={sending || !newOrderText.trim() || supportStatus === 'closed'}
                    className="w-full mt-2 bg-gradient-to-r from-amber-500/80 to-orange-500/80 hover:from-amber-500 hover:to-orange-500 text-white font-mono"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    SUBMIT ORDER TO ADMIN
                  </Button>
                </div>

                {/* Orders List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {orderMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <ClipboardList className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="font-mono text-sm text-muted-foreground">NO_ORDERS_YET://</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Submit an order above</p>
                    </div>
                  ) : (
                    orderMessages.map(order => {
                      const status = getOrderStatus(order);
                      return (
                        <div
                          key={order.id}
                          className="p-4 rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 hover:border-amber-500/50 transition-all"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs text-amber-400">REF: {order.id.slice(0, 8)}</span>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-mono flex items-center gap-1 ${
                              status === 'processing' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {status === 'processing' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                              {status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap mb-2">{order.message.replace('🧾 ORDER REQUEST:\n', '')}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.created_at).toLocaleString()}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              {/* EXCHANGE TAB */}
              <TabsContent value="exchange" className="flex-1 m-0 p-0 overflow-hidden">
                <CryptoExchange />
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </>
  );
}
