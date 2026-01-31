import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function AdminChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated successfully');
      setPassword('');
      setConfirm('');
    }
  };

  return (
    <div className="panel-3d p-4 rounded-lg depth-shadow">
      <h3 className="font-mono text-primary mb-3">CHANGE_ADMIN_PASSWORD</h3>

      <div className="space-y-3">
        <Input
          type="password"
          placeholder="New password"
          className="crt-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Confirm new password"
          className="crt-input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <Button
          className="crt-button w-full"
          onClick={handleChangePassword}
          disabled={loading}
        >
          {loading ? 'UPDATING...' : '[ UPDATE PASSWORD ]'}
        </Button>
      </div>
    </div>
  );
}
