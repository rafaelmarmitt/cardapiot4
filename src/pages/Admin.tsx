import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminProducts from "@/components/admin/AdminProducts";

export default function Admin() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container px-4 py-6 max-w-2xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-4">Painel Admin</h1>
        <Tabs defaultValue="orders">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
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
