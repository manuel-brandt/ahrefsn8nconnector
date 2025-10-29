const { applyCors, sendJson } = require("../src/http");

module.exports = async function handler(req, res) {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  sendJson(res, 200, {
    status: "ok",
    message: "Ahrefs MCP bridge is operational.",
  });
};
