import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { avaliarBigFiveFromExternalApi, type AvaliarBigFivePayload } from "@/service/bigfive.service";

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

function normalizeBody(body: unknown): AvaliarBigFivePayload | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const input = body as Record<string, unknown>;

  if (typeof input.participanteId !== "string" || typeof input.campanhaId !== "string") {
    return null;
  }

  const payload: Record<string, unknown> = {
    participanteId: input.participanteId,
    campanhaId: input.campanhaId,
  };

  for (const field of scoreFields) {
    const value = input[field];
    if (typeof value !== "number") {
      return null;
    }
    payload[field] = value;
  }

  return payload as AvaliarBigFivePayload;
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
      { message: "Payload invalido para avaliacao BigFive." },
      { status: 400 },
    );
  }

  try {
    const result = await avaliarBigFiveFromExternalApi(session.token, payload);
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

    return NextResponse.json({ message: "Falha ao avaliar BigFive." }, { status: 500 });
  }
}
