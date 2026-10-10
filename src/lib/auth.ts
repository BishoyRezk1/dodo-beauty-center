import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimitDb } from "@/lib/rate-limit";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h admin sessions
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Brute-force protection: max 5 login attempts per 15 minutes per IP.
        const forwardedFor = req?.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
          ?.split(",")[0]
          ?.trim() || "unknown";

        const { allowed } = await rateLimitDb(`admin-login:${ip}`, 5, 15 * 60 * 1000);
        if (!allowed) {
          throw new Error("محاولات دخول كتيرة جدًا، برجاء الانتظار شوية والمحاولة تاني.");
        }

        const admin = await prisma.adminUser.findUnique({
          where: { email: credentials.email.toLowerCase().trim() }
        });
        if (!admin) return null;

        const valid = await bcrypt.compare(credentials.password, admin.passwordHash);
        if (!valid) return null;

        return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role?: string }).role;
        token.id = (user as unknown as { id?: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { role?: unknown }).role = token.role;
        (session.user as unknown as { id?: unknown }).id = token.id;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
