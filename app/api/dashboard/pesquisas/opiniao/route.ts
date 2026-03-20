import { NextResponse } from "next/server";

import { listarPesquisasOpiniaoDashboardFromExternalApi } from "@/service/dashboard.service";
import { dashboardApiErrorResponse, requireDashboardSession } from "@/app/api/dashboard/_utils";

export async function GET() {
  const { token, response } = await requireDashboardSession();
  if (response || !token) {
    return response as NextResponse;
  }

  try {
    const result = await listarPesquisasOpiniaoDashboardFromExternalApi(token);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return dashboardApiErrorResponse(error, "Falha ao carregar pesquisas de opiniao do dashboard.");
  }
}
