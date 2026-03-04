import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, CheckCircle, ArrowLeft } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";

const PIX_KEY = "03450557050";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderTotal, setOrderTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handlePlaceOrder() {
    if (!user || items.length === 0) return;
    setLoading(true);
    try {
      const { data: numData } = await supabase.rpc("generate_order_number");
      const num = numData || Math.floor(Math.random() * 999999 + 1).toString().padStart(6, "0");
      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        order_number: num,
        total,
        items: items.map(i => ({ id: i.id, title: i.title, price: i.price, quantity: i.quantity })),
      });
      if (error) throw error;
      setOrderNumber(num);
      setOrderTotal(total);
      clearCart();
      toast.success("Pedido criado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  }

  function copyPix() {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (orderNumber) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container px-4 py-6 max-w-lg mx-auto">
          <div className="bg-card rounded-2xl p-6 border border-border animate-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-success" />
            </div>
            <h1 className="font-display text-2xl font-bold">Pedido Criado</h1>

            <div className="bg-secondary rounded-xl p-4 my-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Número do Pedido</p>
              <p className="font-display text-4xl font-bold text-foreground mt-1 tracking-wider">{orderNumber}</p>
              <p className="font-display text-lg font-bold text-foreground mt-2">R${orderTotal.toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="bg-secondary rounded-xl p-4 text-left space-y-3">
              <p className="font-display font-semibold text-sm">Pagamento via PIX</p>
              <p className="text-xs text-muted-foreground">Copie a chave abaixo e realize o pagamento:</p>
              <div className="flex items-center gap-2 bg-card rounded-lg p-2.5 border border-border">
                <code className="flex-1 text-xs font-mono break-all text-foreground">{PIX_KEY}</code>
                <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0 rounded-lg" onClick={copyPix}>
                  <Copy className={`h-4 w-4 ${copied ? 'text-success' : ''}`} />
                </Button>
              </div>
              <div className="p-3 bg-accent/8 rounded-lg border border-accent/15">
                <p className="text-xs font-semibold text-foreground">Importante</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Coloque o número <span className="font-bold text-foreground">{orderNumber}</span> na descrição do PIX para identificarmos seu pagamento.
                </p>
              </div>
              <div className="p-3 bg-primary/8 rounded-lg border border-primary/15">
                <p className="text-xs font-semibold text-foreground">⏳ Aprovação</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Seu pagamento será aprovado em algumas horas. Após a confirmação, é só ir ao bar com o número do pedido <span className="font-bold text-foreground">#{orderNumber}</span> para retirar.
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <Button variant="accent" className="flex-1" onClick={() => navigate("/meus-pedidos")}>
                Ver Pedidos
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
                Cardápio
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container px-4 py-5 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/carrinho")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-display text-xl font-bold">Checkout</h1>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border animate-fade-up">
          <h2 className="font-display font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Resumo</h2>
          {items.map(item => (
            <div key={item.id} className="flex justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm">{item.quantity}x {item.title}</span>
              <span className="text-sm font-semibold">R${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
          <div className="flex justify-between mt-3 pt-3 border-t border-border">
            <span className="font-display font-bold">Total</span>
            <span className="font-display font-bold text-lg">R${total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <Button variant="accent" className="w-full mt-4 h-12 text-base font-semibold" onClick={handlePlaceOrder} disabled={loading || items.length === 0}>
          {loading ? "Processando..." : "Confirmar Pedido"}
        </Button>
      </main>
    </div>
  );
}
