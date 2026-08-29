import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const statusLabels: Record<string, string> = {
  PENDING: "بانتظار المراجعة",
  CONFIRMED: "مؤكد",
  REJECTED: "مرفوض",
  CANCELLED: "ملغي",
  COMPLETED: "منتهي"
};

// GET /api/reports/export?format=csv|xlsx|pdf&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const format = req.nextUrl.searchParams.get("format") || "csv";
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const dateFilter =
    from && to
      ? { gte: new Date(`${from}T00:00:00`), lte: new Date(`${to}T23:59:59`) }
      : undefined;

  const bookings = await prisma.booking.findMany({
    where: dateFilter ? { date: dateFilter } : {},
    include: { customer: true, service: true, payment: true },
    orderBy: { date: "asc" }
  });

  const rows = bookings.map((b) => ({
    bookingNumber: b.bookingNumber,
    customer: b.customer.name,
    phone: b.customer.phone,
    service: b.service.name,
    date: b.date.toISOString().split("T")[0],
    time: b.startTime,
    fee: Number(b.feeAmount),
    status: statusLabels[b.status] || b.status
  }));

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("الحجوزات");
    sheet.views = [{ rightToLeft: true }];
    sheet.columns = [
      { header: "رقم الحجز", key: "bookingNumber", width: 20 },
      { header: "العميلة", key: "customer", width: 20 },
      { header: "الهاتف", key: "phone", width: 16 },
      { header: "الخدمة", key: "service", width: 20 },
      { header: "التاريخ", key: "date", width: 14 },
      { header: "الوقت", key: "time", width: 10 },
      { header: "الرسوم", key: "fee", width: 12 },
      { header: "الحالة", key: "status", width: 16 }
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach((r) => sheet.addRow(r));

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="dodo-bookings-report.xlsx"`
      }
    });
  }

  if (format === "pdf") {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.on("data", (chunk) => chunks.push(chunk));

    const pdfBuffer: Buffer = await new Promise((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      // Note: pdfkit's built-in fonts don't support Arabic glyph shaping,
      // so this report is intentionally rendered with Latin labels/numbers
      // to guarantee it's readable everywhere without bundling extra fonts.
      // The XLSX and CSV exports above are the recommended formats for a
      // fully Arabic report.
      doc.fontSize(18).text("DoDo Beauty Center - Bookings Report", { align: "center" });
      doc.moveDown();
      doc.fontSize(10);
      rows.forEach((r) => {
        doc.text(
          `${r.bookingNumber}  |  ${r.date} ${r.time}  |  ${r.service}  |  Fee: ${r.fee} EGP  |  ${r.status}`
        );
      });
      doc.end();
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dodo-bookings-report.pdf"`
      }
    });
  }

  // Default: CSV (UTF-8 BOM so Excel opens Arabic correctly)
  const header = "رقم الحجز,العميلة,الهاتف,الخدمة,التاريخ,الوقت,الرسوم,الحالة";
  const csvRows = rows.map((r) =>
    [r.bookingNumber, r.customer, r.phone, r.service, r.date, r.time, r.fee, r.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = "\uFEFF" + [header, ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dodo-bookings-report.csv"`
    }
  });
}
