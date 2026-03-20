import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import {
  cadastrarUsuarioOnExternalApi,
  listarUsuariosFromExternalApi,
  type CreateUsuarioPayload,
} from "@/service/usuarios.service";

function normalizeUsuarioBody(body: unknown): CreateUsuarioPayload | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const raw = body as Record<string, unknown>;

  if (
    typeof raw.nome !== "string" ||
    typeof raw.email !== "string" ||
    typeof raw.senha !== "string" ||
    typeof raw.papel !== "string" ||
    typeof raw.ativo !== "boolean"
  ) {
    return null;
  }

  const nome = raw.nome.trim();
  const email = raw.email.trim();
  const senha = raw.senha.trim();

  if (!nome || !email || !senha) {
    return null;
  }

  return {
    nome,
    email,
    senha,
    papel: raw.papel,
    ativo: raw.ativo,
  };
}

export async function GET() {
  const session = await getSession();

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  try {
    const usuarios = await listarUsuariosFromExternalApi(session.token);
    return NextResponse.json(usuarios, { status: 200 });
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
      { message: "Falha ao listar usuarios na API externa." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const payload = normalizeUsuarioBody(body);

  if (!payload) {
    return NextResponse.json(
      {
        message:
          "Payload invalido. Envie nome, email, senha, papel e ativo no formato esperado.",
      },
      { status: 400 },
    );
  }

  try {
    const usuario = await cadastrarUsuarioOnExternalApi(session.token, payload);
    return NextResponse.json(usuario, { status: 201 });
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
      { message: "Falha ao cadastrar usuario na API externa." },
      { status: 500 },
    );
  }
}
