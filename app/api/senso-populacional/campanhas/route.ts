import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import {
  criarCampanhaSensoFromExternalApi,
  listarCampanhasSensoFromExternalApi,
} from "@/service/sensoPopulacional.service";

type Body = {
  nome: string;
  descricao?: string;
  questionarioId: string;
};

function normalizeBody(body: unknown): Body | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const input = body as Record<string, unknown>;

  if (typeof input.nome !== "string" || typeof input.questionarioId !== "string") {
    return null;
  }

  const nome = input.nome.trim();
  const descricao = typeof input.descricao === "string" ? input.descricao.trim() : undefined;
  const questionarioId = input.questionarioId.trim();

  if (!nome || !questionarioId) {
    return null;
  }

  return { nome, descricao, questionarioId };
}

export async function GET() {
  const session = await getSession();

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  try {
    const result = await listarCampanhasSensoFromExternalApi(session.token);
    return NextResponse.json(result, { status: 200 });
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

    return NextResponse.json({ message: "Falha ao listar campanhas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const payload = normalizeBody(json);

  if (!payload) {
    return NextResponse.json({ message: "Payload invalido para criar campanha." }, { status: 400 });
  }

  try {
    const result = await criarCampanhaSensoFromExternalApi(session.token, payload);
    return NextResponse.json(result, { status: 201 });
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

    return NextResponse.json({ message: "Falha ao criar campanha." }, { status: 500 });
  }
}
