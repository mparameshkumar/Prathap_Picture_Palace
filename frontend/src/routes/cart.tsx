import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart, cart } from "@/lib/cart";
import { api, isAuthed } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Cart — Prathap Theatre" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, count, total } = useCart();
  const [placing, setPlacing] = useState(false);
  const [seatNumber, setSeatNumber] = useState("");
  const [showTime, setShowTime] = useState("morning");
  const router = useRouter();

  const SHOW_TIMES = [
    { value: "morning", label: "Morning" },
    { value: "matinee", label: "Matinee" },
    { value: "first", label: "First Show" },
    { value: "second", label: "Second Show" },
    { value: "special", label: "Special Show" }
  ];

  const placeOrder = async () => {
    if (!isAuthed()) {
      toast.error("Please sign in to place an order");
      router.navigate({ to: "/login" });
      return;
    }
    if (items.length === 0) return;
    
    if (!seatNumber.trim()) {
      toast.error("Please enter your seat number");
      return;
    }
    
    setPlacing(true);
    try {
      const canteen_id = items[0].canteen_id;
      const payload = {
        canteen_id,
        seat_number: seatNumber.trim(),
        show_time: showTime,
        theatre_name: "Prathap Deluxe", // Default theatre
        items: items.map((i) => ({ item_id: i.id, quantity: i.quantity })),
      };
      await api.post("/user/orders", payload);
      cart.clear();
      toast.success("Order placed! Track it in My Orders.");
      router.navigate({ to: "/orders" });
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Couldn't place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 py-10">
      <h1 className="font-display text-4xl sm:text-5xl">Your Cart</h1>
      <p className="text-muted-foreground mt-1">{count} item{count !== 1 ? "s" : ""}</p>

      {items.length === 0 ? (
        <div className="mt-12 rounded-2xl bg-gradient-card border border-border/60 p-12 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-xl font-semibold">Your cart is empty</h3>
          <p className="text-muted-foreground mt-1">Add some snacks to get started.</p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/menu">Browse menu</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-xl bg-gradient-card border border-border/60 p-4 flex items-center gap-4">
                <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary/20 to-background flex items-center justify-center text-3xl">🍿</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{it.name}</div>
                  <div className="text-sm text-muted-foreground">₹{it.price.toFixed(0)} each</div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cart.update(it.id, it.quantity - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{it.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cart.update(it.id, it.quantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="font-semibold w-20 text-right">₹{(it.price * it.quantity).toFixed(0)}</div>
                <Button size="icon" variant="ghost" onClick={() => cart.remove(it.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-gradient-card border border-border/60 p-6 h-fit lg:sticky lg:top-20">
            <h3 className="font-display text-xl">Order Summary</h3>
            
            {/* Seat Number Input */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="seat-number">Seat Number *</Label>
              <Input
                id="seat-number"
                placeholder="e.g., A12, B5, C10"
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Show Time Selection */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="show-time">Show Time *</Label>
              <select
                id="show-time"
                value={showTime}
                onChange={(e) => setShowTime(e.target.value)}
                className="w-full h-11 rounded-md bg-background border border-border px-3 text-sm"
              >
                {SHOW_TIMES.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{total.toFixed(0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="text-success">Free</span></div>
              <div className="border-t border-border my-3" />
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-[color:var(--gold)] font-display text-2xl">₹{total.toFixed(0)}</span></div>
            </div>
            <Button variant="hero" size="lg" className="w-full mt-6" onClick={placeOrder} disabled={placing}>
              {placing && <Loader2 className="h-4 w-4 animate-spin" />}
              Place Order
            </Button>
            <p className="mt-3 text-[11px] text-center text-muted-foreground">By placing your order you agree to our terms.</p>
          </div>
        </div>
      )}
    </div>
  );
}
