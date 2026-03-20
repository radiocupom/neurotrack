import { NextResponse } from "next/server";

import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { obterQuestionarioBaseSensoFromExternalApi } from "@/service/sensoPopulacional.service";

export async function GET() {
  try {
    const result = await obterQuestionarioBaseSensoFromExternalApi();
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

    return NextResponse.json({ message: "Falha ao carregar questionario base do senso." }, { status: 500 });
  }
}
