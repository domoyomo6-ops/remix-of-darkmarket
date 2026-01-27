import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Terminal, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('INVALID_EMAIL_FORMAT');
const passwordSchema = z.string().min(6, 'MIN_6_CHARS_REQUIRED');

export default function Auth() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const location = useLocation();
  const isAdminPortal = location.pathname === '/admin-auth';
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Check invite token on mount
  useEffect(() => {
    const checkInvite = async () => {
      if (inviteToken) {
        const { data, error } = await supabase
          .from('admin_invites')
          .select('email, used_at, expires_at')
          .eq('token', inviteToken)
          .maybeSingle();

        if (error || !data) {
          setInviteValid(false);
          return;
        }

        if (data.used_at || new Date(data.expires_at) < new Date()) {
          setInviteValid(false);
          return;
        }

        setInviteValid(true);
        setInviteEmail(data.email);
        setEmail(data.email);
        setIsLogin(false);
      }
    };
    checkInvite();
  }, [inviteToken]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; name?: string } = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    
    if (!isLogin && !fullName.trim()) {
      newErrors.name = 'IDENTIFIER_REQUIRED';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message.includes('Invalid login credentials')
            ? 'ACCESS_DENIED: Invalid credentials'
            : error.message
          );
        } else {
          toast.success('ACCESS_GRANTED');
          navigate(isAdminPortal ? '/admin' : '/');
        }
      } else {
        // For signup, check if user has a valid invite
        const { data: inviteCheck } = await supabase.rpc('validate_invite_on_signup', {
          invite_email: email.toLowerCase().trim()
        });

        const inviteResult = inviteCheck as { valid?: boolean; error?: string } | null;

        if (!inviteResult?.valid) {
          toast.error('ACCESS_DENIED: Valid invite required to register');
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message.includes('already registered')
            ? 'USER_EXISTS: Please authenticate'
            : error.message
          );
          if (error.message.includes('already registered')) setIsLogin(true);
        } else {
          toast.success('ACCOUNT_INITIALIZED');
          navigate('/');
        }
      }
    } catch {
      toast.error('SYSTEM_ERROR: Unexpected failure');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden perspective-container px-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/3 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px]" />

      <div className="relative z-10 w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="absolute -top-12 left-0 text-muted-foreground hover:text-primary font-mono btn-3d text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          [BACK]
        </Button>

        <div className="glass-3d rounded-lg p-6 sm:p-8 animate-fade-in panel-3d depth-shadow">
          {/* Terminal header */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-primary/20">
            <Terminal className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground font-mono truncate">
              hell5tar@auth-gateway ~ 
            </span>
            <span className="w-2 h-4 bg-primary animate-blink flex-shrink-0" />
          </div>

          {/* Invite status banner */}
          {inviteToken && inviteValid === false && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400 font-mono">INVITE_EXPIRED_OR_INVALID</p>
            </div>
          )}

          {inviteToken && inviteValid === true && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-xs text-primary font-mono">INVITE_VALID: {inviteEmail}</p>
            </div>
          )}

          {isAdminPortal && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-xs text-primary font-mono">ADMIN_PORTAL_ACCESS</p>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl font-mono font-bold text-primary mb-2 terminal-glow">
              {isLogin ? (isAdminPortal ? 'ADMIN_AUTH' : 'AUTHENTICATE') : 'INITIALIZE_USER'}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm font-mono">
              {isLogin
                ? (isAdminPortal ? '> Admin credentials required' : '> Enter credentials to access')
                : '> Create secure identity'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="IDENTIFIER://"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 pl-10 crt-input text-sm"
                  />
                </div>
                {errors.name && <p className="text-xs text-destructive font-mono">[ERROR] {errors.name}</p>}
              </div>
            )}

            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="EMAIL://"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-10 crt-input text-sm"
                  disabled={!!inviteEmail}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive font-mono">[ERROR] {errors.email}</p>}
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="PASSKEY://"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 pr-12 crt-input text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive font-mono">[ERROR] {errors.password}</p>}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 crt-button mt-6"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  {isLogin ? 'AUTHENTICATING...' : 'INITIALIZING...'}
                </div>
              ) : (
                isLogin ? '[ AUTHENTICATE ]' : '[ CREATE IDENTITY ]'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
                if (inviteEmail) setEmail(inviteEmail);
              }}
              className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors font-mono"
            >
              {isLogin ? '> Have an invite? ' : '> Existing user? '}
              <span className="text-primary">
                {isLogin ? '[REGISTER]' : '[LOGIN]'}
              </span>
            </button>
          </div>

          {!isLogin && !inviteToken && (
            <div className="mt-4 p-3 rounded-lg bg-muted/20 border border-muted/30 text-center">
              <p className="text-xs text-muted-foreground font-mono">
                Registration requires an invite from an admin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
