import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import AppHeader from "@/components/AppHeader";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

export default function Index() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("products").select("*").order("created_at", { ascending: true }).then(({ data }) => {
      setProducts(data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl font-bold text-foreground">Cardápio</h1>
          <p className="text-muted-foreground text-sm mt-1">Bar do Terceirão 🎓</p>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card-product h-56 animate-pulse bg-muted" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🍔</p>
            <p className="text-muted-foreground font-display">Nenhum produto disponível ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => (
              <ProductCard key={p.id} {...p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
