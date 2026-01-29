import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, details?: unknown) => {
  console.log(
    `[TELEGRAM-STARS-WEBHOOK] ${step}`,
    details ? JSON.stringify(details) : ""
  );
};

const jsonOk = () =>
  new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!botToken || !supabaseUrl || !serviceKey) {
      throw new Error("Missing environment variables");
    }

    const body = await req.json();
    logStep("Webhook received", body);

    /* ============================ PRE-CHECKOUT ============================ */
    if (body.pre_checkout_query) {
      await fetch(
        `https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pre_checkout_query_id: body.pre_checkout_query.id,
            ok: true,
          }),
        }
      );

      logStep("Pre-checkout approved", body.pre_checkout_query.id);
      return jsonOk();
    }

    /* ========================= SUCCESSFUL PAYMENT ========================= */
    if (body.message?.successful_payment) {
      const payment = body.message.successful_payment;
      const chatId = body.message.chat.id;

      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      });

      const [type, userId, amountRaw] =
        payment.invoice_payload.split(":");

      if (type !== "topup") {
        throw new Error("Invalid invoice payload");
      }

      const amount = Number(amountRaw);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) {
        throw new Error("Invalid top-up amount");
      }

      const starsPaid = payment.total_amount;
      const paymentRef = payment.telegram_payment_charge_id;

      /* ---------- IDEMPOTENCY ---------- */
      const { data: existingTx } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("payment_reference", paymentRef)
        .maybeSingle();

      if (existingTx) {
        logStep("Duplicate payment ignored", paymentRef);
        return jsonOk();
      }

      /* ---------- ENSURE WALLET ---------- */
      const { data: wallet, error } = await supabase
        .from("user_wallets")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (!wallet) {
        const { error: createError } = await supabase
          .from("user_wallets")
          .insert({ user_id: userId, balance: 0 });

        if (createError) throw createError;
      }

      /* ---------- ATOMIC BALANCE UPDATE ---------- */
      const { error: balanceError } = await supabase.rpc(
        "increment_wallet_balance",
        {
          p_user_id: userId,
          p_amount: amount,
        }
      );

      if (balanceError) throw balanceError;

      /* ---------- LOG TRANSACTION ---------- */
      await supabase.from("wallet_transactions").insert({
        user_id: userId,
        amount,
        type: "topup",
        payment_method: "telegram_stars",
        payment_reference: paymentRef,
        description: `${starsPaid} Telegram Stars`,
      });

      /* ---------- CONFIRM USER ---------- */
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            `✅ Payment successful!\n\n` +
            `💰 $${amount.toFixed(2)} added to your wallet\n` +
            `⭐ Stars paid: ${starsPaid}`,
        }),
      });

      logStep("Wallet top-up completed", { userId, amount });
      return jsonOk();
    }

    /* ================================ /START ================================ */
    if (body.message?.text?.startsWith("/start")) {
      const chatId = body.message.chat.id;
      const [, deepLink] = body.message.text.split(" ");

      if (deepLink?.startsWith("topup_")) {
        const [, userId, amountRaw] = deepLink.split("_");
        const amount = Number(amountRaw);

        if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) {
          throw new Error("Invalid deep-link amount");
        }

        const starsNeeded = Math.ceil(amount * 80);

        await fetch(`https://api.telegram.org/bot${botToken}/sendInvoice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            title: "Wallet Top-Up",
            description: `Add $${amount} to your wallet`,
            payload: `topup:${userId}:${amount}`,
            currency: "XTR",
            prices: [{ label: `$${amount} Top-Up`, amount: starsNeeded }],
          }),
        });

        logStep("Invoice sent", { userId, amount, starsNeeded });
      } else {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text:
              "🌟 Welcome!\n\n" +
              "Use this bot to top up your wallet using Telegram Stars.\n\n" +
              "Start from the website to continue.",
          }),
        });
      }

      return jsonOk();
    }

    return jsonOk();
  } catch (err) {
    logStep("ERROR", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : err }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

