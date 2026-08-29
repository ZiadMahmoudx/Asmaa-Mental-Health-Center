# 🚀 Pre-Launch Production Smoke Test Checklist
*(10-Minute Walkthrough Before Public Announcement)*

Perform this walkthrough against the production environment immediately after deployment and before opening the platform to real patients.

---

### A. Core Manual Payment & Verification Chain
1. [ ] **Patient Registration**: Register a new patient account (`/register`).
2. [ ] **Online Booking Hold**: Book an **ONLINE** session. Confirm the hold countdown timer appears and the InstaPay handle / Vodafone Cash numbers shown are the **clinic's real production numbers**, not placeholder values.
3. [ ] **Receipt Submission**: Upload a real receipt image (JPEG/PNG/PDF). Confirm the booking transitions to `PAYMENT_UNDER_REVIEW` and redirects to `/dashboard/patient`.
4. [ ] **Verification Desk Receipt Rendering**: Sign in as Admin, navigate to `/dashboard/admin/verification`, and open the pending receipt. Confirm the image/PDF renders cleanly from persistent storage.
5. [ ] **Zoom Link Attachment & Approval**: Enter a verified Zoom meeting URL + passcode and click **"اعتماد الدفع وتأكيد الحجز"**. Confirm the appointment transitions to `CONFIRMED` and the WhatsApp confirmation message includes the Zoom link.
6. [ ] **Patient Portal Reflection**: As the patient, refresh `/dashboard/patient` and confirm the Zoom button and credentials appear on the confirmed session card.

---

### B. Patient Credit Ledger & Round-Trip Booking
7. [ ] **Clinic-Initiated Cancellation**: As Admin or Doctor, cancel that **CONFIRMED** appointment with a cancellation reason.
8. [ ] **Atomic Credit Issuance**: Confirm a `CANCELLATION` credit row is created for the full session fee, and the patient's dashboard displays the updated credit balance.
9. [ ] **Credit-Covered Online Booking**: As the patient, book a new **ONLINE** session selecting "Apply Credit".
10. [ ] **Verification Queue Entry (F13 Regression Check)**: In `/dashboard/admin/verification`, confirm the new booking appears in the queue with the badge: *"مدفوع من الرصيد — لا يوجد إيصال للمراجعة، يلزم إرفاق رابط زووم فقط قبل الاعتماد"*.
11. [ ] **Approval**: Attach the Zoom link and approve. Confirm it reaches `CONFIRMED`.
12. [ ] **Credit-Covered Offline Booking**: Book an **OFFLINE** session using credit. Confirm it auto-confirms immediately without entering the queue, and the decision log shows *"النظام (رصيد مالي)"* (F18 Check).

---

### C. Financial Settlement via InstaPay
13. [ ] **Generate Balance**: Cancel a session to create an outstanding positive balance.
14. [ ] **Admin Settlement**: In `/dashboard/admin/credits`, click **"تسوية الرصيد"**, enter a real InstaPay transaction reference (`IP-...`), and confirm.
15. [ ] **Single Payout Entry**: Confirm the patient's balance returns to 0.00 EGP, and exactly **one** `PAID_OUT` row exists with the reference.

---

### D. Scheduled Cron Jobs
16. [ ] **Hold Release Cron**: Invoke `GET /api/cron/release-holds` with `Authorization: Bearer <CRON_SECRET>`. Confirm `200 OK` (and `401 Unauthorized` without the header).
17. [ ] **Reminder Notification Cron**: Invoke `GET /api/cron/send-reminders` with `Authorization: Bearer <CRON_SECRET>`. Confirm `200 OK` and inspect the audit log.

---

### E. Security & Access Control
18. [ ] **Doctor Isolation**: Sign in as Doctor A and attempt to view Doctor B's schedule or patient clinical records. Confirm 403 Forbidden.
19. [ ] **Unauthenticated Redirection**: Visit `/dashboard/admin` and `/dashboard/patient` in an incognito window without logging in. Confirm clean redirect to `/login`.

---

**Sign-off:** All 19 steps verified and passed before clinic announcement.
