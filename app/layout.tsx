import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { TelehealthProvider } from "@/context/TelehealthStore";
import { CrisisBanner } from "@/components/layout/CrisisBanner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AIAssistantDrawer } from "@/components/assistant/AIAssistantDrawer";
import { getAuthContext } from "@/lib/auth/session";
import { readCsrfToken } from "@/lib/auth/csrf";

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
 * This is a Server Component so the session can be resolved once per request and
 * handed to the navbar as data. That is what replaced the old client-side role
 * switcher: identity now originates on the server and the client cannot choose
 * it. `getAuthContext` is wrapped in React `cache`, so pages that also need the
 * session share this single database round-trip.
 *
 * `force-dynamic` because every request renders the signed-in user's name; a
 * cached shell would show one visitor's identity to another.
 */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [auth, csrfToken] = await Promise.all([getAuthContext(), readCsrfToken()]);

  const navUser = auth
    ? {
        fullName: auth.user.fullName,
        email: auth.user.email,
        role: auth.user.role,
      }
    : null;

  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-alabaster-base text-gray-800 selection:bg-teal-100 selection:text-teal-900">
        <LanguageProvider>
          {/* TelehealthProvider still backs the content areas that are not part
              of the Phase-1 clinical flow (academy, books, circles, audio). It no
              longer has any role in authentication. */}
          <TelehealthProvider>
            <div className="flex flex-col min-h-screen">
              <CrisisBanner />
              <Navbar user={navUser} csrfToken={csrfToken} />
              <main className="flex-grow">{children}</main>
              <Footer />
              <AIAssistantDrawer />
            </div>
          </TelehealthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
