import * as React from "react";
import { cn } from "@/lib/utils";

const styles = {
  info: "border-gold/30 bg-gold/5 text-gold-light",
  success: "border-success/30 bg-success/10 text-success",
  error: "border-danger/30 bg-danger/10 text-danger",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

export function Alert({ variant = "info", className, ...p }: React.HTMLAttributes<HTMLDivElement> & { variant?: keyof typeof styles }) {
  return <div role={variant === "error" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm", styles[variant], className)} {...p} />;
}
