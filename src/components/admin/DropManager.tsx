const toggleActive = async (id: string, current: boolean) => {
  // optimistic UI update
  setDrops((prev) =>
    prev.map((d) =>
      d.id === id ? { ...d, is_active: !current } : d
    )
  );

  const { error } = await supabase
    .from("product_drops")
    .update({ is_active: !current })
    .eq("id", id);

  if (error) {
    // rollback on failure
    setDrops((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, is_active: current } : d
      )
    );

    toast({
      title: "Failed to update drop",
      description: error.message,
      variant: "destructive",
    });
  }
};
