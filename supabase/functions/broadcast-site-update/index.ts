import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://example.com";

const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

if (VAPID_SUBJECT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

type BroadcastRequest = {
  title: string;
  message: string;
  link?: string;
  type: "announcement" | "drop" | "product" | "custom" | "restock" | "update" | "promo" | "info";
  sendPush?: boolean;
  forceTelegram?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
};

type SiteSettings = {
  telegram_admin_enabled: boolean;
  telegram_customer_enabled: boolean;
  telegram_bot_token: string | null;
  telegram_admin_chat_id: string | null;
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const typeLabelMap: Record<BroadcastRequest["type"], { emoji: string; label: string }> = {
  announcement: { emoji: "📣", label: "Announcement" },
  drop: { emoji: "🔥", label: "Drop" },
  product: { emoji: "🛍️", label: "Product" },
  custom: { emoji: "✨", label: "Update" },
  restock: { emoji: "♻️", label: "Restock" },
  update: { emoji: "🆕", label: "Update" },
  promo: { emoji: "🎁", label: "Promo" },
  info: { emoji: "ℹ️", label: "Info" },
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const jwt = authHeader.replace("Bearer ", "").trim();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authorization token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError) {
      throw roleError;
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const {
      title,
      message,
      link,
      type,
      sendPush = true,
      forceTelegram = false,
      telegramBotToken,
      telegramChatId,
      ctaLabel,
      ctaUrl,
      secondaryCtaLabel,
      secondaryCtaUrl,
    }: BroadcastRequest = await req.json();

    if (!title || !message || !type) {
      return new Response(JSON.stringify({ error: "title, message and type are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("telegram_admin_enabled, telegram_customer_enabled, telegram_bot_token, telegram_admin_chat_id")
      .single();

    if (settingsError) {
      throw settingsError;
    }

    const telegramSettings = settings as SiteSettings | null;
    const telegramEnabled = telegramSettings?.telegram_admin_enabled && telegramSettings?.telegram_customer_enabled;
    const telegramToken = telegramBotToken?.trim() || telegramSettings?.telegram_bot_token;
    const resolvedTelegramChatId = telegramChatId?.trim() || telegramSettings?.telegram_admin_chat_id;
    const shouldSendTelegram = forceTelegram || telegramEnabled;

    let telegramResult: { sent: boolean; error?: unknown } = { sent: false };

    if (shouldSendTelegram && telegramToken && resolvedTelegramChatId) {
      const typeMeta = typeLabelMap[type] ?? typeLabelMap.custom;
      const fullLink = ctaUrl || (link ? `${SITE_URL}${link}` : undefined);
      const safeTitle = escapeHtml(title.trim());
      const safeMessage = escapeHtml(message.trim());
      const generatedAt = new Date().toUTCString();
      const lines = [
        `${typeMeta.emoji} <b>${safeTitle}</b>`,
        `<blockquote>${safeMessage}</blockquote>`,
        `<b>Category:</b> ${escapeHtml(typeMeta.label.toUpperCase())}`,
        `<b>Posted:</b> ${escapeHtml(generatedAt)}`,
      ];

      if (fullLink && !ctaLabel) {
        lines.push(`<b>Open:</b> ${escapeHtml(fullLink)}`);
      }

      const inlineKeyboard: Array<Array<{ text: string; url: string }>> = [];
      if (ctaLabel && ctaUrl) {
        inlineKeyboard.push([{ text: ctaLabel, url: ctaUrl }]);
      }
      if (secondaryCtaLabel && secondaryCtaUrl) {
        inlineKeyboard.push([{ text: secondaryCtaLabel, url: secondaryCtaUrl }]);
      }

      const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: resolvedTelegramChatId,
          text: lines.join("\n\n"),
          parse_mode: "HTML",
          disable_web_page_preview: false,
          ...(inlineKeyboard.length > 0 ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {}),
        }),
      });

      const telegramJson = await telegramResponse.json();
      telegramResult = {
        sent: telegramResponse.ok,
        error: telegramResponse.ok ? undefined : telegramJson,
      };
    }

    let pushSent = 0;
    if (sendPush && VAPID_SUBJECT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      const { data: subscriptions, error } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth");

      if (error) {
        throw error;
      }

      for (const subscription of subscriptions ?? []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify({
              title,
              body: message,
              url: link ?? "/",
              tag: `site-${type}`,
            }),
          );
          pushSent += 1;
        } catch (pushError) {
          const statusCode = (pushError as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          }
          console.error("Failed to send push notification", pushError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        telegram: telegramResult,
        pushSent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error) {
    console.error("broadcast-site-update error", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
