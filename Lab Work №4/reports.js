const express = require("express");
const { v4: uuidv4 } = require("uuid");

const store = require("../store/memoryStore");
const { requireAuth, requireModerator } = require("../middleware/auth");
const { httpError } = require("../utils/errors");

const router = express.Router();

function nowIso() {
  return new Date().toISOString();
}

function shortId(prefix) {
  return `${prefix}_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
}

function validateReportStatus(value) {
  return value === "new" || value === "in_progress" || value === "resolved" || value === "rejected";
}

// POST /api/v1/reports — create report (complaint)
router.post("/", requireAuth, (req, res, next) => {
  try {
    const { mapId, reason, comment = "" } = req.body || {};

    const details = [];
    if (!mapId || typeof mapId !== "string") details.push({ field: "mapId", issue: "required" });
    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      details.push({ field: "reason", issue: "required" });
    }
    if (details.length) {
      throw httpError(400, "VALIDATION_ERROR", "Некорректные параметры запроса", details);
    }

    const map = store.maps.get(mapId);
    if (!map) throw httpError(404, "NOT_FOUND", "Невозможно создать жалобу: карта не найдена");

    const reportId = shortId("rep");
    const report = {
      reportId,
      mapId,
      authorId: req.user.id,
      reason: reason.trim(),
      comment: typeof comment === "string" ? comment : "",
      status: "new",
      createdAt: nowIso()
    };

    store.reports.set(reportId, report);
    store.reportIndex.unshift(reportId);

    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/reports — list reports (moderator only)
router.get("/", requireAuth, requireModerator, (req, res, next) => {
  try {
    const status = req.query.status;

    let limit = 20;
    if (typeof req.query.limit === "string") limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit < 1) limit = 20;
    if (limit > 50) limit = 50;

    let offset = 0;
    if (typeof req.query.cursor === "string") offset = parseInt(req.query.cursor, 10);
    if (Number.isNaN(offset) || offset < 0) offset = 0;

    let ids = store.reportIndex.slice();

    if (typeof status === "string") {
      ids = ids.filter(id => {
        const r = store.reports.get(id);
        return r && r.status === status;
      });
    }

    const sliceIds = ids.slice(offset, offset + limit);
    const items = sliceIds.map(id => store.reports.get(id)).filter(Boolean);

    const nextOffset = offset + sliceIds.length;
    const nextCursor = nextOffset < ids.length ? String(nextOffset) : null;

    res.status(200).json({
      items: items.map(r => ({
        reportId: r.reportId,
        mapId: r.mapId,
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt
      })),
      nextCursor
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/reports/:reportId — update report (moderator only)
router.put("/:reportId", requireAuth, requireModerator, (req, res, next) => {
  try {
    const { reportId } = req.params;
    const report = store.reports.get(reportId);

    if (!report) throw httpError(404, "NOT_FOUND", "Жалоба не найдена");

    const { status, comment } = req.body || {};
    const details = [];

    const hasStatus = typeof status !== "undefined";
    const hasComment = typeof comment !== "undefined";

    if (!hasStatus && !hasComment) {
      details.push({ field: "body", issue: "no_updatable_fields" });
    }
    if (hasStatus && !validateReportStatus(status)) {
      details.push({ field: "status", issue: "invalid value" });
    }
    if (hasComment && typeof comment !== "string") {
      details.push({ field: "comment", issue: "must be string" });
    }

    if (details.length) {
      throw httpError(400, "VALIDATION_ERROR", "Некорректные параметры запроса", details);
    }

    if (hasStatus) report.status = status;
    if (hasComment) report.comment = comment;

    store.reports.set(reportId, report);
    res.status(200).json(report);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/reports/:reportId — delete report (moderator only)
router.delete("/:reportId", requireAuth, requireModerator, (req, res, next) => {
  try {
    const { reportId } = req.params;
    const report = store.reports.get(reportId);

    if (!report) throw httpError(404, "NOT_FOUND", "Жалоба не найдена");

    store.reports.delete(reportId);
    store.reportIndex = store.reportIndex.filter(id => id !== reportId);

    res.status(200).json({ reportId, deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
