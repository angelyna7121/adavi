import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          /* Layout */
          "flex h-10 w-full",
          /* Dark card surface */
          "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)]",
          /* Typography */
          "font-[Calibri,Arial,sans-serif] text-[0.9375rem] text-white",
          /* Shape */
          "rounded-lg px-3.5 py-2.5",
          /* Placeholder */
          "placeholder:text-white/30",
          /* Focus — gold ring */
          "focus-visible:outline-none focus-visible:border-[#C5A35A] focus-visible:ring-2 focus-visible:ring-[rgba(197,163,90,0.15)] focus-visible:ring-offset-0",
          /* File input */
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white",
          /* States */
          "transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "read-only:opacity-70",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
