import { spawnSync } from "node:child_process";

const [databaseName, fromInput, toInput] = process.argv.slice(2);

const STATIC_PATHS = [
  "/linkedin/about",
  "/linkedin/post",
  "/company/about",
  "/company/services",
  "/youtube/channel",
  "/youtube/comment",
  "/facebook/intro",
  "/facebook/post",
  "/instagram/post",
  "/tiktok/post",
  "/alignable/profile"
];

if (!databaseName || !fromInput || !toInput) {
  console.error("Usage: npm run report -- <database-name> <from-ISO-UTC> <to-ISO-UTC>");
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(databaseName)) {
  console.error("Database name may contain only lowercase letters, digits and hyphens.");
  process.exit(1);
}

const UTC_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function parseUtc(value) {
  if (!UTC_ISO_PATTERN.test(value)) {
    return Number.NaN;
  }

  const timestamp = Date.parse(value);
  const normalized = value.length === 20 ? `${value.slice(0, -1)}.000Z` : value;
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === normalized
    ? timestamp
    : Number.NaN;
}

const from = parseUtc(fromInput);
const to = parseUtc(toInput);

if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
  console.error("Provide a valid UTC interval with from earlier than to.");
  process.exit(1);
}

const staticPathList = STATIC_PATHS.map((path) => `'${path}'`).join(", ");
const trackablePathFilter = [
  `path IN (${staticPathList})`,
  "OR (",
  "substr(path, 1, 9) = '/youtube/'",
  "AND length(path) > 9",
  "AND instr(substr(path, 10), '/') = 0",
  "AND instr(substr(path, 10), char(92)) = 0",
  "AND instr(lower(substr(path, 10)), '%2f') = 0",
  "AND instr(lower(substr(path, 10)), '%5c') = 0",
  ")"
].join(" ");

const sql = [
  "SELECT path, COUNT(*) AS clicks",
  "FROM clicks",
  `WHERE clicked_at >= ${Math.trunc(from)} AND clicked_at < ${Math.trunc(to)}`,
  `AND (${trackablePathFilter})`,
  "GROUP BY path",
  "ORDER BY clicks DESC, path ASC"
].join(" ");

const result = spawnSync(
  "npx",
  ["wrangler", "d1", "execute", databaseName, "--remote", "--command", sql],
  { stdio: "inherit" }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
