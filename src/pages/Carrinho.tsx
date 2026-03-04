import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";

export default function Carrinho() {
  const { items, removeItem, updateQuantity, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  function handleCheckout() {
    if (!user) {
      toast.error("Faça login para finalizar o pedido!");
      navigate("/login");
      return;
    }
    navigate("/checkout");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container px-4 py-6 max-w-lg mx-auto">
        <h1 className="font-display text-2xl font-bold mb-4">Carrinho</h1>
        {items.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-muted-foreground font-display">Seu carrinho está vazio</p>
            <Button className="mt-4 btn-accent" onClick={() => navigate("/")}>Ver Cardápio</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="bg-card rounded-lg p-3 flex items-center gap-3 shadow-sm border border-border">
                  <div className="w-14 h-14 rounded-md bg-muted overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm truncate">{item.title}</p>
                    <p className="text-accent font-bold text-sm">R${(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-card rounded-lg p-4 shadow-sm border border-border">
              <div className="flex justify-between items-center mb-4">
                <span className="font-display font-semibold text-lg">Total</span>
                <span className="font-display font-bold text-xl text-accent">R${total.toFixed(2).replace('.', ',')}</span>
              </div>
              <Button className="w-full btn-accent h-12 text-base" onClick={handleCheckout}>
                Finalizar Pedido
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
