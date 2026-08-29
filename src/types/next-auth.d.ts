import { AdminRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: AdminRole;
    };
  }
  interface User {
    id: string;
    role: AdminRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: AdminRole;
  }
}
