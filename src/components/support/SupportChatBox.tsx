import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minus, Maximize2, Bitcoin, Loader2, Users, ClipboardList, Sparkles } from 'lucide-react';
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
  const {
    user
  } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [supportStatus, setSupportStatus] = useState<'open' | 'closed' | 'busy'>('open');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [newOrderText, setNewOrderText] = useState('');

  // Drag state
  const [position, setPosition] = useState({
    x: 24,
    y: 24
  });
  const dragRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({
    x: 0,
    y: 0
  });

  // DRAG EVENTS
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };
  const onMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    });
  };
  const onMouseUp = () => {
    dragging.current = false;
  };
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
  useEffect(() => messagesEndRef.current?.scrollIntoView({
    behavior: 'smooth'
  }), [messages]);
  useEffect(() => {
    if (unreadCount > 0) setIsOpen(true);
  }, [unreadCount]);
  const fetchSupportStatus = async () => {
    const {
      data
    } = await supabase.from('site_settings').select('support_status').single();
    if (data?.support_status) setSupportStatus(data.support_status as any);
  };
  const checkExistingChat = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from('support_chats').select('*').eq('user_id', user.id).eq('status', 'open').order('created_at', {
      ascending: false
    }).limit(1).maybeSingle();
    if (data) setChat(data), fetchMessages(data.id);
  };
  const fetchMessages = async (chatId: string) => {
    const {
      data
    } = await supabase.from('support_messages').select('*').eq('chat_id', chatId).order('created_at', {
      ascending: true
    });
    if (data) {
      setMessages(data as Message[]);
      const unread = data.filter(m => !m.is_read && m.sender_type !== 'user').length;
      setUnreadCount(unread);
      if (unread > 0) setHasNewMessage(true), setIsOpen(true);
    }
  };
  const createChat = async () => {
    if (!user) return null;
    const {
      data,
      error
    } = await supabase.from('support_chats').insert({
      user_id: user.id
    }).select().single();
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
    const {
      error
    } = await supabase.from('support_messages').insert({
      chat_id: currentChat.id,
      sender_id: user.id,
      sender_type: 'user',
      message: newMessage.trim()
    });
    if (error) toast.error('Failed to send message');else setNewMessage(''), setUnreadCount(0), setHasNewMessage(false);
    setSending(false);
  };
  const markAsRead = async () => {
    if (!chat) return;
    await supabase.from('support_messages').update({
      is_read: true
    }).eq('chat_id', chat.id).eq('is_read', false);
    setUnreadCount(0);
    setHasNewMessage(false);
  };
  const addManualOrder = async () => {
    if (!newOrderText.trim()) return;
    if (!user) return;
    setSending(true);

    let currentChat = chat;
    if (!currentChat) {
      currentChat = await createChat();
      if (!currentChat) {
        setSending(false);
        return;
      }
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
      message: `Order: ${orderItems}`
    });

    if (error) {
      toast.error('Failed to send order');
    } else {
      setNewOrderText('');
      setUnreadCount(0);
      setHasNewMessage(false);
    }
    setSending(false);
  };
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  const statusColors = {
    open: 'bg-green-500',
    closed: 'bg-red-500',
    busy: 'bg-amber-500'
  };
  const orderMessages = messages.filter(message => message.message_type === 'order');
  const formatOrderItems = (message: string) => {
    const clean = message.replace(/^Order:\s*/i, '');
    return clean.split(',').map(item => item.trim()).filter(Boolean);
  };

  if (!user) return null;
  return <>
      <button 
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
          markAsRead();
        }} 
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all"
      >
        {hasNewMessage ? <Users className="w-6 h-6 animate-pulse" /> : <MessageCircle className="w-6 h-6" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && <div ref={dragRef} style={{
      transform: `translate(${position.x}px, ${position.y}px)`
    }} className={`fixed top-0 left-0 z-50 select-none w-[360px] sm:w-[400px] ${isMinimized ? 'h-12' : 'h-[500px]'}`}>
          {/* HEADER */}
          <div onMouseDown={onMouseDown} className="cursor-move flex items-center justify-between px-4 py-3 bg-zinc-800 border-b border-primary/20">
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

          {!isMinimized && <Tabs defaultValue="chat" className="h-[calc(100%-48px)] flex flex-col bg-black/95">
              <TabsList className="flex shrink-0 bg-black/50 border-b border-primary/20">
                <TabsTrigger value="chat" className="flex-1 font-mono text-xs">
                  💬 Chat {unreadCount > 0 && <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unreadCount}</span>}
                </TabsTrigger>
                <TabsTrigger value="exchange" className="flex-1 font-mono text-xs"><Bitcoin className="w-3 h-3 mr-1" /> Exchange</TabsTrigger>
                <TabsTrigger value="orders" className="flex-1 font-mono text-xs"><ClipboardList className="w-3 h-3 mr-1" /> Orders</TabsTrigger>
              </TabsList>

              {/* CHAT */}
              <TabsContent value="chat" className="flex-1 flex flex-col m-0 p-0">
                <div className="px-4 py-3 border-b border-primary/20 bg-black/70">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusColors[supportStatus]}`} />
                      <span>Support status: {supportStatus}</span>
                    </div>
                    {chat && <span className="text-[10px] text-green-400">Chat ID: {chat.id.slice(0, 8)}…</span>}
                  </div>
                  <p className="text-[11px] text-green-300/80 mt-1">We keep your orders and messages in one thread so admins see everything instantly.</p>
                </div>
                <div className="flex-1 flex flex-col justify-end p-4 space-y-3">
                  {messages.length === 0 ? <div className="text-center text-muted-foreground text-sm py-8">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Start a conversation</p>
                      <p className="text-xs mt-1">We typically reply within minutes</p>
                    </div> : messages.map(msg => <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.sender_type === 'user' ? 'bg-primary/20 text-primary' : msg.sender_type === 'telegram' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-foreground'}`}>
                          {msg.sender_type !== 'user' && <p className="text-[10px] text-muted-foreground mb-1">{msg.sender_type === 'telegram' ? '📱 Telegram' : '👤 Admin'}</p>}
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                          {msg.file_url && <img src={msg.file_url} alt="attachment" className="mt-2 rounded max-w-full" />}
                          <p className="text-[10px] text-muted-foreground mt-1 text-right">{formatTime(msg.created_at)}</p>
                        </div>
                      </div>)}
                  <div ref={messagesEndRef} />
                </div>

                <div className="shrink-0 p-3 border-t border-primary/20 bg-zinc-900">
                  <div className="flex gap-2">
                  <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder={supportStatus === 'closed' ? 'Support is currently closed' : 'Type a message...'} className="flex-1 bg-black/50 border-primary/30 text-sm" disabled={supportStatus === 'closed'} />
                    <Button onClick={sendMessage} disabled={sending || !newMessage.trim() || supportStatus === 'closed'} size="sm" className="px-3">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* EXCHANGE */}
              <TabsContent value="exchange" className="flex-1 m-0 p-0 overflow-hidden"><CryptoExchange /></TabsContent>

              {/* ORDERS */}
              <TabsContent value="orders" className="flex-1 flex flex-col m-0 p-4 gap-3 bg-black/95">
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-black/70">
                  <div>
                    <p className="text-xs font-mono text-green-300 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Orders route straight to admin support.</p>
                    <p className="text-[10px] text-muted-foreground">Keep details concise: items, size, quantity, and notes.</p>
                  </div>
                  <span className="text-[10px] text-green-400 font-mono">Visible to admins</span>
                </div>

                <textarea placeholder="Type your full order here, items separated by commas (e.g., Burger, Fries, Coke)" value={newOrderText} onChange={e => setNewOrderText(e.target.value)} className="flex-1 w-full px-4 py-3 text-white bg-black/90 border-2 border-primary rounded-lg resize-none font-mono text-sm placeholder:text-green-400 shadow-[0_0_20px_rgba(0,255,0,0.7)] focus:outline-none focus:ring-2 focus:ring-green-400" />
                <button onClick={addManualOrder} disabled={sending || !newOrderText.trim() || supportStatus === 'closed'} className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/80 transition w-full mt-1 disabled:opacity-60 disabled:cursor-not-allowed">
                  {sending ? 'Sending…' : 'Send Order to Admin'}
                </button>

                <div className="flex-1 grid grid-cols-2 gap-3 mt-2">
                  {orderMessages.length === 0 ? <div className="col-span-2 flex items-center justify-center text-sm text-green-400 font-mono bg-zinc-900 rounded-lg shadow-[0_0_10px_rgba(0,255,0,0.5)] p-4">
                      No orders yet. Send one above and it will appear here.
                    </div> : orderMessages.map(order => {
                      const items = formatOrderItems(order.message);
                      return (
                        <div key={order.id} className="p-3 border border-primary/40 rounded-lg bg-gradient-to-br from-zinc-900 to-black shadow-[0_0_10px_rgba(0,255,0,0.5)] flex flex-col justify-between">
                          <p className="font-mono text-xs mb-1">Order Ref: {order.id.slice(0, 6)}…</p>
                          <ul className="text-sm mb-2 space-y-1">
                            {items.length === 0 ? <li className="text-muted-foreground">No items listed.</li> : items.map((item, idx) => (
                              <li key={`${order.id}-${idx}`} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                          <span className="px-2 py-1 rounded text-xs text-white bg-amber-400/90 w-fit">QUEUED</span>
                          <p className="text-[10px] text-green-400 mt-2 text-right">{formatTime(order.created_at)}</p>
                        </div>
                      );
                    })}
                </div>
              </TabsContent>
            </Tabs>}
        </div>}
    </>;
}
