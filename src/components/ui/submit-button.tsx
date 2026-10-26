"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { buttonClass } from "./button";

type Props = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  pendingLabel?: string;
};

/** Submit button that disables itself while its form's server action runs. */
export function SubmitButton({ variant = "primary", size = "md", className = "", pendingLabel, children, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass(variant, size, className)} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
