# Ahrefs n8n Connector Bridge

This project provides a ready-to-deploy Vercel bridge that lets any HTTP client (including n8n workflows) call the free Ahrefs Model Context Protocol (MCP) server that is available in the default ChatGPT interface. The bridge exposes a compact JSON API on Vercel and forwards requests to the remote MCP server using JSON-RPC.

## Features

- 🔁 Simple HTTP JSON interface for listing Ahrefs tools, invoking tools, reading resources, and fetching metadata.
- 🔐 Optional bearer token forwarding when the remote MCP server requires authentication.
- ⏱️ Configurable request timeouts and CORS controls to tailor the bridge to your deployment needs.
- 🪶 Zero external runtime dependencies for fast, reliable Vercel deployments.

## Architecture Overview

The bridge runs as a pair of Vercel serverless functions:

- `api/mcp` – Accepts JSON payloads that describe an MCP action (e.g. `listTools`, `callTool`) and forwards the call to the remote Ahrefs MCP server using JSON-RPC 2.0 semantics.
- `api/health` – Lightweight health check endpoint used by monitoring tools or uptime checks.

Internally the bridge keeps a lightweight JSON-RPC client that uses the `fetch` API available in the Node 18+ runtime provided by Vercel. Each request is wrapped in a timeout guard and enriched with structured logging for easy debugging.

## Deployment

1. **Clone this repository** (or copy the files into your own project).
2. **Configure the environment variables** on Vercel:

   | Variable | Required | Description |
   |----------|----------|-------------|
| `MCP_SERVER_URL` | ✅ | Full JSON-RPC endpoint for the remote Ahrefs MCP server (e.g. `https://api.ahrefs.com/mcp/mcp`). |
   | `MCP_SERVER_AUTH_TOKEN` | ⛔️ | Optional bearer token forwarded to the MCP server. |
   | `MCP_REQUEST_TIMEOUT_MS` | ⛔️ | Overrides the default 30s timeout for MCP requests. |
   | `CORS_ALLOW_ORIGIN` | ⛔️ | Origin(s) allowed to access the API. Defaults to `*`. |

3. **Deploy to Vercel**. The default `vercel.json` configuration (included in this repo) sets `"version": 2` so Vercel uses its modern build system and explicitly pins the serverless runtime to `@vercel/node@3.0.0`. That satisfies Vercel's requirement that each function runtime include a concrete version (eliminating errors such as `Function Runtimes must have a valid version`) while ensuring the project runs on a Node 18-compatible runtime that supports the built-in `fetch` used by the bridge.

When connecting to the managed Ahrefs MCP instance, set `MCP_SERVER_AUTH_TOKEN` to the authorization token issued by Ahrefs. The bridge automatically negotiates both classic JSON responses and the server-sent events (SSE) stream emitted by the `https://api.ahrefs.com/mcp/mcp` endpoint, so n8n receives the final JSON-RPC payload without any additional workflow logic.

## Usage

Send a `POST` request to the `/api/mcp` endpoint with a JSON payload of the following shape:

```json
{
  "action": "callTool",
  "params": {
    "name": "ahrefs.domainOverview",
    "arguments": {
      "target": "ahrefs.com"
    }
  }
}
```

Supported `action` values:

- `listTools` – Retrieve the list of Ahrefs MCP tools.
- `callTool` – Invoke an Ahrefs tool. Provide `params.name` and optional `params.arguments`.
- `listResources` – Fetch the list of available resources exposed by the MCP server.
- `readResource` – Read a specific resource by URI (`params.uri`).
- `getMetadata` – Retrieve metadata describing the MCP server instance.
- `raw:<jsonrpc-method>` – Forward any custom JSON-RPC method directly to the remote server.

Each successful call returns `{ "result": <remote result> }`. Errors are normalized to:

```json
{
  "error": "McpRequestFailed",
  "message": "<message>",
  "details": { ... },
  "code": "<optional remote error code>"
}
```

### Example n8n HTTP Request Node

Configure an **HTTP Request** node in n8n with:

- **Method**: `POST`
- **URL**: `https://<your-vercel-deployment>.vercel.app/api/mcp`
- **Headers**: `Content-Type: application/json`
- **Body**: Raw JSON, e.g.

```json
{
  "action": "callTool",
  "params": {
    "name": "ahrefs.urlMetrics",
    "arguments": {
      "url": "https://ahrefs.com/blog/"
    }
  }
}
```

The node output will include the response from the Ahrefs MCP server, ready to be consumed by downstream workflow steps.

## Health Check

`GET https://<your-vercel-deployment>.vercel.app/api/health`

Returns:

```json
{
  "status": "ok",
  "message": "Ahrefs MCP bridge is operational."
}
```

## Local Testing

1. Set the required environment variable(s) locally:

   ```bash
   export MCP_SERVER_URL="https://example.com/mcp"
   ```

2. Start a local serverless dev environment (e.g. `vercel dev`) and send requests with `curl` or an HTTP client.

3. Use the health endpoint to verify connectivity:

   ```bash
   curl http://localhost:3000/api/health
   ```

## License

MIT
