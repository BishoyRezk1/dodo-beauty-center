const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

// Returns an Egyptian mobile in local format (01XXXXXXXXX) or null if invalid.
export function normalizeEgPhone(input: string): string | null {
  let s = (input || "").replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
  s = s.replace(/[^0-9]/g, "");
  if (s.startsWith("0020")) s = "0" + s.slice(4);
  else if (s.startsWith("20") && s.length === 12) s = "0" + s.slice(2);
  return /^01[0125][0-9]{8}$/.test(s) ? s : null;
}
