import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { paymentData, items, total, user_id } = await req.json();

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) {
      throw new Error("MP_ACCESS_TOKEN não configurado.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate order number
    const { data: orderNumData } = await supabase.rpc("generate_order_number");
    const orderNumber = orderNumData || `${Date.now()}`;

    // Insert order as pending
    const { data: orderData, error: dbError } = await supabase
      .from("orders")
      .insert({
        user_id,
        order_number: orderNumber,
        status: "pending",
        total: Number(total),
        items,
      })
      .select("id")
      .single();

    if (dbError) throw new Error(`Erro ao salvar pedido: ${dbError.message}`);

    // Build MP payment payload from Brick data
    const mpPayload: Record<string, unknown> = {
      transaction_amount: Number(total),
      token: paymentData.token,
      installments: paymentData.installments || 1,
      payment_method_id: paymentData.payment_method_id,
      issuer_id: paymentData.issuer_id,
      payer: paymentData.payer || {},
      external_reference: orderData.id,
    };

    // Call Mercado Pago Payments API
    const idempotencyKey = crypto.randomUUID();

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken.trim()}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      // Update order to failed
      await supabase
        .from("orders")
        .update({ status: "rejected" })
        .eq("id", orderData.id);

      throw new Error(
        `Mercado Pago recusou: ${mpData.message || JSON.stringify(mpData)}`
      );
    }

    // Update order status based on MP response
    const newStatus =
      mpData.status === "approved"
        ? "approved"
        : mpData.status === "in_process" || mpData.status === "pending"
        ? "pending"
        : "rejected";

    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderData.id);

    return new Response(
      JSON.stringify({
        status: mpData.status,
        status_detail: mpData.status_detail,
        order_number: orderNumber,
        order_id: orderData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
