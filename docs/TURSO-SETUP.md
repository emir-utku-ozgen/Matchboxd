# Turso (İrlanda) Veritabanı Kurulumu

## 1. `lib/db.ts` Turso’ya bağlanıyor mu?

**Evet.** `npm run dev` çalıştığında uygulama **.env** içindeki değişkenleri kullanır:

- **DATABASE_URL** → Turso URL’in (`libsql://<db>-<org>.turso.io`)
- **TURSO_AUTH_TOKEN** → Turso auth token

Bu ikisi Turso’ya ait olduğu sürece, çalışan uygulama (Next.js) **Turso’ya** bağlanır; yerel `dev.db` kullanılmaz.

---

## 2. Turso boşken siteye girersem ne olur?

Turso’da tablolar yoksa, ilk Prisma sorgusu (ör. ana sayfada analizler çekilirken) **hata verir**: “table X does not exist” benzeri bir mesaj görürsün. Bu yüzden önce Turso’da tabloları oluşturman gerekir.

---

## 3. Turso’da tabloları nasıl oluştururum?

Prisma’nın `db push` komutu bazı ortamlarda Turso (libsql HTTP) ile doğrudan çalışmayabilir. Bu yüzden şemayı **SQL dosyası** ile uyguluyoruz.

### Adım A: SQL dosyasını oluştur (şema değişince)

```bash
npm run db:turso-sql
```

Bu komut `prisma/turso-schema.sql` dosyasını (User, Match, Review, Collection tabloları) günceller.

### Adım B: SQL’i Turso’da çalıştır

Turso CLI kurulu ve giriş yapılmış olmalı (`turso auth login`). Veritabanı adı, Turso URL’indeki isimdir (örn. `libsql://matchboxd-emir.turso.io` → veritabanı adı: **matchboxd**).

```bash
turso db shell <VERITABANI_ADI> < prisma/turso-schema.sql
```

Örnek:

```bash
turso db shell matchboxd < prisma/turso-schema.sql
```

Böylece Turso (İrlanda) veritabanında tablolar oluşur.

### (İsteğe bağlı) Doğrudan `db push` dene

.env’de **DATABASE_URL** ve **TURSO_AUTH_TOKEN** Turso’ya ayarlıyken:

```bash
npx prisma db push
```

Eğer bu komut Turso’ya bağlanıp şemayı uyguluyorsa, yukarıdaki SQL adımını atlayıp sadece bunu kullanabilirsin. Hata alırsan yöntem olarak SQL ile uygulama (Adım A + B) kullan.

---

## Özet

| Ne yapıyorsun?        | Hangi bağlantı? |
|----------------------|------------------|
| `npm run dev`        | .env’deki `DATABASE_URL` + `TURSO_AUTH_TOKEN` → Turso |
| `npx prisma db push` | .env’deki `DATABASE_URL` (yerel file: ise dev.db, Turso URL ise Turso) |
| Turso’da tablo yok   | Önce `npm run db:turso-sql` sonra `turso db shell <db> < prisma/turso-schema.sql` |

Tablolar Turso’da oluştuktan sonra `npm run dev` ile siteyi açtığında hata vermeden Turso’yu kullanır.
