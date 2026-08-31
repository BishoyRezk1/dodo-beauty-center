# 💇‍♀️ DoDo Beauty Center

منصة حجز وإدارة أونلاين لمركز DoDo Beauty Center — Next.js 14 + Prisma + PostgreSQL + NextAuth، جاهزة للنشر على Vercel.

> ⚠️ لم يتم تنفيذ `npm install` أو تشغيل build داخل بيئة الإنشاء لأنها بدون اتصال إنترنت. الكود مكتوب ومُراجع بعناية، لكن نفّذي خطوات التشغيل بالأسفل محليًا للتأكد قبل النشر.

---

## 1. المحتوى الجاهز فعليًا (Implemented)

- الصفحة الرئيسية: Hero، الخدمات، العروض، آراء العملاء، الموقع على الخريطة، أزرار واتساب.
- تدفق حجز كامل (Booking Flow): اختيار خدمة → تاريخ ووقت متاح فعليًا (مع منع Double Booking) → بيانات العميلة → رسوم Vodafone Cash → رفع Screenshot → رقم حجز فريد `DODO-YYYY-00001`.
- لوحة تحكم Admin محمية بتسجيل دخول (NextAuth + bcrypt):
  - Dashboard بإحصائيات حقيقية من قاعدة البيانات + رسم بياني لأكثر الخدمات حجزًا.
  - إدارة الحجوزات: مراجعة Screenshot، تأكيد/رفض/إلغاء، إرسال واتساب للعميلة تلقائيًا أو عبر رابط.
  - إدارة الخدمات (CRUD) والعروض (CRUD).
  - إدارة أيام وساعات العمل (تمنع الحجز في الأيام المغلقة).
  - إعدادات Vodafone Cash (رقم + رسوم ثابتة أو نسبة)، إعدادات واتساب، إعدادات الخريطة.
- تكامل واتساب بمعمارية آمنة: يعمل تلقائيًا عبر wa.me links من أول يوم بدون أي إعداد، وجاهز للترقية لـ WhatsApp Business Cloud API بمجرد إضافة المفاتيح في Environment Variables.
- تخزين صور آمن قابل للتوسع: Cloudinary أو Supabase Storage عبر متغيرات البيئة (مع fallback محلي للتجربة فقط).
- حماية: Password hashing (bcrypt)، NextAuth sessions، Middleware يحمي كل صفحات `/admin/*` عدا تسجيل الدخول، Validation بـ Zod على كل الـ API، منع رفع ملفات غير صور، حد أقصى 5MB.

## 2. جاهز للتوسعة لاحقًا (Architected but not wired to a UI yet)

هذه الأجزاء المذكورة في المتطلبات موجودة في قاعدة البيانات والـ API لكنها تحتاج شاشة Admin إضافية بسيطة إذا أردتِ:
- تصدير التقارير إلى Excel/CSV/PDF (البيانات جاهزة من `/api/admin/stats` و `/api/bookings`).
- Notification Center مرئي داخل لوحة التحكم (جدول `Notification` جاهز ويتم تعبئته تلقائيًا).
- قاعدة عملاء تفصيلية (موديل `Customer` موجود ومرتبط بكل الحجوزات).
- إجازات/مواعيد مغلقة محددة (موديل `ClosedDate` جاهز، يحتاج شاشة لإضافتها من لوحة التحكم — حاليًا تُضاف عبر Prisma Studio).

قل لي أي جزء منها تريدين تفعيله وسأضيف الشاشة الخاصة به.

---

## 3. تشغيل المشروع محليًا (Local)

### المتطلبات
- Node.js 20 أو أحدث
- PostgreSQL (محلي أو Neon/Supabase)

### الخطوات

```bash
# 1) فك ضغط المشروع وادخلي المجلد
cd dodo-beauty-center

# 2) تثبيت الحزم
npm install

# 3) انسخي ملف البيئة وعدّلي القيم
cp .env.example .env

# 4) أنشئي جداول قاعدة البيانات
npx prisma migrate dev --name init

# 5) أضيفي بيانات تجريبية (خدمات، عرض، حساب أدمن)
npm run seed

# 6) شغّلي المشروع
npm run dev
```

