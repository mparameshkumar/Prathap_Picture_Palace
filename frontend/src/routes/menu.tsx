import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Plus, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, CANTEENS } from "@/lib/api";
import { cart, useCart } from "@/lib/cart";
import { toast } from "sonner";
import chips from "@/assets/chips.webp";
import coffee from "@/assets/coffee.webp";
import cooldrinks from "@/assets/cooldrinks.png";
import cornflakes from "@/assets/cornflakes.webp";
import eggpuff from "@/assets/egg puff.webp";
import nuts from "@/assets/nuts.webp";
import peanuts from "@/assets/peanuts.webp";
import popcorn from "@/assets/popcorn.jpg";
import rings from "@/assets/rings.webp";
import samosa from "@/assets/samosa.webp";
import waterbottle from "@/assets/waterbottle.webp";
import wheels from "@/assets/wheels.webp";

type MenuItem = {
  item_id: number;
  item_name?: string;
  name?: string;
  price: number;
  quantity?: number;
  available_quantity?: number;
};

const getItemImage = (itemName: string) => {
  const name = itemName.toLowerCase();
  const imageMap: Record<string, string> = {
    'chips': chips,
    'coffee': coffee,
    'cool drinks': cooldrinks,
    'cooldrinks': cooldrinks,
    'cold drinks': cooldrinks,
    'cornflakes': cornflakes,
    'egg puff': eggpuff,
    'eggpuff': eggpuff,
    'nuts': nuts,
    'peanuts': peanuts,
    'popcorn': popcorn,
    'rings': rings,
    'samosa': samosa,
    'water': waterbottle,
    'water bottle': waterbottle,
    'waterbottle': waterbottle,
    'wheels': wheels,
  };
  
  // Check for exact matches first
  if (imageMap[name]) {
    return imageMap[name];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(imageMap)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }
  
  // Default to popcorn if no match found
  return popcorn;
};

export const Route = createFileRoute("/menu")({
  head: () => ({ meta: [{ title: "Menu — Prathap Picture Palace" }] }),
  component: MenuPage,
});

function MenuPage() {
  const [canteenId, setCanteenId] = useState<number>(1);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const { count } = useCart();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get(`/user/menu`, { params: { canteen_id: canteenId } })
      .then((r) => {
        if (cancelled) return;
        const list = Array.isArray(r.data) ? r.data : r.data?.menu || [];
        setItems(list);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load menu");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [canteenId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => (i.item_name || i.name || "").toLowerCase().includes(term));
  }, [items, q]);

  return (
    <div className="w-full px-4 sm:px-6 py-8 md:py-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Order from your seat</div>
          <h1 className="mt-1 font-display text-4xl sm:text-5xl">The Menu</h1>
        </div>
        <Link to="/cart">
          <Button variant="glass" className="relative">
            <ShoppingBag className="h-4 w-4" /> View Cart
            {isClient && count > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>
        </Link>
      </div>

      {/* Canteen tabs */}
      <div className="mt-6 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {CANTEENS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCanteenId(c.id)}
            className={`flex-shrink-0 rounded-full border px-5 py-2 text-sm font-medium transition-all ${
              canteenId === c.id
                ? "border-primary bg-primary text-primary-foreground shadow-glow"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mt-5 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search snacks, beverages..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9 h-11 bg-card border-border"
        />
      </div>

      {/* Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading menu...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center">
            <p className="font-medium">Couldn't reach the kitchen</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <p className="text-xs text-muted-foreground mt-2">Make sure your FastAPI is running on localhost:8000.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No items found.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item, i) => {
              const name = item.item_name || item.name || "Item";
              const qty = item.available_quantity ?? item.quantity ?? 0;
              const out = qty <= 0;
              return (
                <motion.div
                  key={item.item_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="group rounded-2xl bg-gradient-card border border-border/60 overflow-hidden shadow-card hover:shadow-elegant hover:-translate-y-1 transition-all"
                >
                  <div className="relative aspect-square bg-gradient-to-br from-primary/20 via-background to-background overflow-hidden">
                    <img 
                      src={getItemImage(name)} 
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to popcorn image if image fails to load
                        (e.target as HTMLImageElement).src = popcorn;
                      }}
                    />
                    {out && (
                      <span className="absolute top-2 right-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                        OUT
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold leading-tight line-clamp-2">{name}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="font-display text-2xl text-[color:var(--gold)]">₹{Number(item.price).toFixed(0)}</div>
                      <Button
                        size="sm"
                        variant="hero"
                        disabled={out}
                        onClick={() => {
                          cart.add({ id: item.item_id, name, price: Number(item.price), canteen_id: canteenId });
                          toast.success(`${name} added to cart`);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
