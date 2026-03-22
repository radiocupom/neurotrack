"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AuthUser, UserRole } from "@/lib/auth/types";
import {
  atualizarUsuarioAction,
  criarUsuarioAction,
  listarUsuariosAction,
} from "@/app/usuariosdosistema/usuarios-actions";

type SistemaUser = {
  id: string;
  nome: string;
  email: string;
  papel: UserRole;
  ativo: boolean;
};

type UserFormInput = {
  nome: string;
  email: string;
  papel: UserRole;
  ativo: boolean;
  senha?: string;
};

export type UsuariosWorkflowProps = {
  loggedUser: AuthUser;
  activeView: "usuarios-listar" | "usuarios-cadastrar" | "usuarios-editar";
  onViewChange: (view: "usuarios-listar" | "usuarios-cadastrar" | "usuarios-editar") => void;
};

const ADMIN_ROLES: UserRole[] = ["SUPERADMIN", "ADMIN"];

function canManageUsers(role: UserRole): boolean {
  return (ADMIN_ROLES as string[]).includes(role as string);
}

function roleLabel(role: UserRole): string {
  if (role === "SUPERADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  if (role === "ENTREVISTADOR") return "Entrevistador";
  return role;
}

function readApiError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Erro inesperado ao comunicar com o servidor.";
  }

  return error.message;
}

function normalizeUser(raw: unknown): SistemaUser | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const item = raw as Record<string, unknown>;

  if (typeof item.id !== "string") {
    return null;
  }

  const nome = typeof item.nome === "string" ? item.nome : "Sem nome";
  const email = typeof item.email === "string" ? item.email : "sem-email";
  const papel = typeof item.papel === "string" ? item.papel : "ENTREVISTADOR";
  const ativo =
    typeof item.ativo === "boolean"
      ? item.ativo
      : typeof item.isAtivo === "boolean"
        ? item.isAtivo
        : true;

  return {
    id: item.id,
    nome,
    email,
    papel,
    ativo,
  };
}

async function fetchUsuarios() {
  const result = await listarUsuariosAction();

  if (!result.ok) {
    throw new Error(result.message || "Nao foi possivel listar usuarios.");
  }

  const data = result.data;

  if (!Array.isArray(data)) {
    return [] as SistemaUser[];
  }

  return data.map(normalizeUser).filter((item): item is SistemaUser => item != null);
}

async function createUsuario(payload: UserFormInput) {
  const senha = payload.senha?.trim();
  if (!senha) {
    throw new Error("Senha e obrigatoria para cadastrar usuario.");
  }

  const result = await criarUsuarioAction({
    nome: payload.nome,
    email: payload.email,
    papel: payload.papel,
    ativo: payload.ativo,
    senha,
  });

  if (!result.ok) {
    throw new Error(result.message || "Nao foi possivel cadastrar usuario.");
  }

  const user = normalizeUser(result.data);
  if (!user) {
    throw new Error("Resposta de cadastro invalida.");
  }

  return user;
}

async function updateUsuario(id: string, payload: UserFormInput) {
  const result = await atualizarUsuarioAction(id, payload);

  if (!result.ok) {
    throw new Error(result.message || "Nao foi possivel editar usuario.");
  }

  const user = normalizeUser(result.data);
  if (!user) {
    throw new Error("Resposta de edicao invalida.");
  }

  return user;
}

