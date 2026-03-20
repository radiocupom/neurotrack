import { NextResponse } from "next/server";

import { ExternalApiError, readExternalApiErrorMessage } from "@/service/api";
import { precheckJornadaPublicaSensoFromExternalApi } from "@/service/sensoPopulacional.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campanhaId = searchParams.get("campanhaId")?.trim();
  const telefone = searchParams.get("telefone")?.trim();
  const participanteId = searchParams.get("participanteId")?.trim();

  if (!campanhaId || (!telefone && !participanteId)) {
    return NextResponse.json(
      { message: "campanhaId e pelo menos um entre telefone ou participanteId sao obrigatorios no precheck." },
      { status: 400 },
    );
  }

  try {
    const result = await precheckJornadaPublicaSensoFromExternalApi({
      campanhaId,
      telefone,
      participanteId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ExternalApiError) {
      return NextResponse.json(
        { message: readExternalApiErrorMessage(error), data: error.data },
        { status: error.status },
      );
    }

    return NextResponse.json({ message: "Falha ao executar precheck da jornada." }, { status: 500 });
  }
}
