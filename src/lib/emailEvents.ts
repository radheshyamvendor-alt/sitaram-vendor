import { EventEmitter } from "events";

const globalForEvents = globalThis as unknown as { emailEvents?: EventEmitter };

export const emailEvents = globalForEvents.emailEvents || new EventEmitter();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.emailEvents = emailEvents;
}
