import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AppHeader() {
  const { user, isAdmin, signOut } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    async function fetchPending() {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count ?? 0);
    }

    fetchPending();

    const channel = supabase
      .channel("admin-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchPending();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
      <div className="container flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="font-display text-sm font-bold text-accent-foreground">CD</span>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">Cardápio</span>
        </Link>
        <div className="flex items-center gap-1">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="relative text-muted-foreground hover:text-foreground">
                  <Shield className="h-5 w-5" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" onClick={() => navigate("/carrinho")}>
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/meus-pedidos")} className="text-muted-foreground hover:text-foreground">
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button variant="accent" size="sm" onClick={() => navigate("/login")} className="font-semibold">
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
