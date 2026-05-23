import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Utensils, Loader2, Package, ShoppingCart, TrendingUp, RefreshCw, CheckCircle2, XCircle, Settings2, Clock, Trophy, CreditCard, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, CANTEENS, getRole } from "@/lib/api";
import { StatCard, SectionTitle } from "@/components/admin/admin-ui";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Prathap Theatre" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && getRole() !== "admin") {
      throw { redirect: true };
    }
  },
  component: AdminDashboard,
  errorComponent: () => {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  },
});

type Order = {
  order_id: number;
  user_id: number;
  username: string;
  seat_number: string;
  show_time: string;
  theatre_name: string;
  order_status: string;
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  special_instructions?: string;
  created_at: string;
  updated_at: string;
  items?: Array<{
    item_id: number;
    item_name: string;
    quantity: number;
    price_per_item: number;
    total_price: number;
    item_status: string;
  }>;
};

function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [stats, setStats] = useState({ revenue: 0, orders: 0, items: 0 });
  const [revenueStats, setRevenueStats] = useState({
    total_revenue: 0,
    total_orders: 0,
    avg_order_value: 0,
    peak_hours: {} as Record<string, number>
  });
  const [topSellingItems, setTopSellingItems] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState("1");
  const [paymentModal, setPaymentModal] = useState<{ orderId: number; customerName: string } | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<"cash" | "upi">("cash");
  const [upiId, setUpiId] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const r = await api.get("/canteen-ops/orders");
      const list = Array.isArray(r.data) ? r.data : r.data?.orders || [];
      setOrders(list);
      setPreviousOrderCount(list.length); // Set initial order count
    } catch (e: any) {
      toast.error(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Show browser notification
  const showBrowserNotification = (orderCount: number, newOrders: any[]) => {
    if (notificationPermission !== 'granted') return;
    
    try {
      const notification = new Notification('New Order Received!', {
        body: `${orderCount} new order${orderCount > 1 ? 's' : ''} received${newOrders.length > 0 ? `: ${newOrders.map(o => `Order #${o.order_id}`).join(', ')}` : ''}`,
        icon: '/favicon.ico',
        tag: 'new-order',
        requireInteraction: false
      });
      
      setTimeout(() => {
        notification.close();
      }, 5000);
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

  const refreshOrdersOnly = async () => {
    try {
      const r = await api.get("/canteen-ops/orders");
      const list = Array.isArray(r.data) ? r.data : r.data?.orders || [];
      
      // Check for new orders
      if (previousOrderCount > 0 && list.length > previousOrderCount) {
        const newOrderCount = list.length - previousOrderCount;
        const newOrders = list.slice(previousOrderCount);
        
        // Play notification sound
        playNotificationSound();
        
        // Show browser notification
        showBrowserNotification(newOrderCount, newOrders);
        
        // Show in-app toast
        if (newOrderCount === 1) {
          toast.success(`New Order #${newOrders[0]?.order_id} received!`);
        } else {
          toast.success(`${newOrderCount} new orders received!`);
        }
      }
      
      setOrders(list);
      setPreviousOrderCount(list.length);
    } catch (e: any) {
      console.error("Failed to refresh orders:", e);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const results = await Promise.all(
        CANTEENS.map((c) => api.get("/api/sales/daily-sales", { params: { canteen_id: c.id, sale_date: today } }).catch(() => ({ data: {} }))),
      );
      let revenue = 0,
        orders = 0,
        items = 0;
      results.forEach((r) => {
        const d = r.data || {};
        revenue += Number(d.total_revenue || d.revenue || 0);
        orders += Number(d.total_orders || d.orders || 0);
        items += Number(d.total_items || d.items_sold || 0);
      });
      setStats({ revenue, orders, items });
    } catch {
      /* ignore */
    }
  };

  const fetchRevenueStats = async () => {
    try {
      const results = await Promise.all(
        CANTEENS.map((c) => 
          api.get("/api/sales/revenue-stats", { 
            params: { 
              days: parseInt(timeFilter),
              canteen_id: c.id 
            } 
          }).catch(() => ({ data: {} }))
        )
      );
      
      let totalRevenue = 0;
      let totalOrders = 0;
      let allPeakHours: Record<string, number> = {};
      
      results.forEach((r) => {
        const d = r.data || {};
        totalRevenue += Number(d.total_revenue || 0);
        totalOrders += Number(d.total_orders || 0);
        
        // Combine peak hours
        Object.entries(d.peak_hours || {}).forEach(([hour, revenue]: [string, any]) => {
          if (!allPeakHours[hour]) allPeakHours[hour] = 0;
          allPeakHours[hour] += Number(revenue);
        });
      });
      
      // Sort peak hours and take top 3
      const sortedPeakHours = Object.entries(allPeakHours)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .reduce((obj: Record<string, number>, [hour, revenue]: [string, number]) => {
          obj[hour] = revenue;
          return obj;
        }, {} as Record<string, number>);
      
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      setRevenueStats({
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        avg_order_value: avgOrderValue,
        peak_hours: sortedPeakHours
      });
    } catch (e: any) {
      console.error("Failed to fetch revenue stats:", e);
    }
  };

  const fetchTopSellingItems = async () => {
    try {
      const results = await Promise.all(
        CANTEENS.map((c) => 
          api.get("/api/sales/top-selling-items", { 
            params: { 
              days: parseInt(timeFilter),
              limit: 5,
              canteen_id: c.id 
            } 
          }).catch(() => ({ data: [] }))
        )
      );
      
      // Combine all items from all canteens
      const allItems: any[] = [];
      results.forEach((r) => {
        const items = r.data || [];
        items.forEach((item: any) => {
          const existing = allItems.find((i: any) => i.item_name === item.item_name);
          if (existing) {
            existing.total_quantity += item.total_quantity;
            existing.total_revenue += item.total_revenue;
          } else {
            allItems.push({ ...item });
          }
        });
      });
      
      // Sort by quantity and take top 5
      const topItems = allItems
        .sort((a: any, b: any) => (b.total_quantity || 0) - (a.total_quantity || 0))
        .slice(0, 5);
      
      setTopSellingItems(topItems);
    } catch (e: any) {
      console.error("Failed to fetch top selling items:", e);
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
    
    // Initial load - fetch all data once
    const initialLoad = async () => {
      await Promise.all([
        fetchOrders(),
        fetchStats(),
        fetchRevenueStats(),
        fetchTopSellingItems()
      ]);
      setInitialLoadDone(true);
    };
    initialLoad();
    
    // Enhanced polling strategy for better real-time notifications
    let intervalId: NodeJS.Timeout;
    
    const startPolling = () => {
      // Clear existing interval
      if (intervalId) clearInterval(intervalId);
      
      // Use shorter interval when page is visible, longer when hidden
      const interval = document.hidden ? 60000 : 10000; // 10s when visible, 1min when hidden
      
      intervalId = setInterval(() => {
        // Only poll orders if page is visible or if notifications are enabled
        if (!document.hidden || notificationPermission === 'granted') {
          refreshOrdersOnly();
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
      refreshOrdersOnly(); // Immediate refresh when page gets focus
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

  useEffect(() => {
    fetchRevenueStats();
    fetchTopSellingItems();
  }, [timeFilter]);

  const handleCheckout = (order: Order) => {
    const id = order.order_id;
    const customerName = order.username || "Customer";
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
      refreshOrdersOnly();
      // Also refresh sales data to show the new sales
      fetchStats();
      fetchRevenueStats();
      fetchTopSellingItems();
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
  const handleCancel = async (id: number) => {
    try {
      await api.post(`/canteen-ops/orders/${id}/cancel`);
      toast.success(`Order #${id} cancelled`);
      refreshOrdersOnly();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Cancel failed");
    }
  };

  const cards = [
    { 
      label: timeFilter === "1" ? "Today's Revenue" : `Revenue (${timeFilter} days)`, 
      value: `Rs${revenueStats.total_revenue.toLocaleString('en-IN')}`, 
      icon: <TrendingUp className="h-5 w-5" />, 
      accent: "gold" as const, 
      link: "/admin/sales" 
    },
    { 
      label: timeFilter === "1" ? "Orders Today" : `Orders (${timeFilter} days)`, 
      value: revenueStats.total_orders, 
      icon: <ShoppingCart className="h-5 w-5" />, 
      accent: "primary" as const, 
      link: "/admin/canteen-ops" 
    },
    { 
      label: "Avg Order", 
      value: `Rs${Math.round(revenueStats.avg_order_value).toLocaleString('en-IN')}`, 
      icon: <TrendingUp className="h-5 w-5" />, 
      accent: "success" as const, 
      link: "/admin/sales" 
    },
    { 
      label: "Live Orders", 
      value: orders.length, 
      icon: <Utensils className="h-5 w-5" />, 
      accent: "warning" as const, 
      link: "/admin/canteen-ops" 
    },
  ];

  return (
    <div className="w-full px-4 sm:px-6 py-8">
      <SectionTitle
        title="Admin Dashboard"
        subtitle="Manage canteen operations across all screens"
        right={
          <div className="flex gap-2">
            <Button variant="glass" onClick={refreshOrdersOnly}>
              <RefreshCw className="h-4 w-4" /> Refresh Orders
            </Button>
            <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchRevenueStats(); fetchTopSellingItems(); }}>
              <RefreshCw className="h-4 w-4" /> Refresh Stats
            </Button>
            <Button asChild variant="hero">
              <Link to="/admin/canteen-ops">
                Operations <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
      />

      {/* Time Filter */}
      <div className="mt-6 flex justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Time Period:</span>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Today</SelectItem>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Link to={c.link} className="block">
              <StatCard label={c.label} value={c.value} icon={c.icon} accent={c.accent} />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Peak Hours and Top Selling Items */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl">Peak Hours</h2>
          </div>
          {Object.keys(revenueStats.peak_hours).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(revenueStats.peak_hours).map(([hour, revenue]) => (
                <div key={hour} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{hour}</span>
                  <span className="text-sm text-[color:var(--gold)] font-display">
                    Rs{revenue.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No peak hours data available
            </div>
          )}
        </div>

        {/* Top Selling Items */}
        <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl">Top Selling Items</h2>
          </div>
          {topSellingItems.length > 0 ? (
            <div className="space-y-3">
              {topSellingItems.map((item, index) => (
                <div key={item.item_name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.item_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.total_quantity} sold
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-[color:var(--gold)] font-display">
                    Rs{item.total_revenue.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No sales data available
            </div>
          )}
        </div>
      </div>

      {/* Canteens */}
      <div className="mt-10">
        <h2 className="font-display text-2xl mb-4">Canteen Locations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CANTEENS.map((c) => (
            <Link
              key={c.id}
              to="/admin/canteen-ops"
              search={{ canteen: c.id } as any}
              className="group rounded-2xl bg-gradient-card border border-border/60 p-6 hover:border-primary/50 transition-all hover:-translate-y-1 shadow-card"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Screen {c.id}</div>
              <h3 className="mt-2 font-display text-2xl">{c.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{c.tagline}</p>
              <div className="mt-4 inline-flex items-center text-sm text-primary group-hover:translate-x-1 transition-transform">
                Manage <ArrowRight className="ml-1 h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-10">
        <h2 className="font-display text-2xl mb-4">Business Tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { to: "/admin/sales", label: "Sales", icon: TrendingUp, color: "text-[color:var(--gold)]" },
            { to: "/admin/stock", label: "Stock", icon: Package, color: "text-success" },
            { to: "/admin/analytics", label: "Analytics", icon: BarChart3, color: "text-chart-4" },
            { to: "/admin/canteen-ops", label: "Operations", icon: Utensils, color: "text-primary" },
          ].map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="group rounded-2xl bg-gradient-card border border-border/60 p-6 hover:border-primary/40 transition-all"
            >
              <t.icon className={`h-6 w-6 ${t.color}`} />
              <div className="mt-4 font-semibold">{t.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Open →</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Online orders */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Online Orders</h2>
          <Button variant="ghost" size="sm" onClick={fetchOrders}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-gradient-card border border-border/60 p-10 text-center text-muted-foreground">
            No live orders right now.
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-card border border-border/60 overflow-hidden">
            <div className="hidden md:grid grid-cols-[120px_1fr_150px_150px_180px_150px] gap-6 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <div className="text-left">Order</div>
              <div className="text-left">Customer</div>
              <div className="text-left">Theatre</div>
              <div className="text-left">Status</div>
              <div className="text-right">Total</div>
              <div className="text-right">Actions</div>
            </div>
            {orders.map((o) => {
              const id = o.order_id;
              const total = o.total_amount;
              const customerName = o.username || "Customer";
              const theatreName = o.theatre_name || "Prathap Deluxe";
              const status = o.order_status;
              return (
                <div key={id} className="grid grid-cols-2 md:grid-cols-[120px_1fr_150px_150px_180px_150px] gap-6 px-6 py-4 border-b border-border last:border-0 items-center">
                  <div className="font-mono text-sm text-left">#{id}</div>
                  <div className="text-sm font-medium text-left truncate">{customerName}</div>
                  <div className="text-sm text-muted-foreground hidden md:block text-left">{theatreName}</div>
                  <div className="text-left">
                    <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${
                      status === 'completed' ? 'bg-success/15 text-success border-success/30' :
                      status === 'confirmed' ? 'bg-chart-5/15 text-chart-5 border-chart-5/30' :
                      status === 'cancelled' ? 'bg-destructive/15 text-destructive border-destructive/30' :
                      'bg-warning/15 text-warning border-warning/30'
                    }`}>
                      {status}
                    </span>
                  </div>
                  <div className="text-right font-display text-lg text-[color:var(--gold)] hidden md:block">₹{Number(total).toFixed(0)}</div>
                  <div className="col-span-2 md:col-span-1 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleCancel(id)} title="Cancel Order">
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="glass" onClick={() => router.navigate({ to: "/admin/canteen-ops", search: { order: id } as any })} title="Manage Order">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="hero" onClick={() => handleCheckout(o)} title="Checkout Order">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                  Order #{paymentModal.orderId} - {paymentModal.customerName}
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
                        <div className="text-6xl mb-2">- </div>
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
                      <div className="text-6xl mb-2">-</div>
                      <div className="text-sm text-muted-foreground">Collect cash payment</div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        Amount: -{orders.find(o => o.order_id === paymentModal.orderId)?.total_amount || 0}
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
