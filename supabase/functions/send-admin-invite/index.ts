import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminInviteRequest {
  email: string;
  inviteLink: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, inviteLink }: AdminInviteRequest = await req.json();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase service role configuration");
    }

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const { data: settings, error: settingsError } = await supabaseClient
      .from("site_settings")
      .select("telegram_admin_enabled, telegram_admin_chat_id, telegram_bot_token")
      .single();

    if (settingsError) {
      throw new Error(`Failed to load site settings: ${settingsError.message}`);
    }

    const telegramEnabled = settings?.telegram_admin_enabled;
    const telegramToken = settings?.telegram_bot_token;
    const telegramChatId = settings?.telegram_admin_chat_id;

    if (!telegramEnabled || !telegramToken || !telegramChatId) {
      throw new Error("Telegram admin bot settings are not configured");
    }

    const message = [
      "🛡️ New admin invite created",
      `Email: ${email}`,
      `Invite link: ${inviteLink}`,
    ].join("\n");

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
        }),
      }
    );

    const telegramResult = await telegramResponse.json();
    console.log("Admin invite sent via Telegram:", telegramResult);

    return new Response(JSON.stringify(telegramResult), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending admin invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
