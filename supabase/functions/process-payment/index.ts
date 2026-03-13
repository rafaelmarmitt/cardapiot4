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
    const { paymentData, items, total, user_id } = await req.json();

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) {
      throw new Error("MP_ACCESS_TOKEN não configurado.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: orderNumData } = await supabase.rpc("generate_order_number");
    const orderNumber = orderNumData || `${Date.now()}`;

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

    // The Payment Brick sends data nested under formData
    const formData = paymentData.formData || paymentData;
    const paymentMethodId = formData.payment_method_id;
    const isPix = paymentMethodId === "pix";

    // Build payer object - ensure required fields for PIX
    const payer: Record<string, unknown> = { ...formData.payer };

    if (isPix) {
      if (!payer.email) {
        throw new Error("E-mail do pagador é obrigatório para pagamento via PIX.");
      }
      if (!payer.first_name) {
        payer.first_name = (payer.email as string).split("@")[0];
      }
      if (!payer.last_name) {
        payer.last_name = "Cliente";
      }

      // CPF é obrigatório para PIX
      const identification = payer.identification as Record<string, string> | undefined;
      if (!identification?.number) {
        throw new Error("CPF do pagador é obrigatório para pagamento via PIX. Preencha o campo de documento no formulário.");
      }
      // Garantir tipo CPF
      payer.identification = {
        type: identification.type || "CPF",
        number: identification.number.replace(/\D/g, ""),
      };
    }

    // Build MP payment payload
    const mpPayload: Record<string, unknown> = {
      transaction_amount: Number(total),
      payment_method_id: paymentMethodId,
      payer,
      external_reference: orderData.id,
    };

    // Credit/debit card specific fields
    if (formData.token) {
      mpPayload.token = formData.token;
      mpPayload.installments = formData.installments || 1;
      mpPayload.issuer_id = formData.issuer_id;
    }

    console.log("MP Payload:", JSON.stringify(mpPayload));

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
    console.log("MP Response status:", mpRes.status, "body:", JSON.stringify(mpData));

    if (!mpRes.ok) {
      await supabase
        .from("orders")
        .update({ status: "rejected" })
        .eq("id", orderData.id);

      throw new Error(
        `Mercado Pago recusou: ${mpData.message || JSON.stringify(mpData)}`
      );
    }

    // Update order status
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

    // Build response
    const response: Record<string, unknown> = {
      status: mpData.status,
      status_detail: mpData.status_detail,
      order_number: orderNumber,
      order_id: orderData.id,
      payment_method_id: paymentMethodId,
    };

    // Include PIX QR code data if available
    if (mpData.point_of_interaction?.transaction_data) {
      response.pix_qr_code = mpData.point_of_interaction.transaction_data.qr_code;
      response.pix_qr_code_base64 = mpData.point_of_interaction.transaction_data.qr_code_base64;
      response.pix_ticket_url = mpData.point_of_interaction.transaction_data.ticket_url;
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("process-payment error:", (error as Error).message);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
