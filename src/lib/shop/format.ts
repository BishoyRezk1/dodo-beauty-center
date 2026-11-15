export function money(n: number): string {
  return `${(Math.round(n * 100) / 100).toLocaleString("en-US")} جنيه`;
}
