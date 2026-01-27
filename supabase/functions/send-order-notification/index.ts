import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderNotificationRequest {
  email: string;
  orderType: 'completed' | 'topup';
  productTitle?: string;
  amount: number;
  newBalance?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, orderType, productTitle, amount, newBalance }: OrderNotificationRequest = await req.json();

    let subject: string;
    let html: string;

    if (orderType === 'completed') {
      subject = `Order Completed - ${productTitle}`;
      html = `
        <div style="font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; padding: 40px; max-width: 600px; margin: 0 auto;">
          <div style="border: 1px solid #00ff00; padding: 30px;">
            <h1 style="color: #00ff00; margin: 0 0 20px;">✓ ORDER COMPLETED</h1>
            <div style="border-top: 1px solid #00ff00; padding-top: 20px;">
              <p style="margin: 10px 0;"><strong>Product:</strong> ${productTitle}</p>
              <p style="margin: 10px 0;"><strong>Amount:</strong> $${amount.toFixed(2)}</p>
              <p style="margin: 10px 0;"><strong>Status:</strong> COMPLETED</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
              <p style="color: #888; font-size: 12px;">Your download is now available in your orders page.</p>
            </div>
          </div>
          <p style="color: #444; font-size: 10px; margin-top: 20px; text-align: center;">HELL5TAR SYSTEMS</p>
        </div>
      `;
    } else {
      subject = `Wallet Top-Up Successful - $${amount.toFixed(2)}`;
      html = `
        <div style="font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; padding: 40px; max-width: 600px; margin: 0 auto;">
          <div style="border: 1px solid #00ff00; padding: 30px;">
            <h1 style="color: #00ff00; margin: 0 0 20px;">💰 WALLET TOP-UP</h1>
            <div style="border-top: 1px solid #00ff00; padding-top: 20px;">
              <p style="margin: 10px 0;"><strong>Amount Added:</strong> $${amount.toFixed(2)}</p>
              <p style="margin: 10px 0;"><strong>New Balance:</strong> $${newBalance?.toFixed(2) || 'N/A'}</p>
              <p style="margin: 10px 0;"><strong>Status:</strong> SUCCESS</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #333;">
              <p style="color: #888; font-size: 12px;">Your funds are now available for purchases.</p>
            </div>
          </div>
          <p style="color: #444; font-size: 10px; margin-top: 20px; text-align: center;">HELL5TAR SYSTEMS</p>
        </div>
      `;
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "HELL5TAR <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    const result = await emailResponse.json();
    console.log("Email sent:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
