/**
 * Button Component
 *
 * Reusable button component with multiple variants and sizes.
 */

import React, { ReactNode, ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: ReactNode;
  /** Visual variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Whether button is loading */
  isLoading?: boolean;
  /** Optional icon prefix */
  icon?: ReactNode;
  /** Optional className override */
  className?: string;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm",
  secondary: "bg-slate-800/50 text-slate-200 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600/50 active:bg-slate-700",
  ghost: "text-slate-400 hover:text-slate-300 hover:bg-slate-800/30 active:bg-slate-800/50",
  danger: "bg-red-600/20 text-red-300 border border-red-500/30 hover:bg-red-600/30 active:bg-red-600/40",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-base",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  icon,
  className = "",
  disabled,
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button
      disabled={isLoading || disabled}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-lg font-medium transition-smooth cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_STYLES[variant]}
        ${SIZE_STYLES[size]}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="text-lg">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
