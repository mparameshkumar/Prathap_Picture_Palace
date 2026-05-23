import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Edit2, Loader2, Package, Plus, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, CANTEENS, getRole } from "@/lib/api";
import { CanteenSelector, SectionTitle, StatCard, EmptyState } from "@/components/admin/admin-ui";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/stock")({
  head: () => ({ meta: [{ title: "Stock — Admin" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && getRole() !== "admin") throw { redirect: true };
  },
  component: StockPage,
  errorComponent: () => {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  },
});

type Item = {
  item_id: number;
  item_name?: string;
  name?: string;
  price: number;
  quantity: number;
};

function StockPage() {
  const [canteenId, setCanteenId] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ item_name: "", price: 0, quantity: 0 });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ price: 0, quantity: 0 });

  const load = () => {
    setLoading(true);
    api
      .get("/api/stock/", { params: { canteen_id: canteenId } })
      .then((r) => {
        const items = Array.isArray(r.data) ? r.data : [];
        // Sort items alphabetically by name (case-insensitive)
        const sortedItems = items.sort((a, b) => {
          const nameA = (a.item_name || a.name || "").toLowerCase();
          const nameB = (b.item_name || b.name || "").toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setItems(sortedItems);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [canteenId]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/stock/", { ...form, canteen_id: canteenId });
      toast.success("Item added");
      setForm({ item_name: "", price: 0, quantity: 0 });
      setShowAdd(false);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };

  const startEdit = (it: Item) => {
    setEditId(it.item_id);
    setEditForm({ price: it.price, quantity: it.quantity });
  };
  const saveEdit = async (id: number) => {
    try {
      await api.patch(`/api/stock/${id}`, editForm);
      toast.success("Updated");
      setEditId(null);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };
  const removeItem = async (id: number) => {
    if (!confirm("Delete this item?")) return;
    try {
      await api.delete(`/api/stock/${id}`);
      toast.success("Deleted");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Failed");
    }
  };

  const total = items.length;
  const inStock = items.filter((i) => i.quantity > 0).length;
  const outOfStock = total - inStock;

  return (
    <div className="w-full px-4 sm:px-6 py-8">
      <SectionTitle
        title="Stock Management"
        subtitle="Manage inventory and stock levels"
        right={
          <div className="flex flex-wrap gap-2 items-center">
            <CanteenSelector value={canteenId} onChange={setCanteenId} canteens={CANTEENS} />
            <Button variant="hero" onClick={() => setShowAdd((s) => !s)}>
              <Plus className="h-4 w-4" /> {showAdd ? "Close" : "Add Item"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Items" value={total} icon={<Package className="h-5 w-5" />} accent="primary" />
        <StatCard label="In Stock" value={inStock} icon={<Package className="h-5 w-5" />} accent="success" />
        <StatCard label="Out of Stock" value={outOfStock} icon={<Package className="h-5 w-5" />} accent="warning" />
      </div>

      {showAdd && (
        <form onSubmit={addItem} className="mt-6 rounded-2xl bg-gradient-card border border-border/60 p-6">
          <h3 className="font-display text-xl mb-4">New stock item</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Item Name</Label>
              <Input value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Price (₹)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required />
            </div>
          </div>
          <Button type="submit" variant="hero" className="mt-4">Add Item</Button>
        </form>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState title="No stock items" hint="Add your first item to get started." />
        ) : (
          <div className="rounded-2xl bg-gradient-card border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-right">Qty</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const editing = editId === it.item_id;
                  return (
                    <tr key={it.item_id} className="border-t border-border">
                      <td className="px-5 py-3 font-medium">{it.item_name || it.name}</td>
                      <td className="px-5 py-3 text-right">
                        {editing ? (
                          <Input type="number" className="h-8 w-24 ml-auto" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} />
                        ) : (
                          <span className="font-display text-[color:var(--gold)]">₹{Number(it.price).toFixed(0)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {editing ? (
                          <Input type="number" className="h-8 w-20 ml-auto" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })} />
                        ) : (
                          it.quantity
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {it.quantity > 0 ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-success/15 text-success border border-success/30">In stock</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/30">Out</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex gap-1">
                          {editing ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(it.item_id)}><Check className="h-4 w-4 text-success" /></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditId(null)}><X className="h-4 w-4" /></Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(it)}><Edit2 className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeItem(it.item_id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
