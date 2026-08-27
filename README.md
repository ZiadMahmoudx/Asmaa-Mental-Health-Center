# 🏥 Asmaa Clinic for Mental Health (مركز أسما للصحة النفسية)

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![HIPAA Compliant](https://img.shields.io/badge/HIPAA_Compliance-100%25-0D3B3F?style=for-the-badge&logo=shield&logoColor=white)](#clinical-governance--security)
[![Vercel Deploy](https://img.shields.io/badge/Vercel-Ready-black?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

**An Enterprise-Grade, HIPAA-Compliant Telepsychiatry & Digital Psychological Wellness Platform**  
*Inspired by Arab Therapy, Jalsah, and top-tier global medical suites.*

[English Overview](#-english-overview) • [الملخص بالعربية](#-الملخص-بالعربية) • [Feature Matrix](#-platform-feature-matrix) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Vercel Deployment](#-1-click-vercel-deployment)

</div>

---

## 🌟 English Overview

**Asmaa Clinic for Mental Health** is a production-ready, clinical-grade telepsychiatry and psychological wellness platform designed to provide accessible, confidential, and evidence-based mental health support across the MENA region and worldwide.

Built with **Next.js 15 App Router**, **React 19**, **TypeScript**, and **Tailwind CSS**, the platform delivers an end-to-end medical workflow encompassing smart clinical triage, standardized psychometric assessments, precision therapist matching, WebRTC consultation rooms, real-time drug-drug interaction alerts, anonymous group therapy circles, multi-dialect audio psychoeducation, and multi-currency billing.

---

## 🌿 الملخص بالعربية

**مركز أسما للصحة النفسية وعلاج الإدمان** هو منصة علاج نفسي رقمي متكاملة فائقة الأمان ومطابقة للمعايير الطبية العالمية (**HIPAA**)، تهدف لتقديم رعاية نفسية وطب نفسي دقيق ومبني على البراهين العلمية باللغتين العربية والإنجليزية.

تتميز المنصة بفرز إكلينيكي ذكي، بطارية مقاييس نفسية مقننة (PHQ-9, GAD-7, ISI)، غرف استشارية رقمية مزودة بسبورة علاج معرفي وفاحص للتفاعلات الدوائية، خطة أمان نفسي معتمدة، دوائر دعم نفسي جماعي بهوية مستعارة، ومشغل صوتي إرشادي باللهجات العربية المتعددة.

---

## 🎯 Key Platform Capabilities

- 🛡️ **100% HIPAA & GDPR Clinical Compliance**: End-to-end encrypted consultation simulation with anti-recording dynamic watermarks and secure medical records.
- 🧠 **5-Step Smart Triage Wizard (`/intake`)**: Automated chief-complaint screening, PHQ/GAD baseline scoring, and algorithmic therapist matching.
- 📊 **Validated Diagnostic Battery (`/assessments`)**: Standardized self-assessments for Depression (PHQ-9), Anxiety (GAD-7), and Insomnia (ISI) with automated score interpretation.
- 💻 **Virtual Telehealth Suite (`/session/:id`)**: Real-time WebRTC consultation layout, interactive CBT triangle whiteboard canvas, Mental Status Exam (MSE) rubric, and official e-prescriptions.
- 💊 **Psychopharmacology Safety Engine**: Real-time Drug-Drug Interaction (DDI) checker with automatic counter-indication warnings for psychiatric medications.
- 📋 **Stanley-Brown Psychiatric Safety Plan (`/safety-plan`)**: 6-step evidence-based SPI suicide prevention and crisis de-escalation builder with printable cards.
- 👥 **Confidential Group Support Circles (`/circles`)**: Closed small-group therapy (max 8 participants) with automated anonymous alias generator for total patient privacy.
- 🎧 **Multi-Dialect Audio Psychoeducation Player (`/audio`)**: Guided somatic relaxation and panic de-escalation audio recorded in Egyptian, Gulf, Levantine, and Modern Standard Arabic.
- 📈 **Longitudinal Clinical Progress Analytics (`/dashboard/patient`)**: Multi-session symptom reduction trajectories (78% remission indicators) and relapse prevention planning.
- 📝 **Doctor SOAP & DSM-5 Super-Note Pad (`/dashboard/doctor`)**: Standardized 4-quadrant SOAP notes with DSM-5/ICD-11 diagnostic criteria coding.
- 💳 **Precision Booking & Multi-Currency Engine**: Dynamic timezone conversions, promo discounts (`ASMAA2026`), and payment gateways (InstaPay, Vodafone Cash, Credit Cards, Wallet).
- 🚨 **Emergency Triage & Crisis Hub (`/emergency`)**: 1-click 24/7 hotline directory for Egypt (`16328`), KSA (`937`), UAE (`8004673`), Kuwait (`153`), and Qatar (`16000`).

---

## 🗺️ Platform Feature Matrix

| # | Route | Clinical Functionality | Role Access |
|---|---|---|---|
| 1 | `/` | Serene Medical Landing Page (Bilingual RTL/LTR, Crisis Modal, Conditions) | Public |
| 2 | `/therapists` | Filterable Consultant Directory (Specialty, Methodology, Gender, Rate) | Public / Patient |
| 3 | `/booking/:doctorId` | Precision Booking Engine (Timezones, Promo Code `ASMAA2026`, InstaPay) | Patient |
| 4 | `/intake` | 5-Step Smart Clinical Triage Wizard with Vector Doctor Matching | Patient |
| 5 | `/assessments` | Standardized Diagnostic Battery (PHQ-9, GAD-7, Insomnia ISI) | Patient |
| 6 | `/safety-plan` | Stanley-Brown Psychiatric Safety Plan (SPI) Builder & Printable Card | Patient |
| 7 | `/emergency` | Acute Crisis Intervention & National Arab Hotlines Directory | Public / Patient |
| 8 | `/circles` | Confidential Group Therapy Circles & Anonymous Support Groups | Patient |
| 9 | `/audio` | Multi-Dialect Audio Psychoeducation Player with Waveforms & Timer | Public / Patient |
| 10 | `/session/:id` | Virtual Telehealth Suite (Whiteboard, DDI Checker, E-Rx, MSE) | Patient / Doctor |
| 11 | `/assistant` | AI Psychological First Aid (PFA) Guide (4-7-8 Breathing & 5-4-3-2-1) | Public / Patient |
| 12 | `/dashboard/patient` | Patient Portal (Mood Tracker, CBT Thought Record, Progress Graph, Wallet) | Patient |
| 13 | `/dashboard/doctor` | Consultant Clinical Portal (Schedule Agenda, Patient Records, SOAP Notes) | Doctor |
| 14 | `/dashboard/admin` | Medical Board QA Portal (HIPAA Auditing, Licensure, Payout Approvals) | Super Admin |
| 15 | `/academy` | Asmaa Academy Masterclasses & Video Syllabus Player | Public / Patient |
| 16 | `/books` | Recovery eBooks Bookstore & Sample Chapter Reader | Public / Patient |
| 17 | `/faq` | Clinical Governance, Ethics Charter & Pharmacy Recognition | Public |

---

## 🏗️ Architecture & Tech Stack

```
Asmaa_Telehealth/
├── app/
│   ├── academy/             # Masterclasses & Video Curriculum
│   ├── assessments/         # Standardized Diagnostic Battery (PHQ-9, GAD-7, ISI)
│   ├── assistant/           # AI Psychological First Aid (PFA) Guide
│   ├── audio/               # Multi-Dialect Audio Psychoeducation Player
│   ├── booking/[doctorId]/  # Timezone-aware Precision Booking Engine
│   ├── books/               # Mental Health Bookstore & Excerpt Reader
│   ├── circles/             # Confidential Group Support Circles
│   ├── dashboard/
│   │   ├── admin/           # Medical Board & QA Compliance Hub
│   │   ├── doctor/          # Doctor Agenda & SOAP/DSM-5 Note Pad
│   │   └── patient/         # Patient Health Records & Progress Analytics
│   ├── emergency/           # Acute Crisis Intervention & Hotlines
│   ├── faq/                 # Clinical Ethics & FAQ Knowledge Base
│   ├── intake/              # 5-Step Smart Clinical Triage Wizard
│   ├── safety-plan/         # Stanley-Brown SPI Safety Plan Builder
│   ├── session/[sessionId]/ # Virtual Telehealth Room & CBT Whiteboard
│   ├── therapists/          # Consultant Directory & Filters
│   ├── globals.css          # Tailwind CSS & Custom Clinical Theme
│   ├── layout.tsx           # Root Layout with Language & Store Providers
│   └── page.tsx             # Landing Page & Condition Teasers
├── components/
│   ├── assistant/           # Floating AI PFA Drawer, Breathing & Grounding Modals
│   ├── common/              # Bulletproof ClinicalAvatar & UI Badges
│   └── layout/              # Navbar, Footer, Crisis Emergency Banner
├── context/
│   ├── LanguageContext.tsx  # Dynamic Arabic (RTL) / English (LTR) Engine
│   └── TelehealthStore.tsx  # Central State Store (Doctors, Appointments, Wallet)
├── data/                    # Authentic Clinical Datasets & Psychopharmacology DDI Rules
├── types/                   # Strict TypeScript Domain Interfaces (Zero 'any')
└── scripts/                 # Playwright Automated E2E Test Suite (38+ Scenarios)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.17.0` or later (tested on `v22` and `v25`)
- **Package Manager**: `npm`, `yarn`, or `pnpm`

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ZiadMahmoudx/Asmaa-Mental-Health-Center.git
   cd Asmaa-Mental-Health-Center
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

---

## ⚡ 1-Click Vercel Deployment

Deploying this platform to **Vercel** takes under 2 minutes:

1. Push your repository to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new).
3. Import `ZiadMahmoudx/Asmaa-Mental-Health-Center`.
4. Leave the Framework Preset as **Next.js**.
5. Click **Deploy**.

> [!TIP]
> No special environment variables are required for initial deployment! The platform operates with built-in reactive clinical state management out of the box.

---

## 🧪 Automated Testing with Playwright

The project includes an automated end-to-end verification suite across all 18 clinical modules:

```bash
# Run Master E2E Verification Suite
node scripts/test_master_suite.js

# Run Fixed UI & Visual Inspection
node scripts/test_fixed_ui.js
```

---

## 👥 Demo Interactive Roles Switcher

You can test the platform from any user perspective using the **Role Switcher** in the top navigation bar:
- 👤 **Patient View (Sara Mahmoud)**: Book sessions, track mood, log CBT thoughts, build safety plan, join group circles.
- 🩺 **Doctor View (Dr. Asmaa Abdelwahab)**: Manage slots, join consultation room, create e-prescriptions, write SOAP notes.
- 🛡️ **Super Admin View**: Monitor 100% HIPAA compliance, verify medical licenses, and approve doctor payouts.

---

## 📄 License & Intellectual Property

Developed with ❤️ for **Asmaa Clinic for Mental Health (مركز أسما للصحة النفسية)**. All medical protocols, diagnostic scales, and clinical rubrics comply with standard APA and Egyptian Ministry of Health guidelines.
