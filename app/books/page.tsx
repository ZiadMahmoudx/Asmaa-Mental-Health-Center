"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Star,
  Download,
  CheckCircle2,
  Lock,
  Award,
  X,
  CreditCard,
  Wallet,
  Eye,
  FileText,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { formatCurrency } from "@/lib/utils";
import { MentalHealthBook } from "@/types/telehealth";

export default function BooksPage() {
  const { language } = useLanguage();
  const { books, purchasedBookIds, purchaseBook, currentUser } = useTelehealth();

  const [activeBookModal, setActiveBookModal] = useState<MentalHealthBook | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState("");

  const handlePurchase = (bookId: string) => {
    setPurchaseError("");
    const success = purchaseBook(bookId);
    if (success) {
      setPurchaseSuccess(true);
      setTimeout(() => setPurchaseSuccess(false), 3000);
    } else {
      setPurchaseError(
        language === "ar"
          ? "رصيد المحفظة غير كافٍ. يرجى شحن المحفظة من لوحة التحكم."
          : "Insufficient wallet balance. Please top up in your dashboard."
      );
    }
  };

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-terracotta-50 text-terracotta-900 text-xs font-bold border border-terracotta-200">
            <BookOpen className="w-3.5 h-3.5 text-terracotta-600" />
            <span>{language === "ar" ? "مكتبة التعافي والكتب الإكلينيكية" : "Mental Health & Clinical Library"}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-teal-950">
            {language === "ar" ? "كتب المساعدة الذاتية وأدلة العلاج المعرفي" : "Self-Help Guides & Cognitive Workbooks"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600">
            {language === "ar"
              ? "كتب إلكترونية وجداول تمارين تطبيقية مؤلفة من قبل نخبة استشاريي مركز أسما للصحة النفسية."
              : "Practical clinical literature and self-monitoring workbooks authored by senior psychiatrists."}
          </p>
        </div>

        {/* Books Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            const isPurchased = purchasedBookIds.includes(book.id);

            return (
              <div
                key={book.id}
                className="bg-white rounded-3xl border border-alabaster-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Book Cover Image */}
                  <div className="relative h-64 w-full bg-gray-50 flex items-center justify-center p-4 border-b border-gray-100 overflow-hidden">
                    <img
                      src={book.coverImage}
                      alt={book.title}
                      className="h-full w-auto object-cover rounded-2xl shadow-lg group-hover:scale-105 transition duration-500"
                    />
                    <span className="absolute top-3 right-3 bg-teal-950/80 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                      {book.pagesCount} {language === "ar" ? "صفحة" : "pages"}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <span className="text-[10px] font-bold text-terracotta-700 uppercase">
                      {language === "ar" ? book.category : book.categoryEn}
                    </span>

                    <h3 className="font-extrabold text-base text-teal-950 group-hover:text-teal-800 transition leading-snug">
                      {language === "ar" ? book.title : book.titleEn}
                    </h3>

                    <p className="text-xs text-sage-800 font-semibold">
                      {language === "ar" ? `المؤلف: ${book.author}` : `Author: ${book.author}`}
                    </p>

                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                      {language === "ar" ? book.description : book.descriptionEn}
                    </p>
                  </div>
                </div>

                {/* Price & Actions */}
                <div className="p-5 pt-0 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between pt-3">
                    <div>
                      <span className="text-[10px] text-gray-400 block">
                        {language === "ar" ? "سعر الكتاب (نسخة رقمية)" : "Digital eBook Price"}
                      </span>
                      <span className="font-black text-teal-900 text-base">
                        {formatCurrency(book.priceEGP, "EGP", language)}
                      </span>
                    </div>

                    {isPurchased ? (
                      <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === "ar" ? "تم الشراء" : "Purchased"}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePurchase(book.id)}
                        className="px-5 py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                      >
                        {language === "ar" ? "شراء فوري" : "Buy eBook"}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveBookModal(book)}
                    className="w-full text-center text-xs font-bold text-teal-800 hover:underline flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "قراءة مقتطف من الكتاب" : "Read Sample Excerpt"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Book Sample Excerpt Modal */}
        {activeBookModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setActiveBookModal(null)}
                className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4 mb-6">
                <img
                  src={activeBookModal.coverImage}
                  alt={activeBookModal.title}
                  className="w-20 h-28 object-cover rounded-xl shadow-md"
                />
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] font-bold text-terracotta-700 uppercase">
                    {language === "ar" ? activeBookModal.category : activeBookModal.categoryEn}
                  </span>
                  <h3 className="font-black text-lg text-teal-950">
                    {language === "ar" ? activeBookModal.title : activeBookModal.titleEn}
                  </h3>
                  <p className="text-xs text-sage-800 font-semibold">{activeBookModal.author}</p>
                  <p className="text-[11px] text-gray-400">{activeBookModal.pagesCount} صفحة • PDF عالي الجودة</p>
                </div>
              </div>

              {/* Sample Excerpt Reader Box */}
              <div className="bg-alabaster-base p-6 rounded-2xl border border-alabaster-border space-y-3 font-serif">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-xs pb-2 border-b border-gray-200">
                  <FileText className="w-4 h-4 text-teal-700" />
                  <span>{language === "ar" ? "مقتطف للقراءة والمعاينة:" : "Sample Excerpt:"}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                  {language === "ar" ? activeBookModal.sampleExcerpt : activeBookModal.sampleExcerptEn}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block">السعر:</span>
                  <span className="font-black text-teal-900 text-lg">
                    {formatCurrency(activeBookModal.priceEGP, "EGP", language)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handlePurchase(activeBookModal.id);
                    setActiveBookModal(null);
                  }}
                  className="px-6 py-3 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-2xl shadow transition"
                >
                  {language === "ar" ? "شراء النسخة الكاملة الآن" : "Purchase Full Edition"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