الموقع: http://localhost:3000
لوحة التحكم: http://localhost:3000/admin/login

بيانات الدخول الافتراضية بعد الـ seed تُطبع في الـ terminal، وهي مأخوذة من `ADMIN_EMAIL` و `ADMIN_PASSWORD` في ملف `.env` — **غيّريها فورًا بعد أول دخول** من قاعدة البيانات أو عبر Prisma Studio (`npx prisma studio`).

---

## 4. إعداد PostgreSQL

**الخيار الأسهل للنشر: Neon (مجاني ويعمل مباشرة مع Vercel)**
1. أنشئي حساب على https://neon.tech
2. أنشئي مشروع جديد → انسخي "Connection string" (Pooled connection).
3. الصقيه في `DATABASE_URL` داخل `.env` (وبعدين في Vercel Environment Variables).

**بديل: Supabase Postgres** — نفس الفكرة، من إعدادات المشروع → Database → Connection string.

**تشغيل محلي بديل**: ثبّتي PostgreSQL على جهازك وأنشئي قاعدة بيانات باسم `dodo_beauty`، ثم استخدمي:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/dodo_beauty?schema=public"
```

---

## 5. متغيرات البيئة (Environment Variables)

انسخي كل القيم من `.env.example`. أهمها:

| المتغير | الوصف |
|---|---|
| `DATABASE_URL` | رابط اتصال PostgreSQL |
| `NEXTAUTH_SECRET` | مفتاح سري — ولّديه بالأمر `openssl rand -base64 32` |
| `NEXTAUTH_URL` | رابط الموقع (محليًا: `http://localhost:3000`، على Vercel: رابط الدومين) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | تُستخدم مرة واحدة فقط عند تشغيل `npm run seed` لإنشاء أول حساب أدمن |
| `CLOUDINARY_*` أو `SUPABASE_*` | لتخزين صور إثبات التحويل (مطلوب على Vercel لأن نظام الملفات هناك مؤقت) |
| `WHATSAPP_*` | اختياري — لتفعيل الإرسال التلقائي عبر WhatsApp Business Cloud API (راجعي القسم 8) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | اختياري — الخريطة تعمل بدونه بصيغة embed مجانية، لكن المفتاح يفتح مزايا إضافية لاحقًا |

⚠️ **لا تضعي أي قيم حقيقية داخل الكود نفسه** — كل شيء حساس يُقرأ من Environment Variables فقط، تمامًا كما طُلب.

---

## 6. رفع المشروع على GitHub

```bash
cd dodo-beauty-center
git init
git add .
git commit -m "DoDo Beauty Center - initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/dodo-beauty-center.git
git push -u origin main
```

(أنشئي الـ repository فارغ على GitHub أولًا من الموقع، وخذي رابطه بدل `USERNAME/dodo-beauty-center`.)

---

## 7. النشر على Vercel

