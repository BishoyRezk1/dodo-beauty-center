#!/data/data/com.termux/files/usr/bin/bash
set -e
cd ~/dodo-beauty-center

python - <<'PY'
from pathlib import Path

p = Path('src/lib/auth.ts')
t = p.read_text(encoding='utf-8')

old_import = 'import { prisma } from "@/lib/prisma";'
new_import = 'import { prisma } from "@/lib/prisma";\nimport { rateLimit } from "@/lib/rate-limit";'

old_authorize = '''      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const admin = await prisma.adminUser.findUnique({
          where: { email: credentials.email.toLowerCase().trim() }
        });
        if (!admin) return null;

        const valid = await bcrypt.compare(credentials.password, admin.passwordHash);
        if (!valid) return null;

        return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
      }'''

new_authorize = '''      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Brute-force protection: max 5 login attempts per 15 minutes per IP.
        const forwardedFor = req?.headers?.["x-forwarded-for"];
        const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)
          ?.split(",")[0]
          ?.trim() || "unknown";

        const { allowed } = rateLimit(`admin-login:${ip}`, 5, 15 * 60 * 1000);
        if (!allowed) {
          throw new Error("محاولات دخول كتيرة جدًا، برجاء الانتظار شوية والمحاولة تاني.");
        }

        const admin = await prisma.adminUser.findUnique({
          where: { email: credentials.email.toLowerCase().trim() }
        });
        if (!admin) return null;

        const valid = await bcrypt.compare(credentials.password, admin.passwordHash);
        if (!valid) return null;

        return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
      }'''

if old_import in t and old_authorize in t:
    t = t.replace(old_import, new_import, 1)
    t = t.replace(old_authorize, new_authorize, 1)
    p.write_text(t, encoding='utf-8')
    print('auth.ts: تم إضافة حماية من محاولات الدخول المتكررة')
else:
    print('تحذير - auth.ts مش لاقي النص المتوقع')
PY

echo "تم تأمين تسجيل دخول الإدمن من محاولات الاختراق المتكررة"
