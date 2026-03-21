import { Activity, Shield, Sparkles } from "lucide-react";

const pillars = [
  {
    icon: Shield,
    title: "Controle de acesso",
    description: "Sessoes protegidas no servidor para as areas internas da plataforma.",
  },
  {
    icon: Activity,
    title: "Operacao em tempo real",
    description: "Fluxos preparados para dashboards, auditoria e monitoramento de campo.",
  },
  {
    icon: Sparkles,
    title: "Base para escalar",
    description: "Estrutura pronta para evoluir a autenticacao, servicos e modulos privados.",
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]">
        <div className="max-w-md space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
            Neuro Track Front
          </p>
          <h2 className="text-2xl font-black text-white">
            Interface interna para operacao, auditoria e inteligencia de dados.
          </h2>
          <p className="text-sm leading-6 text-slate-400">
            Header autenticado, modal de acesso e area protegida preparados para o fluxo de trabalho do time.
          </p>
        </div>

        {pillars.map((pillar) => (
          <div key={pillar.title} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
              <pillar.icon className="size-5" />
            </div>
            <h3 className="text-base font-semibold text-white">{pillar.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{pillar.description}</p>
          </div>
        ))}
      </div>
    </footer>
  );
}
