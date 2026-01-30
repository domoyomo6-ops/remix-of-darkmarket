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
  const [orders, setOrders] = useState<Order[]>([]);
  const [newOrderText, setNewOrderText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const items = newOrderText.split(',').map(i => i.trim()).filter(Boolean);
    const newOrder: Order = {
      id: (orders.length + 1).toString(),
      items,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setOrders([newOrder, ...orders]);
    setNewOrderText('');
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const statusColors = { open: 'bg-green-500', closed: 'bg-red-500', busy: 'bg-amber-500' };

  if (!user) return null;

  return (
    <>
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

      {isOpen && (
        <div className={`fixed bottom-4 right-4 z-50 w-[480px] sm:w-[600px] h-[550px] bg-black/95 border border-primary/50 rounded-xl shadow-2xl
          flex flex-col transform-gpu transition-transform duration-300
          hover:rotate-[-1deg] hover:scale-105 hover:shadow-[0_20px_50px_rgba(0,255,0,0.5)]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-green-500 shadow-inner">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-green-400 text-sm">SUPPORT TERMINAL</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded hover:bg-green-700/30 text-green-400">
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded hover:bg-red-500/30 text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <Tabs defaultValue="chat" className="flex-1 flex flex-col perspective-1000">
              <TabsList className="flex bg-black/90 border-b border-green-500">
                <TabsTrigger value="chat" className="flex-1 font-mono text-xs text-green-400">💬 Chat</TabsTrigger>
                <TabsTrigger value="exchange" className="flex-1 font-mono text-xs text-green-400"><Bitcoin className="w-3 h-3 mr-1" /> Exchange</TabsTrigger>
                <TabsTrigger value="orders" className="flex-1 font-mono text-xs text-green-400">🍔 Orders</TabsTrigger>
              </TabsList>

              {/* CHAT */}
              <TabsContent value="chat" className="flex-1 flex flex-col p-4 bg-black/90 transform-gpu">
                <div className="flex-1 flex flex-col justify-end gap-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.sender_type === 'user' ? 'bg-green-900/80 text-green-400' : 'bg-zinc-800 text-white'}`}>
                        {msg.sender_type !== 'user' && <p className="text-[10px] text-green-400 mb-1">{msg.sender_type === 'telegram' ? '📱 Telegram' : '👤 Admin'}</p>}
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        <p className="text-[10px] text-green-400 mt-1 text-right">{formatTime(msg.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type message..."
                      className="flex-1 bg-black/70 border-green-500 text-green-400 font-mono"
                    />
                    <Button onClick={sendMessage} size="sm" className="px-3 bg-green-700 hover:bg-green-600">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* EXCHANGE */}
              <TabsContent value="exchange" className="flex-1 p-4 bg-black/90 transform-gpu">
                <CryptoExchange />
              </TabsContent>

              {/* ORDERS */}
              <TabsContent value="orders" className="flex-1 flex flex-col p-4 bg-black/90 transform-gpu">
                <textarea
                  placeholder="Type full order here (items separated by commas)"
                  value={newOrderText}
                  onChange={(e) => setNewOrderText(e.target.value)}
                  className="w-full h-[220px] resize-none px-3 py-2 rounded border border-green-500 bg-black text-green-400 font-mono text-lg shadow-inner"
                />
                <Button onClick={addManualOrder} className="w-full mt-2 px-3 py-2 bg-green-700 hover:bg-green-600 text-white font-mono text-sm shadow-lg transform-gpu hover:scale-105 hover:shadow-[0_10px_20px_rgba(0,255,0,0.6)]">
                  Add Order
                </Button>
                <div className="flex-1 flex flex-col gap-2 mt-2">
                  {orders.length === 0 ? (
                    <p className="text-green-400 font-mono text-sm flex-1 flex items-center justify-center">No orders yet.</p>
                  ) : orders.map(order => (
                    <div key={order.id} className="p-3 border border-green-500 rounded-lg bg-zinc-900 flex-shrink-0 shadow-md">
                      <p className="font-mono text-xs mb-1">Order ID: {order.id}</p>
                      <p className="text-sm mb-1">Items: {order.items.join(', ')}</p>
                      <span className={`px-2 py-1 rounded text-xs text-white ${order.status === 'pending' ? 'bg-amber-400' : order.status === 'preparing' ? 'bg-blue-400' : 'bg-green-500'}`}>
                        {order.status.toUpperCase()}
                      </span>
                      <p className="text-[10px] text-green-400 mt-1">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </>
  );
}





