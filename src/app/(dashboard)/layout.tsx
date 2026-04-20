import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { MainContent } from "@/components/layout/main-content";
import { NavigationStateProvider } from "@/components/layout/navigation-context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <NavigationProgress />
      <NavigationStateProvider>
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-auto p-6">
            <MainContent>{children}</MainContent>
          </main>
        </div>
      </NavigationStateProvider>
    </div>
  );
}
