import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouter, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Film, ShoppingBag, LogOut, LayoutDashboard, BarChart3, Package, TrendingUp, Headphones, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { clearAuth, getRole, isAuthed } from "@/lib/api";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-display text-primary">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">Scene not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for has left the theatre.
        </p>
        <div className="mt-6">
          <Button asChild variant="hero">
            <Link to="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Prathap Theatre — Premium Canteen Experience" },
      { name: "description", content: "Order snacks, beverages, and meals at Prathap Picture Palace. Skip the queue, enjoy the show." },
      { name: "author", content: "Prathap Picture Palace" },
      { property: "og:title", content: "Prathap Picture Palace" },
      { property: "og:description", content: "Premium canteen ordering for the cinema experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}

function SiteHeader() {
  const router = useRouter();
  const location = useLocation();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setAuthed(isAuthed());
      setRole(getRole());
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("auth:update", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("auth:update", sync);
    };
  }, [location.pathname]);

  const onLogout = () => {
    clearAuth();
    window.dispatchEvent(new Event("auth:update"));
    router.navigate({ to: "/login" });
  };

  const adminLinks = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/sales", label: "Sales", icon: TrendingUp },
    { to: "/admin/stock", label: "Stock", icon: Package },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/admin/canteen-ops", label: "Operations", icon: Headphones },
  ] as const;

  const customerLinks = [
    { to: "/menu", label: "Menu" },
    { to: "/orders", label: "My Orders" },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Film className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl tracking-wider">PRATHAP</div>
            <div className="text-[10px] text-muted-foreground -mt-0.5">PICTURE PALACE</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {role === "admin"
            ? adminLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
                  activeProps={{ className: "px-3 py-2 text-sm font-medium text-primary rounded-md bg-accent" }}
                >
                  {l.label}
                </Link>
              ))
            : customerLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors"
                  activeProps={{ className: "px-3 py-2 text-sm font-medium text-primary rounded-md bg-accent" }}
                >
                  {l.label}
                </Link>
              ))}
        </nav>

        <div className="flex items-center gap-2">
          {role !== "admin" && (
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" aria-label="Cart">
                <ShoppingBag className="h-5 w-5" />
              </Button>
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground shadow-glow">
                  {count}
                </span>
              )}
            </Link>
          )}

          {authed ? (
            <Button variant="ghost" size="sm" onClick={onLogout} className="hidden sm:inline-flex">
              <LogOut className="h-4 w-4 mr-1.5" /> Logout
            </Button>
          ) : (
            <Button asChild variant="hero" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">Sign In</Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background">
          <div className="px-4 py-3 flex flex-col gap-1">
            {(role === "admin" ? adminLinks : customerLinks).map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-sm hover:bg-accent"
              >
                {l.label}
              </Link>
            ))}
            {authed ? (
              <button
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="px-3 py-2 rounded-md text-sm text-left hover:bg-accent"
              >
                Logout
              </button>
            ) : (
              <Link to="/login" onClick={() => setOpen(false)} className="px-3 py-2 rounded-md text-sm bg-primary text-primary-foreground">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background mt-auto">
      <div className="w-full px-4 sm:px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Film className="h-4 w-4 text-primary" />
          <span>© {new Date().getFullYear()} Prathap Picture Palace. All rights reserved.</span>
        </div>
        <div className="flex gap-4">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <Link to="/menu" className="hover:text-foreground">Menu</Link>
          <Link to="/login" className="hover:text-foreground">Sign In</Link>
        </div>
      </div>
    </footer>
  );
}
