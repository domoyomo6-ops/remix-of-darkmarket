import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Terminal, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(0,255,150,0.2)_1px,transparent_1px)] bg-[size:100%_3px]" />

      <div className="relative z-10 text-center px-6">
        <div className="bg-card/80 backdrop-blur-md border border-primary/30 rounded-lg p-12 max-w-md mx-auto shadow-terminal">
          {/* Terminal header */}
          <div className="flex items-center gap-2 mb-8 pb-4 border-b border-primary/20 justify-center">
            <Terminal className="w-5 h-5 text-destructive" />
            <span className="text-xs text-muted-foreground font-mono">
              hell5tar@error-handler ~
            </span>
          </div>

          <h1 className="text-8xl font-mono font-bold text-primary mb-4 terminal-glow-strong">
            404
          </h1>
          
          <p className="text-xl font-mono text-destructive mb-2">
            [ERROR] ROUTE_NOT_FOUND
          </p>
          
          <p className="text-muted-foreground font-mono mb-8">
            {'>'} Requested path does not exist
            <br />
            <span className="text-primary/60">{location.pathname}</span>
          </p>

          <Link to="/">
            <Button className="crt-button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              [ RETURN TO BASE ]
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
