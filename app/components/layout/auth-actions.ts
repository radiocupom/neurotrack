"use server";

import { clearSession, createSession } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/types";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { loginWithExternalApi } from "@/service/serviceAuth";

function normalizeUser(payload: unknown): AuthUser | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    id?: unknown;
    nome?: unknown;
    email?: unknown;
    papel?: unknown;
  };

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.nome !== "string" ||
    typeof candidate.email !== "string" ||
    typeof candidate.papel !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    nome: candidate.nome,
    email: candidate.email,
    papel: candidate.papel,
  };
}

export async function loginAction(input: { email: string; senha: string }) {
  const email = input.email?.trim() ?? "";
  const senha = input.senha ?? "";

  if (!email || !senha) {
    return {
      ok: false,
      status: 400,
      message: "Informe email e senha para continuar.",
      user: null as AuthUser | null,
    };
  }

  try {
    const payload = await loginWithExternalApi({ email, senha });
    const user = normalizeUser(payload.usuario);
    const token = payload.token;

    if (!user || typeof token !== "string") {
      return {
        ok: false,
        status: 502,
        message: "A API retornou um login incompleto.",
        user: null as AuthUser | null,
      };
    }

    await createSession({ user, token });

    return {
      ok: true,
      status: 200,
      message: payload.message ?? "Login realizado com sucesso.",
      user,
    };
  } catch (error) {
    if (error instanceof ExternalApiError) {
      return {
        ok: false,
        status: error.status,
        message: readExternalApiErrorMessage(error),
        user: null as AuthUser | null,
      };
    }

    return {
      ok: false,
      status: 503,
      message: "Nao foi possivel conectar ao backend de autenticacao.",
      user: null as AuthUser | null,
    };
  }
}

export async function logoutAction() {
  await clearSession();

  return { ok: true };
}