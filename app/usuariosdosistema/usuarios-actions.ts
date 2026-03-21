"use server";

import { getSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/types";
import {
  cadastrarUsuarioOnExternalApi,
  editarUsuarioOnExternalApi,
  listarUsuariosFromExternalApi,
  type CreateUsuarioPayload,
  type ExternalUsuario,
  type UpdateUsuarioPayload,
} from "@/service/usuarios.service";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";

const ADMIN_ROLES: UserRole[] = ["SUPERADMIN", "ADMIN"];

type ActionResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
};

function isAdminRole(role: UserRole) {
  return ADMIN_ROLES.includes(role);
}

async function requireAdminToken() {
  const session = await getSession();
  if (!session?.token || !session.user?.papel) {
    return { ok: false as const, status: 401, message: "Sessao nao autenticada." };
  }

  if (!isAdminRole(session.user.papel)) {
    return { ok: false as const, status: 403, message: "Perfil sem permissao para esta operacao." };
  }

  return { ok: true as const, token: session.token };
}

function mapError<T>(error: unknown, fallback: string): ActionResult<T> {
  if (error instanceof ExternalApiError) {
    return {
      ok: false,
      status: error.status,
      data: null,
      message: readExternalApiErrorMessage(error),
    };
  }

  return {
    ok: false,
    status: 500,
    data: null,
    message: fallback,
  };
}

export async function listarUsuariosAction(): Promise<ActionResult<ExternalUsuario[]>> {
  const auth = await requireAdminToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await listarUsuariosFromExternalApi(auth.token);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel listar usuarios.");
  }
}

export async function criarUsuarioAction(payload: CreateUsuarioPayload): Promise<ActionResult<ExternalUsuario>> {
  const auth = await requireAdminToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await cadastrarUsuarioOnExternalApi(auth.token, payload);
    return { ok: true, status: 201, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel cadastrar usuario.");
  }
}

export async function atualizarUsuarioAction(
  id: string,
  payload: UpdateUsuarioPayload,
): Promise<ActionResult<ExternalUsuario>> {
  const auth = await requireAdminToken();
  if (!auth.ok) return { ok: false, status: auth.status, data: null, message: auth.message };

  try {
    const data = await editarUsuarioOnExternalApi(auth.token, id, payload);
    return { ok: true, status: 200, data, message: "ok" };
  } catch (error) {
    return mapError(error, "Nao foi possivel editar usuario.");
  }
}