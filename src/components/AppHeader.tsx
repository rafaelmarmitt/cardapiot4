import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";

export default function AppHeader() {
  const { user, isAdmin, signOut, profile } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-primary shadow-md">
      <div className="container flex items-center justify-between h-14 px-4">
        <Link to="/" className="font-display text-xl font-bold text-primary-foreground">
          🍔 Bar do Terceirão
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-primary-foreground hover:bg-primary/80">
                  <Shield className="h-5 w-5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary/80" onClick={() => navigate("/carrinho")}>
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {itemCount}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/meus-pedidos")} className="text-primary-foreground hover:bg-primary/80">
                <User className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-primary-foreground hover:bg-primary/80">
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => navigate("/login")} className="font-semibold">
              Entrar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
