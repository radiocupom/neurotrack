import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { normalizeParticipanteResponse } from "@/lib/participantes/normalize";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import {
  buscarParticipantePorContatoFromExternalApi,
  listarParticipantesFromExternalApi,
} from "@/service/participantes.service";

function normalizeContact(value: string) {
  return value.replace(/\D/g, "");
}

function readAllParticipants(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload
      .map(normalizeParticipanteResponse)
      .filter((item): item is NonNullable<ReturnType<typeof normalizeParticipanteResponse>> => item != null);
  }

  if (payload && typeof payload === "object") {
    const root = payload as { data?: unknown; items?: unknown };

    if (Array.isArray(root.data)) {
      return root.data
        .map(normalizeParticipanteResponse)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeParticipanteResponse>> => item != null);
    }

    if (Array.isArray(root.items)) {
      return root.items
        .map(normalizeParticipanteResponse)
        .filter((item): item is NonNullable<ReturnType<typeof normalizeParticipanteResponse>> => item != null);
    }
  }

  return [];
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const contato = searchParams.get("contato")?.trim() ?? "";

  if (!contato) {
    return NextResponse.json({ message: "Contato invalido." }, { status: 400 });
  }

  const target = normalizeContact(contato);

  try {
    const payload = await buscarParticipantePorContatoFromExternalApi(session.token, contato);
    const list = readAllParticipants(payload);

    const participante =
      list.find((item) => normalizeContact(item.contatoOpcional ?? "") === target) ??
      list.find((item) => normalizeContact(item.telefone ?? "") === target) ??
      list[0] ??
      null;

    if (!participante) {
      return NextResponse.json(
        {
          found: false,
          participante: null,
          message: "Participante nao encontrado para o contato informado.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ found: true, participante }, { status: 200 });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      if (error.status === 404) {
        try {
          const allParticipants = await listarParticipantesFromExternalApi(session.token);
          const list = readAllParticipants(allParticipants);
          const participante =
            list.find((item) => normalizeContact(item.contatoOpcional ?? "") === target) ??
            list.find((item) => normalizeContact(item.telefone ?? "") === target) ??
            null;

          if (participante) {
            return NextResponse.json({ found: true, participante }, { status: 200 });
          }
        } catch {
          // Mantem resposta padrao de participante nao encontrado quando fallback falhar.
        }

        return NextResponse.json(
          {
            found: false,
            participante: null,
            message: "Participante nao encontrado para o contato informado.",
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          message: readExternalApiErrorMessage(error),
          data: error.data,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { message: "Falha ao consultar participante por contato." },
      { status: 500 },
    );
  }
}