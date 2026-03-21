import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { ResponderPesquisaPrivadoClient } from "@/app/pesquisa-opiniao/responder/responder-privado-client";

export default async function ResponderPesquisaPrivadoPage() {
  const session = await getSession();

  if (!session?.token) {
    redirect("/?login=1&redirect=/pesquisa-opiniao/responder");
  }

  return <ResponderPesquisaPrivadoClient />;
}
