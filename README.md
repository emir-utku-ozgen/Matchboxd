# Matchboxd — Sosyal Futbol Maç Bilgi Sistemi
Proje dokümantasyonu geliştirme ortamı olarak macOS baz alınarak hazırlanmıştır; Windows kullanıcıları için Platform Uyumluluğu bölümünü inceleyiniz.

## Proje Hakkında

Matchboxd, futbol maçlarını listeleyip teknik analiz paylaşımına odaklanan bir web uygulamasıdır. Kullanıcılar maçları inceleyebilir; analiz (review) oluşturabilir; genel ve isteğe bağlı kategori bazlı puanlarla içerik üretebilir. Veriler ilişkisel bir veritabanında saklanır; arayüz sunucu tarafı bileşenleri ve REST API uçlarıyla beslenir.

## Gereksinimler (Prerequisites)

| Bileşen | Önerilen / minimum |
| ------- | ------------------- |
| **Node.js** | 20.x (LTS); üretim ve Next.js 16 ile uyumluluk için 18+ kabul edilebilir |
| **npm** | 10.x veya üzeri (`npm install -g npm@latest` ile güncellenebilir) |
| **Git** | Depoyu klonlamak için |
| **PostgreSQL erişimi** | Yerel veya bulut (ör. **Neon**) — bağlantı dizesi `DATABASE_URL` ile verilir |

İsteğe bağlı: Football-Data.org API anahtarı (canlı maç verisi senaryoları için), `.env.example` içinde belgelidir.

## Bağımlılıklar (Libraries)

| Teknoloji | Rol | Bu projede kullanım gerekçesi |
| --------- | --- | ------------------------------ |
| **Next.js** (App Router) | Tam yığın React çatısı | Sayfa yönlendirme, sunucu bileşenleri, API Route Handler'lar ve tek kod tabanında dağıtım |
| **React** | UI | Bileşen tabanlı arayüz, etkileşimli formlar ve istemci durumu |
| **Prisma** | ORM | Şema tek kaynak (`schema.prisma`), tip güvenli sorgular, veritabanı senkronizasyonu |
| **PostgreSQL** | İlişkisel veritabanı | Maç, analiz, kullanıcı ve koleksiyon verilerinin normalize saklanması |
| **Neon / `@neondatabase/serverless`** | Yönetilen Postgres + sunucusuz sürücü | Üretim ve geliştirmede bağlantı havuzu maliyetini düşürme; Prisma adapter ile entegrasyon |
| **Tailwind CSS** | Utility-first CSS | Tutarlı tipografi, responsive düzen ve tema değişkenleri ile hızlı stil üretimi |
| **NextAuth.js** | Kimlik doğrulama | Oturum ve güvenli kimlik bilgisi akışı (`NEXTAUTH_*`) |

## Kurulum Talimatları (Installation)

### 🖥️ Platform Uyumluluğu

Proje geliştirme ortamı macOS (Unix-based) baz alınarak yapılandırılmıştır. Windows ortamında çalıştırırken aşağıdaki hususlara dikkat edilmelidir:

- **Terminal:** PowerShell yerine Git Bash veya WSL (Windows Subsystem for Linux) kullanılması önerilir. Bazı bash tabanlı scriptler veya `rm -rf` gibi komutlar standart Windows PowerShell'de hata verebilir.

- **Line Endings:** Git ayarlarınızın `core.autocrlf` değerinin `true` olduğundan emin olun (Windows'ta CRLF, Unix'te LF satır sonları sorun yaratabilir).

- **Scriptler:** `package.json` içindeki scriptleri çalıştırmakta sorun yaşarsanız, projenin kök dizininde `node_modules/.bin` içerisindeki dosyaların Windows uyumlu (`.cmd` uzantılı) versiyonlarının çalıştığından emin olun.

#### ⚠️ Önemli: Windows'ta `ulimit` Hatası

`npm run dev` komutunu çalıştırdığınızda **`ulimit` hatası** alabilirsiniz. Bunun sebebi, `dev` komutunun Linux/Mac sistemlerine göre yazılmış olmasıdır; `ulimit` komutu Windows'ta çalışmaz. Projeyi başlatmadan önce şu adımları uygulayın:

1. **VS Code** ile `Matchboxd` klasörünü açın.
2. Sol taraftaki dosya listesinden `package.json` dosyasını bulun ve tıklayın.
3. `"scripts"` bölümündeki `"dev"` satırını bulun. Muhtemelen şöyle görünüyor:
   ```json
   "dev": "ulimit -n 10000; WATCHPACK_POLLING=true next dev --hostname 127.0.0.1"
   ```
4. O satırı Windows ile uyumlu hale getirmek için şununla değiştirin:
   ```json
   "dev": "set WATCHPACK_POLLING=true && next dev --hostname 127.0.0.1"
   ```
5. Dosyayı kaydedin (**Ctrl + S**).

