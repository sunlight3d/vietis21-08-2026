import { eventEmitter } from '@/lib/eventEmitter';
import { cookies } from "next/headers";
import { decrypt } from "@/lib/auth";

// Next.js App Router route configuration for SSE
export const dynamic = 'force-dynamic';

async function getUserId() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  if (!cookie) return null;
  const session = await decrypt(cookie);
  return session?.userId as string | null;
}

export async function GET(req: Request) {
  const currentUserId = await getUserId();
  if (!currentUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  let responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Write initial SSE headers conceptually (NextResponse handles this via init headers)
  
  const sendEvent = async (data: any) => {
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch (err) {
      console.error('Error writing SSE event', err);
    }
  };

  const onTaskChanged = (userId: string) => {
    if (userId === currentUserId) {
      sendEvent({ type: 'TASK_CHANGED', timestamp: Date.now() });
    }
  };

  eventEmitter.on('task_changed', onTaskChanged);

  // Send an initial heartbeat
  sendEvent({ type: 'CONNECTED', timestamp: Date.now() });

  req.signal.addEventListener('abort', () => {
    eventEmitter.off('task_changed', onTaskChanged);
    writer.close().catch(() => {});
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      // CORS headers if needed for mobile to connect directly to IP
      'Access-Control-Allow-Origin': '*',
    },
  });
}
