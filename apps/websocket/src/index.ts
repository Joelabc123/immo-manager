import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { parse as parseCookie } from "cookie";
import { eq, gt } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { sessions, users } from "@repo/shared/db/schema";

const PORT = Number(process.env.WS_PORT) || 3002;

// Map of userId -> Set of connected sockets
const userConnections = new Map<string, Set<WebSocket>>();

const server = createServer();
const wss = new WebSocketServer({ server });

async function validateSessionToken(
  token: string,
): Promise<{ userId: string; name: string; email: string } | null> {
  const result = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);

  if (result.length === 0) return null;

  // Check expiry
  const sessionRow = await db
    .select({ expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (
    sessionRow.length === 0 ||
    new Date(sessionRow[0].expiresAt) < new Date()
  ) {
    return null;
  }

  return result[0];
}

wss.on("connection", async (ws, req) => {
  // Extract session token from cookie
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    ws.close(4001, "No session cookie");
    return;
  }

  const cookies = parseCookie(cookieHeader);
  const token = cookies.session_token;
  if (!token) {
    ws.close(4001, "No session token");
    return;
  }

  const user = await validateSessionToken(token);
  if (!user) {
    ws.close(4003, "Invalid session");
    return;
  }

  // Register connection
  if (!userConnections.has(user.userId)) {
    userConnections.set(user.userId, new Set());
  }
  userConnections.get(user.userId)!.add(ws);

  console.log(
    `[ws] User ${user.userId} connected. Active: ${userConnections.get(user.userId)!.size}`,
  );

  ws.on("close", () => {
    const conns = userConnections.get(user.userId);
    if (conns) {
      conns.delete(ws);
      if (conns.size === 0) {
        userConnections.delete(user.userId);
      }
    }
    console.log(`[ws] User ${user.userId} disconnected.`);
  });

  ws.on("error", (err) => {
    console.error(`[ws] Error for user ${user.userId}:`, err.message);
  });

  // No incoming messages expected — this is server-push only
  ws.on("message", () => {
    // Silently ignore
  });

  // Send welcome
  ws.send(JSON.stringify({ type: "connected", userId: user.userId }));
});

/**
 * Send a message to all connected sockets of a specific user.
 */
export function sendToUser(
  userId: string,
  payload: { type: string; data?: unknown },
): void {
  const conns = userConnections.get(userId);
  if (!conns) return;

  const message = JSON.stringify(payload);
  for (const ws of conns) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Broadcast a message to all connected users.
 */
export function broadcast(payload: { type: string; data?: unknown }): void {
  const message = JSON.stringify(payload);
  for (const [, conns] of userConnections) {
    for (const ws of conns) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}

server.listen(PORT, () => {
  console.log(`[ws] WebSocket server listening on port ${PORT}`);
});
