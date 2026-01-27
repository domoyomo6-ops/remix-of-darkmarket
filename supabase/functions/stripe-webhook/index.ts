import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        logStep("Webhook signature verified");
      } catch (err) {
        logStep("Webhook signature verification failed", { error: err });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      event = JSON.parse(body);
      logStep("Webhook received without signature verification");
    }

    logStep("Event type", { type: event.type });

    // Handle successful checkout
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Checkout session completed", { sessionId: session.id });

      const metadata = session.metadata;
      if (metadata?.type === "wallet_topup" && metadata?.user_id && metadata?.amount) {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );

        const amount = parseFloat(metadata.amount);
        const userId = metadata.user_id;

        logStep("Processing wallet top-up", { userId, amount });

        // Get or create wallet
        let { data: wallet, error: walletError } = await supabaseClient
          .from("user_wallets")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (walletError && walletError.code === "PGRST116") {
          // Create wallet if doesn't exist
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
          logStep("Failed to get wallet", { error: walletError });
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
        const { error: txError } = await supabaseClient
          .from("wallet_transactions")
          .insert({
            user_id: userId,
            amount: amount,
            type: "topup",
            payment_method: "stripe",
            payment_reference: session.id,
          });

        if (txError) {
          logStep("Failed to log transaction", { error: txError });
        }

        logStep("Wallet top-up completed", { userId, amount, newBalance });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
