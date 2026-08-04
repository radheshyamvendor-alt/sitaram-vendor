import { NextRequest } from "next/server";
import { emailEvents } from "@/lib/emailEvents";

export const dynamic = "force-dynamic";

// GET /api/orders/email-received/stream?email=xxx
// Server-Sent Events (SSE) stream — ZERO POLLING
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const chemistEmail = searchParams.get("email");

  if (!chemistEmail) {
    return new Response("Missing email parameter", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const onNewOrder = (data: { chemistEmail: string; order: any }) => {
        if (data.chemistEmail === chemistEmail) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data.order)}\n\n`)
          );
        }
      };

      emailEvents.on("new-order", onNewOrder);

      // Keep connection alive with periodic heartbeat comment every 30s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      req.signal.addEventListener("abort", () => {
        emailEvents.off("new-order", onNewOrder);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // ignore stream close errors
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
