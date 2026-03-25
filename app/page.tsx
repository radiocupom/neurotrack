import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCheck,
  Globe,
  MapPin,
  MessageCircle,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const commandCards = [
  {
    icon: BarChart3,
    title: "Leitura eleitoral em tempo real",
    description: "Painel de intenções, opinião e produtividade com camadas visuais de alto contraste para decisão imediata.",
  },
  {
    icon: MessageCircle,
    title: "Distribuicao publica por WhatsApp",
    description: "Operacao conectada para disparar pesquisas publicas, acompanhar inbox e responder o campo sem troca de contexto.",
  },
  {
    icon: Brain,
    title: "Jornada Senso + Big Five",
    description: "Combina perfil demografico e psicografico para enriquecer segmentacao e leitura comportamental.",
  },
];

const signals = [
  { label: "Latencia operacional", value: "< 1 min", accent: "cyan" },
  { label: "Campanhas simultaneas", value: "48", accent: "emerald" },
  { label: "Entrevistas auditadas", value: "98,7%", accent: "violet" },
  { label: "Cobertura territorial", value: "27 UFs", accent: "cyan" },
];

const gridHighlights = [
  {
    icon: Activity,
    eyebrow: "Controle ao vivo",
    title: "Dashboards desenhados para operacao",
    text: "Cards de leitura rapida, curvas de tendencia e estado de equipes no mesmo plano visual.",
  },
  {
    icon: MapPin,
    eyebrow: "Cobertura territorial",
    title: "Auditoria georreferenciada",
    text: "Conferencia por estado, cidade e bairro com rastreabilidade para cada aplicacao concluida.",
  },
  {
    icon: Shield,
    eyebrow: "Camada segura",
    title: "Ambiente privado com governanca",
    text: "Fluxos protegidos, controle de sessao e separacao clara entre publicacao e operacao interna.",
  },
];

const journeySteps = [
  {
    index: "01",
    title: "Selecionar campanha",
    description: "A operacao escolhe a campanha ativa e consome a URL publica vinda do backend, sem montagem manual.",
  },
  {
    index: "02",
    title: "Coletar no canal certo",
    description: "Campo presencial, inbox WhatsApp ou link publico convergem para o mesmo trilho operacional.",
  },
  {
    index: "03",
    title: "Ler e reagir",
    description: "Os dashboards atualizam o recorte territorial e comportamental para a equipe agir no mesmo ciclo.",
  },
];

function SectionBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-300">
      {children}
    </span>
  );
}

function AccentPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-[1.9rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.06]">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-400">{description}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_20%_30%,rgba(16,185,129,0.12),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_18%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-24 h-px bg-linear-to-r from-transparent via-cyan-400/40 to-transparent" />

      <section className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
        <div>
          <SectionBadge>Neuro Track Command Center</SectionBadge>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight sm:text-6xl lg:text-7xl">
            Pesquisa, psicografia e campo em uma interface
            <span className="block bg-linear-to-r from-cyan-300 via-white to-emerald-300 bg-clip-text text-transparent">
              com leitura futurista e resposta imediata.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            A Neuro Track organiza operação territorial, inbox WhatsApp, dashboards táticos e jornada Senso + Big Five em um único fluxo visual de alta precisão.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link href="/?login=1&redirect=/areashow" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-cyan-400 via-sky-300 to-emerald-300 px-6 text-sm font-bold text-slate-950 transition hover:scale-[1.01]">
              Acessar plataforma
              <ArrowRight className="size-4" />
            </Link>
            <a href="#modulos" className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 text-sm font-semibold text-white transition hover:border-cyan-400/30 hover:bg-white/[0.08]">
              Ver modulos estrategicos
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {signals.map((signal) => (
              <div key={signal.label} className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">{signal.label}</p>
                <p className={`mt-3 text-3xl font-black ${signal.accent === "emerald" ? "text-emerald-300" : signal.accent === "violet" ? "text-violet-300" : "text-cyan-300"}`}>
                  {signal.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] border border-cyan-400/15 bg-cyan-400/5 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,47,73,0.72))] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300">Radar eleitoral</p>
                    <h2 className="mt-2 text-lg font-bold text-white">Intencao, opiniao e ritmo de campo</h2>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-300">
                    <BarChart3 className="size-5" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-12 gap-2">
                  {[48, 62, 58, 74, 69, 82, 77, 86, 84, 91, 88, 94].map((value, index) => (
                    <div key={value + index} className="flex flex-col justify-end">
                      <div className="h-36 rounded-full bg-slate-800/90 p-1">
                        <div
                          className="w-full rounded-full bg-linear-to-t from-cyan-400 via-sky-300 to-white"
                          style={{ height: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Campo ativo</p>
                    <p className="mt-2 text-xl font-black text-cyan-300">312</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Inbox em fila</p>
                    <p className="mt-2 text-xl font-black text-emerald-300">18</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Alertas IA</p>
                    <p className="mt-2 text-xl font-black text-violet-300">07</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-300">Jornada integrada</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <Users className="size-4 text-cyan-300" />
                      <span className="text-sm text-slate-200">Identificacao publica e privada</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <Sparkles className="size-4 text-violet-300" />
                      <span className="text-sm text-slate-200">Big Five acoplado ao senso</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                      <CheckCheck className="size-4 text-emerald-300" />
                      <span className="text-sm text-slate-200">Conclusao rastreada por campanha</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(76,29,149,0.52))] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-300">Mapa de sinais</p>
                  <div className="mt-4 space-y-4">
                    {["Capital", "Interior", "Faixa costeira"].map((region, index) => (
                      <div key={region}>
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                          <span>{region}</span>
                          <span>{72 + index * 9}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-linear-to-r from-violet-400 via-cyan-300 to-emerald-300" style={{ width: `${72 + index * 9}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4 text-sm text-violet-100">
                    Tendencia consolidada: crescimento consistente nas regioes com maior densidade de entrevistas auditadas.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="modulos" className="relative border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="max-w-3xl">
            <SectionBadge>Arquitetura visual</SectionBadge>
            <h2 className="mt-5 text-3xl font-black sm:text-4xl">Modulos que parecem um cockpit, nao um painel genérico.</h2>
            <p className="mt-4 text-base leading-8 text-slate-400">
              A nova landing prioriza contraste, profundidade e leitura operacional. Cada bloco comunica comando, ritmo e confianca de dados.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {commandCards.map((card) => (
              <AccentPanel key={card.title} icon={card.icon} title={card.title} description={card.description} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 sm:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="space-y-5">
            <SectionBadge>Mapa operacional</SectionBadge>
            <h2 className="text-3xl font-black sm:text-4xl">Camadas de leitura para territorio, IA e inbox no mesmo fluxo.</h2>
            <p className="text-base leading-8 text-slate-400">
              Em vez de uma vitrine estática, a página principal agora espelha os casos centrais do produto: monitoramento vivo, rota publica e governanca interna.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {gridHighlights.map((item) => (
              <div key={item.title} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300">
                  <item.icon className="size-5" />
                </div>
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">{item.eyebrow}</p>
                <h3 className="mt-2 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:px-10">
          <div className="max-w-3xl">
            <SectionBadge>Fluxo de execucao</SectionBadge>
            <h2 className="mt-5 text-3xl font-black sm:text-4xl">Da campanha ao insight sem perder o contexto.</h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {journeySteps.map((step) => (
              <div key={step.index} className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm">
                <span className="text-sm font-black text-cyan-300">{step.index}</span>
                <h3 className="mt-4 text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <SectionBadge>Fechamento</SectionBadge>
            <h2 className="mt-5 text-3xl font-black sm:text-5xl">
              Uma plataforma para quem precisa
              <span className="block bg-linear-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                operar pesquisa como sistema nervoso, nao como planilha.
              </span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400">
              A landing agora fala a mesma linguagem do produto: neon controlado, profundidade visual, cards de graficos e foco direto nos fluxos mais valiosos da Neuro Track.
            </p>
          </div>

          <div className="rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(180deg,rgba(8,47,73,0.8),rgba(15,23,42,0.92))] p-6 shadow-2xl shadow-cyan-950/20">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <Globe className="size-5 text-cyan-300" />
                <p className="mt-3 text-sm font-semibold text-white">URLs publicas confiaveis</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">A interface exibe e distribui exatamente o que o backend entrega.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                <Zap className="size-5 text-emerald-300" />
                <p className="mt-3 text-sm font-semibold text-white">Resposta operacional rapida</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">Troca entre campanha, campo e inbox sem ruptura visual.</p>
              </div>
            </div>

            <Link href="/?login=1&redirect=/areashow" className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-cyan-400 to-emerald-300 px-6 text-sm font-bold text-slate-950 transition hover:opacity-95">
              Entrar no cockpit Neuro Track
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
