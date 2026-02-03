const express = require("express");
const { v4: uuidv4 } = require("uuid");

const store = require("../store/memoryStore");
const { requireAuth } = require("../middleware/auth");
const { httpError } = require("../utils/errors");

const router = express.Router();

function nowIso() {
  return new Date().toISOString();
}

function shortId(prefix) {
  return `${prefix}_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
}

function validateVisibility(value) {
  return value === "private" || value === "public";
}

function canReadMap(user, map) {
  if (!map) return false;
  if (map.visibility === "public") return true;
  if (user.role === "moderator") return true;
  return map.ownerId === user.id;
}

function canWriteMap(user, map) {
  if (!map) return false;
  if (user.role === "moderator") return true;
  return map.ownerId === user.id;
}

function findElement(mapId, elementId) {
  const list = store.elements.get(mapId) || [];
  const index = list.findIndex(e => e.elementId === elementId);
  return { list, index, element: index >= 0 ? list[index] : null };
}

// POST /api/v1/maps — create map
router.post("/", requireAuth, (req, res, next) => {
  try {
    const { title, description = "", visibility = "private" } = req.body || {};

    const details = [];
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      details.push({ field: "title", issue: "required" });
    }
    if (!validateVisibility(visibility)) {
      details.push({ field: "visibility", issue: "must be 'private' or 'public'" });
    }
    if (details.length) {
      throw httpError(400, "VALIDATION_ERROR", "Некорректные параметры запроса", details);
    }

    const mapId = shortId("map");
    const ts = nowIso();

    const map = {
      mapId,
      ownerId: req.user.id,
      title: title.trim(),
      description: typeof description === "string" ? description : "",
      visibility,
      createdAt: ts,
      updatedAt: ts
    };

    store.maps.set(mapId, map);
    store.elements.set(mapId, []);

    res.status(201).json(map);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/maps — list maps for current user (pagination: limit+cursor)
router.get("/", requireAuth, (req, res, next) => {
  try {
    const visibility = req.query.visibility;

    let limit = 20;
    if (typeof req.query.limit === "string") limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit < 1) limit = 20;
    if (limit > 50) limit = 50;

    let offset = 0;
    if (typeof req.query.cursor === "string") offset = parseInt(req.query.cursor, 10);
    if (Number.isNaN(offset) || offset < 0) offset = 0;

    let maps = Array.from(store.maps.values()).filter(m => m.ownerId === req.user.id);

    if (typeof visibility === "string" && (visibility === "private" || visibility === "public")) {
      maps = maps.filter(m => m.visibility === visibility);
    }

    maps.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

    const slice = maps.slice(offset, offset + limit);
    const nextOffset = offset + slice.length;
    const nextCursor = nextOffset < maps.length ? String(nextOffset) : null;

    res.status(200).json({
      items: slice.map(m => ({
        mapId: m.mapId,
        title: m.title,
        visibility: m.visibility,
        updatedAt: m.updatedAt
      })),
      nextCursor
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/maps/:mapId — get map (private: owner/moderator)
router.get("/:mapId", requireAuth, (req, res, next) => {
  try {
    const { mapId } = req.params;
    const map = store.maps.get(mapId);

    if (!map) throw httpError(404, "NOT_FOUND", "Карта не найдена");
    if (!canReadMap(req.user, map)) {
      throw httpError(403, "FORBIDDEN", "Недостаточно прав для просмотра карты");
    }

    res.status(200).json(map);
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/maps/:mapId — update map (owner/moderator)
router.put("/:mapId", requireAuth, (req, res, next) => {
  try {
    const { mapId } = req.params;
    const map = store.maps.get(mapId);

    if (!map) throw httpError(404, "NOT_FOUND", "Карта не найдена");
    if (!canWriteMap(req.user, map)) {
      throw httpError(403, "FORBIDDEN", "Недостаточно прав для изменения карты");
    }

    const { title, description, visibility } = req.body || {};
    const details = [];

    const hasTitle = typeof title !== "undefined";
    const hasDescription = typeof description !== "undefined";
    const hasVisibility = typeof visibility !== "undefined";

    if (!hasTitle && !hasDescription && !hasVisibility) {
      details.push({ field: "body", issue: "no_updatable_fields" });
    }
    if (hasTitle && (typeof title !== "string" || title.trim().length === 0)) {
      details.push({ field: "title", issue: "must be non-empty string" });
    }
    if (hasDescription && typeof description !== "string") {
      details.push({ field: "description", issue: "must be string" });
    }
    if (hasVisibility && !validateVisibility(visibility)) {
      details.push({ field: "visibility", issue: "must be 'private' or 'public'" });
    }

    if (details.length) {
      throw httpError(400, "VALIDATION_ERROR", "Некорректные параметры запроса", details);
    }

    if (hasTitle) map.title = title.trim();
    if (hasDescription) map.description = description;
    if (hasVisibility) map.visibility = visibility;
    map.updatedAt = nowIso();

    store.maps.set(mapId, map);
    res.status(200).json(map);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/maps/:mapId — delete map (owner/moderator)
router.delete("/:mapId", requireAuth, (req, res, next) => {
  try {
    const { mapId } = req.params;
    const map = store.maps.get(mapId);

    if (!map) throw httpError(404, "NOT_FOUND", "Карта не найдена");
    if (!canWriteMap(req.user, map)) {
      throw httpError(403, "FORBIDDEN", "Недостаточно прав для удаления карты");
    }

    store.maps.delete(mapId);
    store.elements.delete(mapId);

    const removedReportIds = [];
    for (const [reportId, report] of store.reports.entries()) {
      if (report.mapId === mapId) {
        store.reports.delete(reportId);
        removedReportIds.push(reportId);
      }
    }
    if (removedReportIds.length) {
      store.reportIndex = store.reportIndex.filter(id => !removedReportIds.includes(id));
    }

    res.status(200).json({ mapId, deleted: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/maps/:mapId/elements — add element to map
router.post("/:mapId/elements", requireAuth, (req, res, next) => {
  try {
    const { mapId } = req.params;
    const map = store.maps.get(mapId);

    if (!map) throw httpError(404, "NOT_FOUND", "Карта не найдена");
    if (!canWriteMap(req.user, map)) {
      throw httpError(403, "FORBIDDEN", "Недостаточно прав для изменения карты");
    }

    const { type, x, y, content = "", style = {} } = req.body || {};

    const details = [];
    if (!type || typeof type !== "string") details.push({ field: "type", issue: "required" });
    if (typeof x !== "number") details.push({ field: "x", issue: "must be number" });
    if (typeof y !== "number") details.push({ field: "y", issue: "must be number" });

    if (details.length) {
      throw httpError(400, "VALIDATION_ERROR", "Некорректные параметры запроса", details);
    }

    const elementId = shortId("el");
    const element = {
      elementId,
      mapId,
      type,
      x,
      y,
      content: typeof content === "string" ? content : "",
      style: typeof style === "object" && style !== null ? style : {},
      createdAt: nowIso()
    };

    const list = store.elements.get(mapId) || [];
    list.push(element);
    store.elements.set(mapId, list);

    map.updatedAt = nowIso();
    store.maps.set(mapId, map);

    res.status(201).json(element);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/maps/:mapId/elements — list elements of map
router.get("/:mapId/elements", requireAuth, (req, res, next) => {
  try {
    const { mapId } = req.params;
    const map = store.maps.get(mapId);

    if (!map) throw httpError(404, "NOT_FOUND", "Карта не найдена");
    if (!canReadMap(req.user, map)) {
      throw httpError(403, "FORBIDDEN", "Недостаточно прав для просмотра элементов карты");
    }

    const items = store.elements.get(mapId) || [];
    res.status(200).json({
      items: items.map(e => ({
        elementId: e.elementId,
        type: e.type,
        x: e.x,
        y: e.y,
        content: e.content
      }))
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/maps/:mapId/elements/:elementId — update element
router.put("/:mapId/elements/:elementId", requireAuth, (req, res, next) => {
  try {
    const { mapId, elementId } = req.params;
    const map = store.maps.get(mapId);

    if (!map) throw httpError(404, "NOT_FOUND", "Карта не найдена");
    if (!canWriteMap(req.user, map)) {
      throw httpError(403, "FORBIDDEN", "Недостаточно прав для изменения элементов карты");
    }

    const { list, index, element } = findElement(mapId, elementId);
    if (!element) throw httpError(404, "NOT_FOUND", "Элемент не найден");

    const { type, x, y, content, style } = req.body || {};
    const details = [];

    const hasType = typeof type !== "undefined";
    const hasX = typeof x !== "undefined";
    const hasY = typeof y !== "undefined";
    const hasContent = typeof content !== "undefined";
    const hasStyle = typeof style !== "undefined";

    if (!hasType && !hasX && !hasY && !hasContent && !hasStyle) {
      details.push({ field: "body", issue: "no_updatable_fields" });
    }
    if (hasType && (typeof type !== "string" || type.trim().length === 0)) {
      details.push({ field: "type", issue: "must be non-empty string" });
    }
    if (hasX && typeof x !== "number") details.push({ field: "x", issue: "must be number" });
    if (hasY && typeof y !== "number") details.push({ field: "y", issue: "must be number" });
    if (hasContent && typeof content !== "string") {
      details.push({ field: "content", issue: "must be string" });
    }
    if (hasStyle && (typeof style !== "object" || style === null)) {
      details.push({ field: "style", issue: "must be object" });
    }

    if (details.length) {
      throw httpError(400, "VALIDATION_ERROR", "Некорректные параметры запроса", details);
    }

    if (hasType) element.type = type.trim();
    if (hasX) element.x = x;
    if (hasY) element.y = y;
    if (hasContent) element.content = content;
    if (hasStyle) element.style = style;

    list[index] = element;
    store.elements.set(mapId, list);

    map.updatedAt = nowIso();
    store.maps.set(mapId, map);

    res.status(200).json(element);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/maps/:mapId/elements/:elementId — delete element
router.delete("/:mapId/elements/:elementId", requireAuth, (req, res, next) => {
  try {
    const { mapId, elementId } = req.params;
    const map = store.maps.get(mapId);

    if (!map) throw httpError(404, "NOT_FOUND", "Карта не найдена");
    if (!canWriteMap(req.user, map)) {
      throw httpError(403, "FORBIDDEN", "Недостаточно прав для удаления элементов карты");
    }

    const { list, index } = findElement(mapId, elementId);
    if (index < 0) throw httpError(404, "NOT_FOUND", "Элемент не найден");

    list.splice(index, 1);
    store.elements.set(mapId, list);

    map.updatedAt = nowIso();
    store.maps.set(mapId, map);

    res.status(200).json({ elementId, deleted: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
