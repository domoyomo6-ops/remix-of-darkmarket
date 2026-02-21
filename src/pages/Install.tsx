import { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle, X, Terminal, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
};

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const syncNotificationState = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setNotificationsEnabled(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setNotificationsEnabled(false);
        return;
      }

      const subscriptionJson = subscription.toJSON();
      const endpoint = subscriptionJson.endpoint;

      if (!endpoint) {
        setNotificationsEnabled(false);
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setNotificationsEnabled(false);
        return;
      }

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userData.user.id)
        .eq('endpoint', endpoint)
        .maybeSingle();

      if (error) {
        setNotificationsEnabled(false);
        return;
      }

      setNotificationsEnabled(Boolean(data));
    } catch (error) {
      console.error('Failed to sync notification state', error);
      setNotificationsEnabled(false);
    }
  };

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsStandalone(standalone);
      setIsInstalled(standalone);
    };
    checkInstalled();

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    syncNotificationState();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleEnableNotifications = async () => {
    try {
      setNotificationLoading(true);

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toast.error('Push notifications are not supported on this browser');
        return;
      }

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        toast.error('Notification keys are not configured');
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        toast.error('Please log in first to enable notifications');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('Notification permission was not granted');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys;

      if (!subscriptionJson.endpoint || !keys?.p256dh || !keys?.auth) {
        toast.error('Could not read push subscription keys');
        return;
      }

      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: userData.user.id,
          endpoint: subscriptionJson.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' },
      );

      if (error) {
        toast.error('Failed to save notification subscription');
        return;
      }

      setNotificationsEnabled(true);
      toast.success('Phone notifications enabled');

      await syncNotificationState();
    } catch (error) {
      console.error(error);
      toast.error('Failed to enable notifications');
    } finally {
      setNotificationLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen relative">
        <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px] z-10" />

        <div className="container mx-auto px-4 py-8 sm:py-16 relative z-20">
          <div className="max-w-lg mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 border border-primary/30 mb-6">
              <Smartphone className="w-10 h-10 text-primary" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-mono font-bold text-primary terminal-glow mb-4">
              INSTALL_APP://
            </h1>

            {isStandalone || isInstalled ? (
              <div className="panel-3d rounded-lg p-6 sm:p-8">
                <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-primary font-mono mb-2">APP_INSTALLED</p>
                <p className="text-muted-foreground font-mono text-sm">
                  You're already using the installed version of HELL5TAR.
                </p>
              </div>
            ) : isIOS ? (
              <div className="panel-3d rounded-lg p-6 sm:p-8 text-left">
                <p className="text-primary font-mono mb-4 text-center">INSTALL_ON_IOS://</p>
                <ol className="space-y-4 text-muted-foreground font-mono text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-bold">1.</span>
                    <span>Tap the <strong className="text-primary">Share</strong> button in Safari's toolbar</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-bold">2.</span>
                    <span>Scroll down and tap <strong className="text-primary">"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary font-bold">3.</span>
                    <span>Tap <strong className="text-primary">"Add"</strong> to confirm</span>
                  </li>
                </ol>
                <div className="mt-6 p-3 rounded bg-primary/10 border border-primary/20">
                  <p className="text-xs text-primary font-mono">
                    The app will appear on your home screen with the HELL5TAR icon.
                  </p>
                </div>
              </div>
            ) : deferredPrompt ? (
              <div className="panel-3d rounded-lg p-6 sm:p-8">
                <p className="text-muted-foreground font-mono mb-6">
                  Install HELL5TAR for quick access, offline support, and a native app experience.
                </p>
                <Button
                  className="crt-button px-8 py-6 text-lg font-mono w-full sm:w-auto"
                  onClick={handleInstall}
                >
                  <Download className="w-5 h-5 mr-2" />
                  INSTALL NOW
                </Button>
              </div>
            ) : (
              <div className="panel-3d rounded-lg p-6 sm:p-8">
                <X className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-mono mb-4">
                  Installation not available on this browser.
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  Try opening this page in Chrome, Edge, or Safari on a mobile device.
                </p>
              </div>
            )}

            <div className="mt-4 panel-3d rounded-lg p-4 sm:p-5 text-left">
              <p className="text-sm font-mono text-primary mb-3">PHONE_NOTIFICATIONS://</p>
              <p className="text-xs text-muted-foreground font-mono mb-4">
                Enable push notifications to get instant alerts for site updates and free digital drops.
              </p>
              <Button
                className="crt-button w-full"
                onClick={handleEnableNotifications}
                disabled={notificationLoading || notificationsEnabled}
              >
                {notificationsEnabled ? <Bell className="w-4 h-4 mr-2" /> : <BellOff className="w-4 h-4 mr-2" />}
                {notificationLoading ? 'ENABLING...' : notificationsEnabled ? 'NOTIFICATIONS_ENABLED' : 'ENABLE_NOTIFICATIONS'}
              </Button>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: Terminal, title: 'QUICK ACCESS', desc: 'Launch from home screen' },
                { icon: Download, title: 'WORKS OFFLINE', desc: 'Access cached content' },
                { icon: Smartphone, title: 'NATIVE FEEL', desc: 'Full-screen experience' },
              ].map((feature) => (
                <div key={feature.title} className="p-4 rounded-lg border border-primary/20 bg-background/50">
                  <feature.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs font-mono text-primary">{feature.title}</p>
                  <p className="text-xs font-mono text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
