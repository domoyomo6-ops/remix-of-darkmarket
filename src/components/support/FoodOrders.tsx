<TabsContent value="orders" className="flex-1 flex flex-col m-0 p-0 bg-black/90">
  <div className="flex-1 flex flex-col p-4 gap-2">
    {/* Manual order input */}
    <textarea
      placeholder="Type your full order here, items separated by commas (e.g., Burger, Fries, Coke)"
      value={newOrderText}
      onChange={(e) => setNewOrderText(e.target.value)}
      className="w-full resize-none px-3 py-2 rounded border border-primary/30 bg-black text-sm text-white placeholder:text-muted-foreground"
    />
    <button
      onClick={addManualOrder}
      className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/80 transition w-full"
    >
      Add Order
    </button>

    {/* Orders grid resembling CCTV monitors */}
    <div className="flex-1 grid grid-cols-2 gap-3 mt-2">
      {orders.length === 0 ? (
        <div className="col-span-2 flex items-center justify-center text-sm text-muted-foreground bg-zinc-900 rounded-lg">
          No orders yet. Type your order above and click "Add Order".
        </div>
      ) : (
        orders.map(order => (
          <div key={order.id} className="p-3 border border-primary/40 rounded-lg bg-zinc-800 shadow-lg flex flex-col justify-between">
            <p className="font-mono text-xs mb-1">Order ID: {order.id}</p>
            <p className="text-sm mb-1">Items: {order.items.join(', ')}</p>
            <span className={`px-2 py-1 rounded text-xs text-white ${order.status === 'pending' ? 'bg-amber-400' : order.status === 'preparing' ? 'bg-blue-400' : 'bg-green-500'}`}>
              {order.status.toUpperCase()}
            </span>
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{new Date(order.created_at).toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
  </div>
</TabsContent>