export function UsuariosWorkflow({ loggedUser, activeView, onViewChange }: UsuariosWorkflowProps) {
  const [users, setUsers] = useState<SistemaUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(loggedUser.id);
  const [feedback, setFeedback] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? users[0] ?? null,
    [selectedUserId, users],
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await fetchUsuarios();
      setUsers(data);

      if (data.length > 0) {
        setSelectedUserId((current) =>
          data.some((user) => user.id === current) ? current : data[0].id,
        );
      }
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  if (!canManageUsers(loggedUser.papel)) {
    return (
      <section className="m-6 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-6 text-rose-100 sm:m-8">
        <h2 className="text-xl font-black">Acesso negado</h2>
        <p className="mt-2 text-sm text-rose-100/85">
          Somente Super Admin e Admin podem acessar o modulo de usuarios do sistema.
        </p>
      </section>
    );
  }

  async function handleCreateUser(input: UserFormInput) {
    setError("");

    try {
      const nextUser = await createUsuario(input);
      setUsers((prev) => [nextUser, ...prev]);
      setSelectedUserId(nextUser.id);
      setFeedback("Usuario cadastrado com sucesso na API externa.");
      onViewChange("usuarios-listar");
    } catch (err) {
      setFeedback("");
      setError(readApiError(err));
    }
  }

  async function handleUpdateUser(input: UserFormInput) {
    if (!selectedUser) return;

    setError("");

    try {
      const updated = await updateUsuario(selectedUser.id, input);
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
      setFeedback("Usuario atualizado com sucesso na API externa.");
      onViewChange("usuarios-listar");
    } catch (err) {
      setFeedback("");
      setError(readApiError(err));
    }
  }

  return (
    <section className="flex flex-1 flex-col p-4 sm:p-6 lg:p-8">
      <div className="rounded-3xl border border-white/10 bg-slate-900/55 p-6 shadow-2xl shadow-slate-950/40">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">AreaShow</p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Usuarios do Sistema</h2>
            <p className="mt-2 text-sm text-slate-400">
              Workflow conectado com a API externa para listar, cadastrar e editar usuarios.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <QuickViewButton
              active={activeView === "usuarios-listar"}
              icon={<Users className="size-4" />}
              label="Listar"
              onClick={() => onViewChange("usuarios-listar")}
            />
            <QuickViewButton
              active={activeView === "usuarios-cadastrar"}
              icon={<Plus className="size-4" />}
              label="Cadastrar"
              onClick={() => onViewChange("usuarios-cadastrar")}
            />
            <QuickViewButton
              active={activeView === "usuarios-editar"}
              icon={<Pencil className="size-4" />}
              label="Editar"
              onClick={() => onViewChange("usuarios-editar")}
            />
          </div>
        </header>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => void loadUsers()}
            className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-slate-100 hover:bg-white/10"
          >
            Atualizar lista
          </Button>
          {loading ? <span className="text-xs text-slate-400">Carregando usuarios...</span> : null}
        </div>

        {feedback ? (
          <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {feedback}
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          {activeView === "usuarios-listar" ? (
            <ListarUsuarios
              users={users}
              loading={loading}
              onEdit={(id) => {
                setSelectedUserId(id);
                onViewChange("usuarios-editar");
              }}
            />
          ) : null}

          {activeView === "usuarios-cadastrar" ? (
            <div className="max-w-3xl">
              <h3 className="mb-4 text-lg font-bold text-white">Cadastrar novo usuario</h3>
              <UsuarioForm
                mode="create"
                onSubmit={handleCreateUser}
                submitLabel="Cadastrar usuario"
              />
            </div>
          ) : null}

          {activeView === "usuarios-editar" ? (
            <div className="max-w-3xl space-y-4">
              <h3 className="text-lg font-bold text-white">Editar usuario</h3>

              <label className="block text-sm text-slate-300">
                <span className="mb-1 block">Usuario selecionado</span>
                <select
                  value={selectedUser?.id ?? ""}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 outline-none ring-cyan-400/35 transition focus:ring-2"
                >
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.nome} - {roleLabel(user.papel)}
                    </option>
                  ))}
                </select>
              </label>

              {selectedUser ? (
                <UsuarioForm
                  key={selectedUser.id}
                  mode="edit"
                  initialValue={selectedUser}
                  onSubmit={handleUpdateUser}
                  submitLabel="Salvar alteracoes"
                />
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                  Nenhum usuario disponivel para editar.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function QuickViewButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
        active
          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
          : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/30 hover:text-cyan-200",
      ].join(" ")}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ListarUsuarios({
  users,
  loading,
  onEdit,
}: {
  users: SistemaUser[];
  loading: boolean;
  onEdit: (id: string) => void;
}) {
  if (!loading && users.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
        Nenhum usuario retornado pela API.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-white/5 text-slate-300">
          <tr>
            <th className="px-4 py-3 font-semibold">Nome</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Papel</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-white/10 text-slate-200">
              <td className="px-4 py-3">{user.nome}</td>
              <td className="px-4 py-3 text-slate-400">{user.email}</td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-200">
                  {roleLabel(user.papel)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={[
                    "inline-flex rounded-full px-2 py-1 text-xs font-semibold",
                    user.ativo
                      ? "border border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                      : "border border-amber-300/20 bg-amber-400/10 text-amber-200",
                  ].join(" ")}
                >
                  {user.ativo ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td className="px-4 py-3">
                <Button
                  type="button"
                  onClick={() => onEdit(user.id)}
                  className="h-9 rounded-lg bg-cyan-500 px-3 text-slate-950 hover:bg-cyan-400"
                >
                  <Pencil className="size-4" />
                  Editar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsuarioForm({
  mode,
  initialValue,
  onSubmit,
  submitLabel,
}: {
  mode: "create" | "edit";
  initialValue?: SistemaUser;
  onSubmit: (input: UserFormInput) => Promise<void> | void;
  submitLabel: string;
}) {
  const [nome, setNome] = useState(initialValue?.nome ?? "");
  const [email, setEmail] = useState(initialValue?.email ?? "");
  const [papel, setPapel] = useState<UserRole>(initialValue?.papel ?? "ENTREVISTADOR");
  const [ativo, setAtivo] = useState(initialValue?.ativo ?? true);
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!nome.trim() || !email.trim()) {
      setError("Nome e email sao obrigatorios.");
      return;
    }

    if (mode === "create" && !senha.trim()) {
      setError("Senha e obrigatoria para criar usuario.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await onSubmit({
        nome: nome.trim(),
        email: email.trim(),
        papel,
        ativo,
        senha: senha.trim() || undefined,
      });

      if (mode === "create") {
        setNome("");
        setEmail("");
        setPapel("ENTREVISTADOR");
        setAtivo(true);
        setSenha("");
      }
    } catch (err) {
      setError(readApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
      <label className="block text-sm text-slate-300">
        <span className="mb-1 block">Nome</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome completo"
          className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 outline-none ring-cyan-400/35 transition focus:ring-2"
        />
      </label>

      <label className="block text-sm text-slate-300">
        <span className="mb-1 block">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@dominio.com"
          className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 outline-none ring-cyan-400/35 transition focus:ring-2"
        />
      </label>

      <label className="block text-sm text-slate-300">
        <span className="mb-1 block">
          Senha {mode === "edit" ? "(opcional para redefinir)" : ""}
        </span>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder={mode === "edit" ? "Digite apenas se quiser alterar" : "Senha inicial"}
          className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 outline-none ring-cyan-400/35 transition focus:ring-2"
        />
      </label>

      <label className="block text-sm text-slate-300">
        <span className="mb-1 block">Papel</span>
        <select
          value={papel}
          onChange={(e) => setPapel(e.target.value as UserRole)}
          className="h-11 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 outline-none ring-cyan-400/35 transition focus:ring-2"
        >
          <option value="SUPERADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="ENTREVISTADOR">Entrevistador</option>
        </select>
      </label>

      <label className="inline-flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          className="size-4 rounded border-white/20"
        />
        Usuario ativo
      </label>

      {error ? (
        <p className="rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={submitting}
          className="h-10 rounded-xl bg-linear-to-r from-cyan-400 to-sky-500 px-4 font-semibold text-slate-950 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {mode === "edit" ? <ShieldCheck className="size-4" /> : <Plus className="size-4" />}
          {submitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
