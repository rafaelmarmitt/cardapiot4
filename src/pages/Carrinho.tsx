import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ArrowLeft } from "lucide-react";
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
      toast.error("Faça login para finalizar o pedido");
      navigate("/login");
      return;
    }
    if (items.length === 0) return;
    navigate("/checkout");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container px-4 py-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-xl font-bold">Carrinho</h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <ShoppingCartIcon className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-display font-medium text-foreground">Carrinho vazio</p>
            <p className="text-sm text-muted-foreground mt-1">Adicione itens do cardápio</p>
            <Button variant="accent" className="mt-4" onClick={() => navigate("/")}>Ver Cardápio</Button>
          </div>
        ) : (
          <div className="animate-fade-up">
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.id} className="bg-card rounded-xl p-3 flex items-center gap-3 border border-border">
                  <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-display font-bold text-muted-foreground">{item.title.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm truncate">{item.title}</p>
                    <p className="text-foreground font-bold text-sm mt-0.5">
                      R${(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 bg-card rounded-xl p-4 border border-border">
              <div className="flex justify-between items-center mb-4">
                <span className="font-display font-semibold">Total</span>
                <span className="font-display font-bold text-xl">R${total.toFixed(2).replace('.', ',')}</span>
              </div>
              <Button variant="accent" className="w-full h-12 text-base font-semibold" onClick={handleCheckout}>
                Finalizar Pedido
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
  );
}
