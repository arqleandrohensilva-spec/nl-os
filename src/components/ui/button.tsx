import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-bold uppercase tracking-widest transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-none",
  {
    variants: {
      variant: {
        default: "bg-[#8B7355] text-[#0A0A0A] hover:bg-[#8B7355]/80",
        destructive: "bg-[#8B2020] text-[#E8E4DF] hover:bg-[#8B2020]/80",
        outline: "border border-white/10 bg-transparent text-[#E8E4DF] hover:bg-white/5",
        secondary: "bg-[#2A2A2A] text-[#E8E4DF] hover:bg-[#3A3A3A]",
        ghost: "bg-transparent text-[#777777] hover:bg-white/5 hover:text-[#E8E4DF]",
        link: "text-[#8B7355] underline-offset-4 hover:underline bg-transparent",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-8 px-4 text-[10px]",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
