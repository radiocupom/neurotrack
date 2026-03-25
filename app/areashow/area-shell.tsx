"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AuthUser } from "@/lib/auth/types";
import { Sidebar } from "@/app/components/layout/sidebar";
import { SensoBigFiveWorkflow } from "../sensobigfive/senso-bigfive-workflow";
import { DashboardSensoBigFive } from "../dashboardsenso/dashboard-senso-bigfive";
import { DashboardOpiniao } from "../dashboardsenso/dashboard-opiniao";
import { DashboardVoto } from "../dashboardsenso/dashboard-voto";
import { DashboardEntrevistadores } from "../dashboardsenso/dashboard-entrevistadores";
import { UsuariosWorkflow } from "../usuariosdosistema/usuarios-workflow";
import { ListaPesquisasClient } from "@/app/pesquisa-opiniao/lista-pesquisas-client";
import { ResponderPesquisaPrivadoClient } from "@/app/pesquisa-opiniao/responder/responder-privado-client";
import { CriarPesquisaClient } from "@/app/pesquisa-opiniao/criar-pesquisa-client";
import { EditarPesquisaClient } from "@/app/pesquisa-opiniao/editar-pesquisa-client";
import { CriarPesquisaIntencaoVotoClient } from "@/app/intencao-voto/criar-pesquisa-client";
import { EditarPesquisaIntencaoVotoClient } from "@/app/intencao-voto/editar-pesquisa-client";
import { ListaPesquisasIntencaoVotoClient } from "@/app/intencao-voto/lista-pesquisas-client";
import { ResponderIntencaoVotoPrivadoClient } from "@/app/intencao-voto/responder/responder-privado-client";
import { WhatsAppPanel } from "@/app/whatsapp/whatsapp-panel";
import ParticipantesDashboard from "@/app/participantes/participantes-dashboard";

const ADMIN_ROLES = new Set(["SUPERADMIN", "ADMIN"]);

export type AreaShellProps = {
  user: AuthUser;
};

export function AreaShell({ user }: AreaShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState("");
  const activeViewFromUrl = useMemo(() => searchParams.get("view")?.trim() || "", [searchParams]);

  const updateActiveView = useCallback(
    (nextView: string) => {
      setActiveView(nextView);

      const params = new URLSearchParams(searchParams.toString());
      if (nextView) {
        params.set("view", nextView);
      } else {
        params.delete("view");
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setActiveView(activeViewFromUrl);
  }, [activeViewFromUrl]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [activeView]);

  const canAccessAdminViews = ADMIN_ROLES.has(user.papel);
  const isUsuariosView = activeView.startsWith("usuarios-");
  const isSensoBigFiveManageView = activeView === "senso-gerenciar-campanhas" || activeView === "senso-criar-campanha";
  const isSensoBigFiveView = activeView === "senso-aplicar" || isSensoBigFiveManageView;
  const isDashboardSensoBigFiveView = activeView === "dashboard-senso";
  const isDashboardOpiniaoView = activeView === "dashboard-opiniao";
  const isDashboardVotoView = activeView === "dashboard-voto";
  const isDashboardEntrevistadoresView = activeView === "dashboard-entrevistadores";
  const isOpiniaoListView = activeView === "opiniao-listar";
  const isOpiniaoAplicarView = activeView === "opiniao-aplicar";
  const isOpiniaoCriarView = activeView === "opiniao-criar";
  const isOpiniaoEditarView = activeView === "opiniao-editar";
  const isVotoListView = activeView === "voto-listar";
  const isVotoAplicarView = activeView === "voto-aplicar";
  const isVotoCriarView = activeView === "voto-criar";
  const isVotoEditarView = activeView === "voto-editar";
  const isWhatsAppView = activeView === "whatsapp-abrir";
  const isParticipantesView = activeView === "participantes-listar";

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <Sidebar
        userRole={user.papel}
        activeView={activeView}
        onViewChange={updateActiveView}
      />

      <div ref={contentRef} className="flex min-w-0 flex-1 flex-col overflow-auto">
        {isUsuariosView ? (
          <UsuariosWorkflow
            loggedUser={user}
            activeView={activeView as "usuarios-listar" | "usuarios-cadastrar" | "usuarios-editar"}
            onViewChange={updateActiveView}
          />
        ) : isSensoBigFiveView ? (
          isSensoBigFiveManageView && !canAccessAdminViews ? (
            <ContentPlaceholder view={activeView} message="Acesso restrito:" />
          ) : (
            <SensoBigFiveWorkflow
              loggedUser={user}
              mode={activeView === "senso-aplicar" ? "aplicar" : "campanhas"}
            />
          )
        ) : isOpiniaoListView ? (
          <ListaPesquisasClient />
        ) : isOpiniaoAplicarView ? (
          <ResponderPesquisaPrivadoClient />
        ) : isOpiniaoCriarView ? (
          <CriarPesquisaClient />
        ) : isOpiniaoEditarView ? (
          <EditarPesquisaClient />
        ) : isVotoListView ? (
          <ListaPesquisasIntencaoVotoClient />
        ) : isVotoAplicarView ? (
          <ResponderIntencaoVotoPrivadoClient />
        ) : isVotoCriarView ? (
          <CriarPesquisaIntencaoVotoClient />
        ) : isVotoEditarView ? (
          <EditarPesquisaIntencaoVotoClient />
        ) : isDashboardSensoBigFiveView ? (
          <DashboardSensoBigFive loggedUser={user} />
        ) : isDashboardOpiniaoView ? (
          <DashboardOpiniao loggedUser={user} />
        ) : isDashboardVotoView ? (
          <DashboardVoto loggedUser={user} />
        ) : isDashboardEntrevistadoresView ? (
          <DashboardEntrevistadores loggedUser={user} />
        ) : isParticipantesView ? (
          canAccessAdminViews ? <ParticipantesDashboard /> : <ContentPlaceholder view={activeView} message="Acesso restrito:" />
        ) : isWhatsAppView ? (
          <WhatsAppPanel />
        ) : activeView ? (
          <ContentPlaceholder view={activeView} />
        ) : (
          <WelcomeView
            user={user}
            onEditProfile={() => updateActiveView("usuarios-editar")}
          />
        )}
      </div>
    </div>
  );
}

