import Link from "next/link";
import { Brain } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur sm:p-7">
          <Link
            href="/areashow"
            className="inline-flex items-center gap-3 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 transition hover:bg-cyan-400/15"
          >
            <span className="flex size-9 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-300">
              <Brain className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-300">Neuro Track</p>
              <p className="text-xs text-slate-400">Inteligencia populacional para operacoes de alta precisao</p>
            </div>
          </Link>

          <div className="mt-5 grid gap-3 text-xs text-slate-400 sm:grid-cols-2">
            <p className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2">
              Neuro Track. Operacao, auditoria e distribuicao publica em uma unica plataforma.
            </p>
            <p className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2">
              Ambiente protegido para inteligencia populacional, pesquisas e monitoramento territorial.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-4 text-center text-xs text-slate-500 sm:px-10">
          <p>Todos os direitos reservados Neuro Track 2026 desenvolvido por Felipe Belmont</p>
        </div>
      </div>
    </footer>
  );
}
