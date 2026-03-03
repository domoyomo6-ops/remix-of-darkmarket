import { useEffect, useState, useCallback } from 'react';
import {
  Bot, Loader2, MessageSquare, Save, Send, LinkIcon,
  CheckCircle2, XCircle, Settings2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface TelegramSettings {
  id: string;
  telegram_admin_enabled: boolean;
  telegram_customer_enabled: boolean;
  telegram_bot_token: string | null;
  telegram_admin_chat_id: string | null;
}

interface FormState {
  adminEnabled: boolean;
  customerEnabled: boolean;
  botToken: string;
  chatId: string;
}

interface TestPayload {
  message: string;
  ctaLabel: string;
  ctaUrl: string;
  type: string;
}

const BROADCAST_TYPES = [
  { value: 'custom', label: '✨ Custom' },
  { value: 'announcement', label: '📣 Announcement' },
  { value: 'drop', label: '🔥 Drop' },
  { value: 'restock', label: '♻️ Restock' },
  { value: 'promo', label: '🎁 Promo' },
  { value: 'info', label: 'ℹ️ Info' },
];

export default function TelegramBotManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [lastTestResult, setLastTestResult] = useState<'success' | 'error' | null>(null);

  const [form, setForm] = useState<FormState>({
    adminEnabled: false,
    customerEnabled: false,
    botToken: '',
    chatId: '',
  });

  const [test, setTest] = useState<TestPayload>({
    message: '✅ Telegram integration is configured and ready for stock updates.',
    ctaLabel: '🛍️ View Stock',
    ctaUrl: '/stock',
    type: 'custom',
  });

  const updateForm = useCallback(
    (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch })),
    [],
  );

  const updateTest = useCallback(
    (patch: Partial<TestPayload>) => setTest((prev) => ({ ...prev, ...patch })),
    [],
  );

  // ── Fetch settings ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('id, telegram_admin_enabled, telegram_customer_enabled, telegram_bot_token, telegram_admin_chat_id')
        .single();

      if (error || !data) {
        toast.error('Failed to load Telegram settings');
        setLoading(false);
        return;
      }

      const s = data as TelegramSettings;
      setSettingsId(s.id);
      setForm({
        adminEnabled: s.telegram_admin_enabled,
        customerEnabled: s.telegram_customer_enabled,
        botToken: s.telegram_bot_token || '',
        chatId: s.telegram_admin_chat_id || '',
      });
      setLoading(false);
    })();
  }, []);

  // ── Save settings ───────────────────────────────────────────
  const saveSettings = async () => {
    if (!settingsId) return;
    setSaving(true);

    const { error } = await supabase
      .from('site_settings')
      .update({
        telegram_admin_enabled: form.adminEnabled,
        telegram_customer_enabled: form.customerEnabled,
        telegram_bot_token: form.botToken.trim() || null,
        telegram_admin_chat_id: form.chatId.trim() || null,
      })
      .eq('id', settingsId);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Telegram settings saved');
    }
    setSaving(false);
  };

  // ── Send test ───────────────────────────────────────────────
  const sendTestMessage = async () => {
    if (!test.message.trim()) {
      toast.error('Enter a test message first');
      return;
    }

    const botToken = form.botToken.trim();
    const chatId = form.chatId.trim();
    if (!botToken || !chatId) {
      toast.error('Bot token and chat ID are required');
      return;
    }

    setSendingTest(true);
    setLastTestResult(null);

    const resolvedUrl = test.ctaUrl.trim().startsWith('http')
      ? test.ctaUrl.trim()
      : `${window.location.origin}${test.ctaUrl.trim().startsWith('/') ? '' : '/'}${test.ctaUrl.trim()}`;

    const { data, error } = await supabase.functions.invoke('broadcast-site-update', {
      body: {
        title: '🧪 Telegram Test',
        message: test.message.trim(),
        type: test.type,
        link: '/stock',
        sendPush: false,
        forceTelegram: true,
        telegramBotToken: botToken,
        telegramChatId: chatId,
        ctaLabel: test.ctaLabel.trim() || undefined,
        ctaUrl: test.ctaLabel.trim() ? resolvedUrl : undefined,
      },
    });

    if (error || data?.telegram?.sent !== true) {
      toast.error('Failed to send test message');
      setLastTestResult('error');
      console.error('Telegram test failed', error, data);
    } else {
      toast.success('Test message sent to Telegram');
      setLastTestResult('success');
    }
    setSendingTest(false);
  };

  // ── Loading state ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isConfigured = Boolean(form.botToken.trim() && form.chatId.trim());

  return (
    <div className="panel-3d rounded-lg p-4 sm:p-6 depth-shadow space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-primary" />
          <h2 className="text-lg sm:text-xl font-mono font-bold text-primary terminal-glow">
            TELEGRAM_BOT://
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <span className="flex items-center gap-1 text-xs font-mono text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-mono text-amber-400">
              <XCircle className="h-3.5 w-3.5" /> Not configured
            </span>
          )}
        </div>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings" className="font-mono text-xs">
            <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Settings
          </TabsTrigger>
          <TabsTrigger value="test" className="font-mono text-xs">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Test
          </TabsTrigger>
        </TabsList>

        {/* ── Settings Tab ── */}
        <TabsContent value="settings" className="space-y-4 pt-2">
          <div className="flex items-center justify-between rounded-lg border border-primary/20 p-3">
            <div>
              <p className="font-mono text-sm text-primary">TELEGRAM INTEGRATION</p>
              <p className="text-xs text-muted-foreground">Master toggle for invite/notification flows.</p>
            </div>
            <Switch
              checked={form.adminEnabled}
              onCheckedChange={(v) => updateForm({ adminEnabled: v })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-primary/20 p-3">
            <div>
              <p className="font-mono text-sm text-primary">CUSTOMER STOCK ALERTS</p>
              <p className="text-xs text-muted-foreground">Auto-broadcast stock changes to channel.</p>
            </div>
            <Switch
              checked={form.customerEnabled}
              onCheckedChange={(v) => updateForm({ customerEnabled: v })}
            />
          </div>

          <div>
            <Label className="font-mono text-xs text-muted-foreground">BOT TOKEN</Label>
            <Input
              className="crt-input mt-1"
              type="password"
              placeholder="123456:ABC-DEF..."
              value={form.botToken}
              onChange={(e) => updateForm({ botToken: e.target.value })}
            />
          </div>

          <div>
            <Label className="font-mono text-xs text-muted-foreground">CHANNEL / CHAT ID</Label>
            <Input
              className="crt-input mt-1"
              placeholder="@channelname or -1001234567890"
              value={form.chatId}
              onChange={(e) => updateForm({ chatId: e.target.value })}
            />
          </div>

          <Button className="crt-button w-full" onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            SAVE SETTINGS
          </Button>
        </TabsContent>

        {/* ── Test Tab ── */}
        <TabsContent value="test" className="space-y-4 pt-2">
          {!isConfigured && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs font-mono text-amber-300">
              ⚠ Configure bot token and chat ID in Settings tab first.
            </div>
          )}

          <div>
            <Label className="font-mono text-xs text-muted-foreground">MESSAGE TYPE</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {BROADCAST_TYPES.map((bt) => (
                <Button
                  key={bt.value}
                  variant={test.type === bt.value ? 'default' : 'outline'}
                  size="sm"
                  className="font-mono text-xs"
                  onClick={() => updateTest({ type: bt.value })}
                >
                  {bt.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="font-mono text-xs text-muted-foreground">MESSAGE</Label>
            <Textarea
              className="crt-input min-h-[100px] mt-1"
              value={test.message}
              onChange={(e) => updateTest({ message: e.target.value })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="font-mono text-xs text-muted-foreground">CTA LABEL (optional)</Label>
              <Input
                className="crt-input mt-1"
                placeholder="🛍️ View Stock"
                value={test.ctaLabel}
                onChange={(e) => updateTest({ ctaLabel: e.target.value })}
              />
            </div>
            <div>
              <Label className="font-mono text-xs text-muted-foreground">CTA URL / PATH</Label>
              <Input
                className="crt-input mt-1"
                placeholder="/stock"
                value={test.ctaUrl}
                onChange={(e) => updateTest({ ctaUrl: e.target.value })}
              />
            </div>
          </div>

          <Button
            className="w-full crt-button"
            onClick={sendTestMessage}
            disabled={sendingTest || !isConfigured}
          >
            {sendingTest ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            SEND TEST TO TELEGRAM
          </Button>

          {lastTestResult && (
            <div
              className={`rounded-lg border p-3 text-center font-mono text-sm ${
                lastTestResult === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-red-500/30 bg-red-500/10 text-red-400'
              }`}
            >
              {lastTestResult === 'success' ? (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Message sent successfully
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <XCircle className="h-4 w-4" /> Send failed — check token & chat ID
                </span>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
