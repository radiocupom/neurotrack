import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { obterResultadoBigFiveFromExternalApi } from "@/service/bigfive.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ participanteId: string }> },
) {
  const session = await getSession();
  const params = await context.params;
  const participanteId = params.participanteId?.trim();

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  if (!participanteId) {
    return NextResponse.json({ message: "participanteId invalido." }, { status: 400 });
  }

  try {
    const result = await obterResultadoBigFiveFromExternalApi(session.token, participanteId);
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

    return NextResponse.json({ message: "Falha ao consultar resultado BigFive." }, { status: 500 });
  }
}