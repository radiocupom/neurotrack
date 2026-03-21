"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, LockKeyhole, Mail, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type LoginModalProps = {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (credentials: { email: string; senha: string }) => Promise<{ ok: boolean; message?: string }>;
};

export function LoginModal({ open, pending, onClose, onSubmit }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose, pending]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const result = await onSubmit({ email, senha });

    if (!result.ok) {
      setError(result.message ?? "Falha ao autenticar.");
      return;
    }

    setError(null);
    setSenha("");
  }

  function handleClose() {
    setError(null);
    setSenha("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-md">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!pending) {
            handleClose();
          }
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-cyan-400/20 bg-slate-950/95 shadow-2xl shadow-cyan-950/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),transparent_55%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.18),transparent_45%)]" />

        <div className="relative flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
              Acesso Seguro
            </p>
            <h2 id="login-title" className="mt-2 text-2xl font-black text-white">
              Entrar no Neuro Track
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Use as credenciais validadas no backend para liberar a area protegida.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-cyan-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fechar modal de login"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-5 px-6 py-6">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Email</span>
            <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition focus-within:border-cyan-400/60 focus-within:bg-white/8">
              <Mail className="size-4 text-cyan-300" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@dominio.com"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                required
              />
            </span>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Senha</span>
            <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition focus-within:border-cyan-400/60 focus-within:bg-white/8">
              <LockKeyhole className="size-4 text-cyan-300" />
              <input
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="Digite sua senha"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                required
              />
            </span>
          </label>

          {error ? (
            <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-xs leading-5 text-slate-400">
              O login usa a rota publica /auth/login e cria uma sessao protegida em cookie no servidor.
            </p>

            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="h-11 min-w-36 rounded-2xl bg-linear-to-r from-cyan-400 to-violet-500 font-semibold text-slate-950 hover:opacity-95"
            >
              {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {pending ? "Entrando" : "Entrar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
