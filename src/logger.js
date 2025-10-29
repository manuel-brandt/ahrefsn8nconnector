const levels = ["debug", "info", "warn", "error"];

function log(level, message, context = {}) {
  if (!levels.includes(level)) {
    level = "info";
  }

  const payload = {
    level,
    message,
    ...context,
    timestamp: new Date().toISOString(),
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
  } else if (level === "warn") {
    console.warn(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

module.exports = {
  log,
};
