import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, ShoppingCart, TrendingUp, Package, Download, Calendar, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, CANTEENS, getRole } from "@/lib/api";
import { CanteenSelector, SectionTitle, StatCard, EmptyState } from "@/components/admin/admin-ui";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/sales")({
  head: () => ({ meta: [{ title: "Sales — Admin" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && getRole() !== "admin") throw { redirect: true };
  },
  component: SalesPage,
  errorComponent: () => {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  },
});

const SHOWS = ["Morning", "Matinee", "First Show", "Second Show", "Special Show"] as const;

function SalesPage() {
  const [canteenId, setCanteenId] = useState(1);
  const [tab, setTab] = useState<"add" | "report">("report");
  const [stats, setStats] = useState({ revenue: 0, items: 0, orders: 0 });
  const [report, setReport] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // form state
  const [show, setShow] = useState<string>(SHOWS[0]);
  const [itemId, setItemId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);

  // Date definitions
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  }, []);

  // filters state - default to today
  const [dateFrom, setDateFrom] = useState<string>(today);
  const [dateTo, setDateTo] = useState<string>(today);
  const [showFilter, setShowFilter] = useState<string>("all");
  const [itemFilter, setItemFilter] = useState<string>("all");

  const load = async (useDateRange: boolean = false) => {
    setLoading(true);
    try {
      let salesData: any[] = [];
      
      if (useDateRange) {
        // Fetch sales data for the selected date range
        const reportResponse = await api.get("/api/sales/sales-report", { 
          params: { 
            canteen_id: canteenId, 
            date_from: dateFrom,
            date_to: dateTo,
            show_type: showFilter !== "all" ? showFilter : undefined,
            item_name: itemFilter !== "all" ? itemFilter : undefined
          } 
        }).catch(() => ({ data: [] }));
        
        salesData = Array.isArray(reportResponse.data) ? reportResponse.data : [];
      } else {
        // Always fetch today's sales for the report
        const dailySales = await api.get("/api/sales/daily-sales", { 
          params: { 
            canteen_id: canteenId, 
            sale_date: today 
          } 
        }).catch(() => ({ data: [] }));
        
        salesData = Array.isArray(dailySales.data) ? dailySales.data : [];
      }
      
      const [st] = await Promise.all([
        api.get("/api/stock", { params: { canteen_id: canteenId } }).catch(() => ({ data: [] }))
      ]);
      
      // Calculate stats from detailed sales data
      const totalRevenue = salesData.reduce((sum: number, item: any) => sum + (item.total_cost || 0), 0);
      const totalItems = salesData.reduce((sum: number, item: any) => sum + (item.quantity_sold || 0), 0);
      const totalOrders = new Set(salesData.map((item: any) => item.show_type)).size;
      
      setStats({
        revenue: totalRevenue,
        items: totalItems,
        orders: totalOrders,
      });
      
      setReport(salesData);
      setStock(Array.isArray(st.data) ? st.data : []);
    } catch (error) {
      console.error("Error loading sales data:", error);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
  }, [canteenId]);

  useEffect(() => {
    // Load data with date range filters when they change
    if (dateFrom && dateTo) {
      load(true);
    }
  }, [dateFrom, dateTo, showFilter, itemFilter]);

  const submitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) return toast.error("Select an item");
    setSubmitting(true);
    try {
      await api.post("/api/sales", {
        canteen_id: canteenId,
        items: [{
          item_id: Number(itemId),
          quantity_sold: qty
        }],
        show_type: show,
      });
      toast.success("Sale recorded");
      setQty(1);
      setItemId("");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed to record sale");
    } finally {
      setSubmitting(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    try {
      const from = dateFrom || thirtyDaysAgo;
      const to = dateTo || today;
      
      // Use current filtered report data
      const salesData = filteredReport;
      
      if (salesData.length === 0) {
        toast.error("No data to export");
        return;
      }
      
      // Create CSV content
      const headers = ["SL No", "Date", "Theatre", "Show Type", "Item Name", "Price", "Quantity", "Total Revenue"];
      const csvContent = [
        headers.join(","),
        ...salesData.map((sale: any, index: number) => [
          sale.sl_no || index + 1,
          sale.sale_date ? new Date(sale.sale_date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
          CANTEENS.find(c => c.id === canteenId)?.name || `Screen ${canteenId}`,
          sale.show_type || "-",
          sale.item_name || "-",
          `₹${(sale.price || 0).toFixed(2)}`,
          sale.quantity_sold || sale.quantity || 0,
          `₹${(sale.total_cost || sale.total_amount || 0).toFixed(2)}`
        ].map(field => `"${field}"`).join(","))
      ].join("\n");
      
      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `sales_report_${canteenId}_${from}_to_${to}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Sales data exported successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  // Filter report data based on filters (only for client-side filtering when not using date range)
  const filteredReport = useMemo(() => {
    // If we're using date range filtering, the data is already filtered on the server
    if (dateFrom !== today || dateTo !== today) {
      return report;
    }
    
    // Otherwise, apply client-side filtering
    let filtered = [...report];
    
    if (showFilter !== "all") {
      filtered = filtered.filter(item => 
        (item.show_type || "").toLowerCase() === showFilter.toLowerCase()
      );
    }
    
    if (itemFilter !== "all") {
      filtered = filtered.filter(item => 
        (item.item_name || "").toLowerCase().includes(itemFilter.toLowerCase())
      );
    }
    
    return filtered;
  }, [report, showFilter, itemFilter, dateFrom, dateTo, today]);

  // Get unique show types and items for filters
  const uniqueShows = useMemo(() => {
    const shows = [...new Set(report.map(item => item.show_type || "").filter(Boolean))];
    return shows;
  }, [report]);

  const uniqueItems = useMemo(() => {
    const items = [...new Set(report.map(item => item.item_name || "").filter(Boolean))];
    return items;
  }, [report]);

  return (
    <div className="w-full px-4 sm:px-6 py-8">
      <SectionTitle
        title="Sales Management"
        subtitle="Track sales performance and record transactions"
        right={<CanteenSelector value={canteenId} onChange={setCanteenId} canteens={CANTEENS} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Today's Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={<TrendingUp className="h-5 w-5" />} accent="gold" />
        <StatCard label="Items Sold" value={stats.items} icon={<Package className="h-5 w-5" />} accent="success" />
        <StatCard label="Total Orders" value={stats.orders} icon={<ShoppingCart className="h-5 w-5" />} accent="primary" />
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setTab("add")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === "add" ? "bg-background shadow" : "text-muted-foreground"}`}
          >
            Add Sale
          </button>
          <button
            onClick={() => setTab("report")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${tab === "report" ? "bg-background shadow" : "text-muted-foreground"}`}
          >
            Sales Report
          </button>
        </div>
        
        {tab === "report" && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => load(dateFrom !== today || dateTo !== today)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> 
              Refresh
            </Button>
            <Button 
              variant="hero" 
              size="sm" 
              onClick={exportToExcel}
              disabled={exporting || loading}
            >
              <Download className={`h-4 w-4 mr-1 ${exporting ? 'animate-spin' : ''}`} /> 
              Export CSV
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6">
        {tab === "add" ? (
          <form onSubmit={submitSale} className="rounded-2xl bg-gradient-card border border-border/60 p-6 max-w-2xl">
            <h3 className="font-display text-xl mb-4">Record a sale</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Show Type</Label>
                <select value={show} onChange={(e) => setShow(e.target.value)} className="w-full h-10 rounded-md bg-background border border-border px-3 text-sm">
                  {SHOWS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Item</Label>
                <select
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="w-full h-10 rounded-md bg-background border border-border px-3 text-sm"
                >
                  <option value="">Select item...</option>
                  {stock.map((s) => (
                    <option key={s.item_id} value={s.item_id.toString()}>
                      {s.item_name || s.name} — ₹{s.price}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
              </div>
            </div>
            <Button type="submit" variant="hero" className="mt-5" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Sale
            </Button>
          </form>
        ) : (
          <>
            {/* Filters Section */}
            <div className="rounded-2xl bg-gradient-card border border-border/60 p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Filters</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">From Date</Label>
                  <Input 
                    type="date" 
                    value={dateFrom} 
                    onChange={(e) => setDateFrom(e.target.value)}
                    max={today}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">To Date</Label>
                  <Input 
                    type="date" 
                    value={dateTo} 
                    onChange={(e) => setDateTo(e.target.value)}
                    max={today}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Show Type</Label>
                  <Select value={showFilter} onValueChange={setShowFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All shows" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shows</SelectItem>
                      {uniqueShows.map(show => (
                        <SelectItem key={show} value={show}>{show}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Item</Label>
                  <Select value={itemFilter} onValueChange={setItemFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      {uniqueItems.map(item => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quick Range</Label>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setDateFrom(today);
                        setDateTo(today);
                      }}
                      className="flex-1"
                    >
                      Today
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setDateFrom(thirtyDaysAgo);
                        setDateTo(today);
                      }}
                      className="flex-1"
                    >
                      30 Days
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Report Table */}
            {loading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading sales data...
              </div>
            ) : filteredReport.length === 0 ? (
              <EmptyState 
                title="No sales data found" 
                hint="Try adjusting your filters or date range to see sales data." 
              />
            ) : (
              <div className="rounded-2xl bg-gradient-card border border-border/60 overflow-hidden">
                <div className="px-5 py-3 bg-muted/30 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Sales Report</h3>
                    <div className="text-sm text-muted-foreground">
                      {filteredReport.length} records
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-5 py-3">SL No</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Theatre</th>
                        <th className="px-5 py-3">Show Type</th>
                        <th className="px-5 py-3">Item Name</th>
                        <th className="px-5 py-3 text-right">Price</th>
                        <th className="px-5 py-3 text-right">Quantity</th>
                        <th className="px-5 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReport.map((r, i) => (
                        <tr key={i} className="border-t border-border hover:bg-muted/30">
                          <td className="px-5 py-3 text-muted-foreground font-mono text-xs">
                            {r.sl_no || i + 1}
                          </td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {r.sale_date ? new Date(r.sale_date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                              {CANTEENS.find(c => c.id === canteenId)?.name || `Screen ${canteenId}`}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                              {r.show_type || "-"}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium">{r.item_name || "-"}</td>
                          <td className="px-5 py-3 text-right font-mono">
                            ₹{Number(r.price || 0).toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-right font-mono">
                            {r.quantity_sold || r.quantity || 0}
                          </td>
                          <td className="px-5 py-3 text-right font-display text-[color:var(--gold)] font-semibold">
                            ₹{Number(r.total_cost || r.total_amount || r.revenue || r.total || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t border-border">
                      <tr>
                        <td colSpan={5} className="px-5 py-3 font-semibold">Total</td>
                        <td className="px-5 py-3 text-right font-semibold">
                          -
                        </td>
                        <td className="px-5 py-3 text-right font-semibold">
                          {filteredReport.reduce((sum, r) => sum + (r.quantity_sold || r.quantity || 0), 0)}
                        </td>
                        <td className="px-5 py-3 text-right font-display text-[color:var(--gold)] font-bold text-lg">
                          ₹{filteredReport.reduce((sum, r) => sum + Number(r.total_cost || r.total_amount || r.revenue || r.total || 0), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
