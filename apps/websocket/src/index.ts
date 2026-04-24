import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { parse as parseCookie } from "cookie";
import { jwtVerify } from "jose";

const PORT = Number(process.env.WS_PORT) || 3002;

// Map of userId -> Set of connected sockets
const userConnections = new Map<string, Set<WebSocket>>();

const server = createServer();
const wss = new WebSocketServer({ server });

function getAccessSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_ACCESS_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

async function validateAccessToken(
  token: string,
): Promise<{ userId: string; name: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret());
    return {
      userId: payload.sub as string,
      name: payload.name as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

wss.on("connection", async (ws, req) => {
  // Extract access token from cookie
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    ws.close(4001, "No cookie");
    return;
  }

  const cookies = parseCookie(cookieHeader);
  const token = cookies.access_token;
  if (!token) {
    ws.close(4001, "No access token");
    return;
  }

  const user = await validateAccessToken(token);
  if (!user) {
    ws.close(4003, "Invalid token");
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
