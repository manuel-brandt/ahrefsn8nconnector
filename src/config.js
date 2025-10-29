const DEFAULT_TIMEOUT_MS = 30000;

function getConfig() {
  const baseUrl = process.env.MCP_SERVER_URL;
  if (!baseUrl) {
    throw new Error(
      "Missing MCP_SERVER_URL environment variable. Set it to the remote Ahrefs MCP server endpoint."
    );
  }

  const timeout = Number.parseInt(process.env.MCP_REQUEST_TIMEOUT_MS ?? "", 10);
  const authToken = process.env.MCP_SERVER_AUTH_TOKEN;
  const corsOrigin = process.env.CORS_ALLOW_ORIGIN ?? "*";

  if (Number.isNaN(timeout) && process.env.MCP_REQUEST_TIMEOUT_MS) {
    throw new Error("MCP_REQUEST_TIMEOUT_MS must be a valid integer representing milliseconds.");
  }

  return {
    baseUrl: baseUrl.replace(/\/?$/, ""),
    timeout: Number.isNaN(timeout) ? DEFAULT_TIMEOUT_MS : timeout,
    authToken,
    corsOrigin,
  };
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  getConfig,
};
