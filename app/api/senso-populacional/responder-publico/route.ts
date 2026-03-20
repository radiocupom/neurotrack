import { NextResponse } from "next/server";

import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { responderSensoPublicoFromExternalApi, type ResponderSensoPublicoPayload } from "@/service/sensoPopulacional.service";

function normalizeBody(body: unknown): ResponderSensoPublicoPayload | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const input = body as Record<string, unknown>;

  if (
    typeof input.telefone !== "string" ||
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
      if (typeof raw.perguntaId !== "string" || typeof raw.opcaoId !== "string") return null;
      return { perguntaId: raw.perguntaId, opcaoId: raw.opcaoId };
    })
    .filter((item): item is { perguntaId: string; opcaoId: string } => item != null);

  if (!respostas.length) {
    return null;
  }

  return {
    telefone: input.telefone,
    questionarioId: input.questionarioId,
    campanhaId: input.campanhaId,
    estado: input.estado,
    cidade: input.cidade,
    bairro: input.bairro,
    respostas,
  };
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const payload = normalizeBody(json);

  if (!payload) {
    return NextResponse.json({ message: "Payload invalido para responder senso publico." }, { status: 400 });
  }

  try {
    const result = await responderSensoPublicoFromExternalApi(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json(
        { message: readExternalApiErrorMessage(error), data: error.data },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Falha ao responder senso publico." }, { status: 500 });
  }
}
