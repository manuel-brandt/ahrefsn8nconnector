const { randomUUID } = require("crypto");
const { getConfig } = require("./config");
const { log } = require("./logger");

class McpClient {
  constructor() {
    const config = getConfig();
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.authToken = config.authToken;
  }

  getHeaders(additional = {}) {
    const headers = {
      "content-type": "application/json",
      ...additional,
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  async sendRequest(method, params = undefined) {
    const id = randomUUID();
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeout);

    let response;

    try {
      response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        const message = `Request to ${this.baseUrl} timed out after ${this.timeout}ms`;
        log("error", message, { method });
        throw new Error(message);
      }

      log("error", "Failed to reach MCP server", { error: String(error), method });
      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }

    const responseText = await response.text();
    let body;

    try {
      body = JSON.parse(responseText || "{}");
    } catch (error) {
      log("error", "Invalid JSON returned by MCP server", { responseText });
      throw new Error("MCP server returned invalid JSON response.");
    }

    if (!response.ok) {
      const errorMessage = body?.error?.message ?? response.statusText;
      log("error", "MCP server responded with error status", {
        status: response.status,
        body,
      });
      const error = new Error(errorMessage || "Remote MCP server returned an error status code.");
      error.status = response.status;
      error.details = body?.error;
      throw error;
    }

    if (body.error) {
      const error = new Error(body.error.message || "Remote MCP server returned an error response.");
      error.code = body.error.code;
      error.data = body.error.data;
      log("error", "MCP server returned JSON-RPC error", {
        method,
        error: body.error,
      });
      throw error;
    }

    log("debug", "Received MCP response", { method, id, hasResult: body.result !== undefined });

    return body.result;
  }

  async listTools() {
    return this.sendRequest("tools/list");
  }

  async callTool(name, args = {}) {
    if (!name || typeof name !== "string") {
      throw new Error("Tool name must be a non-empty string.");
    }

    return this.sendRequest("tools/call", {
      name,
      arguments: args,
    });
  }

  async listResources() {
    return this.sendRequest("resources/list");
  }

  async readResource(uri) {
    if (!uri || typeof uri !== "string") {
      throw new Error("Resource URI must be a non-empty string.");
    }

    return this.sendRequest("resources/read", { uri });
  }

  async getMetadata() {
    return this.sendRequest("metadata/read");
  }
}

module.exports = {
  McpClient,
};
