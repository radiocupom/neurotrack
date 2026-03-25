import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export default async function ResponderPesquisaPrivadoPage() {
  const session = await getSession();

  if (!session?.token) {
    redirect("/?login=1&redirect=/areashow?view=opiniao-aplicar");
  }

  redirect("/areashow?view=opiniao-aplicar");
}
