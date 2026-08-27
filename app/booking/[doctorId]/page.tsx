"use client";

import React, { useState, use } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Clock,
  Globe,
  CreditCard,
  Wallet,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Tag,
  ArrowRight,
  ArrowLeft,
  Download,
  MessageCircle,
  Video,
  User,
  Phone,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTelehealth } from "@/context/TelehealthStore";
import { PaymentMethod } from "@/types/telehealth";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function BookingDoctorPage({
  params,
}: {
  params: Promise<{ doctorId: string }>;
}) {
  const resolvedParams = use(params);
  const doctorId = resolvedParams.doctorId;

  const { language } = useLanguage();
  const { doctors, currentUser, bookAppointment } = useTelehealth();
  const router = useRouter();

  const doctor = doctors.find((d) => d.id === doctorId) || doctors[0];

  const [selectedSlotId, setSelectedSlotId] = useState<string>(doctor.availableSlots[0]?.id || "");
  const [duration, setDuration] = useState<45 | 60>(45);
  const [selectedTimezone, setSelectedTimezone] = useState("Africa/Cairo");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CREDIT_CARD");
  const [promoCode, setPromoCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");

  // Payment form mock inputs
  const [cardNumber, setCardNumber] = useState("4123 •••• •••• 8492");
  const [cardExpiry, setCardExpiry] = useState("09/28");
  const [cardCvc, setCardCvc] = useState("892");
  const [walletPhone, setWalletPhone] = useState("+20 100 234 5678");

  // Booking result state
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedAppointmentId, setConfirmedAppointmentId] = useState<string>("");

  const ArrowNext = language === "ar" ? ArrowLeft : ArrowRight;

  const basePrice = duration === 60 ? Math.round(doctor.sessionRateEGP * 1.25) : doctor.sessionRateEGP;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError("");
    const code = promoCode.trim().toUpperCase();
    if (code === "ASMAA2026") {
      const discount = Math.round(basePrice * 0.2);
      setDiscountAmount(discount);
      setPromoApplied(true);
    } else if (code === "TAAFI50") {
      setDiscountAmount(50);
      setPromoApplied(true);
    } else {
      setPromoError(language === "ar" ? "كوبون غير صالح أو منتهي الصلاحية" : "Invalid or expired promo code");
    }
  };

  const handleConfirmBooking = () => {
    const chosenSlot = doctor.availableSlots.find((s) => s.id === selectedSlotId) || doctor.availableSlots[0];
    const roomId = `room-${Date.now().toString().slice(-6)}`;

    const newApt = bookAppointment({
      patientId: currentUser.id,
      patientName: currentUser.name,
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      doctorAvatar: doctor.avatar,
      doctorTitle: doctor.title,
      scheduledAtUTC: chosenSlot?.startTimeUTC || new Date().toISOString(),
      durationMinutes: duration,
      status: "CONFIRMED",
      paymentMethod,
      pricePaid: finalPrice,
      currency: "EGP",
      videoRoomId: roomId,
      meetingUrl: `/session/${roomId}`,
      promoCodeApplied: promoApplied ? promoCode : undefined,
    });

    setConfirmedAppointmentId(newApt.id);
    setIsConfirmed(true);
  };

  const downloadIcsCalendar = () => {
    const chosenSlot = doctor.availableSlots.find((s) => s.id === selectedSlotId) || doctor.availableSlots[0];
    const startTime = new Date(chosenSlot.startTimeUTC).toISOString().replace(/-|:|\.\d+/g, "");
    const endTime = new Date(new Date(chosenSlot.startTimeUTC).getTime() + duration * 60000)
      .toISOString()
      .replace(/-|:|\.\d+/g, "");

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Asmaa Clinic//Telehealth Session//AR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:apt-${confirmedAppointmentId}@asmaaclinic.com
DTSTAMP:${startTime}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:جلسة استشارية نفسية - ${doctor.fullName} (مركز أسما)
DESCRIPTION:جلسة علاجية مشفرة عبر منصة مركز أسما للصحة النفسية. رابط الغرفة: https://asmaaclinic.com/session/room-${confirmedAppointmentId}
LOCATION:منصة عيادة أسما الرقمية (غرفة فيديو مشفرة)
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `asmaa-session-${doctor.fullName}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen py-10 bg-alabaster-base">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {!isConfirmed ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <Link
                href="/therapists"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 mb-2"
              >
                <ArrowNext className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "العودة لقائمة الأطباء" : "Back to Directory"}</span>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-teal-950">
                {language === "ar" ? "تأكيد حجز الجلسة العلاجية" : "Book Your Clinical Consultation"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                {language === "ar"
                  ? "اختر الموعد المناسب لجدولك، وحدد طريقة الدفع لتأكيد حجز غرفتك المشفرة فوراً."
                  : "Select your preferred slot, duration, and payment gateway to secure your encrypted session."}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form: Slots, Timezone, Payment */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Timezone & Duration */}
                <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-teal-950 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sage-700" />
                    <span>{language === "ar" ? "1. المنطقة الزمنية ومدة الجلسة" : "1. Timezone & Duration"}</span>
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        {language === "ar" ? "المنطقة الزمنية المحلية:" : "Your Local Timezone:"}
                      </label>
                      <select
                        value={selectedTimezone}
                        onChange={(e) => setSelectedTimezone(e.target.value)}
                        className="w-full bg-alabaster-muted px-4 py-2.5 rounded-xl text-xs text-gray-800 border border-alabaster-border focus:outline-none focus:border-teal-700 font-medium"
                      >
                        <option value="Africa/Cairo">توقيت القاهرة (GMT+3 / GMT+2)</option>
                        <option value="Asia/Riyadh">توقيت الرياض / مكة المكرمة (GMT+3)</option>
                        <option value="Asia/Dubai">توقيت دبي / أبوظبي (GMT+4)</option>
                        <option value="Europe/London">توقيت لندن (GMT+1 / BST)</option>
                        <option value="America/New_York">توقيت نيويورك (EST/EDT)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        {language === "ar" ? "مدة الجلسة الاستشارية:" : "Session Length:"}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setDuration(45)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                            duration === 45
                              ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                              : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                          }`}
                        >
                          <span>45 {language === "ar" ? "دقيقة" : "Minutes"}</span>
                          <span className={`text-[10px] ${duration === 45 ? "text-teal-200" : "text-gray-400"}`}>
                            {language === "ar" ? "جلسة علاجية قياسية" : "Standard Therapy"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDuration(60)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                            duration === 60
                              ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                              : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                          }`}
                        >
                          <span>60 {language === "ar" ? "دقيقة" : "Minutes"}</span>
                          <span className={`text-[10px] ${duration === 60 ? "text-teal-200" : "text-gray-400"}`}>
                            {language === "ar" ? "تقييم سريري شامل" : "Comprehensive Intake"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Slot Selection */}
                <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-teal-950 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-sage-700" />
                    <span>{language === "ar" ? "2. اختر الموعد المناسب" : "2. Select Available Slot"}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {doctor.availableSlots.map((slot) => {
                      const isSelected = selectedSlotId === slot.id;
                      const formattedTime = formatDateTime(slot.startTimeUTC, language, selectedTimezone);

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={slot.isBooked}
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`p-3 rounded-2xl border text-start rtl:text-right ltr:text-left transition ${
                            slot.isBooked
                              ? "opacity-40 bg-gray-100 border-gray-200 cursor-not-allowed"
                              : isSelected
                              ? "bg-teal-50 border-teal-700 text-teal-950 ring-2 ring-teal-700 shadow-xs font-bold"
                              : "bg-white text-gray-700 border-gray-200 hover:border-sage-400 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="w-3.5 h-3.5 text-sage-700" />
                            <span>{formattedTime}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Payment Method Orchestrator */}
                <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm text-teal-950 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sage-700" />
                    <span>{language === "ar" ? "3. طريقة الدفع وتأكيد الحجز" : "3. Payment Gateway"}</span>
                  </h3>

                  {/* Payment Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "CREDIT_CARD", labelAr: "بطاقة بنكية", labelEn: "Card", icon: CreditCard },
                      { id: "INSTAPAY", labelAr: "InstaPay", labelEn: "InstaPay", icon: QrCode },
                      { id: "VODAFONE_CASH", labelAr: "فودافون كاش", labelEn: "Vodafone Cash", icon: Phone },
                      { id: "WALLET", labelAr: "رصيد المحفظة", labelEn: "Wallet", icon: Wallet },
                    ].map((pm) => {
                      const Icon = pm.icon;
                      const isSelected = paymentMethod === pm.id;
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                          className={`p-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 ${
                            isSelected
                              ? "bg-teal-800 text-white border-teal-800 shadow-sm"
                              : "bg-white text-gray-700 border-gray-200 hover:border-sage-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{language === "ar" ? pm.labelAr : pm.labelEn}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Subform based on payment selection */}
                  <div className="p-4 bg-alabaster-base rounded-2xl border border-alabaster-border space-y-3 text-xs">
                    {paymentMethod === "CREDIT_CARD" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-bold text-gray-700 block mb-1">
                            {language === "ar" ? "رقم البطاقة (مدى / فيزا / ماستركارد):" : "Card Number:"}
                          </label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            className="w-full bg-white px-3 py-2 rounded-xl border border-gray-300 font-mono"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-bold text-gray-700 block mb-1">
                              {language === "ar" ? "تاريخ الانتهاء:" : "Expiry:"}
                            </label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              className="w-full bg-white px-3 py-2 rounded-xl border border-gray-300 font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-gray-700 block mb-1">
                              {language === "ar" ? "رمز الأمان CVC:" : "CVC:"}
                            </label>
                            <input
                              type="password"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value)}
                              className="w-full bg-white px-3 py-2 rounded-xl border border-gray-300 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {paymentMethod === "INSTAPAY" && (
                      <div className="space-y-2 text-center py-2">
                        <div className="w-12 h-12 rounded-2xl bg-teal-800 text-white flex items-center justify-center mx-auto">
                          <QrCode className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-gray-900">
                          {language === "ar" ? "التحويل الفوري عبر عنوان الدفع InstaPay" : "Instant InstaPay Transfer"}
                        </p>
                        <p className="font-mono text-teal-800 bg-white p-2 rounded-xl border border-teal-100 font-bold inline-block">
                          asmaaclinic@instapay
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {language === "ar"
                            ? "سيتم التحقق من المعاملة تلقائياً وتأكيد الحجز فور الضغط على زر التأكيد."
                            : "Auto-verified upon clicking confirm."}
                        </p>
                      </div>
                    )}

                    {paymentMethod === "VODAFONE_CASH" && (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-gray-700 block">
                          {language === "ar" ? "رقم المحفظة الإلكترونية (فودافون/أورانج/اتصالات):" : "Mobile Wallet Number:"}
                        </label>
                        <input
                          type="text"
                          value={walletPhone}
                          onChange={(e) => setWalletPhone(e.target.value)}
                          className="w-full bg-white px-3 py-2 rounded-xl border border-gray-300 font-mono"
                        />
                        <p className="text-[11px] text-gray-500">
                          {language === "ar"
                            ? "ستصلك رسالة تأكيد الخصم برقم سري لتفويض العملية فورياً."
                            : "An OTP authorization prompt will be dispatched to your phone."}
                        </p>
                      </div>
                    )}

                    {paymentMethod === "WALLET" && (
                      <div className="flex items-center justify-between py-1">
                        <div>
                          <span className="text-[11px] text-gray-500 block">
                            {language === "ar" ? "الرصيد المتاح حالياً في محفظتك:" : "Current Wallet Balance:"}
                          </span>
                          <span className="font-extrabold text-teal-900 text-sm">
                            {formatCurrency(currentUser.walletBalanceEGP, "EGP", language)}
                          </span>
                        </div>
                        {currentUser.walletBalanceEGP < finalPrice ? (
                          <span className="text-red-600 font-bold text-xs">
                            {language === "ar" ? "الرصيد غير كافٍ، اختر وسيلة أخرى" : "Insufficient balance"}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{language === "ar" ? "رصيد كافٍ" : "Sufficient"}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Order Summary & Confirmation Box */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-alabaster-border shadow-md space-y-5">
                  <h3 className="font-extrabold text-sm text-teal-950 border-b border-gray-100 pb-3">
                    {language === "ar" ? "ملخص بيانات الجلسة" : "Session Summary"}
                  </h3>

                  {/* Doctor Mini Profile */}
                  <div className="flex items-center gap-3">
                    <img
                      src={doctor.avatar}
                      alt={doctor.fullName}
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-teal-50"
                    />
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900">
                        {language === "ar" ? doctor.fullName : doctor.fullNameEn}
                      </h4>
                      <p className="text-xs text-sage-700 font-semibold line-clamp-1">
                        {language === "ar" ? doctor.title : doctor.titleEn}
                      </p>
                    </div>
                  </div>

                  {/* Selected Slot Recap */}
                  <div className="p-3 bg-alabaster-base rounded-2xl border border-alabaster-border space-y-1 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>{language === "ar" ? "المدة المقررة:" : "Duration:"}</span>
                      <span className="font-bold text-teal-900">{duration} {language === "ar" ? "دقيقة" : "mins"}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>{language === "ar" ? "الموعد المحدد:" : "Scheduled For:"}</span>
                      <span className="font-bold text-teal-900">
                        {formatDateTime(
                          doctor.availableSlots.find((s) => s.id === selectedSlotId)?.startTimeUTC || "",
                          language,
                          selectedTimezone
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Promo Code Form */}
                  <form onSubmit={handleApplyPromo} className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-gray-400 absolute top-3 right-3 rtl:right-3 ltr:left-3 ltr:right-auto" />
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder={language === "ar" ? "كوبون خصم (مثال: ASMAA2026)" : "Promo code (e.g. ASMAA2026)"}
                          className="w-full bg-alabaster-muted pr-9 pl-3 ltr:pl-9 ltr:pr-3 py-2 rounded-xl text-xs uppercase font-mono border border-alabaster-border focus:outline-none focus:border-teal-700"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition"
                      >
                        {language === "ar" ? "تطبيق" : "Apply"}
                      </button>
                    </div>
                    {promoApplied && (
                      <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{language === "ar" ? "تم تطبيق كود الخصم بنجاح!" : "Promo code applied!"}</span>
                      </p>
                    )}
                    {promoError && <p className="text-[11px] text-red-600 font-medium">{promoError}</p>}
                  </form>

                  {/* Pricing Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                    <div className="flex items-center justify-between">
                      <span>{language === "ar" ? "سعر الجلسة الأساسي:" : "Base Session Fee:"}</span>
                      <span className="font-bold text-gray-800">{formatCurrency(basePrice, "EGP", language)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-700 font-bold">
                        <span>{language === "ar" ? "الخصم المطبق:" : "Discount:"}</span>
                        <span>-{formatCurrency(discountAmount, "EGP", language)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm font-black text-teal-950 pt-2 border-t border-gray-100">
                      <span>{language === "ar" ? "المبلغ الإجمالي للدفع:" : "Total Payable:"}</span>
                      <span className="text-base text-teal-900">{formatCurrency(finalPrice, "EGP", language)}</span>
                    </div>
                  </div>

                  {/* Primary CTA Confirm Booking */}
                  <button
                    type="button"
                    onClick={handleConfirmBooking}
                    disabled={paymentMethod === "WALLET" && currentUser.walletBalanceEGP < finalPrice}
                    className="w-full py-3.5 bg-terracotta-600 hover:bg-terracotta-700 disabled:opacity-40 text-white font-black text-xs rounded-2xl shadow-xl shadow-terracotta-600/20 transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === "ar" ? "تأكيد الحجز والدفع الآن" : "Confirm & Pay Now"}</span>
                  </button>

                  <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                    {language === "ar"
                      ? "إلغاء واسترداد مجاني كامل حتى 6 ساعات قبل موعد الجلسة."
                      : "Free 100% refund available up to 6 hours prior to session."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Confirmation Screen */
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-teal-100 shadow-2xl text-center max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-teal-950">
                {language === "ar" ? "تم تأكيد حجز جلستك بنجاح!" : "Booking Confirmed Successfully!"}
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                {language === "ar"
                  ? `تم حجز جلستك مع ${doctor.fullName} وتجهيز غرفة الاستشارة المشفرة.`
                  : `Your consultation with ${doctor.fullName} is secured in our encrypted telepsychiatry suite.`}
              </p>
            </div>

            {/* Appointment Badge */}
            <div className="p-4 bg-alabaster-base rounded-2xl border border-alabaster-border text-xs text-gray-800 space-y-2">
              <div className="flex items-center justify-between font-bold">
                <span>{language === "ar" ? "رقم الموعد المرجعي:" : "Reference ID:"}</span>
                <span className="font-mono text-teal-900">{confirmedAppointmentId}</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>{language === "ar" ? "طريقة الدفع:" : "Payment:"}</span>
                <span className="font-semibold text-gray-800">{paymentMethod}</span>
              </div>
            </div>

            {/* Action Tools */}
            <div className="space-y-3 pt-2">
              <Link
                href={`/session/room-${confirmedAppointmentId}`}
                className="w-full py-3.5 bg-teal-800 hover:bg-teal-900 text-white font-extrabold text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4 text-emerald-300" />
                <span>{language === "ar" ? "الانتقال المباشر لغرفة الاستشارة" : "Join Consultation Room"}</span>
              </Link>

              <button
                type="button"
                onClick={downloadIcsCalendar}
                className="w-full py-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-sage-700" />
                <span>{language === "ar" ? "حفظ الموعد بالتقويم (.ics)" : "Add to Calendar (.ics)"}</span>
              </button>

              <Link
                href="/dashboard/patient"
                className="block text-xs font-bold text-teal-800 hover:underline pt-2"
              >
                {language === "ar" ? "الذهاب إلى لوحة تحكم المريض" : "Go to Patient Dashboard"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
