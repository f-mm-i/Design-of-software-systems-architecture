/**
 * In-memory storage for the lab (resets on restart).
 */
const store = {
  maps: new Map(),          // mapId -> map
  elements: new Map(),      // mapId -> Array<element>
  reports: new Map(),       // reportId -> report
  reportIndex: []           // ordered list of reportIds (for pagination)
};

module.exports = store;
