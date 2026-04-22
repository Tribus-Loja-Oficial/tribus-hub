import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium tracking-wide transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-1",
  {
    variants: {
      variant: {
        default:
          "border-primary/15 bg-primary/10 text-primary shadow-sm ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.06]",
        secondary:
          "border-border/70 bg-secondary/90 text-secondary-foreground ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.05]",
        destructive:
          "border-destructive/15 bg-destructive/10 text-destructive ring-1 ring-inset ring-black/[0.03]",
        outline:
          "border-border/80 bg-card text-foreground/90 shadow-sm ring-1 ring-inset ring-black/[0.03] dark:ring-white/[0.05]",
        muted:
          "border-transparent bg-muted/80 text-muted-foreground ring-1 ring-inset ring-black/[0.02]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
