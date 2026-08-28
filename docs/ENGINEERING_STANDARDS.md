# 🏛️ الدستور الهندسي والمعماري للأنظمة الإنتاجية (Production Architecture Playbook)
## مستخلص من المعمارية الحية لمنصة مركز أسما للطب النفسي (Asmaa Clinic Telehealth)

هذا الملف يمثل **الدليل المرجعي الإلزامي (The Engineering Doctrine)** لكتابة وتصميم الأنظمة البرمجية. يوثق هذا الدستور الأنماط المعمارية، وضوابط الأمان، والحلول الدفاعية الدقيقة المستخلصة من الكود الفعلي للمشروع لتطبيقها في أي ميزة أو مشروع جديد.

---

## 📑 الفهرس المعماري

1. [نمط النتيجة الموحدة (The Uniform Result Envelope Pattern)](#1-نمط-النتيجة-الموحدة-the-uniform-result-envelope-pattern)
2. [المعمارية الدفاعية على مستوى قاعدة البيانات (Database-Level Defensive Guarantees)](#2-المعمارية-الدفاعية-على-مستوى-قاعدة-البيانات-database-level-defensive-guarantees)
3. [أمان التوقيت العالمي وتفادي التوقيت الصيفي (UTC-Only Time Architecture)](#3-أمان-التوقيت-العالمي-وتفادي-التوقيت-الصيفي-utc-only-time-architecture)
4. [معمارية الجلسات والتشفير والأمان السريري (Authentication, Cryptography & HIPAA)](#4-معمارية-الجلسات-والتشفير-والأمان-السريري-authentication-cryptography--hipaa)
5. [أمان فحص ورفع الملفات بالبايتات السحرية (Magic-Byte File Sniffing & Storage)](#5-أمان-فحص-ورفع-الملفات-بالبايتات-السحرية-magic-byte-file-sniffing--storage)
6. [التحقق الصارم وقوائم النطاقات الآمنة (Anti-Phishing & Regex Validation)](#6-التحقق-الصارم-وقوائم-النطاقات-الآمنة-anti-phishing--regex-validation)
7. [التوافق المزدوج لقواعد البيانات والتحويل الآلي (Dual-Provider Schema Translation)](#7-التوافق-المزدوج-لقواعد-البيانات-والتحويل-الآلي-dual-provider-schema-translation)
8. [أنماط واجهات المستخدم والحالات الحرجة (Non-Optimistic UI & useActionState)](#8-أنماط-واجهات-المستخدم-والحالات-الحرجة-non-optimistic-ui--useactionstate)

---

## 1. نمط النتيجة الموحدة (The Uniform Result Envelope Pattern)

### 💡 المبدأ الهندسي:
**يُمنع منعاً باتاً إلقاء استثناءات غير معالجة (`throw new Error`) عبر حدود الـ Server Actions و React Server Components.**  
*السبب:* في بيئة الإنتاج (`Production`)، يقوم Next.js بحجب نص الخطأ واستبداله برسالة غامضة: *"An error occurred in the Server Components render"*، مما يحرم المستخدم من أي رسالة توضيحية.

### 🛠️ نمط الكود الإلزامي (`lib/result.ts`):
يجب أن ترجع كل Server Action كائن `ActionResult<T>` يحتوي على نصوص ثنائية اللغة وتفاصيل الأخطاء الميدانية (`fieldErrors`):

```typescript
export type ActionErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SLOT_TAKEN"
  | "RATE_LIMITED"
  | "CSRF_FAILED"
  | "INTERNAL_ERROR";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ActionErrorCode; messageAr: string; messageEn: string; fieldErrors?: Record<string, string> };

export function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function failure(code: ActionErrorCode, messageAr: string, messageEn: string, fieldErrors?: Record<string, string>): ActionResult<never> {
  return { ok: false, code, messageAr, messageEn, fieldErrors };
}
```

---

## 2. المعمارية الدفاعية على مستوى قاعدة البيانات (Database-Level Defensive Guarantees)

### 💡 المبدأ الهندسي:
**منع الحجز المزدوج (Double-Booking Race Condition) والتعارضات المالية لا يتم عبر كود التطبيق، بل تفوّض مسؤوليته لمحرك قاعدة البيانات.**  
*السبب:* إذا ضغط مريضان على نفس الموعد في نفس الجزء من الثانية، فإن فحص `isSlotFree()` في الكود يقرأ "متاح" للاثنين معاً قبل الحفظ (Time-of-check to Time-of-use gap).

### 🛠️ نمط الكود الإلزامي (`prisma/schema.prisma`):
نستخدم قيداً فريداً مركباً (`Compound Unique Index`) مع حقل قفل الموعد `slotLockKey`:

```prisma
model Appointment {
  id             String   @id @default(cuid()) @db.NVarChar(30)
  doctorId       String   @db.NVarChar(30)
  scheduledAtUTC DateTime
  status         String   @default("PENDING_PAYMENT_PROOF") @db.NVarChar(30)
  
  /// يحمل الثابت "ACTIVE" أثناء شغل الموعد، ويتحول إلى id الحجز عند الإلغاء
  slotLockKey    String   @db.NVarChar(40)

  @@unique([doctorId, scheduledAtUTC, slotLockKey], map: "appointments_doctor_slot_lock_key")
}
```
* **آلية العمل في الكود (`booking.actions.ts`):**
  1. يُحفظ الحجز مع `slotLockKey = "ACTIVE"`.
  2. إذا حاول طلب آخر الحجز في نفس اللحظة، يرفض محرك الـ SQL الحجز الثاني فوراً بخطأ `P2002 Unique Constraint Violation`.
  3. عند إلغاء الحجز، يُعاد كتابة `slotLockKey = appointment.id` (قيمة فريدة عالمياً)، مما يحرر الموعد للآخرين **دون حذف سجل الحجز الملغي من تاريخ المريض**.

---

## 3. أمان التوقيت العالمي وتفادي التوقيت الصيفي (UTC-Only Time Architecture)

### 💡 المبدأ الهندسي:
**قاعدة البيانات تخزن وتتعامل مع التوقيت العالمي (UTC) فقط وبنظام دقائق اليوم. التوقيت المحلي (مثل توقيت القاهرة) لا يوجد إلا في واجهة العرض للمستخدم.**  
*السبب:* في مصر والدول التي تطبق التوقيت الصيفي (DST)، تتغير الساعة فجأة (UTC+2 إلى UTC+3). تخزين الساعة المحلية يؤدي إلى اختفاء أو تكرار أو انزياح المواعيد عند تغيير التوقيت.

### 🛠️ نمط الكود الإلزامي (`lib/slots.ts` & `lib/whatsapp.ts`):
1. **تخزين فترات العمل الأسبوعية بالدقائق من منتصف الليل بتوقيت UTC:**
   ```prisma
   model DoctorAvailability {
     dayOfWeek       Int // 0..6 (UTC Day)
     startMinutesUTC Int // مثلاً: 14 * 60 = 840 (الساعة 14:00 UTC)
     endMinutesUTC   Int // مثلاً: 17 * 60 = 1020 (الساعة 17:00 UTC)
   }
   ```
2. **التحويل والتنسيق المحلي عبر `Intl.DateTimeFormat` لحظة العرض فقط:**
   ```typescript
   export function formatCairo(dateUTC: Date): string {
     return new Intl.DateTimeFormat("ar-EG", {
       timeZone: "Africa/Cairo",
       weekday: "long",
       day: "numeric",
       month: "long",
       year: "numeric",
       hour: "numeric",
       minute: "2-digit",
       hour12: true,
     }).format(dateUTC);
   }
   ```

---

## 4. معمارية الجلسات والتشفير والأمان السريري (Authentication, Cryptography & HIPAA)

### 💡 المبدأ الهندسي:
1. **تشفير كلمات المرور بـ Argon2id (OWASP Profile)**:
   - استخدام مصفوفة ذاكرة 19 MiB، و t=2 (iterations)، و p=1 (parallelism).
   - حماية ضد هجمات الوقت (Timing Attacks) باستخدام دالة مقارنة السلاسل النصية بزمن ثابت (`safeEquals`):
     ```typescript
     export function safeEquals(a: string, b: string): boolean {
       const bufA = Buffer.from(a);
       const bufB = Buffer.from(b);
       if (bufA.byteLength !== bufB.byteLength) {
         timingSafeEqual(bufA, bufA); // حرق نفس الوقت لمنع تسريب الطول
         return false;
       }
       return timingSafeEqual(bufA, bufB);
     }
     ```
2. **الجلسات المعتومة (Opaque Server-Side Sessions)**:
   - الكوكي يحتوي على 256 بت عشوائية مشفرة بالـ Base64 (`generateToken(32)`).
   - قاعدة البيانات تحفظ فقط بصمة الـ `SHA-256` للتوكن (`tokenHash`) وتوكن الـ CSRF (`csrfTokenHash`).
   - *النتيجة:* تسريب قاعدة البيانات لا يسمح للمهاجم بانتحال جلسات المستخدمين، ويتيح الإلغاء الفوري للجلسات (Instant Revocation).
3. **فصل الصلاحيات والتحقق متعدد الطبقات (Edge-Safe RBAC)**:
   - الـ Middleware يفحص فقط وجود الكوكي ويحقن الـ CSRF ويهيئ ترويسات الأمان (`X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy`).
   - التحقق الفعلي من الصلاحيات (`requireRole(["DOCTOR", "ADMIN"])`) يتم داخل كل Server Action وكل Server Component باستعلام مباشر من قاعدة البيانات.

---

## 5. أمان فحص ورفع الملفات بالبايتات السحرية (Magic-Byte File Sniffing & Storage)

### 💡 المبدأ الهندسي:
**لا تثق مطلقاً في الامتداد أو الـ MIME Type المرسل من المتصفح، ولا تخزن أي ملف مرفوع داخل مجلد `public/`.**  
*السبب:* يمكن للمهاجم إرسال ملف كود خبيث تنفيذي أو صفحة HTML وإعطائها امتداد `.png` لتنفيذ هجمات XSS واستيلاء على الجلسات.

### 🛠️ نمط الكود الإلزامي (`lib/uploads.ts`):
1. **فحص التوقيع السحري في أول 16 بايت من الملف (Magic Bytes):**
   ```typescript
   const RECEIPT_MAGIC_NUMBERS = {
     "image/jpeg": [[0xff, 0xd8, 0xff]],
     "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
     "application/pdf": [[0x25, 0x50, 0x44, 0x46, 0x2d]], // "%PDF-"
   };
   ```
2. **استبدال اسم الملف بـ UUID وتخزينه في مجلد خاص:**
   - يتم تجاهل اسم الملف المرسل بالكامل لحماية السيرفر من هجمات الـ Path Traversal (`../../.env`) وحقن الـ Null-Byte.
   - يتم تخزين الملف في مجلد `./.uploads/receipts/YYYY/MM/uuid.ext` خارج نطاق الوصول العام، ولا يُقرأ إلا عبر مسار API محمي بـ `requireRole` وترويسة `Content-Security-Policy: default-src 'none'`.

---

## 6. التحقق الصارم وقوائم النطاقات الآمنة (Anti-Phishing & Regex Validation)

### 💡 المبدأ الهندسي:
**كل حقل نصي خارجي يرسل للمرضى (مثل روابط غرف الاجتماعات) يجب أن يخضع لفحص صارم ضد التصيد والاحتيال.**

### 🛠️ نمط الكود الإلزامي (`lib/validation/schemas.ts`):
1. **التحقق من روابط Zoom عبر Regex صريح يمنع النطاقات الفرعية الاحتيالية:**
   ```typescript
   export const zoomUrlSchema = z
     .string()
     .url()
     .refine(
       (url) => {
         try {
           const parsed = new URL(url);
           return (
             parsed.protocol === "https:" &&
             (parsed.hostname === "zoom.us" || parsed.hostname.endsWith(".zoom.us"))
           );
         } catch {
           return false;
         }
       },
       { message: "يجب أن يكون رابط الاجتماع رابطاً معتمداً على نطاق zoom.us" },
     );
   ```
2. **توحيد أرقام الهواتف المصرية بصيغة E.164:**
   - تحويل `01001234567` أو `+20 100 123 4567` تلقائياً إلى الصيغة القياسية `+201001234567`.

---

## 7. التوافق المزدوج لقواعد البيانات والتحويل الآلي (Dual-Provider Schema Translation)

### 💡 المبدأ الهندسي:
**تصميم الـ Schema لتعمل بكفاءة مطلقة على Microsoft SQL Server (محلياً) و PostgreSQL (سحابياً) دون تعديل كود التطبيق.**

### 🛠️ قواعد التوافق (`scripts/use-db-provider.mjs`):
1. **تجنب الـ Enums على مستوى قاعدة البيانات:**
   - تعريف الحالات كـ `TypeScript unions` في `lib/domain/enums.ts` والتحقق منها عبر Zod.
2. **الحفاظ على الحروف العربية عبر Unicode NVARCHAR:**
   - في SQL Server: استخدام `@db.NVarChar(Max)` و `@db.NVarChar(n)`، لأن `VARCHAR` العادي يحول النصوص العربية إلى علامات استفهام (`????`).
   - في PostgreSQL: يتم تحويلها تلقائياً إلى `@db.Text` و `@db.VarChar(n)`.
3. **تحديد أطوال صريحة للمفاتيح الأجنبية (`@db.NVarChar(30)`):**
   - لمنع كسر حد الفهارس في SQL Server (حد أقصى 900 بايت للفهرس).

---

## 8. أنماط واجهات المستخدم والحالات الحرجة (Non-Optimistic UI & useActionState)

### 💡 المبدأ الهندسي:
**في العمليات المالية والطبية، لا تستخدم التحديث التفاؤلي (Optimistic Updates). إظهار حالة لم تؤكدها قاعدة البيانات أسوأ من الانتظار لثوانٍ.**

### 🛠️ نمط الكود الإلزامي (`PaymentVerificationDesk.tsx`):
1. ربط النماذج بـ React 19 `useActionState` لدعم الـ Progressive Enhancement:
   ```tsx
   const [state, formAction, isPending] = useActionState(approvePaymentAction, null);
   ```
2. **عدم كشف روابط الواتساب إلا بعد تأكيد السيرفر للعملية:**
   - لا يتم إظهار زر محادثة المريض لتأكيد الحجز إلا بعد أن يرجع السيرفر بنجاح `state.ok === true` حقيقي ومسجل في الـ Database.

---

## 🎯 خلاصة التطبيق العملي
عند تكليفي بأي مهمة جديدة:
1. صمم الجداول بقيد فريد مركب يمنع تعارض البيانات.
2. اكتب Server Actions ترجع `ActionResult<T>` موحدة ثنائية اللغة.
3. افحص المدخلات بـ Zod وقوائم النطاقات الآمنة.
4. خزن المواعيد بـ UTC فقط والدقائق من منتصف الليل.
5. احمِ الملفات المرفوعة بالبايتات السحرية وضعها خارج المجلد العام.
6. اكتب اختبارات منطقية للمحرك الحسابي والتشفير في `tests/`.
