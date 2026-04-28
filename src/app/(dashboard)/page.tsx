import { redirect } from "next/navigation";

/** A entrada do app passa pelo Observatório; a landing antiga com cards foi removida. */
export default function RootDashboardPage() {
  redirect("/observatory");
}
