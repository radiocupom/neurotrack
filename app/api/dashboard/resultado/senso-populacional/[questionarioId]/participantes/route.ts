import { NextResponse } from "next/server";

import { obterParticipantesSensoDashboardFromExternalApi } from "@/service/dashboard.service";
import { dashboardApiErrorResponse, mapSearchParams, requireDashboardSession } from "@/app/api/dashboard/_utils";

export async function GET(request: Request, context: { params: Promise<{ questionarioId: string }> }) {
  const { token, response } = await requireDashboardSession();
  if (response || !token) {
    return response as NextResponse;
  }

  const { questionarioId } = await context.params;

  try {
    const result = await obterParticipantesSensoDashboardFromExternalApi(token, questionarioId, mapSearchParams(request));
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return dashboardApiErrorResponse(error, "Falha ao carregar participantes do dashboard de senso.");
  }
}
