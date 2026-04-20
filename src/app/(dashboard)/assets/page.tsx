import type { Metadata } from "next";
import { AssetsPage } from "@/features/assets/components/assets-page";

export const metadata: Metadata = { title: "Assets" };

export default function AssetsPageRoute() {
  return <AssetsPage />;
}
