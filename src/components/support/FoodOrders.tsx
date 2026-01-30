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
    if (userId) fetchOrders();
  }, [userId]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('food_orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch orders:', error);
    } else {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-400',
    preparing: 'bg-blue-400',
    delivered: 'bg-green-500',
  };

  if (loading) return <p className="p-4 text-sm text-muted-foreground">Loading orders...</p>;
  if (orders.length === 0) return <p className="p-4 text-sm text-muted-foreground">No orders found.</p>;

  return (
    <div className="flex flex-col p-4 space-y-3">
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
    </div>
  );
}
