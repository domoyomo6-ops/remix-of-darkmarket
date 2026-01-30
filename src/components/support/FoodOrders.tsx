import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Order {
  id: string;
  items: string[];
  status: 'pending' | 'preparing' | 'delivered';
  created_at: string;
}

interface FoodOrdersProps {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}

export default function FoodOrders({ orders, setOrders }: FoodOrdersProps) {
  const { user } = useAuth();
  const [newOrderText, setNewOrderText] = useState('');

  const addManualOrder = async () => {
    if (!newOrderText.trim()) return;

    const items = newOrderText.split(',').map((i) => i.trim()).filter(Boolean);
    
    if (items.length === 0) {
      toast.error('Please enter at least one item');
      return;
    }

    // Create optimistic order
    const tempId = `temp-${Date.now()}`;
    const newOrder: Order = {
      id: tempId,
      items,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setNewOrderText('');

    // If user is logged in, save to database
    if (user) {
      const { data, error } = await supabase
        .from('food_orders')
        .insert({
          user_id: user.id,
          items,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to save order');
        setOrders((prev) => prev.filter((o) => o.id !== tempId));
      } else if (data) {
        setOrders((prev) =>
          prev.map((o) => (o.id === tempId ? { ...data, status: data.status as Order['status'] } : o))
        );
        toast.success('Order placed!');
      }
    } else {
      toast.success('Order added locally');
    }
  };

  return (
    <div className="h-full w-full bg-black/95 flex flex-col">
      {/* TOP: Order Input */}
      <div className="h-[55%] p-4">
        <textarea
          placeholder="TYPE ORDER — ITEMS SEPARATED BY COMMAS"
          value={newOrderText}
          onChange={(e) => setNewOrderText(e.target.value)}
          className="
            w-full h-full
            px-6 py-4
            bg-black
            text-primary
            font-mono text-lg tracking-wide
            border-2 border-primary/60
            rounded-lg
            resize-none
            outline-none
            placeholder:text-primary/50
            shadow-[inset_0_0_25px_hsl(var(--primary)/0.35),0_0_30px_hsl(var(--primary)/0.25)]
          "
        />
      </div>

      {/* BUTTON BAR */}
      <div className="px-4 pb-2">
        <button
          onClick={addManualOrder}
          className="
            w-full py-2
            bg-primary/80
            text-primary-foreground font-mono text-sm tracking-widest
            rounded
            hover:bg-primary
            transition
            shadow-[0_0_15px_hsl(var(--primary)/0.4)]
          "
        >
          CONFIRM ORDER
        </button>
      </div>

      {/* BOTTOM: Order Panels */}
      <div className="h-[35%] px-4 pb-4 grid grid-cols-2 gap-3">
        {orders.length === 0 ? (
          <div className="col-span-2 flex items-center justify-center font-mono text-primary text-sm border border-primary/40 rounded bg-black shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
            NO ACTIVE ORDERS
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="
                p-3
                bg-black
                border border-primary/40
                rounded
                font-mono text-xs text-primary
                shadow-[inset_0_0_15px_hsl(var(--primary)/0.25)]
              "
            >
              <div className="opacity-70 mb-1">ORDER #{order.id.slice(0, 6)}</div>
              <div className="text-sm mb-2">{order.items.join(', ')}</div>
              <div className="text-[10px] uppercase tracking-widest">
                STATUS: {order.status}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
