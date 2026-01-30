import { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, X, Send, Minus, Maximize2, Bitcoin, BellRing, Loader2 
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

interface Order {
  id: string;
  items: string[];
  status: 'pending' | 'preparing' | 'delivered';
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

  // Orders manual
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOrderText, setNewOrderText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat and support status
  useEffect(() => {
    if (user) {
      checkExistingChat();
      fetchSupportStatus();
    }
  }, [user]);

  useEffect(() => {
    if (!chat) return;
    const channel = supabase
      .channel(`support_messages_${chat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `chat_id=eq.${chat.id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
          if (newMsg.sender_type !== 'user' && (isMinimized || !isOpen)) {
            setUnreadCount(prev => prev + 1);
            setHasNewMessage(true);
            setIsOpen(true);
            setIsMinimized(false);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [chat, isOpen, isMinimized]);

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);
  useEffect(() => { if (unreadCount > 0) setIsOpen(true); }, [unreadCount]);

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
    if (data) setChat(data), fetchMessages(data.id);
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
      if (unread > 0) setHasNewMessage(true), setIsOpen(true);
    }
  };

  const createChat = async () => {
    if (!user) return null;
    const { data, error } = await supabase.from('support_chats').insert({ user_id: user.id }).select().single();
    if (error) return toast.error('Failed to start chat'), null;
    setChat(data);
    return data;
  };

  const sendMessage = async () => {
    if (!user || !newMessage.trim()) return;
    setSending(true);
    let currentChat = chat;
    if (!currentChat) {
      currentChat = await createChat();
      if (!currentChat) return setSending(false);
    }
    const { error } = await supabase.from('support_messages').insert({
      chat_id: currentChat.id,
      sender_id: user.id,
      sender_type: 'user',
      message: newMessage.trim(),
    });
    if (error) toast.error('Failed to send message');
    else setNewMessage(''), setUnreadCount(0), setHasNewMessage(false);
    setSending(false);
  };

  const markAsRead = async () => {
    if (!chat) return;
    await supabase.from('support_messages').update({ is_read: true }).eq('chat_id', chat.id).eq('is_read', false);
    setUnreadCount(0);
    setHasNewMessage(false);
  };

  const addManualOrder = () => {
    if (!newOrderText.trim()) return;
    const newOrder: Order = {
      id: `${Date.now()}`,
      items: newOrderText.split(',').map(item => item.trim()),
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setOrders(prev => [newOrder, ...prev]);
    setNewOrderText('');
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const statusColors = { open: 'bg-green-500', closed: 'bg-red-500', busy: 'bg-amber-500' };

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => { setIsOpen(true); setIsMinimized(false); markAsRead(); }}
        className={`fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg 
          hover:scale-110 transition-all duration-300 flex items-center justify-center
          ${hasNewMessage ? 'animate-bounce' : ''} 
          ${isOpen && !isMinimized ? 'hidden' : ''}`}
      >
        {hasNewMessage ? <BellRing className="w-6 h-6 animate-pulse" /> : <MessageCircle className="w-6 h-6" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Support Box */}
      {isOpen && (
        <div className={`fixed bottom-4 right-4 z-50 w-[360px] sm:w-[600px] lg:w-[700px] bg-zinc-900 border border-primary/30 rounded-lg shadow-2xl shadow-primary/20 overflow-hidden transition-all duration-300
          ${isMinimized ? 'h-12' : 'h-[600px]'}`}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${statusColors[supportStatus]}`} />
              <span className="font-mono text-primary text-sm">SUPPORT TERMINAL</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white">
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          {!isMinimized && (
            <Tabs defaultValue="chat" className="h-[calc(100%-48px)] flex flex-col">
              <TabsList className="flex shrink-0 bg-black/50 border-b border-primary/20">
                <TabsTrigger value="chat" className="flex-1 font-mono text-xs">💬 Chat {unreadCount>0 && <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unreadCount}</span>}</TabsTrigger>
                <TabsTrigger value="exchange" className="flex-1 font-mono text-xs"><Bitcoin className="w-3 h-3 mr-1"/> Exchange</TabsTrigger>
                <TabsTrigger value="orders" className="flex-1 font-mono text-xs">🍔 Orders</TabsTrigger>
              </TabsList>

              {/* Chat Tab */}
              <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
                {supportStatus==='closed' && <div className="px-4 py-2 bg-red-500/20 text-red-400 text-xs font-mono text-center">Support is currently closed</div>}
                {supportStatus==='busy' && <div className="px-4 py-2 bg-amber-500/20 text-amber-400 text-xs font-mono text-center">High volume - expect delays</div>}

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length===0 ? (
                    <p className="text-sm text-muted-foreground text-center mt-4">No messages yet.</p>
                  ) : messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type==='user'?'justify-end':'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.sender_type==='user'?'bg-primary/20 text-primary':msg.sender_type==='telegram'?'bg-blue-500/20 text-blue-400':'bg-zinc-800 text-foreground'}`}>
                        {msg.sender_type!=='user' && <p className="text-[10px] text-muted-foreground mb-1">{msg.sender_type==='telegram'?'📱 Telegram':'👤 Admin'}</p>}
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        {msg.file_url && <img src={msg.file_url} alt="attachment" className="mt-2 rounded max-w-full"/>}
                        <p className="text-[10px] text-muted-foreground mt-1 text-right">{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="shrink-0 flex gap-2 p-3 border-t border-primary/20 bg-zinc-900">
                  <Input value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()} placeholder="Type a message..." className="flex-1 bg-black/50 border-primary/30 text-sm"/>
                  <Button onClick={sendMessage} disabled={!newMessage.trim()} size="sm"><Send className="w-4 h-4"/></Button>
                </div>
              </TabsContent>

              {/* Exchange Tab */}
              <TabsContent value="exchange" className="flex-1 m-0 p-0 overflow-y-auto"><CryptoExchange /></TabsContent>

              {/* Orders Tab - CCTV TV style */}
              <TabsContent value="orders" className="flex-1 flex flex-col p-4 bg-black/95 space-y-2">
                {/* TV panel */}
                <textarea
                  placeholder="Type your full order here, items separated by commas (e.g., Burger, Fries, Coke)"
                  value={newOrderText}
                  onChange={e=>setNewOrderText(e.target.value)}
                  className="flex-[2] w-full h-[200px] resize-none px-3 py-2 rounded border border-primary/30 bg-black text-white placeholder:text-muted-foreground font-mono text-lg"
                />
                <Button onClick={addManualOrder} className="w-full px-3 py-2 bg-primary text-white rounded hover:bg-primary/80 transition">
                  Add Order
                </Button>

                {/* Orders list */}
                <div className="flex-[3] flex flex-col mt-2 gap-2">
                  {orders.length===0 ? (
                    <p className="text-sm text-muted-foreground text-center mt-4 flex-1 flex items-center justify-center">No orders yet. Type your order above and click "Add Order".</p>
                  ) : orders.map(order=>(
                    <div key={order.id} className="p-3 border border-primary/20 rounded-lg bg-zinc-800 flex-shrink-0">
                      <p className="font-mono text-xs mb-1">Order ID: {order.id}</p>
                      <p className="text-sm mb-1">Items: {order.items.join(', ')}</p>
                      <span className={`px-2 py-1 rounded text-xs text-white ${order.status==='pending'?'bg-amber-400':order.status==='preparing'?'bg-blue-400':'bg-green-500'}`}>
                        {order.status.toUpperCase()}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {/* Chat below TV */}
                <div className="flex-[1] flex flex-col mt-4 border-t border-primary/20 pt-2">
                  <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
                    {messages.length===0 ? (
                      <p className="text-sm text-muted-foreground text-center mt-4 flex-1 flex items-center justify-center">
                        No messages yet.
                      </p>
                    ) : messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_type==='user'?'justify-end':'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.sender_type==='user'?'bg-primary/20 text-primary':msg.sender_type==='telegram'?'bg-blue-500/20 text-blue-400':'bg-zinc-800 text-foreground'}`}>
                          {msg.sender_type!=='user' && <p className="text-[10px] text-muted-foreground mb-1">{msg.sender_type==='telegram'?'📱 Telegram':'👤 Admin'}</p>}
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          {msg.file_url && <img src={msg.file_url} alt="attachment" className="mt-2 rounded max-w-full"/>}
                          <p className="text-[10px] text-muted-foreground mt-1 text-right">{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="shrink-0 flex gap-2 mt-2">
                    <Input value={newMessage} onChange={e=>setNewMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()} placeholder="Type a message..." className="flex-1 bg-black/50 border-primary/30 text-sm"/>
                    <Button onClick={sendMessage} disabled={!newMessage.trim()} size="sm"><Send className="w-4 h-4"/></Button>
                  </div>
                </div>
              </TabsContent>

            </Tabs>
          )}
        </div>
      )}
    </>
  );
}





