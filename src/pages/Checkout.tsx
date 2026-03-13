import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, XCircle, Loader2, Copy, Check } from "lucide-react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppHeader from "@/components/AppHeader";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const mpPublicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
if (mpPublicKey) {
  initMercadoPago(mpPublicKey, { locale: "pt-BR" });
}

type PaymentStatus = "idle" | "processing" | "approved" | "pix_pending" | "rejected";

interface PixData {
  qr_code: string;
  qr_code_base64: string;
  ticket_url?: string;
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [payerEmail, setPayerEmail] = useState("");
  const [payerFirstName, setPayerFirstName] = useState("");
  const [payerLastName, setPayerLastName] = useState("");
  const [payerCpf, setPayerCpf] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    setPayerEmail((prev) => prev || user.email || "");

    if (!payerFirstName && !payerLastName) {
      const fullName = (profile?.name || user.user_metadata?.name || "").trim();
      if (fullName) {
        const [first, ...rest] = fullName.split(/\s+/);
        setPayerFirstName(first || "");
        setPayerLastName(rest.join(" ") || "Cliente");
      }
    }
  }, [user, profile, payerFirstName, payerLastName]);

  const formattedCpf = payerCpf
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  // Poll order status for PIX
  useEffect(() => {
    if (status !== "pix_pending" || !orderId) return;

    pollingRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();

      if (data?.status === "approved") {
        setStatus("approved");
        clearCart();
        toast.success("Pagamento PIX confirmado!");
      }
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [status, orderId, clearCart]);

  const handleCopyPix = useCallback(() => {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 3000);
  }, [pixData]);

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

      const normalizedEmail = payerEmail.trim().toLowerCase();
      const normalizedFirstName = payerFirstName.trim();
      const normalizedLastName = payerLastName.trim();
      const normalizedCpf = payerCpf.replace(/\D/g, "");

      if (!normalizedEmail || !normalizedFirstName || !normalizedCpf) {
        toast.error("Para PIX, preencha nome, e-mail e CPF do pagador.");
        return;
      }

      if (normalizedCpf.length !== 11) {
        toast.error("CPF inválido. Digite os 11 números do CPF.");
        return;
      }

      setStatus("processing");

      const normalizedPaymentData = {
        ...formData,
        payer: {
          ...(formData?.payer || {}),
          email: normalizedEmail,
          first_name: normalizedFirstName,
          last_name: normalizedLastName || "Cliente",
          identification: {
            type: "CPF",
            number: normalizedCpf,
          },
        },
      };

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
              paymentData: normalizedPaymentData,
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
        setOrderId(result.order_id || null);

        if (result.status === "approved") {
          setStatus("approved");
          clearCart();
          toast.success("Pagamento aprovado!");
        } else if (result.pix_qr_code) {
          // PIX payment - show QR code
          setPixData({
            qr_code: result.pix_qr_code,
            qr_code_base64: result.pix_qr_code_base64,
            ticket_url: result.pix_ticket_url,
          });
          setStatus("pix_pending");
          clearCart();
        } else if (result.status === "in_process" || result.status === "pending") {
          setPixData(null);
          setStatus("pix_pending");
          clearCart();
        } else {
          setStatus("rejected");
          toast.error(result.status_detail || "Pagamento recusado. Tente outro método.");
        }
      } catch (err: any) {
        console.error("Payment error:", err);
        setStatus("rejected");
        const msg = err.message || "Erro ao processar pagamento";
        if (msg.includes("CPF") || msg.includes("documento") || msg.includes("email")) {
          toast.error("Dados incompletos: verifique se o CPF e e-mail foram preenchidos no formulário.");
        } else {
          toast.error(msg);
        }
      }
    },
    [user, items, total, clearCart, payerEmail, payerFirstName, payerLastName, payerCpf]
  );

  const onError = useCallback((error: any) => {
    console.error("Payment Brick error:", error);
    toast.error("Erro no formulário de pagamento.");
  }, []);

  const onReady = useCallback(() => {}, []);

  // --- Approved ---
  if (status === "approved") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container px-4 py-6 max-w-lg mx-auto">
          <div className="bg-card rounded-2xl p-6 border border-border animate-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-7 w-7 text-primary" />
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

  // --- PIX Pending with QR Code ---
  if (status === "pix_pending") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container px-4 py-6 max-w-lg mx-auto">
          <div className="bg-card rounded-2xl p-6 border border-border animate-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
            </div>
            <h1 className="font-display text-2xl font-bold">Pague com PIX</h1>
            <p className="text-muted-foreground mt-2">Escaneie o QR Code ou copie o código abaixo</p>

            {orderNumber && (
              <div className="bg-secondary rounded-xl p-3 my-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pedido</p>
                <p className="font-display text-xl font-bold text-foreground mt-1 tracking-wider">{orderNumber}</p>
              </div>
            )}

            {pixData?.qr_code_base64 && (
              <div className="my-5 flex justify-center">
                <img
                  src={`data:image/png;base64,${pixData.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-56 h-56 rounded-xl border border-border"
                />
              </div>
            )}

            {pixData?.qr_code && (
              <div className="my-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Código Copia e Cola</p>
                <div className="bg-secondary rounded-xl p-3 break-all text-xs text-foreground font-mono leading-relaxed max-h-24 overflow-y-auto">
                  {pixData.qr_code}
                </div>
                <Button
                  variant="accent"
                  className="w-full mt-3 gap-2"
                  onClick={handleCopyPix}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado!" : "Copiar Código PIX"}
                </Button>
              </div>
            )}

            <p className="text-sm text-muted-foreground mt-4 animate-pulse">
              Aguardando confirmação do pagamento...
            </p>

            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/meus-pedidos")}>Ver Pedidos</Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Cardápio</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Rejected ---
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

        {status === "processing" ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
            <p className="font-display font-semibold">Processando pagamento...</p>
          </div>
        ) : (
          <div className="animate-fade-up">
            <Payment
              initialization={{
                amount: total,
                payer: {
                  email: user?.email || "",
                },
              }}
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
