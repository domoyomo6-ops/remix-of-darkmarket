import { useState } from 'react';

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
  const [newOrderText, setNewOrderText] = useState('');

  const addManualOrder = () => {
    if (!newOrderText.trim()) return;

    const order: Order = {
      id: (Math.random() * 100000).toFixed(0), // temporary ID
      user_id: userId,
      status: 'pending',
      items: newOrderText.split(',').map(i => i.trim()),
      created_at: new Date().toISOString(),
    };

    setOrders([order, ...orders]);
    setNewOrderText('');
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-400',
    preparing: 'bg-blue-400',
    delivered: 'bg-green-500',
  };

  return (
    <div className="flex flex-col h-full w-full p-4 space-y-3">
      {/* Manual Order Input */}
      <div className="flex flex-col mb-3">
        <textarea
          placeholder="Type your full order here, items separated by commas (e.g., Burger, Fries, Coke)"
          value={newOrderText}
          onChange={(e) => setNewOrderText(e.target.value)}
          className="flex-1 resize-none px-3 py-2 rounded border border-primary/30 bg-black/50 text-sm text-white mb-2"
        />
        <button
          onClick={addManualOrder}
          className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/80 transition w-full"
        >
          Add Order
        </button>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {orders.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">
            No orders yet. Type your order above and click "Add Order".
          </p>
        ) : (
          orders.map(order => (
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
          ))
        )}
      </div>
    </div>
  );
}
