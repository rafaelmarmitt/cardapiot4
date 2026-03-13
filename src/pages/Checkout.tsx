import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";

// Initialize Mercado Pago SDK
const mpPublicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
if (mpPublicKey) {
  initMercadoPago(mpPublicKey, { locale: "pt-BR" });
}

type PaymentStatus = "idle" | "processing" | "approved" | "in_process" | "rejected";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const initialization = { amount: total };

  const customization = {
    paymentMethods: {
      creditCard: "all" as const,
      debitCard: "all" as const,
      ticket: "all" as const,
      bankTransfer: "all" as const,
      maxInstallments: 12,
    },
    visual: {
      style: { theme: "default" as const },
    },
  };

  const onSubmit = useCallback(
    async (formData: any) => {
      if (!user || items.length === 0) return;
      setStatus("processing");

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const res = await fetch(
          `${supabaseUrl}/functions/v1/process-payment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseKey,
            },
            body: JSON.stringify({
              paymentData: formData,
              items: items.map((i) => ({
                id: i.id,
                title: i.title,
                price: i.price,
                quantity: i.quantity,
              })),
              total,
              user_id: user.id,
            }),
          }
        );

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Erro ao processar pagamento");

        setOrderNumber(result.order_number || null);

        if (result.status === "approved") {
          setStatus("approved");
          clearCart();
          toast.success("Pagamento aprovado!");
        } else if (result.status === "in_process" || result.status === "pending") {
          setStatus("in_process");
          clearCart();
          toast.info("Pagamento em análise. Você será notificado.");
        } else {
          setStatus("rejected");
          toast.error(result.status_detail || "Pagamento recusado. Tente outro método.");
        }
      } catch (err: any) {
        setStatus("rejected");
        toast.error(err.message || "Erro ao processar pagamento");
      }
    },
    [user, items, total, clearCart]
  );

  const onError = useCallback((error: any) => {
    console.error("Payment Brick error:", error);
    toast.error("Erro no formulário de pagamento.");
  }, []);

  const onReady = useCallback(() => {}, []);

  // --- Result Screens ---
  if (status === "approved") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container px-4 py-6 max-w-lg mx-auto">
          <div className="bg-card rounded-2xl p-6 border border-border animate-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-green-500" />
            </div>
            <h1 className="font-display text-2xl font-bold">Pagamento Aprovado!</h1>
            <p className="text-muted-foreground mt-2">Seu pedido foi confirmado.</p>
            {orderNumber && (
              <div className="bg-secondary rounded-xl p-4 my-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Número do Pedido</p>
                <p className="font-display text-3xl font-bold text-foreground mt-1 tracking-wider">{orderNumber}</p>
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <Button variant="accent" className="flex-1" onClick={() => navigate("/meus-pedidos")}>Ver Pedidos</Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Cardápio</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (status === "in_process") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container px-4 py-6 max-w-lg mx-auto">
          <div className="bg-card rounded-2xl p-6 border border-border animate-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-7 w-7 text-yellow-500" />
            </div>
            <h1 className="font-display text-2xl font-bold">Pagamento em Análise</h1>
            <p className="text-muted-foreground mt-2">Você será notificado quando for aprovado.</p>
            {orderNumber && (
              <div className="bg-secondary rounded-xl p-4 my-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Número do Pedido</p>
                <p className="font-display text-3xl font-bold text-foreground mt-1 tracking-wider">{orderNumber}</p>
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <Button variant="accent" className="flex-1" onClick={() => navigate("/meus-pedidos")}>Ver Pedidos</Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Cardápio</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container px-4 py-6 max-w-lg mx-auto">
          <div className="bg-card rounded-2xl p-6 border border-border animate-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-7 w-7 text-destructive" />
            </div>
            <h1 className="font-display text-2xl font-bold">Pagamento Recusado</h1>
            <p className="text-muted-foreground mt-2">Tente novamente com outro método.</p>
            <div className="flex gap-2 mt-5">
              <Button variant="accent" className="flex-1" onClick={() => setStatus("idle")}>Tentar Novamente</Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/carrinho")}>Voltar ao Carrinho</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!mpPublicKey) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container px-4 py-6 max-w-lg mx-auto text-center">
          <p className="text-destructive font-semibold">Chave pública do Mercado Pago não configurada.</p>
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
          <h1 className="font-display text-xl font-bold">Pagamento</h1>
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-xl p-4 border border-border animate-fade-up mb-5">
          <h2 className="font-display font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wider">Resumo</h2>
          {items.map((item) => (
            <div key={item.id} className="flex justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm">{item.quantity}x {item.title}</span>
              <span className="text-sm font-semibold">R${(item.price * item.quantity).toFixed(2).replace(".", ",")}</span>
            </div>
          ))}
          <div className="flex justify-between mt-3 pt-3 border-t border-border">
            <span className="font-display font-bold">Total</span>
            <span className="font-display font-bold text-lg">R${total.toFixed(2).replace(".", ",")}</span>
          </div>
        </div>

        {/* Payment Brick */}
        {status === "processing" ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="font-display font-semibold">Processando pagamento...</p>
          </div>
        ) : (
          <div className="animate-fade-up">
            <Payment
              initialization={initialization}
              customization={customization}
              onSubmit={onSubmit}
              onReady={onReady}
              onError={onError}
            />
          </div>
        )}
      </main>
    </div>
  );
}
