import { NextResponse } from "next/server";

import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { avaliarBigFivePublicoFromExternalApi, type AvaliarBigFivePublicoPayload } from "@/service/bigfive.service";

const scoreFields = [
  "abertura1",
  "abertura2",
  "abertura3",
  "consc1",
  "consc2",
  "consc3",
  "extro1",
  "extro2",
  "extro3",
  "amavel1",
  "amavel2",
  "amavel3",
  "neuro1",
  "neuro2",
  "neuro3",
] as const;

function normalizeBody(body: unknown): AvaliarBigFivePublicoPayload | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  if (typeof input.telefone !== "string" || typeof input.campanhaId !== "string") return null;

  const payload: Record<string, unknown> = {
    telefone: input.telefone,
    campanhaId: input.campanhaId,
  };

  for (const field of scoreFields) {
    if (typeof input[field] !== "number") return null;
    payload[field] = input[field];
  }

  return payload as AvaliarBigFivePublicoPayload;
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const payload = normalizeBody(json);

  if (!payload) {
    return NextResponse.json({ message: "Payload invalido para avaliar BigFive publico." }, { status: 400 });
  }

  try {
    const result = await avaliarBigFivePublicoFromExternalApi(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json(
        { message: readExternalApiErrorMessage(error), data: error.data },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Falha ao avaliar BigFive publico." }, { status: 500 });
  }
}
