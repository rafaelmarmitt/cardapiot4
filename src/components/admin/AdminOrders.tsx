import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    if (error) { toast.error("Erro ao aprovar"); return; }
    toast.success("Pagamento aprovado");
    fetchOrders();
  }

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Carregando pedidos...</div>;

  return (
    <div className="mt-4">
      {orders.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground text-sm">Nenhum pedido ainda</p>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1 gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Pendentes ({orders.filter(o => o.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1 gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> Aprovados ({orders.filter(o => o.status === "approved").length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-2 mt-3">
            {orders.filter(o => o.status === "pending").length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhum pedido pendente</p>
            ) : orders.filter(o => o.status === "pending").map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} onApprove={approveOrder} />
            ))}
          </TabsContent>
          <TabsContent value="approved" className="space-y-2 mt-3">
            {orders.filter(o => o.status === "approved").length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhum pedido aprovado</p>
            ) : orders.filter(o => o.status === "approved").map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function OrderCard({ order, index, onApprove }: { order: Order; index: number; onApprove?: (id: string) => void }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border animate-fade-up" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-sm">#{order.order_number}</span>
          <span className="text-xs text-muted-foreground">{order.profiles?.name}</span>
        </div>
        {order.status === "approved" ? (
          <span className="badge-approved"><CheckCircle className="h-3 w-3 mr-1" />Aprovado</span>
        ) : (
          <span className="badge-pending"><Clock className="h-3 w-3 mr-1" />Pendente</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
      </p>
      <div className="space-y-0.5 mb-2">
        {(order.items as any[]).map((item: any, idx: number) => (
          <p key={idx} className="text-sm text-muted-foreground">{item.quantity}x {item.title}</p>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2.5 border-t border-border">
        <span className="font-display font-bold text-sm">R${Number(order.total).toFixed(2).replace('.', ',')}</span>
        {order.status === "pending" && onApprove && (
          <Button variant="accent" size="sm" className="h-8 text-xs" onClick={() => onApprove(order.id)}>
            Aprovar Pagamento
          </Button>
        )}
      </div>
    </div>
  );
}
