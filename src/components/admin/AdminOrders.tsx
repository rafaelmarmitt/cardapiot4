import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  items: any[];
  user_id: string;
  created_at: string;
  profiles?: { name: string } | null;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchOrders() {
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!ordersData) { setOrders([]); setLoading(false); return; }
    
    // Fetch profile names for each unique user
    const userIds = [...new Set(ordersData.map(o => o.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, name")
      .in("user_id", userIds);
    
    const profileMap = new Map(profilesData?.map(p => [p.user_id, p.name]) ?? []);
    const enriched = ordersData.map(o => ({ ...o, profiles: { name: profileMap.get(o.user_id) || "Sem nome" } }));
    setOrders(enriched as any);
    setLoading(false);
  }

  useEffect(() => { fetchOrders(); }, []);

  async function approveOrder(id: string) {
    const { error } = await supabase.from("orders").update({ status: "approved" }).eq("id", id);
    if (error) {
      toast.error("Erro ao aprovar");
      return;
    }
    toast.success("Pedido aprovado!");
    fetchOrders();
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-3 mt-4">
      {orders.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">Nenhum pedido ainda</p>
      ) : orders.map(order => (
        <div key={order.id} className="bg-card rounded-xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-display font-bold text-sm">#{order.order_number}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {(order as any).profiles?.name || "Sem nome"}
              </span>
            </div>
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
              <div key={idx} className="text-sm">{item.quantity}x {item.title}</div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="font-bold text-sm">R${Number(order.total).toFixed(2).replace('.', ',')}</span>
            {order.status === "pending" && (
              <Button size="sm" className="btn-accent" onClick={() => approveOrder(order.id)}>
                Aprovar Pagamento
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
