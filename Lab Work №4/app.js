const express = require("express");
const cors = require("cors");

const { notFoundHandler, errorHandler } = require("./utils/errors");
const mapsRoutes = require("./routes/maps");
const reportsRoutes = require("./routes/reports");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "mental-maps-api", version: "v1" });
});

app.use("/api/v1/maps", mapsRoutes);
app.use("/api/v1/reports", reportsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
