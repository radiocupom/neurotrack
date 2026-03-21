"use client";

import { useState } from "react";

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

const ADMIN_ROLES = new Set(["SUPERADMIN", "ADMIN"]);

export type AreaShellProps = {
  user: AuthUser;
};

export function AreaShell({ user }: AreaShellProps) {
  const [activeView, setActiveView] = useState("");
  const isUsuariosView = activeView.startsWith("usuarios-");
  const isSensoBigFiveView = activeView === "senso-aplicar" || activeView === "senso-criar-campanha";
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

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <Sidebar
        userRole={user.papel}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        {isUsuariosView ? (
          <UsuariosWorkflow
            loggedUser={user}
            activeView={activeView as "usuarios-listar" | "usuarios-cadastrar" | "usuarios-editar"}
            onViewChange={setActiveView}
          />
        ) : isSensoBigFiveView ? (
          <SensoBigFiveWorkflow
            loggedUser={user}
            mode={activeView === "senso-criar-campanha" ? "campanhas" : "aplicar"}
          />
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
        ) : activeView ? (
          <ContentPlaceholder view={activeView} />
        ) : (
          <WelcomeView
            user={user}
            onEditProfile={() => setActiveView("usuarios-editar")}
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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center">
      <div className="flex size-20 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-3xl font-black text-cyan-300">
        {user.nome[0]?.toUpperCase() ?? "?"}
      </div>
      <div>
        <h2 className="text-2xl font-black text-white">
          Bem-vindo, {user.nome}!
        </h2>
        <p className="mt-2 text-slate-400">
          Selecione uma opção no menu lateral para começar.
        </p>
      </div>
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
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
