<TabsContent value="orders" className="flex-1 flex flex-col m-0 p-0 bg-black/95">
  <div className="flex-1 flex flex-col p-4 gap-2">
    {/* Big CCTV-style textarea */}
    <textarea
      placeholder="Type your full order here, items separated by commas (e.g., Burger, Fries, Coke)"
      value={newOrderText}
      onChange={(e) => setNewOrderText(e.target.value)}
      className="flex-1 w-full px-4 py-3 text-white bg-black/90 border-2 border-primary rounded-lg resize-none font-mono text-sm placeholder:text-green-400 shadow-[0_0_20px_rgba(0,255,0,0.7)] focus:outline-none focus:ring-2 focus:ring-green-400"
    />

    {/* Add Order button */}
    <button
      onClick={addManualOrder}
      className="px-3 py-2 bg-primary text-white rounded hover:bg-primary/80 transition w-full mt-2"
    >
      Add Order
    </button>

    {/* Orders displayed like CCTV panels */}
    <div className="flex-1 grid grid-cols-2 gap-3 mt-2">
      {orders.length === 0 ? (
        <div className="col-span-2 flex items-center justify-center text-sm text-green-400 font-mono bg-zinc-900 rounded-lg shadow-[0_0_10px_rgba(0,255,0,0.5)] p-4">
          No orders yet. Type your order above and click "Add Order".
        </div>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="p-3 border border-primary/40 rounded-lg bg-zinc-900 shadow-[0_0_10px_rgba(0,255,0,0.5)] flex flex-col justify-between"
          >
            <p className="font-mono text-xs mb-1">Order ID: {order.id}</p>
            <p className="text-sm mb-1">Items: {order.items.join(', ')}</p>
            <span
              className={`px-2 py-1 rounded text-xs text-white ${
                order.status === 'pending'
                  ? 'bg-amber-400'
                  : order.status === 'preparing'
                  ? 'bg-blue-400'
                  : 'bg-green-500'
              }`}
            >
              {order.status.toUpperCase()}
            </span>
            <p className="text-[10px] text-green-400 mt-1 text-right">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        ))
      )}
    </div>
  </div>
</TabsContent>

