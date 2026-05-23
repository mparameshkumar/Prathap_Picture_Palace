import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Shield, Sparkles, Star, Ticket, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CANTEENS } from "@/lib/api";
import heroImg from "@/assets/hero-canteen.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prathap Picture Palace — Skip the queue, enjoy the show" },
      { name: "description", content: "Order popcorn, snacks and beverages from your seat. Premium canteen experience at Prathap Picture Palace." },
      { property: "og:title", content: "Prathap Picture Palace" },
      { property: "og:description", content: "Order from your seat. Skip the queue." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Theatre canteen" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          <div className="absolute inset-0 bg-hero opacity-60" />
        </div>

        <div className="relative w-full px-4 sm:px-6 pt-20 pb-28 md:pt-28 md:pb-40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Now serving at all 3 screens
            </div>
            <h1 className="mt-6 font-display text-5xl sm:text-7xl md:text-8xl leading-[0.95] text-balance">
              SKIP THE QUEUE. <br />
              <span className="bg-gradient-to-r from-primary to-[color:var(--gold)] bg-clip-text text-transparent">
                ENJOY THE SHOW.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Order popcorn, beverages and snacks from your seat. Hot, fresh, and delivered before the trailers end.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="xl">
                <Link to="/menu">
                  Order Now <ArrowRight className="ml-1 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-[color:var(--gold)] text-[color:var(--gold)]" />
                <span className="font-semibold text-foreground">4.8</span> · 12,000+ orders
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                Avg. 4 min delivery
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="w-full px-4 sm:px-6 -mt-16 md:-mt-20 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Ticket, title: "From your seat", desc: "Order without missing a single scene." },
            { icon: Utensils, title: "Always fresh", desc: "Prepared the moment you order." },
            { icon: Shield, title: "Secure payments", desc: "Encrypted, fast checkout every time." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl bg-gradient-card border border-border/60 p-6 shadow-card"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CANTEENS */}
      <section className="w-full px-4 sm:px-6 py-20 md:py-28">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Our Locations</div>
            <h2 className="mt-2 font-display text-4xl sm:text-5xl">Choose your screen</h2>
          </div>
          <Link to="/menu" className="text-sm text-muted-foreground hover:text-foreground hidden sm:inline">
            Browse menu →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CANTEENS.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-2xl bg-gradient-card border border-border/60 p-7 hover:border-primary/50 transition-all hover:-translate-y-1 shadow-card"
            >
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/20 transition-colors" />
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Screen {c.id}</div>
                <h3 className="mt-2 font-display text-3xl">{c.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.tagline}</p>
                <Button asChild variant="ghost" size="sm" className="mt-6 -ml-3">
                  <Link to="/menu" search={{ canteen: c.id } as any}>
                    Order from here <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="w-full px-4 sm:px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 md:p-16 shadow-elegant">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-4xl md:text-6xl text-primary-foreground">Lights. Camera. Snacks.</h2>
            <p className="mt-4 text-primary-foreground/90 text-lg">
              Sign in to start ordering. Your snacks will be ready before the show begins.
            </p>
            <div className="mt-8 flex gap-3">
              <Button asChild variant="glass" size="xl">
                <Link to="/login">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
