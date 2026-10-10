import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCustomer } from "@/lib/customer-session";
import { getPusher } from "@/lib/pusher";

// Channel auth: a customer may join ONLY her own conversation channel;
// admins (NextAuth session) may join any. Everyone else is rejected.
export async function POST(req: NextRequest) {
  const pusher = getPusher();
  if (!pusher) return NextResponse.json({ error: "realtime disabled" }, { status: 503 });

  const form = await req.formData();
  const socketId = String(form.get("socket_id") || "");
  const channel = String(form.get("channel_name") || "");
  const m = /^presence-chat-([A-Za-z0-9_-]{10,40})$/.exec(channel);
  if (!m || !socketId) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const customer = await getCustomer();
  if (customer) {
    const conv = await prisma.conversation.findUnique({
      where: { customerId: customer.id },
      select: { id: true }
    });
    if (conv?.id === m[1]) {
      return NextResponse.json(
        pusher.authorizeChannel(socketId, channel, { user_id: `c:${customer.id}`, user_info: { role: "customer" } })
      );
    }
  }

  const session = await getServerSession(authOptions);
  const adminId = (session?.user as unknown as { id?: string } | undefined)?.id;
  if (adminId) {
    return NextResponse.json(
      pusher.authorizeChannel(socketId, channel, { user_id: `a:${adminId}`, user_info: { role: "admin" } })
    );
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
