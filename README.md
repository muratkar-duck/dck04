# Ducktylo

Ducktylo; senaristlerle yapımcıları güvenli şekilde buluşturan, senaryo saklama ve hak devri süreçlerini tek platformda toplayan bir pazaryeridir. Bu repo, Ducktylo'nun Supabase destekli Next.js uygulaması için ortak referans dokümantasyonunu ve geliştirme kurallarını içerir.

## Ürün Özeti
- **Senaristler (writers)** senaryolarını yükler, görünürlük seviyesini belirler, ilanlara başvurur ve yapımcılarla mesajlaşır.
- **Yapımcılar (producers)** senaryo havuzunu filtreler, favori bırakır, ilan açar, başvuruları değerlendirir ve pazarlık/teklif süreçlerini yönetir.
- Platform, ileride farklı yaratıcı alanlara genişleyebilecek "eşleştirme + hak devri + komisyon" modelini temel alır.

## Teknik Stack
- **Frontend:** Next.js (App Router, React 18, TypeScript) + Tailwind CSS.
- **Backend & Data:** Supabase (PostgreSQL, Auth, RLS, Storage) ve gerektiğinde SQL functions (RPC).
- **Auth:** Supabase Auth email/password ile, `public.users.role` alanı writer/producer gibi rolleri belirler.

## Veri Modeli (Özet)
Ayrıntılı şema migration dosyalarında tutulur. Temel tablolar:

### Kullanıcı & Planlar
- `users`: auth.uid() ile eşlenen profil bilgileri (username, full_name, bio, avatar_url, sosyal linkler, temsilci bilgisi vb.).
- `user_plans`: plan/abonelik bilgileri (plan_tier, senaryo/ilan/favori limitleri).

### Senaryolar
- `scripts`: senaryonun temel kaydı (title, logline, genre, format, era, setting_location_scope, visibility, primary_owner_id).
- `script_files`: Supabase Storage yolu, dosya formatı ve boyutu.
- `script_owners`: primary owner haricindeki ortak sahipler.
- `script_collaborators`: içerik erişimi olan ancak görünürlük/statistik değiştiremeyen roller (editor, co-writer vb.).

### İlanlar & Başvurular
- `producer_listings`: yapımcıların “senaryo arıyorum” ilanları (title, description, genre, budget_range, format, era, setting_location_scope, is_active).
- `applications`: senaristin belirli bir senaryo ile ilana yaptığı başvuru (status = pending/accepted/rejected/withdrawn). Kabul edildiğinde otomatik conversation açılır.

### İlgi, Görüntülenme ve Mesajlaşma
- `interests`: yapımcının senaryoya bıraktığı “İlgi Göster” kaydı. Premium olmayan senaristler kimliği göremez.
- `script_views`: senaryonun preview/görüntülenme kayıtları. Senarist toplam sayıyı görür.
- `conversations`, `conversation_participants`, `messages`: başvurular veya doğrudan ilgi sonrası açılan sohbet kanalları.

### Teklifler, Açık Artırmalar ve Hak Devri
- `offers`: sohbet üzerinden yürüyen pazarlık/teklif kayıtları (amount, currency, status = pending/accepted/rejected/countered/cancelled).
- `auctions`, `bids`: bir senaryoya en az üç farklı teklif geldikten sonra açılan açık artırma süreçleri.
- Gelecekte `orders/deals` tabloları ile ödeme ve hak devri süreci bağlanır; platform komisyonları (%10 + %20 KDV) UI'da gösterilir.

### Bildirimler
- `notifications`: tüm olayları (ilgi gösterme, preview, yeni başvuru, mesaj, teklif vb.) kullanıcıya ileten esnek yapı (type, payload JSON, read_at, created_at).

## Erişim (RLS) İlkeleri
- Kullanıcılar yalnızca kendi `users` satırlarını görebilir/güncelleyebilir.
- `scripts` görünürlüğü `visibility` alanına göre: `public` → tüm auth kullanıcılar; `producers_only` → yalnızca producer rolü; `private` → primary owner + `script_owners`.
- `script_files` RLS'i `scripts` ile hizalı olmalıdır.
- `producer_listings`: tüm auth kullanıcılar okuyabilir; yalnızca sahibi (producer_id) CRUD yapabilir.
- `applications`: sadece writer_id veya producer_id olan taraflar okuyabilir; writer kendi adına başvuru yapar, producer yalnızca kendisine gelen başvurunun durumunu günceller.
- `conversations/messages`: sadece `conversation_participants` kaydı olan kullanıcılar okuyabilir; `sender_id = auth.uid()` zorunludur.
- `interests`: sadece producers insert edebilir; herkes kendi kayıtlarını görür, senarist toplam ilgi sayısını görebilir (kimlik planlara göre maskelenir).
- `offers`, `auctions`, `bids`, `notifications`: yalnızca ilgili taraflar erişebilir; hiçbir tabloda gevşek USING (true) policy kullanılmaz.

## Geliştirme Kuralları
1. RLS kurallarını ASLA bozma; yeni tablolar için de yukarıdaki prensipleri uygula.
2. Tüm Supabase sorgularında `error` kontrolü yap, kullanıcıya Türkçe hata mesajı göster.
3. UI metinleri Türkçe, teknik terimler İngilizce kalabilir; varsayımları kodda `// TODO` şeklinde belirt.
4. Migration'ları dikkatle yaz, Supabase tarafında hatasız çalıştığından emin ol.
5. Zero-error, zero-conflict: build/test kıran veya merge conflict üreten PR kabul edilmez.

Bu belge, Ducktylo reposunda çalışacak herkes için temel referanstır. Yeni özellik eklerken bu kurallara uy ve mimariyi genişletirken mevcut veri modelini bozma.
