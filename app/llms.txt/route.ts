export function GET() {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const content = `# AgentReady

> AgentReady is an agency-first platform for scanning, validating, and monitoring website AI readiness and llms.txt files.

## Product

- [AgentReady home](${base}): Product overview and live public website scanner

## Optional

- [Create a workspace](${base}/register): Account registration for agency workspaces
`;
  return new Response(content, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
