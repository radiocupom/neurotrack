import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { listarQuestionariosSensoFromExternalApi } from "@/service/sensoPopulacional.service";

export async function GET() {
  const session = await getSession();

  if (!session?.token) {
    return NextResponse.json({ message: "Sessao nao autenticada." }, { status: 401 });
  }

  try {
    const result = await listarQuestionariosSensoFromExternalApi(session.token);
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

    return NextResponse.json({ message: "Falha ao listar questionarios." }, { status: 500 });
  }
}
