import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, CheckCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";

const PIX_KEY = "terceiraobar@email.com";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
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
      clearCart();
      toast.success("Pedido criado com sucesso!");
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
        <main className="container px-4 py-6 max-w-lg mx-auto text-center">
          <div className="bg-card rounded-xl p-6 shadow-md border border-border animate-fade-in">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">Pedido Criado!</h1>
            <div className="bg-primary/10 rounded-lg p-4 my-4">
              <p className="text-sm text-muted-foreground">Número do Pedido</p>
              <p className="font-display text-3xl font-bold text-primary">{orderNumber}</p>
            </div>
            <div className="bg-muted rounded-lg p-4 my-4 text-left">
              <p className="font-display font-semibold mb-2">Pagamento via PIX:</p>
              <p className="text-sm text-muted-foreground mb-2">Copie a chave PIX abaixo e realize o pagamento:</p>
              <div className="flex items-center gap-2 bg-card rounded-md p-2 border border-border">
                <code className="flex-1 text-sm font-mono break-all">{PIX_KEY}</code>
                <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={copyPix}>
                  <Copy className={`h-4 w-4 ${copied ? 'text-success' : ''}`} />
                </Button>
              </div>
              <div className="mt-3 p-3 bg-accent/10 rounded-md border border-accent/20">
                <p className="text-sm font-semibold text-accent">⚠️ Importante:</p>
                <p className="text-sm mt-1">Coloque o número <strong>{orderNumber}</strong> na descrição do PIX para identificarmos seu pagamento!</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1 btn-accent" onClick={() => navigate("/meus-pedidos")}>
                Ver Meus Pedidos
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>
                Voltar ao Cardápio
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
      <main className="container px-4 py-6 max-w-lg mx-auto">
        <h1 className="font-display text-2xl font-bold mb-4">Checkout</h1>
        <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <h2 className="font-display font-semibold mb-3">Resumo do Pedido</h2>
          {items.map(item => (
            <div key={item.id} className="flex justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm">{item.quantity}x {item.title}</span>
              <span className="text-sm font-semibold">R${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
            </div>
          ))}
          <div className="flex justify-between mt-3 pt-3 border-t border-border">
            <span className="font-display font-bold text-lg">Total</span>
            <span className="font-display font-bold text-lg text-accent">R${total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>
        <Button className="w-full mt-4 btn-accent h-12 text-base" onClick={handlePlaceOrder} disabled={loading || items.length === 0}>
          {loading ? "Processando..." : "Confirmar Pedido"}
        </Button>
      </main>
    </div>
  );
}
