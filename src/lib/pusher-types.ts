export type PresenceMember = { id: string | number; info?: unknown };
export type PusherMembers = { each: (cb: (m: PresenceMember) => void) => void };
export type PresenceCh = {
  bind: (event: string, cb: (data: never) => void) => unknown;
  unbind: (event?: string) => unknown;
  unbind_all: () => unknown;
  trigger: (event: string, data?: unknown) => boolean;
  members?: PusherMembers;
};
