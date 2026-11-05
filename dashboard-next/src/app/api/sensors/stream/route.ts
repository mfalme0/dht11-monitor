import { NextRequest } from "next/server";

const BRIDGE_URL = process.env.MQTT_BROKER_URL || "http://dht11-bridge:5000";

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch(`${BRIDGE_URL}/api/stream`, {
          signal: AbortSignal.timeout(120000),
        });

        if (!res.body) {
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        controller.enqueue(
          encoder.encode("data: {\"error\": \"bridge unavailable\"}\n\n")
        );
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
