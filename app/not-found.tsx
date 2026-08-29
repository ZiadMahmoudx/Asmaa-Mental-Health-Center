import Link from "next/link";
import { HelpCircle, Home, PhoneCall, HeartHandshake } from "lucide-react";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata() {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "الصفحة غير موجودة (404) | مركز أسما للصحة النفسية"
        : "Page Not Found (404) | Asmaa Mental Health Center",
  };
}

export default async function NotFound() {
  const lang = await getLanguage();
  const isAr = lang === "ar";

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-alabaster-base">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-alabaster-border shadow-sm p-8 sm:p-10 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto text-teal-800 shadow-xs">
          <HelpCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-sage-700 block">
            Error 404
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
            {isAr ? "عذراً، لم نتمكن من العثور على هذه الصفحة" : "Sorry, we could not find this page"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
            {isAr
              ? "الصفحة التي تبحث عنها قد تكون نُقلت أو تم تعديل رابطها. يمكنك العودة إلى الصفحة الرئيسية أو تصفح خدمات المركز."
              : "The page you are looking for may have been moved, renamed, or is temporarily unavailable. You can return home or explore clinical services."}
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>{isAr ? "الصفحة الرئيسية" : "Return to Home"}</span>
          </Link>

          <Link
            href="/therapists"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-alabaster-base hover:bg-gray-100 text-teal-950 border border-alabaster-border text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <span>{isAr ? "دليل الأطباء" : "Find a Doctor"}</span>
          </Link>
        </div>

        {/* Emergency crisis reminder on 404 */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-start bg-red-50/60 p-3.5 rounded-2xl border border-red-100">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="w-4 h-4 text-crisis shrink-0" />
            <div className="text-[11px] text-gray-700 leading-tight">
              <span className="font-bold text-crisis-dark block">
                {isAr ? "في حالة الطوارئ النفسية:" : "In a mental health crisis:"}
              </span>
              <span>{isAr ? "الخط الساخن المجاني متاح 24/7" : "Free 24/7 hotline available"}</span>
            </div>
          </div>
          <a
            href="tel:16328"
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-black shrink-0 transition flex items-center gap-1 shadow-xs"
          >
            <PhoneCall className="w-3 h-3" />
            <span>16328</span>
          </a>
        </div>
      </div>
    </div>
  );
}
