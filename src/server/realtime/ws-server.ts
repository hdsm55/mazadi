import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { redis, PUBSUB_CHANNEL } from "@/server/db/redis";

// Standalone WebSocket server.
// Subscribes to Redis Pub/Sub and fans out events to connected clients.
// Clients subscribe to lots via a `subscribe` message.

const PORT = Number(process.env.WS_PORT ?? 3001);

const server = createServer();
const wss = new WebSocketServer({ server });

// Map of lotId -> Set<WebSocket>
const lotSubscribers = new Map<string, Set<WebSocket>>();

function subscribe(socket: WebSocket, lotId: string) {
  if (!lotSubscribers.has(lotId)) lotSubscribers.set(lotId, new Set());
  lotSubscribers.get(lotId)!.add(socket);
}

function unsubscribe(socket: WebSocket) {
  for (const [lotId, sockets] of lotSubscribers) {
    sockets.delete(socket);
    if (sockets.size === 0) lotSubscribers.delete(lotId);
  }
}

wss.on("connection", (socket) => {
  socket.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "subscribe" && msg.lotId) {
        subscribe(socket, msg.lotId);
      }
    } catch {
      // ignore malformed
    }
  });
  socket.on("close", () => unsubscribe(socket));
});

// Subscribe to Redis and fan out.
const sub = redis.duplicate();
sub.subscribe(PUBSUB_CHANNEL);
sub.on("message", (_channel, message) => {
  let event: { topic: string; payload: { lotId?: string } };
  try {
    event = JSON.parse(message);
  } catch {
    return;
  }
  const lotId = event.payload?.lotId;
  if (!lotId) return;
  const sockets = lotSubscribers.get(lotId);
  if (!sockets) return;
  const out = JSON.stringify(event);
  for (const socket of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(out);
    }
  }
});

server.listen(PORT, () => {
  console.log(`[mazadi-ws] listening on :${PORT}`);
});
