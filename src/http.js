const { getConfig } = require("./config");

function applyCors(req, res) {
  let corsOrigin = "*";

  try {
    const { corsOrigin: configuredOrigin } = getConfig();
    corsOrigin = configuredOrigin;
  } catch (error) {
    // Swallow errors so that endpoints can still respond with a helpful message
    // when the MCP configuration is missing.
  }

  res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
}

async function parseJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf-8");

  try {
    return JSON.parse(raw);
  } catch (error) {
    const err = new Error("Invalid JSON payload provided.");
    err.status = 400;
    err.details = { raw };
    throw err;
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

module.exports = {
  applyCors,
  parseJsonBody,
  sendJson,
};
