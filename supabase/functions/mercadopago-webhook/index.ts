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

    // Mercado Pago sends different notification types
    if (body.type === "payment" || body.action === "payment.updated") {
      const paymentId = body.data?.id;
      if (!paymentId) {
        return new Response("OK", { status: 200, headers: corsHeaders });
      }

      const MP_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      if (!MP_TOKEN) throw new Error("MP not configured");

      // Fetch payment details from Mercado Pago
      const mpRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${MP_TOKEN}` } }
      );
      const payment = await mpRes.json();
      console.log("Payment status:", payment.status, "ref:", payment.external_reference);

      if (payment.status === "approved" && payment.external_reference) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { error } = await supabase
          .from("orders")
          .update({ status: "approved" })
          .eq("order_number", payment.external_reference)
          .eq("status", "pending");

        if (error) console.error("Update error:", error);
        else console.log("Order approved:", payment.external_reference);
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});
