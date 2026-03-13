import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { items, total } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Items required");
    }

    // Generate order number
    const { data: orderNum } = await supabase.rpc("generate_order_number");
    const order_number = orderNum || Math.floor(Math.random() * 999999 + 1).toString().padStart(6, "0");

    // Create order in DB with status pending
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        order_number,
        total,
        status: "pending",
        items: items.map((i: any) => ({
          id: i.id,
          title: i.title,
          price: i.price,
          quantity: i.quantity,
        })),
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    const orderId = orderData.id;

    // Create Mercado Pago preference
    const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MP_TOKEN) throw new Error("Mercado Pago not configured");

    const siteUrl = Deno.env.get("SITE_URL") || "https://cardapiot4.lovable.app";
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`;

    const mpPayload = {
      items: items.map((i: any) => ({
        id: i.id,
        title: i.title,
        quantity: Number(i.quantity),
        unit_price: Number(i.price),
        currency_id: "BRL",
      })),
      external_reference: orderId,
      back_urls: {
        success: `${siteUrl}/meus-pedidos?status=success`,
        failure: `${siteUrl}/meus-pedidos?status=failure`,
        pending: `${siteUrl}/meus-pedidos?status=pending`,
      },
      auto_return: "approved",
      notification_url: webhookUrl,
      statement_descriptor: "T4 Bar",
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP error:", JSON.stringify(mpData));
      throw new Error(mpData.message || "Mercado Pago error");
    }

    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        order_number,
        order_id: orderId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
