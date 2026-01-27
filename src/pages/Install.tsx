import { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle, X, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MainLayout from '@/components/layout/MainLayout';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

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