> Bu değişikliğin `git reset --hard` gibi komutlarla üzerine yazılabileceğini unutmayın; her sıfırlamadan sonra tekrar uygulamanız gerekebilir.

---

### 1. Depoyu kopyalama

```bash
git clone <repository-url>
cd matchboxd
```

`<repository-url>` yerine kendi uzaktan depo adresinizi yazın.

### 2. Kütüphane yükleme

```bash
npm install
```

`postinstall` aşamasında Prisma Client üretilir (`prisma generate`).

### 3. Ortam değişkenleri

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyerek gerekli değişkenleri doldurun (detaylı açıklama için aşağıdaki **Ortam Değişkenleri** bölümüne bakın).

### 4. Veritabanı senkronizasyonu ve çalıştırma

Şema ile veritabanını eşitleme ve istemci üretimi için:

```bash
npx prisma db push
npx prisma generate
```

Geliştirme sunucusu:

```bash
npm run dev
```

Uygulama varsayılan olarak `http://127.0.0.1:3000` adresinde dinler.

Üretim derlemesi için:

```bash
npm run build
npm start
```

## Ortam Değişkenleri (Environment Variables)

Kaynak şablon: **[`.env.example`](./.env.example)**. Aşağıdaki liste, dosyada tanımlı başlıca değişkenlerin işlevlerini özetler.

| Değişken | Açıklama |
| -------- | -------- |
| **`DATABASE_URL`** | Prisma'nın bağlandığı veritabanının bağlantı dizesi. Neon için örnek: `postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require`. Turso/libsql kullanımında `libsql://…` biçimi kullanılabilir (yerel SQLite/anlık senaryolar). |
| **`TURSO_AUTH_TOKEN`** | Turso kullanıldığında libsql istemcisinin kimlik doğrulama anahtarı. |
| **`FOOTBALL_DATA_API_KEY`** | Football-Data.org API erişimi; maç beslemesi veya senkron scriptleri için. |
| **`FOOTBALL_DATA_COMPETITIONS`** | (İsteğe bağlı) Çekilecek lig kodları; boş bırakılırsa projede varsayılan lig seti kullanılabilir. |
| **`NEXTAUTH_SECRET`** | NextAuth için imzalama sırrı; üretimde mutlaka güçlü rastgele değer (`openssl rand -base64 32`). |
| **`NEXTAUTH_URL`** | Oturum geri çağrıları için kanonik taban URL (örn. üretimde tam HTTPS adresi). Yerelde çoğu senaryoda yorum satırında bırakılabilir. |

Ek olarak admin oturumu için `.env` içinde kullanılan özel kimlik bilgileri projeye göre tanımlanabilir (bkz. `lib/auth.ts`).

## Veritabanı Yapılandırması

1. **`prisma/schema.prisma`** tek doğruluk kaynağıdır; modeller (ör. `User`, `Match`, `Review`, `ReviewLike`) burada tanımlıdır.
2. **`npx prisma db push`** geliştirme ortamında şemayı veritabanına uygular (migration geçmişi olmadan hızlı senkron).
3. **`npx prisma generate`** Prisma Client'ı günceller; TypeScript ve çalışma zamanı sorguları bu çıktıya bağlıdır.
4. Örnek veri için **`npm run db:seed`** (yapılandırmaya bağlıdır); arşiv veya lig bazlı scriptler için `package.json` içindeki diğer `db:*` komutlarına bakın.

Şema ile üretim veritabanını birleştirirken dikkat: `db push` bazı durumlarda veri kaybı uyarısı verebilir; üretimde yedek veya Neon branch snapshot önerilir.

---

## Gelişmiş Özellikler

### İstatistik ve puanlama notları

- **NULLS LAST:** "En yüksek puanlı maçlar" gibi raporlarda ağırlıklı ortalama sıralamasında PostgreSQL **`DESC NULLS LAST`** kullanılır; böylece `weightedRating` değeri olmayan kayıtlar listenin sonunda kalır.
- **Weighted rating:** Detaylı kategori puanları girildiğinde tek bir ağırlıklı skor hesaplanır ve istatistiklerde önceliklendirilir; aksi halde klasik `rating` değeri referans olarak kullanılabilir.

### Database Maintenance — NULL sütun tespiti

Tamamen `NULL` olan sütunları tarayıp Neon SQL Editöründe elle çalıştırmalık **`ALTER TABLE … DROP COLUMN`** metni üretmek için:

```bash
npm run db:drop-null-cols -- <schema> <tablo>
```

Varsayılan: `public` şeması ve `Match` tablosu.

```bash
npm run db:drop-null-cols
npm run db:drop-null-cols -- public Match
```

Bu araç veritabanında doğrudan silme **yapmaz**; yalnızca önerilen SQL'i yazdırır. **`DROP COLUMN` geri alınamaz**; üretimde çalıştırmadan önce yedek veya Neon snapshot alınması önerilir.

---

*Bu belge, projenin çalıştırılabilirlik ve teknik bağlamının özetlenmesi amacıyla hazırlanmıştır.*
