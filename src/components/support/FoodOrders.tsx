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

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('food_orders')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => data && setOrders(data as Order[]));
  }, [userId]);

  return (
    <div className="p-4">
      <h3 className="font-bold mb-2">Food Orders</h3>
      {orders.length === 0 ? <p>No orders yet</p> : orders.map(o => (
        <div key={o.id} className="border p-2 mb-2 rounded">{o.items.join(', ')} — {o.status}</div>
      ))}
    </div>
  );
}

