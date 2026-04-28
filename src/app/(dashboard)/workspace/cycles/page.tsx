import { redirect } from "next/navigation";

/** URL antiga: ciclos gerais passaram para /observatory/cycles */
export default function WorkspaceCyclesRedirectPage() {
  redirect("/observatory/cycles");
}
