import { NextResponse } from "next/server";

import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { identificarParticipanteFromExternalApi } from "@/service/participantes.service";

type Body = {
  nome: string;
  telefone: string;
  email?: string;
};

function normalizeBody(body: unknown): Body | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const input = body as Record<string, unknown>;

  if (typeof input.nome !== "string" || typeof input.telefone !== "string") {
    return null;
  }

  const nome = input.nome.trim();
  const telefone = input.telefone.trim();
  const email = typeof input.email === "string" ? input.email.trim() : undefined;

  if (!nome || !telefone) {
    return null;
  }

  return { nome, telefone, email };
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const payload = normalizeBody(json);

  if (!payload) {
    return NextResponse.json(
      { message: "Payload invalido para identificar participante." },
      { status: 400 },
    );
  }

  try {
    const result = await identificarParticipanteFromExternalApi(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json(
        { message: readExternalApiErrorMessage(error), data: error.data },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Falha ao identificar participante." }, { status: 500 });
  }
}
