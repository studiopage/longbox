import { AppSettings } from '@/lib/app-settings';

/** Block webhook URLs targeting localhost or private IP ranges (SSRF prevention). */
export function isAllowedWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
      return false;
    }

    // Block private/internal IP ranges
    // 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x (link-local)
    const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipMatch) {
      const [, a, b] = ipMatch.map(Number);
      if (a === 10) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 169 && b === 254) return false;
      if (a === 0) return false;
    }

    // Must be http or https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

type WebhookEvent =
  | 'request_created'
  | 'request_fulfilled'
  | 'scan_completed'
  | 'error';

/**
 * Fire a webhook to the configured URL (e.g. n8n).
 * Fire-and-forget: errors are caught and logged, never thrown.
 * Does nothing if no webhook URL is configured.
 */
export async function fireWebhook(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const url = await AppSettings.get('webhook_url');
    if (!url) return;

    // Validate URL to prevent SSRF to internal services
    if (!isAllowedWebhookUrl(url)) {
      console.warn('[WEBHOOK] Blocked request to disallowed URL:', url);
      return;
    }

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...payload,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.error('[WEBHOOK] Failed to dispatch:', err);
  }
}
