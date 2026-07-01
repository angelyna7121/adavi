import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /* Gold primary — the adavi.ai signature button */
        default:
          "bg-ds-gold text-ds-bg font-bold border border-[rgba(197,163,90,0.5)] hover:bg-ds-gold-hover shadow-gold-sm hover:shadow-gold active:scale-[0.98]",

        /* Solid destructive */
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive/50 hover:bg-destructive/90 active:scale-[0.98]",

        /* Bordered ghost — visible on dark backgrounds */
        outline:
          "border border-[rgba(255,255,255,0.12)] bg-transparent text-white/70 hover:text-white hover:border-[rgba(197,163,90,0.3)] hover:bg-white/5 active:scale-[0.98]",

        /* Flat secondary */
        secondary:
          "bg-[rgba(255,255,255,0.07)] text-white/80 border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.11)] hover:text-white active:scale-[0.98]",

        /* True ghost — no border at rest */
        ghost:
          "border border-transparent text-white/60 hover:text-white hover:bg-white/5 active:scale-[0.98]",

        /* Gold outlined — gold border, transparent fill */
        "outline-gold":
          "border border-[rgba(197,163,90,0.35)] bg-[rgba(197,163,90,0.06)] text-ds-gold hover:bg-[rgba(197,163,90,0.12)] hover:border-[rgba(197,163,90,0.5)] font-semibold active:scale-[0.98]",

        /* Link style */
        link: "text-ds-gold underline-offset-4 hover:underline border border-transparent",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm:      "h-8  px-3.5 py-1.5 text-xs rounded-md",
        lg:      "h-12 px-7 py-3 text-base rounded-xl",
        xl:      "h-14 px-10 py-4 text-base font-bold rounded-xl",
        icon:    "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
