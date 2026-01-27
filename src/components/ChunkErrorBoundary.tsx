import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const RETRY_KEY = "hell5tar_chunk_retry";

class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    if (this.isChunkError(error)) {
      const hasRetried = sessionStorage.getItem(RETRY_KEY) === "true";
      if (!hasRetried) {
        sessionStorage.setItem(RETRY_KEY, "true");
        window.location.reload();
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    sessionStorage.removeItem(RETRY_KEY);
    // Force a full page reload to clear any cached failed chunks
    window.location.reload();
  };

  isChunkError = (error: Error | null) =>
    Boolean(
      error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.message?.includes("Loading chunk")
    );

  render() {
    if (this.state.hasError) {
      const isChunkError = this.isChunkError(this.state.error);

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                {isChunkError ? "Connection Issue" : "Something went wrong"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isChunkError 
                  ? "Failed to load page resources. This can happen due to a network issue or an app update."
                  : "An unexpected error occurred while loading this page."}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={this.handleRetry} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = "/"}
              >
                Go to Homepage
              </Button>
            </div>

            {this.state.error && (
              <details className="text-left text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;
