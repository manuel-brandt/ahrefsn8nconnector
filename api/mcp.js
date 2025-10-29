const { McpClient } = require("../src/mcpClient");
const { applyCors, parseJsonBody, sendJson } = require("../src/http");
const { log } = require("../src/logger");

let cachedClient = null;

function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  try {
    cachedClient = new McpClient();
    return cachedClient;
  } catch (error) {
    log("error", "Failed to initialize MCP client", { error: String(error) });
    throw error;
  }
}

module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, {
      error: "Method Not Allowed",
      message: "Only POST requests are supported.",
    });
    return;
  }

  let payload;

  try {
    payload = await parseJsonBody(req);
  } catch (error) {
    log("warn", "Invalid request payload received", { error: error.message, details: error.details });
    sendJson(res, error.status ?? 400, {
      error: "Bad Request",
      message: error.message,
    });
    return;
  }

  const { action, params = {} } = payload ?? {};

  if (!action || typeof action !== "string") {
    sendJson(res, 400, {
      error: "Bad Request",
      message: "The 'action' field is required and must be a string.",
    });
    return;
  }

  log("info", "Forwarding MCP action", { action });

  let client;
  try {
    client = getClient();
  } catch (error) {
    sendJson(res, 500, {
      error: "ConfigurationError",
      message: error.message,
    });
    return;
  }

  try {
    let result;

    switch (action) {
      case "listTools":
        result = await client.listTools();
        break;
      case "callTool": {
        const { name, arguments: args } = params;
        result = await client.callTool(name, args ?? {});
        break;
      }
      case "listResources":
        result = await client.listResources();
        break;
      case "readResource":
        result = await client.readResource(params?.uri);
        break;
      case "getMetadata":
        result = await client.getMetadata();
        break;
      default: {
        if (action.startsWith("raw:")) {
          const method = action.replace(/^raw:/, "");
          result = await client.sendRequest(method, params);
          break;
        }

        sendJson(res, 400, {
          error: "Unsupported Action",
          message: `The action '${action}' is not supported. Use one of listTools, callTool, listResources, readResource, getMetadata, or raw:<jsonrpc-method>.`,
        });
        return;
      }
    }

    sendJson(res, 200, { result });
  } catch (error) {
    log("error", "MCP request failed", {
      action,
      error: error.message,
      stack: error.stack,
      code: error.code,
      status: error.status,
    });

    const status = error.status ?? 502;
    sendJson(res, status, {
      error: "McpRequestFailed",
      message: error.message,
      details: error.details ?? error.data ?? null,
      code: error.code,
    });
  }
};
