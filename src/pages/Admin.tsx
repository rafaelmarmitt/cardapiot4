import AppHeader from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminProducts from "@/components/admin/AdminProducts";

export default function Admin() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container px-4 py-5 max-w-2xl mx-auto">
        <h1 className="font-display text-xl font-bold mb-5">Painel Admin</h1>
        <Tabs defaultValue="orders">
          <TabsList className="w-full grid grid-cols-2 bg-secondary rounded-xl p-1 h-auto">
            <TabsTrigger value="orders" className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm">Pedidos</TabsTrigger>
            <TabsTrigger value="products" className="rounded-lg py-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm">Produtos</TabsTrigger>
          </TabsList>
          <TabsContent value="orders">
            <AdminOrders />
          </TabsContent>
          <TabsContent value="products">
            <AdminProducts />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
