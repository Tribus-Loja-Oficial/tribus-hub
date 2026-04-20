import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">T</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tribus Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plataforma interna</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
