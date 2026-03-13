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
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // MP sends notifications with type "payment" and action "payment.updated" or "payment.created"
    if (body.type !== "payment" && body.action !== "payment.updated" && body.action !== "payment.created") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) throw new Error("MP_ACCESS_TOKEN not configured");

    // Fetch payment details from Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken.trim()}` },
    });

    if (!mpRes.ok) {
      console.error("Failed to fetch payment from MP:", await mpRes.text());
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 so MP doesn't retry
      });
    }

    const payment = await mpRes.json();
    console.log("Payment details:", JSON.stringify({ id: payment.id, status: payment.status, external_reference: payment.external_reference }));

    const orderId = payment.external_reference;
    if (!orderId) {
      console.log("No external_reference found, skipping");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Map MP status to our order status
    let newStatus: string;
    if (payment.status === "approved") {
      newStatus = "approved";
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      newStatus = "rejected";
    } else {
      newStatus = "pending";
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order:", updateError.message);
    } else {
      console.log(`Order ${orderId} updated to ${newStatus}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", (error as Error).message);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Always return 200 to avoid MP retries
    });
  }
});
