import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/types";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPERADMIN"];

export async function requirePesquisaSession() {
  const session = await getSession();

  if (!session?.token) {
    return {
      token: null,
      session: null,
      response: NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 }),
    };
  }

  return {
    token: session.token,
    session,
    response: null,
  };
}

export async function requirePesquisaAdminSession() {
  const auth = await requirePesquisaSession();

  if (auth.response || !auth.session) {
    return auth;
  }

  if (!ADMIN_ROLES.includes(auth.session.user.papel)) {
    return {
      ...auth,
      response: NextResponse.json({ message: "Perfil sem permissao para esta operacao." }, { status: 403 }),
    };
  }

  return auth;
}

export function pesquisaApiErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ExternalApiError) {
    return NextResponse.json(
      {
        message: readExternalApiErrorMessage(error),
        data: error.data,
      },
      { status: error.status },
    );
  }

  return NextResponse.json({ message: fallbackMessage }, { status: 500 });
}
