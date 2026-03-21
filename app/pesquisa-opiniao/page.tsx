import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { ListaPesquisasClient } from "@/app/pesquisa-opiniao/lista-pesquisas-client";

export default async function PesquisaOpiniaoPage() {
  const session = await getSession();

  if (!session?.token) {
    redirect("/?login=1&redirect=/pesquisa-opiniao");
  }

  return <ListaPesquisasClient />;
}
