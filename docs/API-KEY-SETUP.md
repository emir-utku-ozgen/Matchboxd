# Matchboxd - API Anahtarı Kurulumu (Football-Data.org)

Maçların gerçek API'den çekilmesi için **Football-Data.org** ücretsiz API anahtarı gereklidir.

---

## Adım 1: API anahtarını al

1. Tarayıcıda şu adrese git: **https://www.football-data.org/client/register**
2. Formu doldur:
   - **Name**: İstediğin bir isim (örn. "Matchboxd Ödev")
   - **Email**: E-posta adresin
   - **Password**: Bir şifre belirle
3. "Register" / "Kayıt ol" butonuna tıkla.
4. E-postana gelen **aktivasyon linkine** tıklayıp hesabı aktifleştir.
5. Giriş yap: **https://www.football-data.org/client**
6. Açılan sayfada **"API Token"** veya **"Authentication Token"** kısmında uzun bir anahtar göreceksin (örn. `a1b2c3d4e5f6...`). Bunu kopyala.

---

## Adım 2: Anahtarı projeye ekle

1. Proje kökünde (`matchboxd` klasöründe) **`.env`** dosyasını aç.  
   Yoksa oluştur: aynı klasörde `.env` adında yeni bir dosya aç.

2. Şu satırı ekle (veya varsa güncelle). `BURAYA_ANAHTARI_YAPISTIR` yerine kopyaladığın token'ı yapıştır:

   ```env
   FOOTBALL_DATA_API_KEY=BURAYA_ANAHTARI_YAPISTIR
   ```

   Örnek (gerçek anahtar böyle görünür):

   ```env
   FOOTBALL_DATA_API_KEY=a1b2c3d4e5f6789012345678abcdef12
   ```

3. Dosyayı kaydet.

---

## Adım 3: Sunucuyu yeniden başlat

`.env` değişince Next.js’in bunu okuması için dev server’ı yeniden başlat:

- Terminalde çalışan `npm run dev` varsa **Ctrl+C** ile durdur.
- Tekrar çalıştır: `npm run dev`

---

## Adım 4: Maçları çek

1. Tarayıcıda **http://127.0.0.1:3000/matches** sayfasına git.
2. **"API'den Güncelle"** butonuna tıkla.
3. Birkaç saniye içinde Premier League (ve varsa Süper Lig) maçları listelenecek. API’den gelen maçların yanında **"API'den canlı çekildi"** etiketi görünür.

---

## Opsiyonel: Hangi ligler gelsin?

Varsayılan olarak **Premier League (PL)** ve **Süper Lig (TSL)** kullanılır. Ücretsiz planda bazı ligler kapalı olabilir; 403 alırsan o lig atlanır.

Sadece belirli ligleri çekmek istersen `.env` dosyasına şunu ekleyebilirsin:

```env
FOOTBALL_DATA_COMPETITIONS=PL
```

Birden fazla lig için virgülle ayır:

```env
FOOTBALL_DATA_COMPETITIONS=PL,TSL,BL1
```

Yaygın kodlar: `PL` (Premier League), `TSL` (Süper Lig), `BL1` (Bundesliga), `PD` (La Liga), `SA` (Serie A).

---

## Sorun giderme

- **"API anahtarı tanımlı değil"**: `.env` dosyası proje kökünde mi kontrol et. Anahtarın başında/sonunda boşluk olmasın.
- **Maç listesi boş**: Önce "API'den Güncelle" butonuna bas. İlk senkronizasyonda maçlar veritabanına yazılır.
- **403 veya yetki hatası**: Ücretsiz planda bazı ligler kapalıdır. `FOOTBALL_DATA_COMPETITIONS=PL` ile sadece Premier League dene.

Veri kaynağı: [football-data.org](https://www.football-data.org) — kullanım koşullarına uygun şekilde "Data provided by football-data.org" ibaresi uygulamada gösterilir.
