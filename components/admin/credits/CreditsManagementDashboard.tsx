"use client";

import { useActionState, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  History,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatCairo, formatEgp } from "@/lib/whatsapp";
import {
  issueManualCreditAction,
  settleCreditAction,
  getPatientCreditBalanceAction,
  type OutstandingCreditRow,
  type CreditLedgerEntry,
} from "@/app/actions/credits.actions";

interface Props {
  outstandingCredits: OutstandingCreditRow[];
  csrfToken: string;
}

export function CreditsManagementDashboard({ outstandingCredits, csrfToken }: Props) {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientForSettlement, setSelectedPatientForSettlement] = useState<OutstandingCreditRow | null>(null);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<{ id: string; name: string } | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // History state
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<CreditLedgerEntry[]>([]);

  // Settle action state
  const [settleState, settleAction, isSettling] = useActionState(settleCreditAction, null);
  // Manual credit action state
  const [manualState, manualAction, isIssuing] = useActionState(issueManualCreditAction, null);

  const totalDebtEGP = outstandingCredits.reduce((acc, curr) => acc + curr.balanceEGP, 0);

  const filteredCredits = outstandingCredits.filter((c) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      c.patientName.toLowerCase().includes(term) ||
      c.patientPhone.includes(term) ||
      c.patientEmail.toLowerCase().includes(term)
    );
  });

  const handleOpenHistory = async (patientId: string, patientName: string) => {
    setSelectedPatientForHistory({ id: patientId, name: patientName });
    setHistoryLoading(true);
    try {
      const res = await getPatientCreditBalanceAction(patientId);
      if (res.ok) {
        setHistoryEntries(res.data.entries);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-start">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-800">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isAr ? "سجل الأمان المالي وأرصدة المرضى" : "Patient Wallet Credits & Financial Safety Ledger"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? "متابعة مستحقات المرضى الناتجة عن إلغاء الجلسات المدفوعة، تسويتها عبر InstaPay، والتحكم في الديون."
                : "Manage patient wallet balances from cancelled paid sessions, bank settlement via InstaPay, and ledger integrity."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsManualModalOpen(true)}
          className="px-4 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{isAr ? "إصدار رصيد يدوي" : "Issue Manual Credit"}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500">
            {isAr ? "إجمالي المبالغ المستحقة للمرضى" : "Total Outstanding Patient Credits"}
          </span>
          <p className="text-2xl font-black font-mono text-teal-800">{formatEgp(totalDebtEGP, isAr ? "ar" : "en")}</p>
          <p className="text-[10px] text-slate-400">
            {isAr ? "ديون معلقة بانتظار التحويل أو الاستخدام" : "Pending payouts or booking redemption"}
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500">
            {isAr ? "عدد المرضى الدائنين" : "Patients with Positive Balance"}
          </span>
          <p className="text-2xl font-black font-mono text-slate-900">{outstandingCredits.length}</p>
          <p className="text-[10px] text-slate-400">
            {isAr ? "مرضى لديهم رصيد إيجابي متاح" : "Active patient credit holders"}
          </p>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-1">
          <span className="text-[11px] font-bold text-slate-500">
            {isAr ? "طرق التسوية المعتمدة" : "Supported Settlement Rails"}
          </span>
          <p className="text-sm font-bold text-slate-800 flex items-center gap-2 pt-1">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs">
              InstaPay
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs">
              Vodafone Cash
            </span>
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {isAr ? "يتم التوثيق برقم المعاملة البنكية" : "Documented with bank transaction ref"}
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="relative">
          <Search className={`w-4 h-4 text-slate-400 absolute top-3 ${isAr ? "right-3" : "left-3"}`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isAr
                ? "البحث باسم المريض أو رقم هاتفه أو بريده الإلكتروني..."
                : "Search by patient name, phone, or email..."
            }
            className={`w-full py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-teal-700 ${
              isAr ? "pr-9 pl-3" : "pl-9 pr-3"
            }`}
          />
        </div>
      </div>

      {/* Outstanding Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold">
              <tr>
                <th className="p-4">{isAr ? "المريض" : "Patient"}</th>
                <th className="p-4">{isAr ? "رقم الهاتف / البريد" : "Phone / Email"}</th>
                <th className="p-4">{isAr ? "الرصيد المستحق" : "Credit Balance"}</th>
                <th className="p-4">{isAr ? "آخر حركة رصيد" : "Last Activity"}</th>
                <th className="p-4 text-center">{isAr ? "الإجراءات والتحكم" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCredits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-semibold">
                    {isAr ? "لا توجد أرصدة معلقة أو ديون مستحقة للمرضى حالياً." : "No outstanding patient credits recorded."}
                  </td>
                </tr>
              ) : (
                filteredCredits.map((row) => (
                  <tr key={row.patientId} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-bold text-slate-900 text-sm">
                      {row.patientName}
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-slate-600 font-semibold" dir="ltr">{row.patientPhone}</div>
                      <div className="text-[10px] text-slate-400">{row.patientEmail}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-teal-800 text-sm">
                      {formatEgp(row.balanceEGP, isAr ? "ar" : "en")}
                    </td>
                    <td className="p-4 text-slate-600">
                      {formatCairo(new Date(row.lastCreditAtUTC), isAr ? "ar" : "en")}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedPatientForSettlement(row)}
                          className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg font-bold text-[11px] transition shadow-sm"
                        >
                          {isAr ? "تسوية الرصيد" : "Settle Payout"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenHistory(row.patientId, row.patientName)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition flex items-center gap-1"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>{isAr ? "السجل" : "History"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Modal */}
      {selectedPatientForSettlement && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-800" />
                <span>{isAr ? "تسوية رصيد وتحويل للمريض" : "Settle Balance Payout"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPatientForSettlement(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={isAr ? "إغلاق" : "Close"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl space-y-1">
              <span className="text-[11px] text-teal-800 font-bold">
                {isAr ? "المريض: " : "Patient: "}{selectedPatientForSettlement.patientName}
              </span>
              <p className="text-xs text-slate-600 font-mono" dir="ltr">
                {isAr ? "الهاتف: " : "Phone: "}{selectedPatientForSettlement.patientPhone}
              </p>
              <p className="text-sm font-black text-teal-900 font-mono pt-1">
                {isAr ? "المبلغ المراد تسويته: " : "Settlement Amount: "}
                {formatEgp(selectedPatientForSettlement.balanceEGP, isAr ? "ar" : "en")}
              </p>
            </div>

            {settleState && !settleState.ok && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                {isAr ? settleState.messageAr : settleState.messageEn ?? settleState.messageAr}
              </div>
            )}

            <form action={settleAction} className="space-y-3">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="patientId" value={selectedPatientForSettlement.patientId} />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "رقم المعاملة أو مرجع التحويل (InstaPay Ref) *" : "Bank Reference / InstaPay Ref *"}
                </label>
                <input
                  type="text"
                  name="settlementRef"
                  required
                  placeholder={isAr ? "مثال: IP-948291048 أو كود التحويل" : "e.g. IP-948291048"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "ملاحظات إضافية (اختياري)" : "Additional Notes (Optional)"}
                </label>
                <input
                  type="text"
                  name="notes"
                  placeholder={
                    isAr
                      ? "تم التحويل عبر محفظة فودافون كاش / إنستا باي..."
                      : "Paid via Vodafone Cash / InstaPay..."
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSettling}
                  className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {isSettling
                    ? isAr ? "جاري التسوية..." : "Processing Settlement..."
                    : isAr ? "تأكيد التسوية وإغلاق الرصيد" : "Confirm Settlement & Clear Balance"}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPatientForSettlement(null)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Credit Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-teal-800" />
                <span>{isAr ? "إصدار رصيد يدوي لمريض" : "Issue Manual Patient Credit"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={isAr ? "إغلاق" : "Close"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {manualState && !manualState.ok && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                {isAr ? manualState.messageAr : manualState.messageEn ?? manualState.messageAr}
              </div>
            )}

            <form action={manualAction} className="space-y-3">
              <input type="hidden" name="csrfToken" value={csrfToken} />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "معرّف المريض (Patient ID) *" : "Patient ID *"}
                </label>
                <input
                  type="text"
                  name="patientId"
                  required
                  placeholder={isAr ? "معرّف المريض في النظام (cuid)" : "Patient CUID"}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "المبلغ (بالجنيه المصري) *" : "Amount (EGP) *"}
                </label>
                <input
                  type="number"
                  name="amountEGP"
                  min="1"
                  max="50000"
                  step="1"
                  required
                  placeholder="500"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isAr ? "سبب إصدار الرصيد *" : "Reason for Credit *"}
                </label>
                <textarea
                  name="reason"
                  rows={3}
                  required
                  placeholder={
                    isAr
                      ? "يرجى توضيح سبب إضافة الرصيد لحساب المريض..."
                      : "Explain the reason for adding credit to patient account..."
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isIssuing}
                  className="flex-1 py-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {isIssuing
                    ? isAr ? "جاري الإصدار..." : "Issuing Credit..."
                    : isAr ? "إضافة الرصيد" : "Add Credit"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ledger History Modal */}
      {selectedPatientForHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 text-start">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-teal-800" />
                <span>
                  {isAr ? "سجل معاملات الرصيد: " : "Credit History: "}{selectedPatientForHistory.name}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPatientForHistory(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label={isAr ? "إغلاق" : "Close"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                {isAr ? "جاري تحميل سجل الحركات..." : "Loading transaction history..."}
              </div>
            ) : historyEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                {isAr ? "لا توجد حركات مسجلة لهذا المريض." : "No credit entries recorded for this patient."}
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto space-y-2.5 pr-1">
                {historyEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            entry.amountEGP > 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {entry.kind === "CANCELLATION"
                            ? isAr ? "إلغاء جلسة" : "Cancellation"
                            : entry.kind === "MANUAL_ADJUSTMENT"
                            ? isAr ? "تعديل يدوي" : "Manual Adjustment"
                            : entry.kind === "PAID_OUT"
                            ? isAr ? "تسوية نقدية" : "Settlement Payout"
                            : isAr ? "استخدام في حجز" : "Booking Applied"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatCairo(new Date(entry.createdAtUTC), isAr ? "ar" : "en")}
                        </span>
                      </div>
                      <p className="text-slate-700 text-xs">
                        {entry.reason ?? (isAr ? "بدون تفاصيل" : "No details")}
                      </p>
                      {entry.settlementRef && (
                        <p className="text-[10px] font-mono text-teal-800 font-bold" dir="ltr">
                          {isAr ? "مرجع التسوية: " : "Ref: "}{entry.settlementRef}
                        </p>
                      )}
                    </div>

                    <div className="text-end shrink-0">
                      <span
                        className={`text-sm font-black font-mono ${
                          entry.amountEGP > 0 ? "text-emerald-700" : "text-slate-700"
                        }`}
                      >
                        {entry.amountEGP > 0
                          ? `+${formatEgp(entry.amountEGP, isAr ? "ar" : "en")}`
                          : formatEgp(entry.amountEGP, isAr ? "ar" : "en")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedPatientForHistory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                {isAr ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
