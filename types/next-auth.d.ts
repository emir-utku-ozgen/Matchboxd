import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  /** authorize() fonksiyonunun döndürdüğü kullanıcı nesnesi */
  interface User {
    role: string; // "user" | "editor" | "admin"
  }

  interface Session {
    user: {
      id: string;
      email: string | null;
      name: string | null;
      image: string | null;
      role: string; // JWT'den gelen rol
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string | null;
    role?: string; // token içinde taşınan rol
  }
}
