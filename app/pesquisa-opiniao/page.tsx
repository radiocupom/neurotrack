import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export default async function PesquisaOpiniaoPage() {
  const session = await getSession();

  if (!session?.token) {
    redirect("/?login=1&redirect=/areashow?view=opiniao-listar");
  }

  redirect("/areashow?view=opiniao-listar");
}
