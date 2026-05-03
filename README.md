# Matchboxd: Sosyal Futbol Maç Bilgi Sistemi

Futbol maçlarını listeleyebildiğiniz, analiz paylaşıp puanladığınız sosyal bir maç bilgi ve değerlendirme uygulaması.

## Kullanılan Teknolojiler

| Katman       | Teknoloji                                      |
| ------------ | ---------------------------------------------- |
| Uygulama     | **Next.js**                                    |
| ORM          | **Prisma**                                     |
| Veritabanı   | **PostgreSQL** (**Neon** üzerinde barındırılabilir) |
| Stil         | **Tailwind CSS**                               |

## Kurulum Adımları

### 1. Depoyu klonlayın

```bash
git clone <repository-url>
cd matchboxd
```

### 2. Bağımlılıkları yükleyin

```bash
npm install
```

### 3. Ortam değişkenleri (.env.example → .env)

```bash
cp .env.example .env
```

`.env` içinde en azından veritabanınız için bir **`DATABASE_URL`** tanımlayın. Neon PostgreSQL örneği:

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
```

(Gerekirse `NEXTAUTH_SECRET`, API anahtarları vb. diğer değişkenleri de `.env.example` dosyasındaki açıklamalara göre doldurun.)

### 4. Şema oluşturma ve Prisma client

```bash
npx prisma db push
npx prisma generate
```

### 5. Uygulamayı çalıştırma

```bash
npm run dev
```

## Database Maintenance

Gereksiz (NULL) sütunların tespiti ve Neon SQL Editöründe çalıştırmalık **`ALTER TABLE … DROP COLUMN`** komutları üretmek için:

```bash
npm run db:drop-null-cols -- <schema> <table>
```

Varsayılan: `public` şeması ve `Match` tablosu (parametresiz çalıştırılabilir).

```bash
npm run db:drop-null-cols
npm run db:drop-null-cols -- public Match
```

**Açıklama:** Gereksiz (tamamen boş / NULL) sütunların temizlenmesi ve veritabanı şemasındaki gereksiz alanların kaldırılması bu araçla kolaylaştırılmıştır; çıktıdaki komutları yedek aldıktan sonra elle uygularsanız gereksiz indeks/işlem yükünden tasarruf sağlar. Üretilen `DROP COLUMN` komutları **geri alınamaz**; üretim veritabanında çalıştırmadan önce Neon branch snapshot veya yedek alın.

## Özellikler (kısa notlar)

- **Sıralama (NULLS LAST):** “En yüksek puanlı maçlar” gibi listelerde ağırlıklı ortalama (`weightedRating`) bazlı sıralama yapılırken PostgreSQL’de **`DESC NULLS LAST`** kullanılır; böylece ağırlıklı puanı olmayan (NULL) kayıtlar listenin sonuna itilir, yüksek puana sahip maçlar üstte kalır.
- **Weighted rating:** Kullanıcılar detaylı kategori puanları girdiğinde (taktik, heyecan, tempo vb.) tek bir **ağırlıklı puan** hesaplanır ve istatistiklerde bu değer öncelikli kullanılır; kategori girilmediyse klasik `rating` değeri yedek olarak devreye girebilir.

---

*Matchboxd — ders / proje teslimi için README şablonuna uygun hazırlanmıştır.*
