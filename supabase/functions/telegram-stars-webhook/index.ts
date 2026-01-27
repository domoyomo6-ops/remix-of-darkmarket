import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TELEGRAM-STARS-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const body = await req.json();
    logStep("Received update", body);

    // Handle pre_checkout_query - must answer within 10 seconds
    if (body.pre_checkout_query) {
      const preCheckoutQuery = body.pre_checkout_query;
      logStep("Pre-checkout query received", { id: preCheckoutQuery.id });

      // Answer the pre-checkout query to confirm the payment
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pre_checkout_query_id: preCheckoutQuery.id,
            ok: true,
          }),
        }
      );

      const result = await response.json();
      logStep("Pre-checkout answered", result);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle successful payment
    if (body.message?.successful_payment) {
      const payment = body.message.successful_payment;
      const chatId = body.message.chat.id;
      logStep("Successful payment received", payment);

      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Extract user info from invoice_payload
      // Payload format: "topup:{user_id}:{amount}"
      const payloadParts = payment.invoice_payload.split(":");
      if (payloadParts[0] === "topup" && payloadParts.length === 3) {
        const userId = payloadParts[1];
        const amount = parseFloat(payloadParts[2]);
        const starsAmount = payment.total_amount; // Stars paid

        logStep("Processing wallet top-up", { userId, amount, starsAmount });

        // Get or create wallet
        let { data: wallet, error: walletError } = await supabaseClient
          .from("user_wallets")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (walletError && walletError.code === "PGRST116") {
          const { data: newWallet, error: createError } = await supabaseClient
            .from("user_wallets")
            .insert({ user_id: userId, balance: 0 })
            .select()
            .single();

          if (createError) {
            logStep("Failed to create wallet", { error: createError });
            throw createError;
          }
          wallet = newWallet;
        } else if (walletError) {
          throw walletError;
        }

        // Update balance
        const newBalance = (wallet?.balance || 0) + amount;
        const { error: updateError } = await supabaseClient
          .from("user_wallets")
          .update({ balance: newBalance })
          .eq("user_id", userId);

        if (updateError) {
          logStep("Failed to update balance", { error: updateError });
          throw updateError;
        }

        // Log transaction
        await supabaseClient.from("wallet_transactions").insert({
          user_id: userId,
          amount: amount,
          type: "topup",
          payment_method: "telegram_stars",
          payment_reference: payment.telegram_payment_charge_id,
          description: `${starsAmount} Stars`,
        });

        logStep("Wallet top-up completed", { userId, amount, newBalance });

        // Send confirmation message
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `✅ Payment successful!\n\n💰 $${amount} has been added to your wallet.\n⭐ Stars paid: ${starsAmount}\n\nThank you for your purchase!`,
            parse_mode: "HTML",
          }),
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Handle /start command - show payment options
    if (body.message?.text?.startsWith("/start")) {
      const chatId = body.message.chat.id;
      const params = body.message.text.split(" ");
      
      // Check if it's a deep link with payment info: /start topup_userId_amount
      if (params.length > 1 && params[1].startsWith("topup_")) {
        const parts = params[1].split("_");
        if (parts.length === 3) {
          const userId = parts[1];
          const amount = parseFloat(parts[2]);
          
          // Calculate stars (roughly $0.013 per star, we'll use 80 stars = $1)
          const starsNeeded = Math.ceil(amount * 80);
          
          logStep("Creating invoice", { userId, amount, starsNeeded });

          // Send invoice
          const invoiceResponse = await fetch(
            `https://api.telegram.org/bot${botToken}/sendInvoice`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                title: "Wallet Top-Up",
                description: `Add $${amount} to your hell5tar wallet balance`,
                payload: `topup:${userId}:${amount}`,
                currency: "XTR", // Telegram Stars currency
                prices: [{ label: `$${amount} Top-Up`, amount: starsNeeded }],
              }),
            }
          );

          const result = await invoiceResponse.json();
          logStep("Invoice sent", result);
        }
      } else {
        // Regular /start command - welcome message
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🌟 <b>Welcome to hell5tar Bot!</b>\n\nUse this bot to top up your wallet balance with Telegram Stars.\n\nTo add funds, go to the website and select "Telegram Stars" as your payment method.`,
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
