import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const hasValidLength = useMemo(() => password.trim().length >= 6, [password]);
  const passwordsMatch = useMemo(() => password === confirmPassword, [password, confirmPassword]);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
    const recoveryType = params.get("type");

    if (recoveryType === "recovery") {
      setIsRecoveryMode(true);
      return;
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsRecoveryMode(true);
      }
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidLength) {
      toast.error("PASSKEY_TOO_SHORT");
      return;
    }

    if (!passwordsMatch) {
      toast.error("PASSKEY_MISMATCH");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("PASSKEY_RESET_COMPLETE");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md glass-3d rounded-lg p-6 sm:p-8 panel-3d depth-shadow">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/30">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-mono font-bold text-primary terminal-glow">RESET_PASSKEY</h1>
          <p className="mt-2 text-sm font-mono text-muted-foreground">
            {isRecoveryMode ? "> Enter a new secure passkey" : "> Open the recovery link from your email first"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="NEW_PASSKEY://"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 pl-10 pr-12 crt-input text-sm"
                disabled={!isRecoveryMode || loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
                disabled={!isRecoveryMode || loading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="CONFIRM_PASSKEY://"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 pl-10 crt-input text-sm"
                disabled={!isRecoveryMode || loading}
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-12 crt-button" disabled={!isRecoveryMode || loading}>
            {loading ? "RESETTING..." : "[ SAVE NEW PASSKEY ]"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="text-xs font-mono text-muted-foreground transition-colors hover:text-primary"
          >
            [ RETURN TO AUTH ]
          </button>
        </div>
      </div>
    </div>
  );
}