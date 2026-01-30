import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'preparing' | 'delivered';
  items: string[];
  created_at: string;
}

interface Props {
  userId: string;
}

export default function FoodOrders({ userId }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) initOrders();
  }, [userId]);

  const initOrders = async () => {
    setLoading(true);

    // 1. Create table if it doesn't exist
    try {
      await supabase.rpc('create_food_orders_table_if_not_exists');
    } catch (err) {
      console.error('Table creation failed:', err);
    }

    // 2. Fetch orders
    await fetchOrders();
    setLoading(false);
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  };

  const createTestOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('food_orders')
        .insert({
          user_id: userId,
          items: ['Pizza', 'Soda'],
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Update orders immediately
      setOrders(prev => [data as Order, ...prev]);
    } catch (err) {
      console.error('Failed to create test order:', err);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-400',
    preparing: 'bg-blue-400',
    delivered: 'bg-green-500',
  };

  if (loading) return <p className="p-4 text-sm text-muted-foreground">Loading orders...</p>;

  return (
    <div className="flex flex-col p-4 space-y-3">
      {orders.length === 0 && (
        <div className="p-4 text-sm text-muted-foreground">
          No orders found.
          <button
            onClick={createTestOrder}
            className="ml-2 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/80"
          >
            Create Test Order
          </button>
        </div>
      )}
      {orders.map(order => (
        <div key={order.id} className="p-3 border border-primary/20 rounded-lg bg-zinc-800">
          <p className="font-mono text-xs mb-1">Order ID: {order.id}</p>
          <p className="text-sm mb-1">Items: {order.items.join(', ')}</p>
          <span className={`px-2 py-1 rounded text-xs text-white ${statusColors[order.status]}`}>
            {order.status.toUpperCase()}
          </span>
          <p className="text-[10px] text-muted-foreground mt-1">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
      ))}

      {orders.length > 0 && (
        <button
          onClick={createTestOrder}
          className="mt-2 px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/80"
        >
          Create Test Order
        </button>
      )}
    </div>
  );
}

