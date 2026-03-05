import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// ── CORS ──────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Env ───────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://example.com";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── Types ─────────────────────────────────────────────────────
type BroadcastType =
  | "announcement" | "drop" | "product" | "custom"
  | "restock" | "update" | "promo" | "info";

interface BroadcastRequest {
  title: string;
  message: string;
  link?: string;
  type: BroadcastType;
  sendPush?: boolean;
  forceTelegram?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
}

// ── Helpers ───────────────────────────────────────────────────
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const TYPE_META: Record<BroadcastType, { emoji: string; label: string }> = {
  announcement: { emoji: "📣", label: "Announcement" },
  drop:         { emoji: "🔥", label: "Drop" },
  product:      { emoji: "🛍️", label: "Product" },
  custom:       { emoji: "✨", label: "Update" },
  restock:      { emoji: "♻️", label: "Restock" },
  update:       { emoji: "🆕", label: "Update" },
  promo:        { emoji: "🎁", label: "Promo" },
  info:         { emoji: "ℹ️", label: "Info" },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

// ── Auth helper ───────────────────────────────────────────────
async function authenticateAdmin(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(
    auth.replace("Bearer ", "").trim(),
  );
  if (error || !user) return null;

  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });
  return isAdmin ? user : null;
}

// ── Telegram sender ───────────────────────────────────────────
async function sendTelegram(
  token: string,
  chatId: string,
  body: BroadcastRequest,
) {
  const meta = TYPE_META[body.type] ?? TYPE_META.custom;
  const fullLink = body.ctaUrl || (body.link ? `${SITE_URL}${body.link}` : undefined);

  const lines = [
    `${meta.emoji} <b>${esc(body.title.trim())}</b>`,
    `<blockquote>${esc(body.message.trim())}</blockquote>`,
    `<b>Category:</b> ${esc(meta.label.toUpperCase())}`,
    `<b>Posted:</b> ${esc(new Date().toUTCString())}`,
  ];

  if (fullLink && !body.ctaLabel) {
    lines.push(`<b>Open:</b> ${esc(fullLink)}`);
  }

  const keyboard: Array<Array<{ text: string; url: string }>> = [];
  if (body.ctaLabel && body.ctaUrl) {
    keyboard.push([{ text: body.ctaLabel, url: body.ctaUrl }]);
  }
  if (body.secondaryCtaLabel && body.secondaryCtaUrl) {
    keyboard.push([{ text: body.secondaryCtaLabel, url: body.secondaryCtaUrl }]);
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join("\n\n"),
      parse_mode: "HTML",
      disable_web_page_preview: false,
      ...(keyboard.length > 0
        ? { reply_markup: { inline_keyboard: keyboard } }
        : {}),
    }),
  });

  const data = await res.json();
  return { sent: res.ok, error: res.ok ? undefined : data };
}

// ── Main handler ──────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = await authenticateAdmin(req);
    if (!admin) return json({ error: "Unauthorized" }, 401);

    const body: BroadcastRequest = await req.json();
    if (!body.title || !body.message || !body.type) {
      return json({ error: "title, message, and type are required" }, 400);
    }

    // Resolve Telegram credentials
    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("telegram_admin_enabled, telegram_customer_enabled, telegram_bot_token, telegram_admin_chat_id")
      .single();

    const tgEnabled = settings?.telegram_admin_enabled && settings?.telegram_customer_enabled;
    const tgToken = body.telegramBotToken?.trim() || settings?.telegram_bot_token;
    const tgChatId = body.telegramChatId?.trim() || settings?.telegram_admin_chat_id;
    const shouldSendTg = body.forceTelegram || tgEnabled;

    // Send Telegram
    let telegramResult = { sent: false as boolean, error: undefined as unknown };
    if (shouldSendTg && tgToken && tgChatId) {
      telegramResult = await sendTelegram(tgToken, tgChatId, body);
    }

    return json({ ok: true, telegram: telegramResult });
  } catch (e) {
    console.error("broadcast-site-update error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
