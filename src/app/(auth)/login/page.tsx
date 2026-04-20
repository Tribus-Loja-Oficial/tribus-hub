import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary mb-4">
            <span className="text-primary-foreground font-bold text-sm">T</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tribus Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plataforma interna
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
