import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import { Ticket, Clock, CheckCircle } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  items: any[];
  created_at: string;
}

export default function MeusPedidos() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as any) ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container px-4 py-6 max-w-lg mx-auto">
        <h1 className="font-display text-2xl font-bold mb-4">Meus Pedidos</h1>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-muted-foreground font-display">Nenhum pedido ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-card rounded-xl p-4 shadow-sm border border-border animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-sm">Pedido #{order.order_number}</span>
                  {order.status === "approved" ? (
                    <span className="badge-approved"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</span>
                  ) : (
                    <span className="badge-pending"><Clock className="h-3 w-3 mr-1" />Pendente</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="space-y-1 mb-2">
                  {(order.items as any[]).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.title}</span>
                      <span className="text-muted-foreground">R${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="font-display font-bold">Total: R${Number(order.total).toFixed(2).replace('.', ',')}</span>
                  {order.status === "approved" && (
                    <div className="flex items-center gap-1 bg-success/10 text-success px-3 py-1.5 rounded-lg">
                      <Ticket className="h-4 w-4" />
                      <span className="text-xs font-bold">TICKET #{order.order_number}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
