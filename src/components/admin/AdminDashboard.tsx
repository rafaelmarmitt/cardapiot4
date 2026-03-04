import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, ShoppingBag, Clock, CheckCircle, TrendingUp, PackageCheck } from "lucide-react";

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  totalProducts: number;
  recentOrders: {
    id: string;
    order_number: string;
    status: string;
    total: number;
    created_at: string;
    customer_name: string;
  }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("id"),
      ]);

      const orders = ordersRes.data ?? [];
      const products = productsRes.data ?? [];

      // Fetch profile names
      const userIds = [...new Set(orders.map(o => o.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, name").in("user_id", userIds)
        : { data: [] };
      const profileMap = new Map<string, string>(profiles?.map(p => [p.user_id, p.name] as [string, string]) ?? []);

      const pendingOrders = orders.filter(o => o.status === "pending").length;
      const approvedOrders = orders.filter(o => o.status === "approved").length;
      const deliveredOrders = orders.filter(o => o.status === "delivered").length;
      const totalRevenue = orders.filter(o => o.status === "approved" || o.status === "delivered").reduce((sum, o) => sum + Number(o.total), 0);

      setStats({
        totalOrders: orders.length,
        totalRevenue,
        pendingOrders,
        approvedOrders,
        deliveredOrders,
        totalProducts: products.length,
        recentOrders: orders.slice(0, 5).map(o => ({
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          total: Number(o.total),
          created_at: o.created_at,
          customer_name: profileMap.get(o.user_id) ?? "Sem nome",
        })),
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-card rounded-xl animate-pulse border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const completedOrders = stats.approvedOrders + stats.deliveredOrders;

  const cards = [
    { label: "Receita Total", value: `R$${stats.totalRevenue.toFixed(2).replace('.', ',')}`, icon: DollarSign, color: "text-success" },
    { label: "Total de Pedidos", value: stats.totalOrders.toString(), icon: ShoppingBag, color: "text-primary" },
    { label: "Pendentes", value: stats.pendingOrders.toString(), icon: Clock, color: "text-warning" },
    { label: "Aprovados", value: stats.approvedOrders.toString(), icon: CheckCircle, color: "text-success" },
    { label: "Entregues", value: stats.deliveredOrders.toString(), icon: PackageCheck, color: "text-primary" },
  ];

  return (
    <div className="mt-4 space-y-5">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((card, i) => (
          <div
            key={card.label}
            className="bg-card rounded-xl p-4 border border-border animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="font-display text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-card rounded-xl p-4 border border-border animate-fade-up" style={{ animationDelay: "250ms" }}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="font-display font-semibold text-sm">Resumo</span>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Produtos cadastrados</p>
            <p className="font-display font-bold text-lg">{stats.totalProducts}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Ticket médio</p>
            <p className="font-display font-bold text-lg">
              {completedOrders > 0
                ? `R$${(stats.totalRevenue / completedOrders).toFixed(2).replace('.', ',')}`
                : "R$0,00"}
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Taxa conclusão</p>
            <p className="font-display font-bold text-lg">
              {stats.totalOrders > 0
                ? `${Math.round((completedOrders / stats.totalOrders) * 100)}%`
                : "0%"}
            </p>
          </div>
        </div>
      </div>

      {/* Approval Progress */}
      {stats.totalOrders > 0 && (
        <div className="bg-card rounded-xl p-4 border border-border animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">Progresso de conclusão</span>
            <span className="text-xs font-semibold">{completedOrders}/{stats.totalOrders}</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${(completedOrders / stats.totalOrders) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="animate-fade-up" style={{ animationDelay: "350ms" }}>
        <h3 className="font-display font-semibold text-sm mb-3">Pedidos Recentes</h3>
        {stats.recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pedido ainda</p>
        ) : (
          <div className="space-y-2">
            {stats.recentOrders.map(order => (
              <div key={order.id} className="bg-card rounded-xl p-3 flex items-center justify-between border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="font-display text-xs font-bold text-muted-foreground">
                      #{order.order_number.slice(-3)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm">R${order.total.toFixed(2).replace('.', ',')}</span>
                  {order.status === "delivered" ? (
                    <span className="badge-approved"><PackageCheck className="h-3 w-3" /></span>
                  ) : order.status === "approved" ? (
                    <span className="badge-approved"><CheckCircle className="h-3 w-3" /></span>
                  ) : (
                    <span className="badge-pending"><Clock className="h-3 w-3" /></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
