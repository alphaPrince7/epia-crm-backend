/** Starts the HTTP server. Also guards against unhandled crashes. */
const app = require("./app");

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EPIA CRM backend running on http://localhost:${PORT}`));

// Final safety nets so a stray async error never takes the whole app down.
process.on("unhandledRejection", (reason) =>
  console.error(`[unhandledRejection] ${reason}`)
);
process.on("uncaughtException", (err) =>
  console.error(`[uncaughtException] ${err.message}`)
);
