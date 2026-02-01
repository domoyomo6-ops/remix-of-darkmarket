import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  isAdmin?: boolean;           // 🔐 admin-only toggle
  maxClaims?: number;           // 🧠 max_claims limit
  currentClaims?: number;       // 🧠 current claims
  onSync?: () => void;          // 🔄 realtime sync callback
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      disabled,
      isAdmin = false,
      maxClaims,
      currentClaims,
      onSync,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    // Auto-disable if max claims reached
    const isMaxedOut = maxClaims !== undefined && currentClaims !== undefined && currentClaims >= maxClaims;

    // Disable if loading, explicitly disabled, or max claims reached
    // Note: isAdmin prop is for admin-only buttons, not for disabling all buttons
    const shouldDisable = isLoading || disabled || isMaxedOut;

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={shouldDisable}
        aria-busy={isLoading}
        onClick={(e) => {
          if (onSync) onSync(); // 🔄 realtime sync
          if (props.onClick) props.onClick(e);
        }}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" />}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
