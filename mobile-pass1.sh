set -e
git checkout -q -b mobile-first 2>/dev/null || git checkout -q mobile-first

python3 - <<'PY'
p="src/components/site/ServiceCard.tsx"
s=open(p,encoding="utf-8").read()
o=s
s=s.replace('className="h-36 w-full object-cover sm:h-44 md:h-52"',
            'loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover"')
s=s.replace('flex h-36 items-center justify-center bg-gray-100 text-3xl sm:h-44 sm:text-4xl md:h-52 md:text-5xl',
            'flex aspect-[4/3] items-center justify-center bg-gray-100 text-4xl')
if "{price}" not in s and "price.toLocaleString" not in s:
    block='''        <div className="mb-3 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-wine">
            {hasDiscount ? discountPrice : price} ج.م
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">{price}</span>
          )}
          <span className="ms-auto text-xs text-gray-500">{durationMin} د</span>
        </div>

'''
    s=s.replace('        {status === "AVAILABLE" ? (', block+'        {status === "AVAILABLE" ? (',1)
s=s.replace('rounded-xl bg-pink-600 px-3 py-2.5','rounded-xl bg-pink-600 flex min-h-[44px] items-center justify-center px-3 py-2.5')
open(p,"w",encoding="utf-8").write(s)
print("ServiceCard:", "changed" if s!=o else "NO CHANGE")
PY

echo "== tsc =="; npx tsc --noEmit; echo "tsc exit: $?"
git diff --stat | tail -3

for f in src/components/site/Header.tsx src/components/site/Hero.tsx src/components/site/ServicesSection.tsx; do
  echo "=== $f ==="; cat "$f"
done
echo "=== BookingFlow ==="
grep -nE "<input|<textarea|<button|type=\"|inputMode|disabled|submitting|setStep|step ===" src/app/booking/BookingFlow.tsx | cut -c1-150
echo "=== chat ==="
sed -n 300,330p src/app/chat/page.tsx
sed -n 495,530p src/app/chat/page.tsx
echo "=== layout/globals ==="
sed -n 25,40p src/app/layout.tsx; sed -n 1,45p src/app/globals.css
