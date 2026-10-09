import { prisma } from "@/lib/prisma";

export const MAINTENANCE_KEY = "site_maintenance";
export const MAINTENANCE_MSG_KEY = "site_maintenance_message";
export const DEFAULT_MAINTENANCE_MESSAGE =
  "نقوم الآن بعمل عروض وتحديثات للصفحة من أجل جمالك 💗 هنرجعلك قريب بحلة جديدة ✨";

/** Never throws: if the DB check fails the site stays open. */
export async function getMaintenance() {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: [MAINTENANCE_KEY, MAINTENANCE_MSG_KEY] } }
    });
    const on = rows.find((r) => r.key === MAINTENANCE_KEY)?.value === "1";
    const message = rows.find((r) => r.key === MAINTENANCE_MSG_KEY)?.value?.trim() || DEFAULT_MAINTENANCE_MESSAGE;
    return { on, message };
  } catch {
    return { on: false, message: DEFAULT_MAINTENANCE_MESSAGE };
  }
}

export async function isMaintenanceOn() {
  return (await getMaintenance()).on;
}
