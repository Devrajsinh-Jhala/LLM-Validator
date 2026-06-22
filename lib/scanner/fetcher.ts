import { assertSafePublicUrl } from "./security";

const USER_AGENT = "AgentReadyBot/0.1 (+https://agentready.local/bot)";
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_REDIRECTS = 5;

export interface SafeFetchResult {
  url: string;
  status: number;
  contentType: string;
  body: string;
  headers: Headers;
}

export async function safeFetch(
  input: string,
  options: { timeoutMs?: number; maxBytes?: number } = {},
): Promise<SafeFetchResult> {
  let current = await assertSafePublicUrl(input);
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBytes = options.maxBytes ?? MAX_RESPONSE_BYTES;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,text/plain,application/xml,text/xml;q=0.9,*/*;q=0.5",
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Timed out while fetching ${current.hostname}.`);
      }
      throw new Error(`Could not fetch ${current.href}.`);
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The website returned an invalid redirect.");
      current = await assertSafePublicUrl(new URL(location, current).href);
      continue;
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > maxBytes) throw new Error("The response is too large to scan safely.");
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new Error("The response is too large to scan safely.");

    return {
      url: current.href,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      body: new TextDecoder("utf-8", { fatal: false }).decode(buffer),
      headers: response.headers,
    };
  }

  throw new Error("The website redirected too many times.");
}
