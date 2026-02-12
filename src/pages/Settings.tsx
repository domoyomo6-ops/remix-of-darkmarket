import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Lock, User, Mail } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [loading, setLoading] = useState(false);

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
