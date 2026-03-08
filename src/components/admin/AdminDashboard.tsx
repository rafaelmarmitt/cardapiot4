import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, ShoppingBag, Clock, CheckCircle, TrendingUp, PackageCheck, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
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
  productSales: { name: string; qty: number; revenue: number }[];
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--success, 142 71% 45%))",
  "hsl(var(--warning, 38 92% 50%))",
  "hsl(var(--destructive))",
  "hsl(260 60% 55%)",
  "hsl(190 70% 45%)",
  "hsl(330 60% 50%)",
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProfit, setShowProfit] = useState(false);
  const [chartMode, setChartMode] = useState<"qty" | "revenue">("qty");

  useEffect(() => {
    async function load() {
      const [ordersRes, productsRes] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("products").select("id, title, cost_price" as any),
      ]);

      const orders = ordersRes.data ?? [];
      const products = productsRes.data ?? [];

      const userIds = [...new Set(orders.map(o => o.user_id))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, name").in("user_id", userIds)
        : { data: [] };
      const profileMap = new Map<string, string>(profiles?.map(p => [p.user_id, p.name] as [string, string]) ?? []);

      const pendingOrders = orders.filter(o => o.status === "pending").length;
      const approvedOrders = orders.filter(o => o.status === "approved").length;
      const deliveredOrders = orders.filter(o => o.status === "delivered").length;
      const totalRevenue = orders.filter(o => o.status === "approved" || o.status === "delivered").reduce((sum, o) => sum + Number(o.total), 0);

      const costMap = new Map<string, number>((products as any[]).map((p: any) => [p.id, Number(p.cost_price ?? 0)]));
      const productNameMap = new Map<string, string>((products as any[]).map((p: any) => [p.id, p.title]));

      const completedOrdersList = orders.filter(o => o.status === "approved" || o.status === "delivered");
      let totalCost = 0;

      // Aggregate product sales
      const salesMap = new Map<string, { qty: number; revenue: number }>();
      for (const order of completedOrdersList) {
        const items = order.items as any[];
        if (Array.isArray(items)) {
          for (const item of items) {
            const itemCost = costMap.get(item.id) ?? 0;
            const qty = item.quantity ?? 1;
            totalCost += itemCost * qty;
            const prev = salesMap.get(item.id) ?? { qty: 0, revenue: 0 };
            salesMap.set(item.id, { qty: prev.qty + qty, revenue: prev.revenue + (Number(item.price ?? 0) * qty) });
          }
        }
      }
      const totalProfit = totalRevenue - totalCost;

      const productSales = Array.from(salesMap.entries())
        .map(([id, data]) => ({ name: productNameMap.get(id) ?? id.slice(0, 6), ...data }))
        .sort((a, b) => b.qty - a.qty);

      setStats({
        totalOrders: orders.length,
        totalRevenue,
        totalProfit,
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
        productSales,
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

  const revenueLabel = showProfit ? "Lucro" : "Receita Bruta";
  const revenueValue = showProfit ? stats.totalProfit : stats.totalRevenue;

  const cards = [
    { label: revenueLabel, value: `R$${revenueValue.toFixed(2).replace('.', ',')}`, icon: DollarSign, color: "text-success", onClick: () => setShowProfit(!showProfit) },
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
            className={`bg-card rounded-xl p-4 border border-border animate-fade-up ${card.onClick ? 'cursor-pointer hover:border-primary/30 transition-colors' : ''}`}
            style={{ animationDelay: `${i * 60}ms` }}
            onClick={card.onClick}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{card.label}</span>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="font-display text-2xl font-bold">{card.value}</p>
            {card.onClick && <p className="text-[10px] text-muted-foreground mt-0.5">Toque para alternar</p>}
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
        </div>
      </div>

      {/* Product Sales Chart */}
      {stats.productSales.length > 0 && (
        <div className="bg-card rounded-xl p-4 border border-border animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="font-display font-semibold text-sm">Vendas por Produto</span>
            </div>
            <button
              className="text-[10px] font-medium px-2 py-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setChartMode(chartMode === "qty" ? "revenue" : "qty")}
            >
              {chartMode === "qty" ? "Ver receita" : "Ver quantidade"}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(180, stats.productSales.length * 40)}>
            <BarChart data={stats.productSales} layout="vertical" margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--secondary))" }}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                formatter={(value: number) => chartMode === "revenue" ? [`R$${value.toFixed(2).replace('.', ',')}`, "Receita"] : [value, "Vendidos"]}
              />
              <Bar dataKey={chartMode} radius={[0, 6, 6, 0]} barSize={20}>
                {stats.productSales.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
