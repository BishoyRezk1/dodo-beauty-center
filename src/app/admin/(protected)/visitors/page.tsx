import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const countryName = (c?: string | null) => {
  if (!c) return "غير معروف";
  try {
    return new Intl.DisplayNames(["ar"], { type: "region" }).of(c) || c;
  } catch {
    return c;
  }
};

export default async function VisitorsPage() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
  const since = new Date(Date.now() - 30 * 864e5);

  const [todayCount, monthCount, byCity, latest] = await Promise.all([
    prisma.visitorLog.count({ where: { day: today } }),
    prisma.visitorLog.count({ where: { createdAt: { gte: since } } }),
    prisma.visitorLog.groupBy({
      by: ["country", "city"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { city: "desc" } },
      take: 15,
    }),
    prisma.visitorLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <div dir="rtl" style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>الزوار وأماكنهم</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16, flex: 1 }}>
          <div>زوار النهارده</div>
          <b style={{ fontSize: 28 }}>{todayCount}</b>
        </div>
        <div className="card" style={{ padding: 16, flex: 1 }}>
          <div>آخر 30 يوم</div>
          <b style={{ fontSize: 28 }}>{monthCount}</b>
        </div>
      </div>

      <h2 style={{ fontWeight: 700, margin: "12px 0" }}>أكتر المدن (30 يوم)</h2>
      {byCity.map((r, i) => (
        <div
          key={i}
          style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #eee" }}
        >
          <span>{r.city || "غير معروف"} — {countryName(r.country)}</span>
          <b>{r._count._all}</b>
        </div>
      ))}

      <h2 style={{ fontWeight: 700, margin: "20px 0 12px" }}>آخر الزوار</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: 14 }}>
          <thead>
            <tr><th>الوقت</th><th>المدينة</th><th>الدولة</th><th>الجهاز</th><th>الصفحة</th></tr>
          </thead>
          <tbody>
            {latest.map((v) => (
              <tr key={v.id}>
                <td>{v.createdAt.toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}</td>
                <td>{v.city || "—"}</td>
                <td>{countryName(v.country)}</td>
                <td>{v.device === "mobile" ? "موبايل" : "كمبيوتر"}</td>
                <td>{v.path}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
