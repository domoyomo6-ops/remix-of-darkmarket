import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, ShoppingBag, Terminal, Menu, X, Download, Gamepad2, Radio, MessageSquare, Receipt, FileText, UserCircle, ShoppingCart, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import WalletBalance from '@/components/wallet/WalletBalance';

export default function Header() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('hell5tar_cart') || '[]');
        setCartCount(cart.length);
      } catch { setCartCount(0); }
    };
    updateCount();
    window.addEventListener('cart-update', updateCount);
    window.addEventListener('storage', updateCount);
    return () => {
      window.removeEventListener('cart-update', updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out failed', error);
      navigate('/');
    }
  };

  const NavLinks = ({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) => (
    <>
      <Link 
        to="/desktop" 
        onClick={onNavigate}
        className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-muted-foreground hover:text-primary transition-all duration-300 font-mono uppercase tracking-wide hover:terminal-glow`}
      >
        [DESKTOP]
      </Link>
      <Link 
        to="/stock" 
        onClick={onNavigate}
        className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-muted-foreground hover:text-primary transition-all duration-300 font-mono uppercase tracking-wide hover:terminal-glow`}
      >
        [STOCK]
      </Link>
      <Link 
        to="/logz" 
        onClick={onNavigate}
        className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-purple-400 hover:text-purple-300 transition-all duration-300 font-mono uppercase tracking-wide hover:terminal-glow flex items-center gap-2`}
      >
        <FileText className="w-4 h-4" />
        [LOGZ]
      </Link>
      <Link 
        to="/accounts" 
        onClick={onNavigate}
        className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-emerald-400 hover:text-emerald-300 transition-all duration-300 font-mono uppercase tracking-wide hover:terminal-glow flex items-center gap-2`}
      >
        <UserCircle className="w-4 h-4" />
        [ACCOUNTS]
      </Link>
      <Link 
        to="/giftcard-shop" 
        onClick={onNavigate}
        className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-pink-400 hover:text-pink-300 transition-all duration-300 font-mono uppercase tracking-wide hover:terminal-glow flex items-center gap-2`}
      >
        <Gift className="w-4 h-4" />
        [GIFTCARDS]
      </Link>
      <Link 
        to="/lounge" 
        onClick={onNavigate}
        className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-fuchsia-400 hover:text-fuchsia-300 transition-all duration-300 font-mono uppercase tracking-wide hover:terminal-glow flex items-center gap-2`}
      >
        <Radio className="w-4 h-4" />
        [LOUNGE]
      </Link>
      <Link 
        to="/forum" 
        onClick={onNavigate}
        className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-cyan-400 hover:text-cyan-300 transition-all duration-300 font-mono uppercase tracking-wide hover:terminal-glow flex items-center gap-2`}
      >
        <MessageSquare className="w-4 h-4" />
        [FORUM]
      </Link>
      <Link 
        to="/games" 
        onClick={onNavigate}
        className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-amber-400 hover:text-amber-300 transition-all duration-300 font-mono uppercase tracking-wide hover:terminal-glow flex items-center gap-2`}
      >
        <Gamepad2 className="w-4 h-4" />
        [GAMES]
      </Link>
      <Link 
        to="/install" 
        onClick={onNavigate}
        className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-purple-400 hover:text-purple-300 transition-all duration-300 font-mono uppercase tracking-wide hover:terminal-glow flex items-center gap-2`}
      >
        <Download className="w-4 h-4" />
        [INSTALL]
      </Link>
      {user && (
        <Link 
          to="/orders" 
          onClick={onNavigate}
          className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-muted-foreground hover:text-primary transition-all duration-300 font-mono uppercase tracking-wide hover:terminal-glow`}
        >
          [ORDERS]
        </Link>
      )}
      {isAdmin && (
        <Link 
          to="/admin" 
          onClick={onNavigate}
          className={`${mobile ? 'block py-3 text-lg' : 'text-sm'} text-primary hover:text-primary/80 transition-all duration-300 font-mono uppercase tracking-wide terminal-glow`}
        >
          [ADMIN]
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 glass-3d border-b border-primary/20">
      <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 group">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded border border-primary/40 flex items-center justify-center group-hover:border-primary/60 transition-all duration-300 raised group-hover:box-glow">
            <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <span className="font-mono font-bold text-sm sm:text-lg text-primary tracking-wider animate-logo-glow">
            HELL5TAR://
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <NavLinks />
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Cart icon */}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded border border-primary/30 hover:border-primary/50 hover:bg-primary/10 btn-3d relative"
              onClick={() => navigate('/cart')}
            >
              <ShoppingCart className="w-4 h-4 text-primary" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Button>
          )}
          {user && <WalletBalance />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded border border-primary/30 hover:border-primary/50 hover:bg-primary/10 btn-3d"
                >
                  <User className="w-4 h-4 text-primary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 glass-3d border-primary/30">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-mono text-primary truncate">{user?.email ?? ''}</p>
                  {isAdmin && (
                    <p className="text-xs text-primary/60 font-mono">[ADMIN ACCESS]</p>
                  )}
                </div>
                <DropdownMenuSeparator className="bg-primary/20" />
                <DropdownMenuItem 
                  onClick={() => navigate('/orders')}
                  className="font-mono text-primary/80 hover:text-primary focus:text-primary focus:bg-primary/10"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  MY ORDERS
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate('/transactions')}
                  className="font-mono text-primary/80 hover:text-primary focus:text-primary focus:bg-primary/10"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  TRANSACTIONS
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => navigate('/settings')}
                  className="font-mono text-primary/80 hover:text-primary focus:text-primary focus:bg-primary/10"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  SETTINGS
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem 
                    onClick={() => navigate('/admin')}
                    className="font-mono text-primary/80 hover:text-primary focus:text-primary focus:bg-primary/10"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    ADMIN PANEL
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-primary/20" />
                <DropdownMenuItem 
                  onClick={handleSignOut} 
                  className="font-mono text-destructive hover:text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  DISCONNECT
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => navigate('/auth')}
              className="crt-button text-xs sm:text-sm px-3 sm:px-4"
            >
              [ ACCESS ]
            </Button>
          )}

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden h-8 w-8 rounded border border-primary/30 hover:border-primary/50 hover:bg-primary/10"
              >
                <Menu className="w-4 h-4 text-primary" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background/95 border-primary/30 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-8 pt-4">
                <Terminal className="w-5 h-5 text-primary" />
                <span className="font-mono font-bold text-primary">NAVIGATION</span>
              </div>
              <nav className="space-y-1">
                <NavLinks mobile onNavigate={() => setMobileMenuOpen(false)} />
              </nav>
              {user && (
                <div className="mt-8 pt-8 border-t border-primary/20">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start font-mono text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    DISCONNECT
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
