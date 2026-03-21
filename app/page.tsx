import Link from "next/link";
import { ArrowRight, BarChart3, LockKeyhole, RadioTower, ShieldCheck } from "lucide-react";

const highlights = [
  {
    icon: RadioTower,
    title: "Autenticacao operacional",
    description: "Login consumindo a rota publica do backend e sessao criada com cookie assinado no servidor.",
  },
  {
    icon: ShieldCheck,
    title: "Rotas protegidas",
    description: "A AreaShow agora redireciona acessos anonimos para o fluxo de login antes de renderizar.",
  },
  {
    icon: BarChart3,
    title: "Base para dashboards",
    description: "Estrutura pronta para conectar indicadores internos e controles por papel de usuario.",
  },
];

const checkpoints = [
  "Header global com login/logout",
  "Modal de acesso acoplado ao layout",
  "Protecao server-side da AreaShow",
  "Sessao pronta para integrar servicos privados",
];

export default function Home() {
  return (
    <div className="overflow-hidden">
      <section className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-7xl gap-12 px-6 py-12 sm:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-16">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            <LockKeyhole className="size-4" />
            Base interna concluida
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-black tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              Neuro Track pronto para avancar com autenticacao, layout global e area protegida.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              A fundacao da interface interna agora tem header, footer, modal de login e protecao de rota alinhados com o App Router e com o fluxo do backend descrito na documentacao do projeto.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/?login=1&redirect=/areashow"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-cyan-400 to-violet-500 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:opacity-95"
            >
              Entrar na AreaShow
              <ArrowRight className="size-4" />
            </Link>

            <a
              href="#estrutura"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white transition hover:border-cyan-400/30 hover:bg-white/10"
            >
              Ver o que foi entregue
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {checkpoints.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-[2rem] bg-cyan-400/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,23,42,0.96),rgba(30,41,59,0.85),rgba(88,28,135,0.72))] p-6 shadow-2xl shadow-slate-950/30 sm:p-8">
            <div className="grid gap-4">
              {highlights.map((item) => (
                <article key={item.title} className="rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-5 backdrop-blur">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                    <item.icon className="size-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="estrutura" className="border-t border-white/10">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 sm:px-10 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border border-cyan-400/20 bg-cyan-400/8 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">Layout</p>
            <h2 className="mt-4 text-2xl font-black text-white">Header e footer globais</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              O layout raiz agora aplica a estrutura compartilhada, injeta o estado inicial da sessao e padroniza a navegacao interna.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-violet-400/20 bg-violet-400/8 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-violet-300">Login</p>
            <h2 className="mt-4 text-2xl font-black text-white">Modal conectado ao backend</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              O botao do header abre o modal, autentica contra /auth/login e redireciona para a area privada apos o sucesso.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-emerald-400/20 bg-emerald-400/8 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-300">Protecao</p>
            <h2 className="mt-4 text-2xl font-black text-white">Bloqueio de telas privadas</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              A rota /areashow tem proxy no servidor e uma checagem adicional antes da renderizacao para evitar acesso sem login.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
