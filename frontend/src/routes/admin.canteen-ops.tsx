import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ChefHat, Clock, Loader2, Package, RefreshCw, Truck, XCircle, Smartphone, CreditCard, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, CANTEENS, getRole } from "@/lib/api";
import { CanteenSelector, SectionTitle, EmptyState } from "@/components/admin/admin-ui";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/canteen-ops")({
  head: () => ({ meta: [{ title: "Canteen Operations — Admin" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && getRole() !== "admin") throw { redirect: true };
  },
  component: CanteenOps,
  errorComponent: () => {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  },
});

type Order = {
  id?: number;
  order_id?: number;
  order_status: string;
  customer_name?: string;
  total_amount?: number;
  total?: number;
  canteen_id?: number;
  created_at?: string;
  items?: Array<{ item_name?: string; name?: string; quantity: number }>;
};

const STATUS_FLOW = ["pending", "confirmed", "preparing", "ready", "completed"] as const;
const STATUS_META: Record<string, { color: string; icon: any; next?: string; label: string }> = {
  pending: { color: "bg-warning/15 text-warning border-warning/30", icon: Clock, next: "confirmed", label: "Pending" },
  confirmed: { color: "bg-chart-5/15 text-chart-5 border-chart-5/30", icon: CheckCircle2, next: "preparing", label: "Confirmed" },
  preparing: { color: "bg-chart-4/15 text-chart-4 border-chart-4/30", icon: ChefHat, next: "ready", label: "Preparing" },
  ready: { color: "bg-success/15 text-success border-success/30", icon: Truck, next: "completed", label: "Ready" },
  completed: { color: "bg-muted text-muted-foreground border-border", icon: Package, label: "Completed" },
  cancelled: { color: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle, label: "Cancelled" },
};

