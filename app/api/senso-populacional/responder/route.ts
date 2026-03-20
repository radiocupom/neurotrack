import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { responderSensoFromExternalApi, type ResponderSensoPayload } from "@/service/sensoPopulacional.service";

function normalizeBody(body: unknown): ResponderSensoPayload | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const input = body as Record<string, unknown>;

  if (
    typeof input.participanteId !== "string" ||
    typeof input.questionarioId !== "string" ||
    typeof input.campanhaId !== "string" ||
    typeof input.estado !== "string" ||
    typeof input.cidade !== "string" ||
    typeof input.bairro !== "string" ||
    !Array.isArray(input.respostas)
  ) {
    return null;
  }

  const respostas = input.respostas
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const raw = item as Record<string, unknown>;
      if (typeof raw.perguntaId !== "string" || typeof raw.opcaoId !== "string") {
        return null;
      }
      return {
        perguntaId: raw.perguntaId,
        opcaoId: raw.opcaoId,
      };
    })
    .filter((item): item is { perguntaId: string; opcaoId: string } => item != null);

  if (!respostas.length) {
    return null;
  }

  return {
    participanteId: input.participanteId,
    questionarioId: input.questionarioId,
    campanhaId: input.campanhaId,
    estado: input.estado,
    cidade: input.cidade,
    bairro: input.bairro,
    respostas,
  };
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const payload = normalizeBody(json);

  if (!payload) {
    return NextResponse.json(
      { message: "Payload invalido para responder senso populacional." },
      { status: 400 },
    );
  }

  try {
    const result = await responderSensoFromExternalApi(session.token, payload);
    return NextResponse.json(result.data, { status: result.status });
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
      { message: "Falha ao enviar respostas do senso populacional." },
      { status: 500 },
    );
  }
}
