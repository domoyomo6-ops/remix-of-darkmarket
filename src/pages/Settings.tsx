import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Lock, User, Mail, Moon, Sun, ImagePlus, BellRing, Palette } from 'lucide-react';
import { applyAppearance, getBackgroundImagePreference, getThemePreference, getThemeVariantPreference, saveAppearance, ThemePreference, ThemeVariant } from '@/lib/appearance';

export default function Settings() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [theme, setTheme] = useState<ThemePreference>(() => getThemePreference());
  const [backgroundImage, setBackgroundImage] = useState(() => getBackgroundImagePreference());
  const [themeVariant, setThemeVariant] = useState<ThemeVariant>(() => getThemeVariantPreference());
  const [updatesNotificationEnabled, setUpdatesNotificationEnabled] = useState(
    () => localStorage.getItem('updates_notifications_enabled') === 'true'
  );
  const [loading, setLoading] = useState(false);

  const handleAppearanceSave = () => {
    saveAppearance(theme, backgroundImage, themeVariant);
    applyAppearance(theme, backgroundImage, themeVariant);
    toast.success('Appearance updated');
  };

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported on this device.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Notification permission was not granted.');
      return;
    }

    localStorage.setItem('updates_notifications_enabled', 'true');
    setUpdatesNotificationEnabled(true);
    toast.success('Update notifications enabled.');
  };

  const handleDisableNotifications = () => {
    localStorage.setItem('updates_notifications_enabled', 'false');
    setUpdatesNotificationEnabled(false);
    toast.success('Update notifications disabled.');
  };

  const handleUpdatePassword = async () => {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully');
      setPassword('');
      setConfirmPassword('');
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    });
    if (!error) {
      // Also update profiles table
      await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('user_id', user?.id);
    }
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Profile updated');
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-mono font-bold terminal-glow">SETTINGS://</h1>
        </div>

        {/* Profile Section */}
        <div className="panel-3d p-6 rounded-xl depth-shadow space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-mono text-primary">APPEARANCE</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="font-mono text-xs text-muted-foreground">THEME_MODE</Label>
                <p className="text-sm mt-1">Switch between dark and light mode</p>
              </div>
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4" />
                <Switch checked={theme === 'light'} onCheckedChange={(checked) => setTheme(checked ? 'light' : 'dark')} />
                <Sun className="w-4 h-4" />
              </div>
            </div>


            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-1 block">
                <Palette className="w-3 h-3 inline mr-1" />THEME_VARIANT
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'neon-night', label: 'Neon Night' },
                  { id: 'violet-club', label: 'Violet Club' },
                  { id: 'ocean-grid', label: 'Ocean Grid' },
                  { id: 'sunset-arcade', label: 'Sunset Arcade' },
                ].map((variant) => (
                  <Button
                    key={variant.id}
                    type="button"
                    variant={themeVariant === variant.id ? 'default' : 'outline'}
                    className="font-mono text-xs"
                    onClick={() => setThemeVariant(variant.id as ThemeVariant)}
                  >
                    {variant.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-1 block">
                <ImagePlus className="w-3 h-3 inline mr-1" />BACKGROUND_IMAGE_URL
              </Label>
              <Input
                value={backgroundImage}
                onChange={(e) => setBackgroundImage(e.target.value)}
                placeholder="https://example.com/your-background.jpg"
                className="crt-input"
              />
              <p className="text-xs text-muted-foreground mt-1 font-mono">Paste a direct image URL to personalize your background.</p>
            </div>

            <div className="flex gap-2">
              <Button className="crt-button w-full" onClick={handleAppearanceSave}>[ SAVE APPEARANCE ]</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setBackgroundImage('');
                  saveAppearance(theme, '', themeVariant);
                  applyAppearance(theme, '', themeVariant);
                }}
              >
                Clear BG
              </Button>
            </div>
          </div>
        </div>

        <div className="panel-3d p-6 rounded-xl depth-shadow space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BellRing className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-mono text-primary">UPDATE_NOTIFICATIONS</h2>
          </div>

          <p className="text-sm text-muted-foreground">
            Enable popup alerts for new announcements. On supported phones, this can also show system notifications.
          </p>

          {updatesNotificationEnabled ? (
            <Button variant="outline" className="w-full" onClick={handleDisableNotifications}>Disable Notifications</Button>
          ) : (
            <Button className="crt-button w-full" onClick={handleEnableNotifications}>Enable Notifications</Button>
          )}
        </div>

        <div className="panel-3d p-6 rounded-xl depth-shadow space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-mono text-primary">PROFILE_DATA</h2>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-1 block">
                <Mail className="w-3 h-3 inline mr-1" />EMAIL
              </Label>
              <Input
                value={user?.email || ''}
                disabled
                className="crt-input opacity-60"
              />
              <p className="text-xs text-muted-foreground mt-1 font-mono">Email cannot be changed</p>
            </div>

            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-1 block">
                <User className="w-3 h-3 inline mr-1" />DISPLAY_NAME
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter display name"
                className="crt-input"
              />
            </div>

            <Button
              className="crt-button w-full"
              onClick={handleUpdateProfile}
              disabled={loading}
            >
              {loading ? 'UPDATING...' : '[ SAVE PROFILE ]'}
            </Button>
          </div>
        </div>

        {/* Password Section */}
        <div className="panel-3d p-6 rounded-xl depth-shadow space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-mono text-primary">CHANGE_PASSWORD</h2>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-1 block">NEW_PASSWORD</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="crt-input"
              />
            </div>

            <div>
              <Label className="font-mono text-xs text-muted-foreground mb-1 block">CONFIRM_PASSWORD</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="crt-input"
              />
            </div>

            <Button
              className="crt-button w-full"
              onClick={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? 'UPDATING...' : '[ UPDATE PASSWORD ]'}
            </Button>
          </div>
        </div>

        {/* Account Info */}
        <div className="panel-3d p-6 rounded-xl depth-shadow">
          <h2 className="text-lg font-mono text-primary mb-3">ACCOUNT_INFO</h2>
          <div className="space-y-2 text-sm font-mono text-muted-foreground">
            <p>USER_ID: <span className="text-foreground/60 text-xs">{user?.id}</span></p>
            <p>CREATED: <span className="text-foreground/60">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span></p>
            <p>LAST_SIGN_IN: <span className="text-foreground/60">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}</span></p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
