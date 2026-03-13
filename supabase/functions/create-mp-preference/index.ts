import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuração do CORS para permitir que o site (Lovable) converse com esta função
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Responde ao 'preflight' do navegador
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Pega os dados enviados pelo frontend
    const body = await req.json();
    const { items, total, user_id } = body;

    // 2. Pega o Token do Mercado Pago configurado no Supabase
    const token = Deno.env.get("MP_ACCESS_TOKEN");
    if (!token) {
      throw new Error("O Token do Mercado Pago (MP_ACCESS_TOKEN) não foi encontrado nas configurações do Supabase.");
    }

    // 3. Conecta no banco de dados para criar o pedido (opcional, mas recomendado)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    const order_number = `PEDIDO-${Date.now()}`;

    // Insere na tabela orders (conforme sua estrutura)
    const { data: orderData, error: dbError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user_id || null,
        order_number: order_number,
        status: "pending",
        total: Number(total),
        items: items,
      })
      .select("id")
      .single();

    if (dbError) throw new Error(`Erro ao salvar no banco: ${dbError.message}`);

    // 4. Prepara os itens para o formato exato que o Mercado Pago exige
    const mpItems = items.map((item: any) => ({
      title: item.title || item.name || "Produto da Loja",
      quantity: Number(item.quantity) || 1,
      currency_id: "BRL",
      unit_price: Number(item.price),
    }));

    // 5. Monta a requisição para o Mercado Pago
    const mpPayload = {
      items: mpItems,
      external_reference: orderData.id, // Liga o pagamento ao ID do pedido
      auto_return: "approved",
      // Quando tiver o domínio oficial do seu site, troque estas URLs:
      back_urls: {
        success: "https://google.com",
        failure: "https://google.com",
        pending: "https://google.com",
      },
    };

    // 6. Chama a API do Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.trim()}`, // O trim() remove espaços em branco acidentais no token
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpResponse.json();

    // Se o Mercado Pago recusar, agora veremos o erro exato!
    if (!mpResponse.ok) {
      throw new Error(`O Mercado Pago recusou: ${JSON.stringify(mpData)}`);
    }

    // Retorna o link de pagamento para o site
    return new Response(JSON.stringify({ init_point: mpData.init_point }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    // Retorna o erro real para podermos debugar
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
