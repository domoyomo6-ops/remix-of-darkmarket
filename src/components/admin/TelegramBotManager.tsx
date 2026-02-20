import { useEffect, useState } from 'react';
import { Bot, Loader2, MessageSquare, Save, Send, Sparkles, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

type TelegramSettings = {
  id: string;
  telegram_admin_enabled: boolean;
  telegram_customer_enabled: boolean;
  telegram_bot_token: string | null;
  telegram_admin_chat_id: string | null;
};

export default function TelegramBotManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    telegram_admin_enabled: false,
    telegram_customer_enabled: false,
    telegram_bot_token: '',
    telegram_admin_chat_id: '',
  });
  const [testMessage, setTestMessage] = useState('✅ Telegram integration is configured and ready for stock updates.');
  const [ctaLabel, setCtaLabel] = useState('🛍️ View Stock');
  const [ctaUrl, setCtaUrl] = useState('/stock');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_settings')
      .select('id, telegram_admin_enabled, telegram_customer_enabled, telegram_bot_token, telegram_admin_chat_id')
      .single();

    if (error || !data) {
      toast.error('Failed to load Telegram settings');
      setLoading(false);
      return;
    }

    const settings = data as TelegramSettings;
    setSettingsId(settings.id);
    setFormData({
      telegram_admin_enabled: settings.telegram_admin_enabled,
      telegram_customer_enabled: settings.telegram_customer_enabled,
      telegram_bot_token: settings.telegram_bot_token || '',
      telegram_admin_chat_id: settings.telegram_admin_chat_id || '',
    });
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!settingsId) return;

    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .update({
        telegram_admin_enabled: formData.telegram_admin_enabled,
        telegram_customer_enabled: formData.telegram_customer_enabled,
        telegram_bot_token: formData.telegram_bot_token.trim() || null,
        telegram_admin_chat_id: formData.telegram_admin_chat_id.trim() || null,
      })
      .eq('id', settingsId);

    if (error) {
      toast.error('Failed to save Telegram settings');
    } else {
      toast.success('Telegram settings updated');
    }
    setSaving(false);
  };

  const sendTestMessage = async () => {
    if (!testMessage.trim()) {
      toast.error('Enter a test message first');
      return;
    }

    const botToken = formData.telegram_bot_token.trim();
    const chatId = formData.telegram_admin_chat_id.trim();

    if (!botToken || !chatId) {
      toast.error('Add bot token and chat ID before sending a test message');
      return;
    }

    setSendingTest(true);

    const resolvedCtaUrl = ctaUrl.trim().startsWith('http')
      ? ctaUrl.trim()
      : `${window.location.origin}${ctaUrl.trim().startsWith('/') ? ctaUrl.trim() : `/${ctaUrl.trim()}`}`;

    const { data, error } = await supabase.functions.invoke('broadcast-site-update', {
      body: {
        title: '🧪 Telegram Test Message',
        message: testMessage.trim(),
        type: 'custom',
        link: '/stock',
        sendPush: false,
        forceTelegram: true,
        telegramBotToken: botToken,
        telegramChatId: chatId,
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: ctaLabel.trim() ? resolvedCtaUrl : undefined,
      },
    });

    if (error || data?.telegram?.sent !== true) {
      toast.error('Failed to send Telegram test message');
      console.error('Telegram test send failed', error, data);
    } else {
      toast.success('Test message sent to Telegram');
    }
    setSendingTest(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="panel-3d rounded-lg p-4 sm:p-6 depth-shadow space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-primary" />
        <h2 className="text-lg sm:text-xl font-mono font-bold text-primary terminal-glow">
          TELEGRAM_BOT://
        </h2>
      </div>

      <p className="text-sm text-muted-foreground font-mono">
        {'>'} Configure Telegram channel updates for new stock/restock alerts.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            STYLED ALERTS
          </div>
          <p className="text-xs text-muted-foreground">Messages now render with richer Telegram formatting and category badges.</p>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center gap-2 text-primary text-xs font-mono mb-1">
            <LinkIcon className="h-3.5 w-3.5" />
            SMART CTA
          </div>
          <p className="text-xs text-muted-foreground">Use a relative path like <span className="font-mono">/stock</span> or full URL.</p>
        </div>
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono mb-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            SAFE OUTPUT
          </div>
          <p className="text-xs text-muted-foreground">HTML escaping is applied server-side to prevent broken Telegram layouts.</p>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="flex items-center justify-between rounded-lg border border-primary/20 p-3">
          <div>
            <p className="font-mono text-sm text-primary">TELEGRAM INTEGRATION</p>
            <p className="text-xs text-muted-foreground">Used by invite and notification flows.</p>
          </div>
          <Switch
            checked={formData.telegram_admin_enabled}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, telegram_admin_enabled: checked }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-primary/20 p-3">
          <div>
            <p className="font-mono text-sm text-primary">CUSTOMER STOCK ALERTS</p>
            <p className="text-xs text-muted-foreground">Send stock announcements to Telegram channel/group.</p>
          </div>
          <Switch
            checked={formData.telegram_customer_enabled}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, telegram_customer_enabled: checked }))}
          />
        </div>

        <div>
          <Label className="font-mono text-xs text-muted-foreground">BOT TOKEN</Label>
          <Input
            className="crt-input mt-1"
            type="password"
            placeholder="123456:ABC..."
            value={formData.telegram_bot_token}
            onChange={(e) => setFormData((prev) => ({ ...prev, telegram_bot_token: e.target.value }))}
          />
        </div>

        <div>
          <Label className="font-mono text-xs text-muted-foreground">CHANNEL / CHAT ID</Label>
          <Input
            className="crt-input mt-1"
            placeholder="@channelname or -1001234567890"
            value={formData.telegram_admin_chat_id}
            onChange={(e) => setFormData((prev) => ({ ...prev, telegram_admin_chat_id: e.target.value }))}
          />
        </div>

        <Button className="crt-button w-full" onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          [ SAVE TELEGRAM SETTINGS ]
        </Button>
      </div>

      <div className="rounded-lg border border-primary/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-primary font-mono text-sm">
          <MessageSquare className="h-4 w-4" />
          TEST_MESSAGE
        </div>
        <Textarea
          className="crt-input min-h-[90px]"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="font-mono text-xs text-muted-foreground">CTA LABEL (OPTIONAL)</Label>
            <Input
              className="crt-input mt-1"
              placeholder="🛍️ View Stock"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
            />
          </div>
          <div>
            <Label className="font-mono text-xs text-muted-foreground">CTA URL / PATH</Label>
            <Input
              className="crt-input mt-1"
              placeholder="/stock or https://example.com/stock"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
            />
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={sendTestMessage} disabled={sendingTest}>
          {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          SEND TEST TO TELEGRAM
        </Button>
      </div>
    </div>
  );
}
