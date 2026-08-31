export function formatEGP(value: number | string): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return `${n.toLocaleString("ar-EG")} جنيه`;
}

export function formatArabicDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