function WelcomeView({
  user,
  onEditProfile,
}: {
  user: AuthUser;
  onEditProfile: () => void;
}) {
  const canEditProfile = ADMIN_ROLES.has(user.papel);

  return (
    <section className="relative flex flex-1 flex-col overflow-hidden px-4 pb-10 pt-5 sm:px-6 sm:pb-12 sm:pt-6 lg:px-8 lg:pt-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,0.1),transparent_18%)]" />

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/60 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="grid gap-8 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-10">
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-cyan-300">
                Painel inicial
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Bem-vindo, {user.nome}!
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                Selecione uma opção no menu lateral para começar. Esta é a base de retorno da plataforma para campanhas, dashboards, WhatsApp e operação de campo.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-200">Estado</p>
                  <p className="mt-2 text-lg font-black text-white">Operacao pronta</p>
                </div>
                <div className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-200">Acesso</p>
                  <p className="mt-2 text-lg font-black text-white">{user.papel}</p>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-200">Canal</p>
                  <p className="mt-2 text-lg font-black text-white">Neuro Track</p>
                </div>
              </div>
            </div>

            <div className="flex items-start justify-center lg:justify-end">
              <div className="relative flex w-full max-w-md items-center justify-center rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-6 sm:p-7">
                <div className="pointer-events-none absolute inset-0 rounded-[1.8rem] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_55%)]" />
                <div className="pointer-events-none absolute inset-4 rounded-full border border-cyan-400/15 [animation:spin_18s_linear_infinite]" />
                <div className="pointer-events-none absolute inset-8 rounded-full border border-violet-400/20 border-dashed [animation:spin_26s_linear_infinite_reverse]" />
                <div className="pointer-events-none absolute inset-14 rounded-full border border-emerald-400/20 [animation:pulse_4s_ease-in-out_infinite]" />

                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="flex size-24 items-center justify-center rounded-full border border-cyan-300/35 bg-slate-950/80 text-cyan-300 shadow-[0_0_35px_rgba(34,211,238,0.2)]">
                    <span className="flex size-14 items-center justify-center rounded-[1.4rem] border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
                      <Brain className="size-7" />
                    </span>
                  </div>

                  <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">
                    Neuro Track Signature Orbit
                  </p>
                  <p className="mt-3 max-w-xs text-sm leading-7 text-slate-300">
                    Inteligencia populacional, leitura territorial e decisao estrategica conectadas no mesmo centro de comando.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Perfil logado</p>
          <p className="mt-3 text-lg font-bold text-white">{user.nome}</p>
          <p className="text-sm text-slate-400">{user.email}</p>

          <div className="mt-3 inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
            {user.papel}
          </div>

          {canEditProfile ? (
            <button
              type="button"
              onClick={onEditProfile}
              className="mt-4 inline-flex h-10 items-center rounded-xl border border-cyan-400/35 bg-cyan-400/10 px-4 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
            >
              Editar usuario
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ContentPlaceholder({ view, message }: { view: string; message?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <div className="flex h-40 w-full max-w-2xl items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5">
        <p className="text-sm text-slate-400">
          {message ?? "Funcionalidade em construção:"}{" "}
          <span className="font-semibold text-cyan-300">{view}</span>
        </p>
      </div>
    </div>
  );
}
