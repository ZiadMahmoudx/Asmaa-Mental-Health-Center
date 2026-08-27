import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { TelehealthProvider } from "@/context/TelehealthStore";
import { CrisisBanner } from "@/components/layout/CrisisBanner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AIAssistantDrawer } from "@/components/assistant/AIAssistantDrawer";

export const metadata: Metadata = {
  title: "مركز أسما للصحة النفسية | Asmaa Mental Health Center",
  description: "المنصة الطبية الرائدة للاستشارات النفسية والعلاج المعرفي السلوكي وعلاج الإدمان عن بُعد بإشراف نخبة من الاستشاريين المعتمدين.",
  keywords: "طب نفسي, استشارات نفسية, علاج معرفي سلوكي, هلع, اكتئاب, استشارات زوجية, علاج الإدمان, telepsychiatry, mental health egypt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
          <TelehealthProvider>
            <div className="flex flex-col min-h-screen">
              <CrisisBanner />
              <Navbar />
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
