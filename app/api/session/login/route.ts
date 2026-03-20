import { NextResponse } from "next/server";

import { createSession } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/types";
import {
  ExternalApiError,
  readExternalApiErrorMessage,
} from "@/service/api";
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

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Envie um corpo JSON valido com email e senha." },
      { status: 400 },
    );
  }

  const email = typeof (body as { email?: unknown })?.email === "string"
    ? (body as { email: string }).email.trim()
    : "";
  const senha = typeof (body as { senha?: unknown })?.senha === "string"
    ? (body as { senha: string }).senha
    : "";

  if (!email || !senha) {
    return NextResponse.json(
      { message: "Informe email e senha para continuar." },
      { status: 400 },
    );
  }

  try {
    const payload = await loginWithExternalApi({ email, senha });
    const user = normalizeUser(payload.usuario);
    const token = payload.token;

    if (!user || typeof token !== "string") {
      return NextResponse.json(
        { message: "A API retornou um login incompleto." },
        { status: 502 },
      );
    }

    await createSession({ user, token });

    return NextResponse.json({
      message: payload.message ?? "Login realizado com sucesso.",
      user,
    });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json(
        { message: readExternalApiErrorMessage(error) },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Nao foi possivel conectar ao backend de autenticacao." },
      { status: 503 },
    );
  }
}
