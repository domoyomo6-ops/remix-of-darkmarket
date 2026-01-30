import { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Minus,
  Maximize2,
  Send,
  Bitcoin,
  BellRing,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import CryptoExchange from './CryptoExchange';
import FoodOrders from './FoodOrders';

export default function SupportChatBox() {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[9999] w-12 h-12 rounded-full bg-black border border-green-500/40 shadow-[0_0_25px_rgba(0,255,0,0.15)] flex items-center justify-center"
          style={{ transform: 'translateZ(0)' }}
        >
          <MessageCircle className="text-green-400 w-5 h-5" />
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-4 right-4 z-[9999] w-[360px] h-[460px] bg-black border border-green-500/30 rounded-md shadow-[0_0_40px_rgba(0,255,0,0.12)] flex flex-col"
          style={{
            transform: 'translateZ(0)',
            willChange: 'transform',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-green-500/20 bg-black">
            <span className="text-xs font-mono text-green-400 tracking-wide">
              SUPPORT TERMINAL
            </span>
            <div className="flex gap-1">
              <button onClick={() => setMinimized(!minimized)}>
                {minimized ? (
                  <Maximize2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Minus className="w-4 h-4 text-green-400" />
                )}
              </button>
              <button onClick={() => setOpen(false)}>
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>

          {!minimized && (
            <Tabs defaultValue="chat" className="flex-1 flex flex-col">
              <TabsList className="grid grid-cols-3 bg-black border-b border-green-500/20">
                <TabsTrigger value="chat" className="text-xs font-mono">
                  CHAT
                </TabsTrigger>
                <TabsTrigger value="exchange" className="text-xs font-mono">
                  <Bitcoin className="w-3 h-3 mr-1 inline" />
                  EXCHANGE
                </TabsTrigger>
                <TabsTrigger value="orders" className="text-xs font-mono">
                  ORDERS
                </TabsTrigger>
              </TabsList>

              {/* CHAT */}
              <TabsContent value="chat" className="flex-1 flex flex-col">
                <div className="flex-1 px-3 py-2 space-y-2 text-sm font-mono text-green-100">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`${
                        m.sender === 'user'
                          ? 'text-right text-green-400'
                          : 'text-left text-green-200'
                      }`}
                    >
                      {m.message}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* INPUT — ALWAYS BOTTOM */}
                <div className="border-t border-green-500/20 p-2">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type message…"
                      className="bg-black border-green-500/30 text-green-200 font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={sending}
                      onClick={() => {
                        if (!newMessage.trim()) return;
                        setMessages((p) => [
                          ...p,
                          { sender: 'user', message: newMessage },
                        ]);
                        setNewMessage('');
                      }}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* EXCHANGE */}
              <TabsContent value="exchange" className="flex-1 p-2">
                <CryptoExchange />
              </TabsContent>

              {/* ORDERS */}
              <TabsContent value="orders" className="flex-1 p-2">
                <FoodOrders userId={user.id} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </>
  );
}







