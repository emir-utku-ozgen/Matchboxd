import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-posta", type: "email" },
        password: { label: "Şifre", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email    = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);

        // ── 1a. .env'deki Admin kimlik bilgileriyle karşılaştır ────────────────
        // DB sorgusu atılmaz; role: "admin" döner.
        const adminEmail    = process.env.ADMIN_EMAIL?.trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (adminEmail && adminPassword && email === adminEmail && password === adminPassword) {
          return {
            id:    "env-admin",  // sabit ID — DB kaydı gerektirmez
            name:  "Admin",
            email: adminEmail,
            image: undefined,
            role:  "admin",
          };
        }

        // ── 1b. .env'deki Editor kimlik bilgileriyle karşılaştır ───────────────
        // DB sorgusu atılmaz; role: "editor" döner.
        // .env dosyasına EDITOR_EMAIL ve EDITOR_PASSWORD ekleyin.
        const editorEmail    = process.env.EDITOR_EMAIL?.trim().toLowerCase();
        const editorPassword = process.env.EDITOR_PASSWORD;

        if (editorEmail && editorPassword && email === editorEmail && password === editorPassword) {
          return {
            id:    "env-editor", // sabit ID — DB kaydı gerektirmez
            name:  "Editor",
            email: editorEmail,
            image: undefined,
            role:  "editor",
          };
        }

        // ── 2. Normal kullanıcı: veritabanında ara ────────────────────────────
        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            passwordHash: true,
            avatarUrl: true,
            role: true,
          },
        });

        if (!user?.passwordHash) return null;
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id:    user.id,
          name:  user.name,
          email: user.email,
          image: user.avatarUrl ?? undefined,
          role:  user.role,   // "user" | "editor" | "admin"
        };
      },
    }),
  ],

  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },

  callbacks: {
    /**
     * jwt callback — her token doğrulamasında çalışır.
     * `user` yalnızca ilk oturum açışta mevcuttur.
     *
     * Güvenlik notu: Rol, token'a ilk girişte yazılır.
     * DB'de rolü değiştirirseniz kullanıcının yeniden oturum açması gerekir.
     * Anlık geçerlilik istiyorsanız aşağıdaki yorum bloğunu aktif edin.
     */
    async jwt({ token, user }) {
      if (user) {
        // İlk giriş: authorize()'dan gelen user nesnesi mevcut
        token.id   = user.id;
        token.email = user.email;
        token.role  = (user as { role: string }).role;
      }

      /*
       * İsteğe bağlı: Her token yenilemesinde rolü DB'den tazele.
       * Rol değişikliklerinin anında yansıması için yorum kaldırın.
       * Dezavantaj: Her request'te 1 ekstra DB sorgusu.
       *
       * } else if (token.id) {
       *   const dbUser = await prisma.user.findUnique({
       *     where: { id: token.id as string },
       *     select: { role: true },
       *   });
       *   if (dbUser) token.role = dbUser.role;
       * }
       */

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id    = token.id    as string;
        session.user.email = token.email as string;
        session.user.role  = token.role  as string; // session'a ekle
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
