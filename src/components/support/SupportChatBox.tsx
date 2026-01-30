import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle, X, Send, Minus, Maximize2, Bitcoin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import CryptoExchange from './CryptoExchange';

interface Message {
  id: string;
  sender_type: 'user' | 'admin' | 'telegram';
  message: string;
  created_at: string;
}

interface ManualOrder {
  id: string;
  items: string[];
  created_at: string;
}

export default function SupportChatBox() {
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [orderText, setOrderText] = useState('');

  // ADMIN TAKEOVER
  const [adminActive, setAdminActive] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);

  /* -------------------------
     REALTIME CHAT + ADMIN
  --------------------------*/
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel('support-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const msg = payload.new as Message;

          setMessages(prev => [...prev, msg]);

          if (msg.sender_type === 'admin') {
            setAdminActive(true);
            setAdminMessage(msg.message);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return null;

  /* -------------------------
     SEND MESSAGE
  --------------------------*/
  const sendMessage = async () => {
    if (!newMessage.trim() || adminActive) return;

    await supabase.from('support_messages').insert({
      sender_type: 'user',
      message: newMessage.trim(),
    });

    setMessages(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender_type: 'user',
        message: newMessage,
        created_at: new Date().toISOString(),
      },
    ]);

    setNewMessage('');
  };

  /* -------------------------
     MANUAL ORDER
  --------------------------*/
  const addOrder = () => {
    if (!orderText.trim()) return;

    setOrders(prev => [
      {
        id: crypto.randomUUID(),
        items: orderText.split(',').map(i => i.trim()),
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    setOrderText('');
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="
            fixed bottom-4 right-4 z-50
            w-11 h-11 rounded-sm
            bg-[#0b0c0d] border border-[#2a2d2f]
            flex items-center justify-center
          "
        >
          <MessageCircle size={16} className="text-[#f5a623]" />
        </button>
      )}

      {isOpen && (
        <div
          className="
            fixed bottom-4 right-4 z-50
            w-[340px] h-[400px]
            bg-[#0b0c0d]
            border border-[#2a2d2f]
            rounded-sm
            shadow-[0_12px_30px_rgba(0,0,0,0.6)]
            flex flex-col
            relative
          "
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#101214] border-b border-[#2a2d2f]">
            <span className="font-mono text-xs text-[#f5a623]">
              SUPPORT TERMINAL
            </span>
            <div className="flex gap-1">
              <button onClick={() => setIsMinimized(!isMinimized)}>
                {isMinimized ? <Maximize2 size={14} /> : <Minus size={14} />}
              </button>
              <button onClick={() => setIsOpen(false)}>
                <X size={14} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <Tabs defaultValue="chat" className="flex-1 flex flex-col">
              {/* TABS */}
              <TabsList className="bg-[#101214] border-b border-[#2a2d2f]">
                <TabsTrigger value="chat" className="text-xs font-mono text-[#f5a623]">
                  CHAT
                </TabsTrigger>
                <TabsTrigger value="exchange" className="text-xs font-mono text-[#f5a623]">
                  <Bitcoin size={12} className="mr-1" /> EXCHANGE
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-xs font-mono text-[#f5a623]">
                  ORDERS
                </TabsTrigger>
              </TabsList>

              {/* CHAT */}
              <TabsContent value="chat" className="flex-1 flex flex-col p-2">
                <div className="flex-1 flex flex-col justify-end gap-1">
                  {messages.map(m => (
                    <div
                      key={m.id}
                      className={`
                        px-2 py-1 text-xs font-mono border border-[#2a2d2f]
                        ${m.sender_type === 'user'
                          ? 'self-end bg-[#101214] text-[#f5a623]'
                          : 'bg-[#0b0c0d] text-[#b58900]'}
                      `}
                    >
                      {m.message}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div className="flex gap-1 border-t border-[#2a2d2f] pt-2">
                  <Input
                    disabled={adminActive}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={adminActive ? 'ADMIN CONTROLLED' : 'Message support'}
                    className="
                      bg-[#101214] border-[#2a2d2f]
                      text-[#f5a623] text-xs font-mono
                    "
                  />
                  <Button size="sm" disabled={adminActive} onClick={sendMessage}>
                    <Send size={14} />
                  </Button>
                </div>
              </TabsContent>

              {/* EXCHANGE */}
              <TabsContent value="exchange" className="flex-1 p-2">
                <CryptoExchange />
              </TabsContent>

              {/* ORDERS */}
              <TabsContent value="orders" className="flex-1 flex flex-col p-2">
                <textarea
                  value={orderText}
                  onChange={(e) => setOrderText(e.target.value)}
                  placeholder="ENTER FULL ORDER (Burger, Fries, Coke)"
                  className="
                    h-[140px] resize-none
                    bg-[#101214] border border-[#2a2d2f]
                    text-[#f5a623] font-mono text-sm p-2
                  "
                />

                <Button onClick={addOrder} className="mt-2">
                  ADD ORDER
                </Button>

                <div className="flex-1 flex flex-col justify-center gap-1 mt-2">
                  {orders.length === 0 ? (
                    <p className="text-xs font-mono text-[#b58900] text-center">
                      NO ORDERS
                    </p>
                  ) : (
                    orders.map(o => (
                      <div
                        key={o.id}
                        className="border border-[#2a2d2f] bg-[#101214] px-2 py-1 text-xs font-mono text-[#f5a623]"
                      >
                        {o.items.join(', ')} — PENDING
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* ADMIN OVERLAY */}
          {adminActive && (
            <div
              className="
                absolute inset-0 z-50
                bg-[#0b0c0d]
                border border-[#f5a623]
                flex flex-col justify-center items-center
                font-mono text-center
              "
            >
              <p className="text-[#f5a623] text-sm tracking-widest">
                ADMIN OVERRIDE ACTIVE
              </p>
              <p className="mt-2 text-[#b58900] text-xs max-w-[85%]">
                {adminMessage}
              </p>
              <p className="mt-4 text-[10px] text-[#6b5f2a]">
                USER INPUT DISABLED
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}






