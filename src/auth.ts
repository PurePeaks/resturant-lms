import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/validation";
import { burnPasswordCheck, verifyPassword } from "@/lib/passwords";
import { clearRateLimit, loginLockKey, rateLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/request";
import { safeRedirect } from "@/lib/redirect";

class AccountLockedError extends CredentialsSignin {
  code = "locked";
}

class TooManyAttemptsError extends CredentialsSignin {
  code = "rate_limited";
}

const MAX_FAILED_LOGINS_PER_EMAIL = 5;
const MAX_LOGINS_PER_IP = 30;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = typeof credentials?.email === "string" ? normalizeEmail(credentials.email) : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password || password.length > 200) return null;

        const ipLimit = await rateLimit(`login:ip:${clientIp(request.headers)}`, MAX_LOGINS_PER_IP, LOGIN_WINDOW_SECONDS);
        if (!ipLimit.allowed) throw new TooManyAttemptsError();

        // Lockout is tracked per email whether or not the account exists, so
        // locking out can't be used to discover which emails have accounts.
        const lockKey = loginLockKey(email);
        const lock = await prisma.rateLimit.findUnique({ where: { key: lockKey } });
        if (lock && lock.resetAt > new Date() && lock.count >= MAX_FAILED_LOGINS_PER_EMAIL) {
          await burnPasswordCheck(password);
          throw new AccountLockedError();
        }

        const include = { tenant: { select: { name: true, archivedAt: true } } } as const;
        // Emails are stored lowercase; the insensitive fallback covers legacy rows.
        const user =
          (await prisma.user.findUnique({ where: { email }, include })) ??
          (await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, include }));

        const canSignIn =
          !!user &&
          !user.deactivatedAt &&
          !user.anonymizedAt &&
          (user.role === "SUPER_ADMIN" || (!!user.tenantId && !user.tenant?.archivedAt));

        const valid = canSignIn ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false);

        if (!valid || !user) {
          const failures = await rateLimit(lockKey, MAX_FAILED_LOGINS_PER_EMAIL, LOGIN_WINDOW_SECONDS);
          if (failures.remaining === 0) throw new AccountLockedError();
          return null;
        }

        await clearRateLimit(lockKey);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId ?? null,
          tenantName: user.tenant?.name ?? null,
          sessionVersion: user.sessionVersion,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.sessionVersion = user.sessionVersion;
        token.mustChangePassword = user.mustChangePassword;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      session.user.tenantId = (token.tenantId as string) ?? null;
      session.user.tenantName = (token.tenantName as string) ?? null;
      session.user.sessionVersion = (token.sessionVersion as number | undefined) ?? 0;
      session.user.mustChangePassword = (token.mustChangePassword as boolean | undefined) ?? false;
      return session;
    },
    async redirect({ url, baseUrl }) {
      return safeRedirect(url, baseUrl);
    },
  },
});
