import { redirect } from "next/navigation";

import { ListaPesquisasIntencaoVotoClient } from "@/app/intencao-voto/lista-pesquisas-client";
import { getSession } from "@/lib/auth/session";

export default async function IntencaoVotoPage() {
  const session = await getSession();

  if (!session?.token) {
    redirect("/?login=1&redirect=/intencao-voto");
  }

  return <ListaPesquisasIntencaoVotoClient />;
}
