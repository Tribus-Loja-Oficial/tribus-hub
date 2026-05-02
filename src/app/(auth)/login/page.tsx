import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/tribus-hub-icon.png"
              alt=""
              width={40}
              height={40}
              priority
              aria-hidden
              className="h-10 w-10 rounded-lg object-contain shadow-sm ring-1 ring-black/[0.06] dark:ring-white/10"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tribus Hub</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plataforma Estratégica</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
