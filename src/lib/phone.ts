export function normalizePhone(raw: string): string {
  let d = raw
    .replace(/[٠-٩]/g, (ch) => String("٠١٢٣٤٥٦٧٨٩".indexOf(ch)))
    .replace(/\D/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20") && d.length === 12) d = d.slice(2);
  if (/^1\d{9}$/.test(d)) d = "0" + d;
  return d;
}

export function isValidEgPhone(p: string) {
  return /^01[0125]\d{8}$/.test(p);
}