1. ادخلي https://vercel.com → **Add New Project** → اختاري الـ repository من GitHub.
2. **Environment Variables**: أضيفي كل المتغيرات من `.env` (خصوصًا `DATABASE_URL` و `NEXTAUTH_SECRET` و `NEXTAUTH_URL` = رابط الدومين النهائي، وإعدادات التخزين Cloudinary/Supabase).
3. **Build Command**: `prisma generate && next build` (مضبوط بالفعل في `package.json`).
4. اضغطي **Deploy**.
5. بعد أول نشر، شغّلي المايجريشن والـ seed مرة واحدة على قاعدة البيانات الحقيقية:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```
   (نفّذيها من جهازك بعد ضبط `DATABASE_URL` في `.env` المحلي على نفس رابط قاعدة بيانات الإنتاج، أو من Vercel CLI: `vercel env pull`.)

---

## 8. ربط Domain مخصص

1. من مشروعك على Vercel → **Settings → Domains** → أضيفي الدومين (مثال: `dodobeauty.com`).
2. من موقع شراء الدومين، أضيفي الـ DNS records التي يعرضها Vercel (عادة CNAME أو A record).
3. بعد التفعيل، حدّثي `NEXTAUTH_URL` في Environment Variables إلى الدومين الجديد، وأعيدي النشر (Redeploy).

---

## 9. إعداد WhatsApp Business Cloud API

النظام يعمل من أول يوم بدون هذا الإعداد (عبر أزرار wa.me). لتفعيل **الإرسال التلقائي الكامل**:

1. أنشئي حساب على https://developers.facebook.com وفعّلي منتج **WhatsApp** داخل تطبيق Meta.
2. من WhatsApp → Getting Started، احصلي على:
   - `Phone Number ID`
   - `WhatsApp Business Account ID`
   - `Temporary/Permanent Access Token` (يُفضّل توليد System User Token دائم للإنتاج)
3. أضيفي القيم في Environment Variables على Vercel:
   ```
   WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_BUSINESS_ACCOUNT_ID=...
   WHATSAPP_ACCESS_TOKEN=...
   ```
4. لإرسال رسائل خارج نافذة الـ 24 ساعة (مثل تذكير أو متابعة) يجب استخدام **Message Templates** المعتمدة من Meta — الكود الحالي يرسل رسائل نصية مباشرة تعمل ضمن نافذة الحوار (بعد تواصل العميلة أو خلال 24 ساعة من إنشاء الحجز)، وهذا يغطي حالة "تأكيد/رفض الحجز" بشكل طبيعي.

---

## 10. إعداد Google Maps

الخريطة تعمل الآن بصيغة **embed مجانية** بدون أي مفتاح API، فقط بتحديث `map_lat` و `map_lng` و `map_address` و `map_url` من **لوحة التحكم → الإعدادات**.

إذا أردتِ مزايا متقدمة لاحقًا (بحث عن مواقع، اتجاهات داخل الموقع):
1. من https://console.cloud.google.com فعّلي **Maps JavaScript API** و **Places API**.
2. أنشئي API Key وقيّديه بالدومين الخاص بك (HTTP referrer restriction).
3. ضعيه في `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

---

## 11. إدارة الموقع بالكامل من لوحة تحكم DoDo

بعد تسجيل الدخول على `/admin/login`:

- **الرئيسية**: نظرة عامة على الحجوزات والإيرادات.
- **الحجوزات**: فلترة بالحالة، عرض إثبات التحويل، تأكيد/رفض/إلغاء، فتح واتساب مباشرة.
- **الخدمات**: إضافة/تعديل/إخفاء أي خدمة وسعرها ومدتها والخصم عليها — يظهر فورًا في الموقع.
- **العروض**: إضافة عرض بصورة وتاريخ بداية/نهاية — يختفي تلقائيًا بعد تاريخ الانتهاء.
- **الإعدادات**: رقم Vodafone Cash، رسوم الحجز (ثابت أو نسبة)، رقم واتساب، بيانات الخريطة، أيام وساعات العمل.

كل تعديل يُحفظ في قاعدة البيانات ويظهر فورًا للعميلات — لا حاجة لإعادة نشر الموقع عند تغيير الأسعار أو العروض أو الإعدادات.

---

## 12. بنية المشروع (Architecture)

```
prisma/schema.prisma       — كل الجداول: Bookings, Services, Offers, Payments, Settings...
src/lib/                   — منطق الأعمال المشترك (auth, whatsapp, settings, storage, booking-number)
src/app/(site)             — الموقع العام (page.tsx, booking/)
src/app/admin/              — لوحة التحكم (محمية بـ middleware.ts)
src/app/api/                 — كل الـ API routes (REST عبر Next.js Route Handlers)
```

هذا التنظيم يسمح بإضافة أي ميزة من "الإضافات المستقبلية" (تقييمات، كوبونات، نقاط ولاء، فروع متعددة...) كجدول جديد في `schema.prisma` + API route + شاشة Admin، دون التأثير على الموجود.
