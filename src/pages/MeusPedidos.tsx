import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import { Ticket, Clock, CheckCircle, PackageCheck } from "lucide-react";

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
      <main className="container px-4 py-5 max-w-lg mx-auto">
        <h1 className="font-display text-xl font-bold mb-5">Meus Pedidos</h1>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-32 bg-card rounded-xl animate-pulse border border-border" />)}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <Ticket className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-display font-medium text-foreground">Sem pedidos</p>
            <p className="text-sm text-muted-foreground mt-1">Seus pedidos aparecerão aqui</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order, i) => (
              <div key={order.id} className="bg-card rounded-xl p-4 border border-border animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-sm">#{order.order_number}</span>
                  {order.status === "delivered" ? (
                    <span className="badge-approved"><PackageCheck className="h-3 w-3 mr-1" />Entregue</span>
                  ) : order.status === "approved" ? (
                    <span className="badge-approved"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</span>
                  ) : (
                    <span className="badge-pending"><Clock className="h-3 w-3 mr-1" />Pendente</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="space-y-1 mb-3">
                  {(order.items as any[]).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.quantity}x {item.title}</span>
                      <span className="text-muted-foreground">R${(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="font-display font-bold text-sm">R${Number(order.total).toFixed(2).replace('.', ',')}</span>
                  {(order.status === "approved" || order.status === "delivered") && (
                    <div className="flex items-center gap-1.5 bg-success/10 text-success px-3 py-1.5 rounded-lg">
                      <Ticket className="h-3.5 w-3.5" />
                      <span className="text-xs font-bold tracking-wide">TICKET #{order.order_number}</span>
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