function CanteenOps() {
  const [canteenId, setCanteenId] = useState(1);
  const [tab, setTab] = useState<"dashboard" | "orders">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState<{ orderId: number; customerName: string } | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<"cash" | "upi">("cash");
  const [upiId, setUpiId] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // Play notification sound with enhanced audio
  const playNotificationSound = () => {
    try {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a more attention-grabbing notification sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Play a two-tone beep pattern for better attention
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
    } catch (error) {
      console.error('Error playing notification sound:', error);
      // Fallback: try to play a simple beep
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdjbivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQpZPdsgZAQhBmAA');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore autoplay errors
      } catch (fallbackError) {
        console.error('Fallback audio also failed:', fallbackError);
      }
    }
  };

  // Show browser notification with enhanced features
  const showBrowserNotification = (orderCount: number, newOrders: Order[]) => {
    console.log('showBrowserNotification called:', { orderCount, newOrders, notificationPermission });
    
    if (notificationPermission !== 'granted') {
      console.log('Notification permission not granted, permission:', notificationPermission);
      // Try to request permission again
      requestNotificationPermission();
      return;
    }
    
    try {
      console.log('Creating browser notification...');
      
      // Vibrate for mobile devices if supported
      if ('vibrate' in navigator) {
        console.log('Vibrating device...');
        navigator.vibrate([200, 100, 200]); // Vibration pattern
      }
      
      const notification = new Notification('New Order Received! - Prathap Theatre', {
        body: `${orderCount} new order${orderCount > 1 ? 's' : ''} received${newOrders.length > 0 ? `: ${newOrders.map(o => `Order #${o.order_id ?? o.id}`).join(', ')}` : ''}`,
        icon: '/favicon.ico',
        tag: 'new-order',
        requireInteraction: orderCount > 1, // Require interaction for multiple orders
        silent: false,
      });
      
      console.log('Notification created successfully:', notification);
      
      // Auto-close after longer time for single orders, keep longer for multiple
      const autoCloseTime = orderCount > 1 ? 10000 : 8000;
      setTimeout(() => {
        console.log('Auto-closing notification...');
        notification.close();
      }, autoCloseTime);
      
      // Play an additional sound after a short delay for emphasis
      setTimeout(() => {
        console.log('Playing delayed notification sound...');
        playNotificationSound();
      }, 300);
    } catch (error) {
      console.error('Error showing browser notification:', error);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return 'denied';
  };

  const load = async () => {
    setLoading(true);
    try {
      console.log('Loading orders...');
      const r = await api.get("/canteen-ops/orders");
      const list = Array.isArray(r.data) ? r.data : r.data?.orders || [];
      
      console.log('Orders loaded:', { count: list.length, previousCount: previousOrderCount });
      
      // Check for new orders
      if (previousOrderCount > 0 && list.length > previousOrderCount) {
        const newOrderCount = list.length - previousOrderCount;
        const newOrders = list.slice(previousOrderCount);
        
        console.log('New orders detected:', { newOrderCount, newOrders });
        
        // Play notification sound
        console.log('Playing notification sound...');
        playNotificationSound();
        
        // Show browser notification
        console.log('Showing browser notification...');
        showBrowserNotification(newOrderCount, newOrders);
        
        // Show in-app toast
        if (newOrderCount === 1) {
          toast.success(`New Order #${newOrders[0]?.order_id ?? newOrders[0]?.id} received!`);
        } else {
          toast.success(`${newOrderCount} new orders received!`);
        }
      } else {
        console.log('No new orders detected');
      }
      
      setOrders(list);
      setPreviousOrderCount(list.length);
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check and request notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        requestNotificationPermission();
      }
    }
    
    load();
    
    // Enhanced polling strategy for better real-time notifications
    let intervalId: NodeJS.Timeout;
    
    const startPolling = () => {
      // Clear existing interval
      if (intervalId) clearInterval(intervalId);
      
      // Use shorter interval when page is visible, longer when hidden
      const interval = document.hidden ? 60000 : 10000; // 10s when visible, 1min when hidden
      
      intervalId = setInterval(() => {
        // Only poll if page is visible or if notifications are enabled
        if (!document.hidden || notificationPermission === 'granted') {
          load();
        }
      }, interval);
    };
    
    // Start polling immediately
    startPolling();
    
    // Handle visibility changes
    const handleVisibilityChange = () => {
      startPolling(); // Restart polling with new interval
    };
    
    // Handle page focus events
    const handleFocus = () => {
      load(); // Immediate refresh when page gets focus
      startPolling();
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Cleanup
    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/canteen-ops/orders/${id}/status`, { status });
      toast.success(`Order #${id} → ${status}`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };
  const cancel = async (id: number) => {
    try {
      await api.post(`/canteen-ops/orders/${id}/cancel`);
      toast.success(`Order #${id} cancelled`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };

  const handleCheckout = (order: Order) => {
    const id = (order.order_id ?? order.id) as number;
    const customerName = order.customer_name || "Customer";
    setPaymentModal({ orderId: id, customerName });
  };

  const processPayment = async () => {
    if (!paymentModal) return;
    
    setProcessingPayment(true);
    try {
      // Call the checkout endpoint to reduce stock and create sales records
      await api.post(`/canteen-ops/orders/${paymentModal.orderId}/checkout`, {
        payment_method: selectedPayment
      });
      
      toast.success(`Order #${paymentModal.orderId} checked out successfully - Payment received via ${selectedPayment.toUpperCase()}`);
      closePaymentModal();
      load();
      // Note: Sales data will be refreshed when user navigates to sales page
      // or when they manually refresh the stats on the admin dashboard
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Payment processing failed");
    } finally {
      setProcessingPayment(false);
    }
  };

  const closePaymentModal = () => {
    setPaymentModal(null);
    setSelectedPayment("cash");
    setUpiId("");
  };

  const filtered = orders.filter((o) => !o.canteen_id || o.canteen_id === canteenId);
  const statusFiltered = statusFilter === "all" 
    ? filtered 
    : filtered.filter((o) => o.order_status?.toLowerCase() === statusFilter);
  const activeOrders = statusFiltered.filter((o) => o.order_status?.toLowerCase() !== "completed" && o.order_status?.toLowerCase() !== "cancelled");
  const byStatus = (s: string) => statusFiltered.filter((o) => o.order_status?.toLowerCase() === s);

  return (
    <div className="w-full px-4 sm:px-6 py-8">
      <SectionTitle
        title="Canteen Operations"
        subtitle="Real-time order management · auto-refresh every 30s"
        right={
          <div className="flex flex-wrap gap-2 items-center">
            <CanteenSelector value={canteenId} onChange={setCanteenId} canteens={CANTEENS} />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={requestNotificationPermission}
              disabled={notificationPermission === 'granted'}
              className="text-xs"
            >
              {notificationPermission === 'granted' ? 'Notifications On' : 'Enable Notifications'}
            </Button>
            <Button variant="glass" onClick={load}><RefreshCw className="h-4 w-4" /> Refresh</Button>
          </div>
        }
      />

      <div className="inline-flex rounded-lg bg-muted p-1 mb-6">
        {(["dashboard", "orders"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-md capitalize transition-all ${tab === t ? "bg-background shadow" : "text-muted-foreground"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Status Filter Tabs - Only show on orders tab */}
      {tab === "orders" && (
        <div className="inline-flex rounded-lg bg-muted p-1 mb-6 flex-wrap gap-1">
          {([
            { key: "all", label: "All Orders" },
            { key: "pending", label: "Pending" },
            { key: "confirmed", label: "Confirmed" },
            { key: "completed", label: "Completed" },
            { key: "cancelled", label: "Cancelled" }
          ] as const).map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                statusFilter === filter.key 
                  ? "bg-background shadow text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading orders...</div>
      ) : tab === "dashboard" ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {STATUS_FLOW.map((s) => {
            const meta = STATUS_META[s];
            const list = byStatus(s);
            return (
              <div key={s} className="rounded-2xl bg-gradient-card border border-border/60 p-5">
                <div className="flex items-center gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.color}`}>
                    <meta.icon className="h-4 w-4" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{meta.label}</div>
                </div>
                <div className="mt-3 font-display text-4xl">{list.length}</div>
              </div>
            );
          })}
        </div>
      ) : statusFiltered.length === 0 ? (
        <EmptyState 
          title={`No ${statusFilter === "all" ? "" : statusFilter} orders for this canteen`} 
          hint={statusFilter === "all" ? "New orders will appear here in real-time." : `No ${statusFilter} orders found.`} 
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {statusFiltered.map((o) => {
            const id = (o.order_id ?? o.id) as number;
            const meta = STATUS_META[o.order_status?.toLowerCase()] || STATUS_META.pending;
            const Icon = meta.icon;
            return (
              <div key={id} className="rounded-2xl bg-gradient-card border border-border/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-xs text-muted-foreground">ORDER</div>
                    <div className="font-display text-2xl">#{id}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{o.customer_name || "Customer"}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${meta.color}`}>
                    <Icon className="h-3 w-3" /> {meta.label}
                  </span>
                </div>

                {o.items && o.items.length > 0 && (
                  <div className="mt-3 text-sm space-y-1">
                    {o.items.map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{it.item_name || it.name}</span>
                        <span className="text-muted-foreground">×{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <div className="font-display text-xl text-[color:var(--gold)]">₹{Number(o.total_amount ?? o.total ?? 0).toFixed(0)}</div>
                  <div className="flex gap-2">
                    {o.order_status?.toLowerCase() !== "completed" && o.order_status?.toLowerCase() !== "cancelled" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="glass" onClick={() => handleCheckout(o)}>
                          <CreditCard className="h-3.5 w-3.5" /> Checkout
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => cancel(id)}>
                          <XCircle className="h-3.5 w-3.5" /> Cancel Order
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    {/* Payment Modal */}
    {paymentModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={closePaymentModal}>
        <div 
          className="bg-background rounded-2xl border border-border/60 max-w-md w-full shadow-elegant"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="font-display text-xl">Process Payment</h2>
              <p className="text-sm text-muted-foreground">
                Order #{paymentModal.orderId} • {paymentModal.customerName}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={closePaymentModal}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Payment Method Selection */}
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Select Payment Method</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPayment("cash")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPayment === "cash"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <CreditCard className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">Cash</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPayment("upi")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedPayment === "upi"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <Smartphone className="h-6 w-6 mx-auto mb-2" />
                    <div className="font-medium">UPI</div>
                  </button>
                </div>
              </div>

              {/* UPI Scanner Demo */}
              {selectedPayment === "upi" && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    UPI Scanner (Demo)
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-black/5 border-2 border-dashed rounded-lg p-8 text-center">
                      <div className="text-6xl mb-2">📱</div>
                      <div className="text-sm text-muted-foreground">Scanning for UPI payment...</div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        <div className="bg-black/10 rounded p-2 font-mono">
                          demo-upi-scanner-active
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Enter UPI ID (demo: user@upi)"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Payment Display */}
              {selectedPayment === "cash" && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Cash Payment
                  </h4>
                  <div className="text-center">
                    <div className="text-6xl mb-2">💵</div>
                    <div className="text-sm text-muted-foreground">Collect cash payment</div>
                    <div className="mt-3 text-xs text-muted-foreground">
                      Amount: ₹{orders.find(o => (o.order_id ?? o.id) === paymentModal.orderId)?.total_amount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" onClick={closePaymentModal} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="hero" 
                onClick={processPayment} 
                disabled={processingPayment || (selectedPayment === "upi" && !upiId.trim())}
                className="flex-1"
              >
                {processingPayment && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {selectedPayment === "cash" ? "Confirm Cash Payment" : "Confirm UPI Payment"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
