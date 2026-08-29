import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata() {
  const lang = await getLanguage();
  return {
    title:
      lang === "ar"
        ? "صلاحية غير كافية | مركز أسما للصحة النفسية"
        : "Access Denied | Asmaa Mental Health Center",
  };
}

export default async function ForbiddenPage() {
  const lang = await getLanguage();
  const isAr = lang === "ar";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 bg-alabaster-base">
      <div className="max-w-md w-full bg-white rounded-3xl border border-alabaster-border shadow-sm p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-crisis-light flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7 text-crisis" />
        </div>
        <h1 className="text-lg font-black text-teal-950">
          {isAr ? "لا تملك صلاحية الوصول لهذه الصفحة" : "You do not have permission to view this page"}
        </h1>
        <p className="text-xs text-gray-600 leading-relaxed">
          {isAr
            ? "هذه الصفحة مخصّصة لفريق العمل الطبي أو الإداري. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع إدارة المركز."
            : "This page is restricted to authorized clinic staff. If you believe this is an error, please contact clinic administration."}
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition shadow-sm"
        >
          {isAr ? "العودة إلى لوحتك" : "Return to Dashboard"}
        </Link>
      </div>
    </div>
  );
}
