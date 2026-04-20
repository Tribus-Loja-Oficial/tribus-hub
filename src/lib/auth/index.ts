import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { hubApiFetch } from "@/lib/integrations/hub-api/client";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type AuthLookupUser = {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "owner" | "admin" | "member";
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await hubApiFetch<AuthLookupUser | null>({
          method: "POST",
          path: "/v1/internal/auth/user-by-email",
          body: { email },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token["id"] = user.id;
        token["role"] = (user as { role: string }).role;
        token["workspaceId"] = (user as { workspaceId: string }).workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token["id"] as string;
        (session.user as { role: string }).role = token["role"] as string;
        (session.user as { workspaceId: string }).workspaceId =
          token["workspaceId"] as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
