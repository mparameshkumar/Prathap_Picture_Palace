import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Package, Receipt, X, Clock, MapPin, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type Order = {
  id: number;
  order_id?: number;
  status: string;
  total_amount?: number;
  total?: number;
  created_at?: string;
  items?: Array<{ item_name?: string; name?: string; quantity: number; price?: number }>;
  seat_number?: string;
  show_time?: string;
  theatre_name?: string;
  payment_method?: string;
  payment_status?: string;
  special_instructions?: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-chart-5/20 text-chart-5 border-chart-5/40",
  preparing: "bg-chart-4/20 text-chart-4 border-chart-4/40",
  ready: "bg-success/20 text-success border-success/40",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
};

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — Prathap Theatre" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/user/orders")
      .then((r) => setOrders(Array.isArray(r.data) ? r.data : r.data?.orders || []))
      .catch((e) => setError(e?.message || "Failed to load"))
      .finally(() => setLoading(false));
  };

  const fetchOrderDetails = async (orderId: number) => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/user/orders/${orderId}`);
      setOrderDetails(response.data);
      setSelectedOrder(orders.find(o => (o.order_id ?? o.id) === orderId) || null);
    } catch (e: any) {
      console.error("Failed to fetch order details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOrderClick = (order: Order) => {
    const orderId = order.order_id ?? order.id;
    fetchOrderDetails(orderId);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setOrderDetails(null);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">My Orders</h1>
          <p className="text-muted-foreground mt-1">Track all your orders here</p>
        </div>
        <Button variant="glass" onClick={load}>Refresh</Button>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading orders...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center">
            <p className="font-medium">Couldn't load orders</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-gradient-card border border-border/60 p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-xl font-semibold">No orders yet</h3>
            <p className="text-muted-foreground mt-1">Place your first order from the menu.</p>
            <Button asChild variant="hero" className="mt-6">
              <Link to="/menu">Browse menu</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
              const id = o.order_id ?? o.id;
              const total = o.total_amount ?? o.total ?? 0;
              const cls = STATUS_COLOR[o.status?.toLowerCase()] || STATUS_COLOR.pending;
              return (
                <div 
                  key={id} 
                  className="rounded-xl bg-gradient-card border border-border/60 p-5 cursor-pointer hover:border-primary/50 transition-all hover:-translate-y-1"
                  onClick={() => handleOrderClick(o)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">Order #{id}</div>
                      {o.created_at && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${cls}`}>
                        {o.status}
                      </span>
                      <div className="font-display text-xl text-[color:var(--gold)]">#{Number(total).toFixed(0)}</div>
                    </div>
                  </div>
                  {o.items && o.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                      {o.items.map((it, idx) => (
                        <span key={idx}>
                          {it.quantity}× {it.item_name || it.name}
                          {idx < o.items!.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={closeModal}>
          <div 
            className="bg-background rounded-2xl border border-border/60 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-elegant"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl">Order Details</h2>
                  <p className="text-sm text-muted-foreground">
                    #{selectedOrder.order_id ?? selectedOrder.id}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={closeModal}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading order details...
                </div>
              ) : orderDetails ? (
                <div className="space-y-6">
                  {/* Order Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                      STATUS_COLOR[orderDetails.order_status?.toLowerCase()] || STATUS_COLOR.pending
                    }`}>
                      {orderDetails.order_status}
                    </span>
                  </div>

                  {/* Order Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Seat Number</p>
                          <p className="font-medium">{orderDetails.seat_number || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Show Time</p>
                          <p className="font-medium">{orderDetails.show_time || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Theatre</p>
                          <p className="font-medium">{orderDetails.theatre_name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Payment Method</p>
                          <p className="font-medium">{orderDetails.payment_method || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  {orderDetails.special_instructions && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Special Instructions</p>
                      <p className="text-sm bg-muted p-3 rounded-lg">{orderDetails.special_instructions}</p>
                    </div>
                  )}

                  {/* Order Items */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Order Items</p>
                    <div className="space-y-2">
                      {orderDetails.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-sm">🍿</div>
                            <div>
                              <p className="font-medium">{item.item_name}</p>
                              <p className="text-xs text-muted-foreground">₹{item.price_per_item} each</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{item.quantity}x</p>
                            <p className="text-sm text-[color:var(--gold)]">₹{item.total_price}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium">Total Amount</span>
                      <span className="font-display text-2xl text-[color:var(--gold)]">
                        ₹{Number(orderDetails.total_amount).toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Order placed: {new Date(orderDetails.created_at).toLocaleString()}</p>
                    {orderDetails.updated_at && (
                      <p>Last updated: {new Date(orderDetails.updated_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  Failed to load order details
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
