import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "صلاحية غير كافية | مركز أسما للصحة النفسية",
};

export default function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 bg-alabaster-base">
      <div className="max-w-md w-full bg-white rounded-3xl border border-alabaster-border shadow-sm p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-crisis-light flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7 text-crisis" />
        </div>
        <h1 className="text-lg font-black text-teal-950">لا تملك صلاحية الوصول لهذه الصفحة</h1>
        <p className="text-xs text-gray-600 leading-relaxed">
          هذه الصفحة مخصّصة لفريق العمل الطبي أو الإداري. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع
          إدارة المركز.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-extrabold transition"
        >
          العودة إلى لوحتك
        </Link>
      </div>
    </div>
  );
}
