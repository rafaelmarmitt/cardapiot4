import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, PackageCheck } from "lucide-react";
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
  const [pendingSearch, setPendingSearch] = useState("");
  const [approvedSearch, setApprovedSearch] = useState("");

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

  useEffect(() => {
    const channel = supabase
      .channel('admin-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => {
          toast.info("🔔 Novo pedido recebido!");
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => { fetchOrders(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function approveOrder(id: string) {
    const { error } = await supabase.from("orders").update({ status: "approved" }).eq("id", id);
    if (error) { toast.error("Erro ao aprovar"); return; }
    toast.success("Pagamento aprovado");
    fetchOrders();
  }

  async function deliverOrder(id: string) {
    const { error } = await supabase.rpc("mark_order_delivered" as any, { _order_id: id } as any);
    if (error) { toast.error(`Erro ao marcar como entregue: ${error.message}`); return; }
    toast.success("Pedido marcado como entregue");
    fetchOrders();
  }

  const pendingOrders = orders.filter(o => o.status === "pending");
  const approvedOrders = orders.filter(o => o.status === "approved");
  const deliveredOrders = orders.filter(o => o.status === "delivered");

  const filterOrders = (list: Order[], term: string) => {
    const query = term.trim().toLowerCase();
    if (!query) return list;

    return list.filter(order => {
      const items = (order.items as any[])
        .map((item: any) => `${item.title ?? ""}`.toLowerCase())
        .join(" ");

      return (
        order.order_number.toLowerCase().includes(query) ||
        (order.profiles?.name ?? "").toLowerCase().includes(query) ||
        items.includes(query)
      );
    });
  };

  const filteredPendingOrders = filterOrders(pendingOrders, pendingSearch);
  const filteredApprovedOrders = filterOrders(approvedOrders, approvedSearch);

  if (loading) return <div className="py-8 text-center text-muted-foreground text-sm">Carregando pedidos...</div>;

  return (
    <div className="mt-4">
      {orders.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground text-sm">Nenhum pedido ainda</p>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1 gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Pendentes ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="flex-1 gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> Aprovados ({approvedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="delivered" className="flex-1 gap-1.5">
              <PackageCheck className="h-3.5 w-3.5" /> Entregues ({deliveredOrders.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-2 mt-3">
            <Input
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              placeholder="Buscar em pendentes por número, cliente ou item"
              className="h-9"
            />
            {filteredPendingOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhum pedido pendente encontrado</p>
            ) : filteredPendingOrders.map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} onApprove={approveOrder} />
            ))}
          </TabsContent>
          <TabsContent value="approved" className="space-y-2 mt-3">
            <Input
              value={approvedSearch}
              onChange={(e) => setApprovedSearch(e.target.value)}
              placeholder="Buscar em aprovados por número, cliente ou item"
              className="h-9"
            />
            {filteredApprovedOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhum pedido aprovado encontrado</p>
            ) : filteredApprovedOrders.map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} onDeliver={deliverOrder} />
            ))}
          </TabsContent>
          <TabsContent value="delivered" className="space-y-2 mt-3">
            {deliveredOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhum pedido entregue</p>
            ) : deliveredOrders.map((order, i) => (
              <OrderCard key={order.id} order={order} index={i} />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function OrderCard({ order, index, onApprove, onDeliver }: { order: Order; index: number; onApprove?: (id: string) => void; onDeliver?: (id: string) => void }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border animate-fade-up" style={{ animationDelay: `${index * 40}ms` }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-sm">#{order.order_number}</span>
          <span className="text-xs text-muted-foreground">{order.profiles?.name}</span>
        </div>
        {order.status === "delivered" ? (
          <span className="badge-approved flex items-center"><PackageCheck className="h-3 w-3 mr-1" />Entregue</span>
        ) : order.status === "approved" ? (
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
        {order.status === "approved" && onDeliver && (
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => onDeliver(order.id)}>
            <PackageCheck className="h-3.5 w-3.5" /> Entregue
          </Button>
        )}
      </div>
    </div>
  );
}
