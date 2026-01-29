import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[TELEGRAM-STARS-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

    const body = await req.json();
    logStep("Received update", body);

    /* ================= PRE-CHECKOUT ================= */
    if (body.pre_checkout_query) {
      const q = body.pre_checkout_query;
      logStep("Pre-checkout query", { id: q.id });

      await fetch(
        `https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pre_checkout_query_id: q.id,
            ok: true,
          }),
        },
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    /* ================= SUCCESSFUL PAYMENT ================= */
    if (body.message?.successful_payment) {
      const payment = body.message.successful_payment;
      const chatId = body.message.chat.id;

      logStep("Successful payment received", payment);

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } },
      );

      // Prevent duplicate processing (Telegram retries webhooks)
      const { data: existingTx } = await supabase
        .from("wallet_transactions")
        .select("id")
        .eq("payment_reference", payment.telegram_payment_charge_id)
        .maybeSingle();

      if (existingTx) {
        logStep("Duplicate payment ignored", existingTx);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Payload format: topup:{user_id}:{amount}
      const parts = payment.invoice_payload.split(":");
      if (parts.length !== 3 || parts[0] !== "topup") {
        throw new Error("Invalid invoice payload");
      }

      const userId = parts[1];
      const amount = Number(parts[2]);

      // Telegram Stars are sent in smallest unit (×100)
      const starsPaid = payment.total_amount / 100;

      logStep("Processing wallet top-up", {
        userId,
        amount,
        starsPaid,
      });

      /* ===== Get or create wallet safely ===== */
      let { data: wallet } = await supabase
        .from("user_wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!wallet) {
        const { data: newWallet, error } = await supabase
          .from("user_wallets")
          .insert({ user_id: userId, balance: 0 })
          .select()
          .single();

        if (error) throw error;
        wallet = newWallet;
      }

      /* ===== Atomic balance update ===== */
      const { error: updateError } = await supabase
        .from("user_wallets")
        .update({
          balance: supabase.sql`balance + ${amount}`,
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      /* ===== Log transaction ===== */
      await supabase.from("wallet_transactions").insert({
        user_id: userId,
        amount,
        type: "topup",
        payment_method: "telegram_stars",
        payment_reference: payment.telegram_payment_charge_id,
        description: `${starsPaid} Stars`,
      });

      logStep("Wallet top-up completed", { userId, amount });

      /* ===== Confirmation message ===== */
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text:
            `✅ <b>Payment successful!</b>\n\n` +
            `💰 <b>$${amount}</b> added to your wallet\n` +
            `⭐ Stars paid: <b>${starsPaid}</b>\n\n` +
            `Thank you for your purchase!`,
          parse_mode: "HTML",
        }),
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    /* ================= /START ================= */
    if (body.message?.text?.startsWith("/start")) {
      const chatId = body.message.chat.id;
      const params = body.message.text.split(" ");

      if (params[1]?.startsWith("topup_")) {
        const [, userId, amountStr] = params[1].split("_");
        const amount = Number(amountStr);
        const starsNeeded = Math.ceil(amount * 80); // 80 stars ≈ $1

        logStep("Creating invoice", { userId, amount, starsNeeded });

        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/sendInvoice`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              title: "Wallet Top-Up",
              description: `Add $${amount} to your wallet balance`,
              payload: `topup:${userId}:${amount}`,
              currency: "XTR",
              prices: [
                { label: `$${amount} Wallet Top-Up`, amount: starsNeeded },
              ],
            }),
          },
        );

        logStep("Invoice sent", await res.json());
      } else {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text:
              `🌟 <b>Welcome to hell5tar!</b>\n\n` +
              `Top up your wallet using Telegram Stars from the website.`,
            parse_mode: "HTML",
          }),
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logStep("ERROR", { message });

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
