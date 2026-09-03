"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatEGP } from "@/lib/utils";
import { uploadImageDirect } from "@/lib/client-upload";

interface Service {
  id: string;
  name: string;
  price: string;
  discountPrice: string | null;
  durationMin: number;
  description: string | null;
}

type Step = "service" | "datetime" | "details" | "payment" | "done";

export default function BookingFlow() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get("service");
  const offerId = searchParams.get("offer");

  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [offerPrice, setOfferPrice] = useState<number | null>(null);

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [time, setTime] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState<number | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingNumber, setBookingNumber] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/services").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json())
    ]).then(([svc, st]) => {
      setServices(svc);
      setSettings(st);
      if (preselected) {
        const found = svc.find((s: Service) => s.id === preselected);
        if (found) {
          setSelectedService(found);
          setStep("datetime");
        }
      }
    });
  }, [preselected]);

  useEffect(() => {
    if (!offerId) return;
    fetch(`/api/offers/${offerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((offer) => {
        if (offer) setOfferPrice(Number(offer.newPrice));
      });
  }, [offerId]);

  useEffect(() => {
    if (!date || !selectedService) return;
    setSlotsLoading(true);
    setTime("");
    fetch(`/api/bookings/availability?serviceId=${selectedService.id}&date=${date}`)
      .then((r) => r.json())
      .then((data) => setSlots(data.slots || []))
      .finally(() => setSlotsLoading(false));
  }, [date, selectedService]);

  const fee = useMemo(() => {
    if (!selectedService) return 0;
    const price = offerPrice ?? Number(selectedService.discountPrice ?? selectedService.price);
    const feeType = settings.fee_type || "FIXED";
    const feeValue = parseFloat(settings.fee_value || "0");
    let amount = feeType === "PERCENT" ? Math.round(((price * feeValue) / 100) * 100) / 100 : feeValue;
    if (couponDiscount) {
      amount = Math.round(amount * (1 - couponDiscount / 100) * 100) / 100;
    }
    return amount;
  }, [selectedService, settings, couponDiscount, offerPrice]);

  async function applyCoupon() {
    if (!couponCode.trim() || !selectedService) return;
    setCheckingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, serviceId: selectedService.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "كود غير صالح");
      setCouponDiscount(data.discountPercent);
    } catch (err: any) {
      setCouponDiscount(null);
      setCouponError(err.message);
    } finally {
      setCheckingCoupon(false);
    }
  }

  const minDate = new Date().toISOString().split("T")[0];
  const maxAdvanceDays = parseInt(settings.max_advance_days || "60", 10);
  const maxDate = new Date(Date.now() + maxAdvanceDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  }

  function openWhatsAppBooking() {
    setError(null);

    if (!selectedService) {
      setError("من فضلك اختر الخدمة أولاً");
      return;
    }

    if (!name.trim()) {
      setError("من فضلك اكتب اسمك أولاً");
      return;
    }

    if (!phone.trim()) {
      setError("من فضلك اكتب رقم الهاتف أولاً");
      return;
    }

    const whatsappNumber = "201210111630";

    const message = [
      "مرحبًا DoDo Beauty Center 🌸",
      "",
      "أريد حجز موعد عن طريق الواتساب.",
      "",
      `الاسم: ${name.trim()}`,
      `رقم الهاتف: ${phone.trim()}`,
      `الخدمة: ${selectedService.name}`,
      `التاريخ: ${date || "لم يتم تحديده"}`,
      `الوقت: ${time || "لم يتم تحديده"}`,
      `ملاحظات: ${notes.trim() || "لا توجد"}`,
      "",
      "أرغب في تأكيد الحجز عن طريق الواتساب. 💚"
    ].join("\n");

    const whatsappUrl =
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
  }

  async function handleSubmit() {
    if (!selectedService || !screenshotFile) return;
    setSubmitting(true);
    setError(null);

    try {
      const screenshotUrl = await uploadImageDirect(screenshotFile, "payment-screenshots");

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          serviceId: selectedService.id,
          date,
          time,
          notes,
          screenshotUrl,
          couponCode: couponDiscount ? couponCode : undefined,
          offerId: offerPrice !== null ? offerId : undefined
        })
      });

      const bookingText = await bookingRes.text();
      let bookingData: any;
      try {
        bookingData = JSON.parse(bookingText);
      } catch {
        throw new Error("حدث خطأ في السيرفر، برجاء المحاولة مرة أخرى.");
      }
      if (!bookingRes.ok) throw new Error(bookingData.error || "فشل إرسال طلب الحجز");

      setBookingNumber(bookingData.bookingNumber);
      setStep("done");
    } catch (err: any) {
      setError(err.message || "حدث خطأ، برجاء المحاولة مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  }

  const steps: Step[] = ["service", "datetime", "details", "payment"];
  const stepIndex = steps.indexOf(step);

  return (
    <div className="section-container max-w-2xl py-12 md:py-16">
      {step !== "done" && (
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-wine" : "bg-charcoal/10"}`}
            />
          ))}
        </div>
      )}

      {step === "service" && (
        <div>
          <h2 className="mb-6 font-display text-2xl font-bold text-charcoal">اختاري الخدمة</h2>
          <div className="flex flex-col gap-3">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedService(s);
                  setStep("datetime");
                }}
                className={`card flex items-center justify-between p-4 text-right transition hover:border-wine ${
                  selectedService?.id === s.id ? "border-wine" : ""
                }`}
              >
                <div>
                  <p className="font-bold text-charcoal">{s.name}</p>
                  <p className="text-xs text-charcoal/50">{s.durationMin} دقيقة</p>
                </div>
                <span className="font-display font-extrabold text-wine">
                  {formatEGP(s.discountPrice ?? s.price)}
                </span>
              </button>
            ))}
            {services.length === 0 && <p className="text-charcoal/50">لا توجد خدمات متاحة حاليًا</p>}
          </div>
        </div>
      )}

      {step === "datetime" && selectedService && (
        <div>
          <h2 className="mb-6 font-display text-2xl font-bold text-charcoal">اختاري التاريخ والوقت</h2>
          <label className="mb-2 block text-sm font-bold text-charcoal/70">التاريخ</label>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field mb-6"
          />

          {date && (
            <>
              <label className="mb-2 block text-sm font-bold text-charcoal/70">الوقت المتاح</label>
              {slotsLoading && <p className="text-sm text-charcoal/50">جاري تحميل المواعيد...</p>}
              {!slotsLoading && slots.length === 0 && (
                <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
                  <p className="text-base font-bold text-charcoal">
                    لا توجد مواعيد متاحة في هذا اليوم
                  </p>
                  <p className="mt-2 text-sm text-charcoal/60">
                    يمكنك التواصل معنا عبر واتساب لمعرفة أقرب موعد متاح وحجزه مباشرة.
                  </p>
                  <button
                    type="button"
                    onClick={openWhatsAppBooking}
                    className="mt-4 w-full rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700"
                  >
                    💬 احجز عن طريق واتساب
                  </button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s}
                    onClick={() => setTime(s)}
                    className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      time === s ? "border-wine bg-wine text-cream" : "border-charcoal/15 text-charcoal hover:border-wine"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep("service")} className="btn-secondary">
              رجوع
            </button>
            <button onClick={() => setStep("details")} disabled={!date || !time} className="btn-primary">
              التالي
            </button>
          </div>
        </div>
      )}

      {step === "details" && (
        <div>
          <h2 className="mb-6 font-display text-2xl font-bold text-charcoal">بياناتك</h2>
          <div className="flex flex-col gap-4">
            <input
              placeholder="الاسم بالكامل"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
            <input
              placeholder="رقم الهاتف"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
              dir="ltr"
            />
            <textarea
              placeholder="ملاحظات (اختياري)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field min-h-24"
            />
          </div>
          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep("datetime")} className="btn-secondary">
              رجوع
            </button>
            <button
              onClick={() => setStep("payment")}
              disabled={name.trim().length < 2 || phone.trim().length < 8}
              className="btn-primary"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {step === "payment" && selectedService && (
        <div>
          <h2 className="mb-2 font-display text-2xl font-bold text-charcoal">رسوم تأكيد الحجز</h2>
          <p className="mb-6 text-charcoal/60">حولي رسوم الحجز عبر Vodafone Cash ثم ارفعي صورة إثبات التحويل</p>

          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
            <p className="text-base font-bold text-charcoal">
              مش قادر تعمل تحويل؟
            </p>
            <p className="mt-2 text-sm text-charcoal/60">
              تقدر تتواصل معنا على واتساب وتطلب تأكيد الحجز مباشرة.
            </p>
            <button
              type="button"
              onClick={openWhatsAppBooking}
              className="mt-4 w-full rounded-xl bg-green-600 px-5 py-3 font-bold text-white transition hover:bg-green-700"
            >
              💬 تأكيد الحجز عن طريق واتساب
            </button>
          </div>

          <div className="card mb-6 p-5 text-center">
            <p className="text-sm text-charcoal/60">المبلغ المطلوب</p>
            {offerPrice !== null && (
              <p className="mb-1 text-xs font-bold text-emerald-600">✓ تم تطبيق سعر العرض</p>
            )}
            <p className="font-display text-3xl font-extrabold text-wine">{formatEGP(fee)}</p>
            <p className="mt-3 text-sm text-charcoal/60">حولي إلى رقم فودافون كاش</p>
            <p dir="ltr" className="font-display text-2xl font-extrabold tracking-widest text-charcoal">
              {settings.vodafone_number}
            </p>
          </div>

          <div className="mb-6 flex gap-2">
            <input
              placeholder="كود الخصم (اختياري)"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponDiscount(null);
                setCouponError(null);
              }}
              className="input-field flex-1"
              dir="ltr"
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={!couponCode.trim() || checkingCoupon}
              className="btn-secondary shrink-0 !py-2 text-sm"
            >
              {checkingCoupon ? "..." : "تطبيق"}
            </button>
          </div>
          {couponDiscount !== null && (
            <p className="mb-4 text-sm font-bold text-emerald-600">✓ تم تطبيق خصم {couponDiscount}%</p>
          )}
          {couponError && <p className="mb-4 text-sm font-bold text-red-600">{couponError}</p>}

          <ol className="mb-6 list-inside list-decimal space-y-1 text-sm text-charcoal/70">
            <li>قومي بتحويل رسوم الحجز إلى رقم Vodafone Cash أعلاه.</li>
            <li>احتفظي بصورة التحويل.</li>
            <li>ارفعي Screenshot التحويل بالأسفل.</li>
            <li>اضغطي إرسال طلب الحجز.</li>
          </ol>

          <label className="mb-6 block cursor-pointer rounded-xl border-2 border-dashed border-wine/40 p-6 text-center transition hover:border-wine">
            <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
            {screenshotPreview ? (
              <img src={screenshotPreview} alt="معاينة صورة التحويل" className="mx-auto max-h-64 rounded-lg" />
            ) : (
              <span className="text-sm font-bold text-wine">📷 اضغطي لرفع صورة التحويل</span>
            )}
          </label>

          {error && <p className="mb-4 text-sm font-bold text-red-600">{error}</p>}

          <div className="flex justify-between">
            <button onClick={() => setStep("details")} className="btn-secondary">
              رجوع
            </button>
            <button onClick={handleSubmit} disabled={!screenshotFile || submitting} className="btn-primary">
              {submitting ? "جاري الإرسال..." : "إرسال طلب الحجز"}
            </button>
          </div>
        </div>
      )}

      {step === "done" && bookingNumber && (
        <div className="card p-8 text-center">
          <div className="mb-4 text-5xl">❤️</div>
          <h2 className="mb-2 font-display text-2xl font-bold text-charcoal">تم استلام طلب الحجز بنجاح</h2>
          <p className="mb-4 text-charcoal/60">رقم الحجز</p>
          <p dir="ltr" className="mb-6 font-display text-2xl font-extrabold tracking-widest text-wine">
            {bookingNumber}
          </p>
          <p className="text-sm text-charcoal/60">سيتم مراجعة التحويل وتأكيد الحجز عبر واتساب.</p>
        </div>
      )}
    </div>
  );
}
