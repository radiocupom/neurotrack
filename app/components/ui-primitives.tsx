import React from "react";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

export function Card({
  children,
  className = "",
  padding = "md",
}: CardProps) {
  const paddingMap = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl shadow-slate-950/30 backdrop-blur-sm",
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const variantMap = {
    primary:
      "bg-gradient-to-r from-cyan-400 to-purple-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110",
    secondary:
      "border border-white/20 bg-white/5 text-slate-100 hover:bg-white/10",
    danger:
      "border border-red-400/40 bg-red-500/20 text-red-100 hover:bg-red-500/30",
  };

  const sizeMap = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variantMap[variant],
        sizeMap[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? "Carregando..." : children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export function Input({
  label,
  error,
  helpText,
  className = "",
  ...props
}: InputProps) {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-200">
          {label}
          {props.required && <span className="text-red-300">*</span>}
        </label>
      )}
      <input
        className={cn(
          "h-11 w-full rounded-xl border bg-slate-950/65 px-3 text-sm text-slate-100",
          "focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/30",
          error ? "border-red-400/70" : "border-white/15",
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-300">{error}</p>}
      {helpText && !error && (
        <p className="mt-1 text-sm text-slate-400">{helpText}</p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({
  label,
  error,
  options,
  className = "",
  ...props
}: SelectProps) {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-200">
          {label}
          {props.required && <span className="text-red-300">*</span>}
        </label>
      )}
      <select
        className={cn(
          "h-11 w-full rounded-xl border bg-slate-950/65 px-3 text-sm text-slate-100",
          "focus:border-cyan-300/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/30",
          error ? "border-red-400/70" : "border-white/15",
          className,
        )}
        {...props}
      >
        <option value="">-- Selecione --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-300">{error}</p>}
    </div>
  );
}

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  name: string;
  label?: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}

export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  error,
}: RadioGroupProps) {
  return (
    <div>
      {label && (
        <label className="mb-3 block text-sm font-medium text-slate-200">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-start rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
              className="mt-1 h-4 w-4"
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-slate-100">
                {option.label}
              </span>
              {option.description && (
                <span className="block text-sm text-slate-400">
                  {option.description}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </div>
  );
}

interface AlertProps {
  children: React.ReactNode;
  type?: "success" | "error" | "warning" | "info";
  onClose?: () => void;
  className?: string;
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = "",
}: ToggleProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3", className)}>
      <div>
        <p className="text-sm font-medium text-slate-100">{label}</p>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "border-emerald-300/40 bg-emerald-400/20"
            : "border-white/15 bg-slate-900/80",
        )}
      >
        <span
          className={cn(
            "absolute left-1 flex size-6 items-center justify-center rounded-full text-[10px] font-black transition-transform",
            checked
              ? "translate-x-6 bg-emerald-300 text-slate-950"
              : "translate-x-0 bg-slate-300 text-slate-950",
          )}
        >
          {checked ? "ON" : "OFF"}
        </span>
      </button>
    </div>
  );
}

export function Alert({
  children,
  type = "info",
  onClose,
  className = "",
}: AlertProps) {
  const typeMap = {
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
    error: "border-red-400/40 bg-red-500/15 text-red-100",
    warning: "border-amber-400/35 bg-amber-400/15 text-amber-100",
    info: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  };

  const iconMap = {
    success: "OK",
    error: "ER",
    warning: "AT",
    info: "IN",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        typeMap[type],
        className,
      )}
    >
      <span className="rounded-md border border-current/30 bg-current/10 px-2 py-0.5 text-[11px] font-black tracking-wide">{iconMap[type]}</span>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-lg hover:opacity-70"
          aria-label="Fechar"
        >
          x
        </button>
      )}
    </div>
  );
}

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message = "Carregando...", fullScreen = false }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400/25 border-t-cyan-300" />
      <p className="text-sm text-slate-300">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return <div className="py-8">{content}</div>;
}

interface Step {
  id: string;
  label: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: string;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="mb-8 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                index <= currentIndex
                  ? "bg-gradient-to-r from-cyan-400 to-purple-500 text-slate-950"
                  : "bg-slate-800 text-slate-400",
              )}
            >
              {index < currentIndex ? "✓" : index + 1}
            </div>
            <p className="mt-2 text-center text-[11px] font-semibold text-slate-300">{step.label}</p>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "mx-2 h-1 flex-1 rounded-full",
                index < currentIndex
                  ? "bg-gradient-to-r from-cyan-400 to-purple-500"
                  : "bg-slate-800",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
