import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { CrisisBanner } from "@/components/layout/CrisisBanner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CsrfSync } from "@/components/common/CsrfSync";
import { getAuthContext } from "@/lib/auth/session";
import { readCsrfToken } from "@/lib/auth/csrf";
import { getLanguage, getDirection } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "مركز أسما للصحة النفسية | Asmaa Mental Health Center",
  description:
    "المنصة الطبية الرائدة للاستشارات النفسية والعلاج المعرفي السلوكي وعلاج الإدمان عن بُعد بإشراف نخبة من الاستشاريين المعتمدين.",
  keywords:
    "طب نفسي, استشارات نفسية, علاج معرفي سلوكي, هلع, اكتئاب, استشارات زوجية, علاج الإدمان, telepsychiatry, mental health egypt",
};

/**
 * Root layout.
 *
 * Server Component resolving auth, CSRF token, and the visitor's language
 * (via the `asmaa_lang` cookie). Renders <html lang={lang} dir={dir}> on the
 * server so English users receive LTR markup on first paint with zero hydration flash.
 */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [auth, csrfToken, lang] = await Promise.all([
    getAuthContext(),
    readCsrfToken(),
    getLanguage(),
  ]);
  const dir = getDirection(lang);

  const navUser = auth
    ? {
        fullName: auth.user.fullName,
        email: auth.user.email,
        role: auth.user.role,
      }
    : null;

  return (
    <html lang={lang} dir={dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-alabaster-base text-gray-800 selection:bg-teal-100 selection:text-teal-900">
        <LanguageProvider initialLanguage={lang}>
          <CsrfSync />
          <div className="flex flex-col min-h-screen">
            <CrisisBanner />
            <Navbar user={navUser} csrfToken={csrfToken} />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
