import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import AppHeader from "@/components/AppHeader";
import heroBg from "@/assets/hero-bg.jpg";
import logoT4 from "@/assets/logo-t4.jpg";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  visible: boolean;
  category: string;
}

export default function Index() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("products").select("*").eq("visible", true).order("created_at", { ascending: true }).then(({ data }) => {
      setProducts(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <div className="relative h-48 overflow-hidden">
        <img src={heroBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/40" />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <div className="container">
            <div className="flex items-end gap-3">
               <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
                <img src={logoT4} alt="Logo T4" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground leading-none">Cardápio Digital</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Cardápio</h2>
          <span className="text-xs text-muted-foreground">{products.length} itens</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-xl h-56 animate-pulse border border-border" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <span className="font-display text-2xl font-bold text-muted-foreground">?</span>
            </div>
            <p className="text-muted-foreground font-display font-medium">Nenhum produto disponível</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Volte em breve!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Comidas */}
            {products.some(p => p.category === "comidas") && (
              <section>
                <h3 className="font-display text-base font-semibold text-foreground mb-3">🍔 Comidas</h3>
                <div className="grid grid-cols-2 gap-3">
                  {products.filter(p => p.category === "comidas").map((p, i) => (
                    <div key={p.id} style={{ animationDelay: `${i * 50}ms` }}>
                      <ProductCard {...p} />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {/* Combos */}
            {products.some(p => p.category === "combos") && (
              <section>
                <h3 className="font-display text-base font-semibold text-foreground mb-3">🎯 Combos</h3>
                <div className="grid grid-cols-2 gap-3">
                  {products.filter(p => p.category === "combos").map((p, i) => (
                    <div key={p.id} style={{ animationDelay: `${i * 50}ms` }}>
                      <ProductCard {...p} />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {/* Bebidas */}
            {products.some(p => p.category === "bebidas") && (
              <section>
                <h3 className="font-display text-base font-semibold text-foreground mb-3">🍺 Bebidas</h3>
                <div className="grid grid-cols-2 gap-3">
                  {products.filter(p => p.category === "bebidas").map((p, i) => (
                    <div key={p.id} style={{ animationDelay: `${i * 50}ms` }}>
                      <ProductCard {...p} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
