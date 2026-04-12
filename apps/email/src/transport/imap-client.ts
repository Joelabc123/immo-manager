import { ImapFlow } from "imapflow";
import { logger } from "../config";

interface ImapClientOptions {
  host: string;
  port: number;
  username: string;
  password: string;
}

/**
 * Create an ImapFlow client with standard settings.
 */
export function createImapClient(options: ImapClientOptions): ImapFlow {
  return new ImapFlow({
    host: options.host,
    port: options.port,
    secure: options.port === 993,
    auth: {
      user: options.username,
      pass: options.password,
    },
    logger: false,
    emitLogs: false,
  });
}

/**
 * Execute a callback with a connected IMAP client.
 * Automatically handles connect/disconnect lifecycle.
 */
export async function withImapClient<T>(
  options: ImapClientOptions,
  callback: (client: ImapFlow) => Promise<T>,
): Promise<T> {
  const client = createImapClient(options);

  try {
    await client.connect();
    return await callback(client);
  } finally {
    try {
      await client.logout();
    } catch (err) {
      logger.warn({ err }, "Failed to logout from IMAP gracefully");
    }
  }
}
