/**
 * E2E Test Utilities
 * Helper functions for end-to-end testing of the VIBE pipeline
 */

export interface ApiConfig {
  baseUrl: string;
  timeout?: number;
  tenantId?: string;
}

/**
 * Simple API client for E2E tests
 */
export class TestApiClient {
  private baseUrl: string;
  private timeout: number;
  private tenantId: string;

  constructor(config: ApiConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    this.tenantId = config.tenantId || process.env.TENANT_ID || 'local';
  }

  private baseHeaders(extra?: Record<string, string>): Record<string, string> {
    return { 'Content-Type': 'application/json', 'X-Tenant-Id': this.tenantId, ...extra };
  }

  async get(path: string): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'X-Tenant-Id': this.tenantId },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GET ${path} failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  async post(path: string, body: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.baseHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`POST ${path} failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  async delete(path: string): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'X-Tenant-Id': this.tenantId },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`DELETE ${path} failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}

export interface SSECollectorOptions {
  timeout?: number;
  until?: (log: string) => boolean;
  onParseError?: (line: string, error: Error) => void;
}

/**
 * Collect Server-Sent Events (SSE) logs from an endpoint
 */
export async function collectSSE(
  baseUrl: string,
  path: string,
  logs: string[],
  options: SSECollectorOptions = {}
): Promise<void> {
  const { timeout = 180000, until, onParseError } = options;
  const url = `${baseUrl}${path}`;

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`SSE collection timeout after ${timeout}ms`));
    }, timeout);

    fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/event-stream',
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          clearTimeout(timeoutId);
          reject(new Error(`SSE connection failed: ${response.status} ${response.statusText}`));
          return;
        }

        if (!response.body) {
          clearTimeout(timeoutId);
          reject(new Error('SSE response has no body'));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              clearTimeout(timeoutId);
              resolve();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.slice(5).trim());
                  if (data.log && data.log.event_message) {
                    const message = data.log.event_message;
                    logs.push(message);

                    // Check if we should stop collecting
                    if (until && until(message)) {
                      clearTimeout(timeoutId);
                      controller.abort();
                      resolve();
                      return;
                    }
                  }
                } catch (parseError: any) {
                  // Report parse errors via callback or silently continue
                  if (onParseError) {
                    onParseError(line, parseError);
                  }
                  // In test environments, parse errors may indicate bugs in SSE implementation
                  // but we continue collecting other logs
                }
              }
            }
          }
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            resolve(); // Resolved by until condition
          } else {
            reject(error);
          }
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          resolve(); // Timeout or until condition met
        } else {
          reject(error);
        }
      });
  });
}

/**
 * Wait for a condition with polling
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 30000, interval = 1000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}
