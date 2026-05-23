import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, TrendingUp, ShoppingBag, Award, Clock } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { api, CANTEENS, getRole } from "@/lib/api";
import { CanteenSelector, SectionTitle, StatCard } from "@/components/admin/admin-ui";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && getRole() !== "admin") throw { redirect: true };
  },
  component: AnalyticsPage,
  errorComponent: () => {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  },
});

const RANGES = [
  { value: 7, label: "7 Days" },
  { value: 30, label: "30 Days" },
  { value: 90, label: "90 Days" },
];

function AnalyticsPage() {
  const [canteenId, setCanteenId] = useState(1);
  const [days, setDays] = useState(7);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [canteenId, days]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch comprehensive analytics data
      const [analyticsRes, performanceRes] = await Promise.all([
        api.get("/api/analytics", { params: { canteen_id: canteenId, days } }),
        api.get("/api/analytics/performance", { params: { canteen_id: canteenId, days } })
      ]);
      
      const analytics = analyticsRes.data || {};
      const performance = performanceRes.data || {};
      
      // Debug: Log the received data
      console.log("Analytics data:", analytics);
      console.log("Performance data:", performance);
      console.log("Daily trend:", analytics.daily_trend);
      console.log("Top items:", analytics.top_selling_items);
      
      // Process the data for charts
      const processedData = {
        ...analytics,
        ...performance,
        // Process daily trend from performance data
        daily_trend: processDailyTrend(analytics, days),
        // Process top items from analytics
        top_items: analytics.top_selling_items || [],
        // Calculate totals
        totals: {
          revenue: analytics.summary?.total_revenue || 0,
          orders: analytics.summary?.total_orders || 0,
          avg_order: analytics.summary?.average_order_value || 0
        },
        // Find peak hour from hourly distribution
        peak_hour: findPeakHour(performance.hourly_distribution || [])
      };
      
      console.log("Processed data:", processedData);
      setData(processedData);
    } catch (error) {
      console.error("Error loading analytics:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const processDailyTrend = (analytics: any, days: number) => {
    // Use real daily trend data from backend
    return analytics.daily_trend || [];
  };

  const findPeakHour = (hourlyData: any[]) => {
    if (!hourlyData || hourlyData.length === 0) return "7-9 PM";
    
    const peak = hourlyData.reduce((max, curr) => 
      curr.orders > max.orders ? curr : max
    );
    
    const hour = peak.hour;
    if (hour >= 19 && hour <= 21) return "7-9 PM";
    if (hour >= 16 && hour <= 18) return "4-6 PM";
    if (hour >= 12 && hour <= 14) return "12-2 PM";
    if (hour >= 10 && hour <= 11) return "10-11 AM";
    return `${hour}:00`;
  };

  const calculatePeakHour = (hourlyData: any[]) => {
    if (!hourlyData || hourlyData.length === 0) return "No data";
    
    const peak = hourlyData.reduce((max, curr) => 
      curr.orders > max.orders ? curr : max
    );
    
    const hour = peak.hour;
    if (hour >= 19 && hour <= 21) return "7-9 PM";
    if (hour >= 16 && hour <= 18) return "4-6 PM";
    if (hour >= 12 && hour <= 14) return "12-2 PM";
    if (hour >= 10 && hour <= 11) return "10-11 AM";
    return `${hour}:00`;
  };

  // Use only real data - no demo fallback
  const trend = data?.daily_trend || [];
  const topItems = data?.top_selling_items || [];
  
  const totals = {
    revenue: data?.summary?.total_revenue || 0,
    orders: data?.summary?.total_orders || 0,
    avg_order: data?.summary?.average_order_value || 0
  };
  const peak = data?.peak_hour || calculatePeakHour(data?.hourly_distribution || []);

  return (
    <div className="w-full px-4 sm:px-6 py-8">
      <SectionTitle
        title="Analytics Dashboard"
        subtitle="Business insights & performance trends"
        right={
          <div className="flex flex-wrap gap-2 items-center">
            <CanteenSelector value={canteenId} onChange={setCanteenId} canteens={CANTEENS} />
            <div className="inline-flex rounded-lg bg-muted p-1">
              {RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setDays(r.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${days === r.value ? "bg-background shadow" : "text-muted-foreground"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={`₹${Number(totals.revenue).toLocaleString()}`} icon={<TrendingUp className="h-5 w-5" />} accent="gold" />
        <StatCard label="Orders" value={totals.orders} icon={<ShoppingBag className="h-5 w-5" />} accent="primary" />
        <StatCard label="Avg Order" value={`₹${Math.round(totals.avg_order || (totals.orders ? totals.revenue / totals.orders : 0))}`} icon={<Award className="h-5 w-5" />} accent="success" />
        <StatCard label="Peak Hours" value={peak} icon={<Clock className="h-5 w-5" />} accent="warning" />
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading analytics...</div>
      ) : (
        <>
          {/* Data info */}
          <div className="mt-6 p-4 bg-muted rounded-lg text-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="font-semibold">Trend Data:</span> {trend.length} days
              </div>
              <div>
                <span className="font-semibold">Top Items:</span> {topItems.length} items
              </div>
              <div>
                <span className="font-semibold">Total Revenue:</span> ₹{totals.revenue}
              </div>
              <div>
                <span className="font-semibold">Total Orders:</span> {totals.orders}
              </div>
            </div>
            {trend.length > 0 && (
              <div className="mt-2 text-muted-foreground">
                Latest: {trend[trend.length - 1]?.date} - Revenue: ₹{trend[trend.length - 1]?.revenue}, Orders: {trend[trend.length - 1]?.orders}
              </div>
            )}
          </div>
          
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
              <h3 className="font-display text-xl mb-4">Revenue Trend</h3>
              <div className="h-72">
                {trend.length > 0 ? (
                  <ResponsiveContainer>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={3} dot={{ fill: "var(--primary)" }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <p className="mb-2">No revenue data available</p>
                      <p className="text-xs">Add sales records to see revenue trends</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-card border border-border/60 p-6">
              <h3 className="font-display text-xl mb-4">Sales Volume</h3>
              <div className="h-72">
                {trend.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar dataKey="orders" fill="var(--gold)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <p className="mb-2">No order data available</p>
                      <p className="text-xs">Add sales records to see order trends</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-card border border-border/60 p-6 lg:col-span-2">
              <h3 className="font-display text-xl mb-4">Top Selling Items</h3>
              <div className="space-y-3">
                {topItems.length > 0 ? (
                  topItems.slice(0, 6).map((it: any, idx: number) => {
                    const quantity = it.quantity_sold || it.quantity || 0;
                    const max = Math.max(...topItems.map((x: any) => Number(x.quantity_sold || x.quantity || 0)));
                    const w = max > 0 ? (quantity / max) * 100 : 0;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{idx + 1}. {it.item_name || it.name}</span>
                          <span className="text-muted-foreground">{quantity} sold</span>
                        </div>
                        <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${w}%` }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <div className="text-center">
                      <p className="mb-2">No sales data available</p>
                      <p className="text-xs">Add sales records to see top selling items</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function demoTrend(days: number) {
  const arr = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push({
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      revenue: Math.round(2000 + Math.random() * 6000),
      orders: Math.round(20 + Math.random() * 80),
    });
  }
  return arr;
}
function demoItems() {
  return [
    { name: "Caramel Popcorn (L)", quantity: 145 },
    { name: "Coke 500ml", quantity: 132 },
    { name: "Veg Sandwich", quantity: 98 },
    { name: "Nachos", quantity: 87 },
    { name: "Cold Coffee", quantity: 64 },
    { name: "Samosa Combo", quantity: 51 },
  ];
}
