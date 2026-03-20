import { NextResponse } from "next/server";

import { obterParticipantesOpiniaoDashboardFromExternalApi } from "@/service/dashboard.service";
import { dashboardApiErrorResponse, mapSearchParams, requireDashboardSession } from "@/app/api/dashboard/_utils";

export async function GET(request: Request, context: { params: Promise<{ pesquisaId: string }> }) {
  const { token, response } = await requireDashboardSession();
  if (response || !token) {
    return response as NextResponse;
  }

  const { pesquisaId } = await context.params;

  try {
    const result = await obterParticipantesOpiniaoDashboardFromExternalApi(token, pesquisaId, mapSearchParams(request));
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return dashboardApiErrorResponse(error, "Falha ao carregar participantes do dashboard de opiniao.");
  }
}
