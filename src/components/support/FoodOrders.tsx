<TabsContent
  value="orders"
  className="h-full w-full bg-black/95 flex flex-col"
>
  {/* TOP: CCTV MONITOR */}
  <div className="h-[55%] p-4">
    <textarea
      placeholder="TYPE ORDER — ITEMS SEPARATED BY COMMAS"
      value={newOrderText}
      onChange={(e) => setNewOrderText(e.target.value)}
      className="
        w-full h-full
        px-6 py-4
        bg-black
        text-green-400
        font-mono text-lg tracking-wide
        border-2 border-green-500/60
        rounded-lg
        resize-none
        outline-none
        placeholder:text-green-600
        shadow-[inset_0_0_25px_rgba(0,255,0,0.35),0_0_30px_rgba(0,255,0,0.25)]
      "
    />
  </div>

  {/* BUTTON BAR */}
  <div className="px-4 pb-2">
    <button
      onClick={addManualOrder}
      className="
        w-full py-2
        bg-green-600/80
        text-black font-mono text-sm tracking-widest
        rounded
        hover:bg-green-500
        transition
        shadow-[0_0_15px_rgba(0,255,0,0.4)]
      "
    >
      CONFIRM ORDER
    </button>
  </div>

  {/* BOTTOM: CCTV PANELS */}
  <div className="h-[35%] px-4 pb-4 grid grid-cols-2 gap-3">
    {orders.length === 0 ? (
      <div className="col-span-2 flex items-center justify-center font-mono text-green-500 text-sm border border-green-500/40 rounded bg-black shadow-[0_0_20px_rgba(0,255,0,0.3)]">
        NO ACTIVE ORDERS
      </div>
    ) : (
      orders.map((order) => (
        <div
          key={order.id}
          className="
            p-3
            bg-black
            border border-green-500/40
            rounded
            font-mono text-xs text-green-400
            shadow-[inset_0_0_15px_rgba(0,255,0,0.25)]
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
</TabsContent>

