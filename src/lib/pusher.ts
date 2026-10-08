import Pusher from "pusher";

let inst: Pusher | null | undefined;

export function getPusher(): Pusher | null {
  if (inst !== undefined) return inst;
  const appId = process.env.PUSHER_APP_ID;
  const secret = process.env.PUSHER_SECRET;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  inst = appId && secret && key && cluster ? new Pusher({ appId, key, secret, cluster, useTLS: true }) : null;
  return inst;
}

export const chatChannel = (conversationId: string) => `presence-chat-${conversationId}`;

export async function publishChat(conversationId: string, event: string, data: unknown) {
  const p = getPusher();
  if (!p) return;
  try {
    await p.trigger(chatChannel(conversationId), event, data);
  } catch {}
}
