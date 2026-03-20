import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { editarUsuarioOnExternalApi, type UpdateUsuarioPayload } from "@/service/usuarios.service";

function normalizeUsuarioBody(body: unknown): UpdateUsuarioPayload | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const raw = body as Record<string, unknown>;

  if (
    typeof raw.nome !== "string" ||
    typeof raw.email !== "string" ||
    typeof raw.papel !== "string" ||
    typeof raw.ativo !== "boolean"
  ) {
    return null;
  }

  const nome = raw.nome.trim();
  const email = raw.email.trim();

  if (!nome || !email) {
    return null;
  }

  const payload: UpdateUsuarioPayload = {
    nome,
    email,
    papel: raw.papel,
    ativo: raw.ativo,
  };

  if (typeof raw.senha === "string" && raw.senha.trim()) {
    payload.senha = raw.senha.trim();
  }

  return payload;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  const params = await context.params;
  const userId = params.id;

  if (!userId) {
    return NextResponse.json({ message: "ID de usuario invalido." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const payload = normalizeUsuarioBody(body);

  if (!payload) {
    return NextResponse.json(
      {
        message:
          "Payload invalido. Envie nome, email, papel e ativo. Senha e opcional para redefinicao.",
      },
      { status: 400 },
    );
  }

  try {
    const usuario = await editarUsuarioOnExternalApi(session.token, userId, payload);
    return NextResponse.json(usuario, { status: 200 });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json(
        {
          message: readExternalApiErrorMessage(error),
          data: error.data,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Falha ao editar usuario na API externa." },
      { status: 500 },
    );
  }
}
