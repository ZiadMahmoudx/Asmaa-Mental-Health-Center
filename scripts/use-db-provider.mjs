#!/usr/bin/env node
/**
 * Switch prisma/schema.prisma between PostgreSQL and Microsoft SQL Server.
 *
 *     node scripts/use-db-provider.mjs sqlserver
 *     node scripts/use-db-provider.mjs postgresql
 *
 * or through the npm aliases: `npm run db:use:sqlserver` / `npm run db:use:postgres`.
 *
 * WHY A SCRIPT AND NOT `provider = env(...)`
 * ------------------------------------------
 * Prisma resolves the datasource provider at schema-parse time and validates
 * every native type attribute against it, so the provider cannot come from an
 * environment variable. The schema is therefore kept in one portable file (no
 * enums, no scalar lists, sized ids — see the header of schema.prisma) and this
 * script performs the only two edits that genuinely differ between providers.
 *
 * WHAT IT REWRITES
 * ----------------
 *  1. The `provider` line inside the `datasource db { … }` block.
 *  2. Native string types:
 *
 *       PostgreSQL            SQL Server
 *       ----------            ----------
 *       @db.VarChar(n)   <->  @db.NVarChar(n)
 *       @db.Text         <->  @db.NVarChar(Max)
 *
 * The second mapping is a correctness requirement, not a stylistic one. On SQL
 * Server `VARCHAR` is a single-byte, code-page type: every Arabic name, doctor
 * biography and clinical note written into one would come back as question
 * marks. `NVARCHAR` is the Unicode type and is the only safe choice here.
 *
 * The script is idempotent and refuses to write anything if the rewrite would
 * leave a type attribute belonging to the other provider behind.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SCHEMA_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "prisma",
  "schema.prisma",
);

const PROVIDERS = {
  postgresql: {
    label: "PostgreSQL",
    urlExample:
      'postgresql://asmaa:PASSWORD@localhost:5432/asmaa_clinic?schema=public',
    // Applied in order. Each entry is [pattern, replacement].
    rewrites: [
      [/@db\.NVarChar\(Max\)/g, "@db.Text"],
      [/@db\.NVarChar\((\d+)\)/g, "@db.VarChar($1)"],
    ],
    // Attributes that must not survive the rewrite.
    forbidden: [/@db\.NVarChar/],
  },
  sqlserver: {
    label: "Microsoft SQL Server",
    urlExample:
      'sqlserver://localhost:14331;database=asmaa_clinic;user=sa;password=PASSWORD;encrypt=true;trustServerCertificate=true',
    rewrites: [
      [/@db\.Text\b/g, "@db.NVarChar(Max)"],
      [/@db\.VarChar\((\d+)\)/g, "@db.NVarChar($1)"],
    ],
    forbidden: [/@db\.Text\b/, /@db\.VarChar\(/],
  },
};

const ALIASES = {
  postgres: "postgresql",
  postgresql: "postgresql",
  pg: "postgresql",
  sqlserver: "sqlserver",
  mssql: "sqlserver",
  sql: "sqlserver",
};

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const requested = (process.argv[2] ?? "").toLowerCase();
const target = ALIASES[requested];

if (!target) {
  fail(
    `Usage: node scripts/use-db-provider.mjs <postgresql|sqlserver>\n` +
      `  Received: ${process.argv[2] ?? "(nothing)"}`,
  );
}

const config = PROVIDERS[target];

let schema;
try {
  schema = readFileSync(SCHEMA_PATH, "utf8");
} catch (error) {
  fail(`Could not read ${SCHEMA_PATH}\n  ${error.message}`);
}

// --- 1. the datasource provider ---------------------------------------------

const datasourceBlock = /datasource\s+db\s*\{[^}]*\}/;
const match = schema.match(datasourceBlock);

if (!match) {
  fail("No `datasource db { … }` block found in prisma/schema.prisma.");
}

const currentProvider = match[0].match(/provider\s*=\s*"([^"]+)"/)?.[1];

if (!currentProvider) {
  fail("The datasource block has no `provider` line.");
}

const rewrittenBlock = match[0].replace(
  /provider\s*=\s*"[^"]+"/,
  `provider = "${target}"`,
);

let output = schema.replace(datasourceBlock, rewrittenBlock);

// --- 2. native type attributes ----------------------------------------------

/**
 * Rewrites are applied per line, and only to the code portion of that line.
 *
 * Comments are left exactly as written. The schema header documents the mapping
 * in both directions ("@db.VarChar(n) <-> @db.NVarChar(n)"), and rewriting that
 * prose would both corrupt the explanation and make the validation step below
 * trip over its own documentation.
 */
function splitCode(line) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return { code: "", comment: line };

  // Prisma has no string literal that can contain "//", so the first occurrence
  // on a code line always starts a trailing comment.
  const commentAt = line.indexOf("//");
  return commentAt === -1
    ? { code: line, comment: "" }
    : { code: line.slice(0, commentAt), comment: line.slice(commentAt) };
}

output = output
  .split("\n")
  .map((line) => {
    const { code, comment } = splitCode(line);
    if (!code) return line;

    let rewritten = code;
    for (const [pattern, replacement] of config.rewrites) {
      rewritten = rewritten.replace(pattern, replacement);
    }
    return rewritten + comment;
  })
  .join("\n");

// --- 3. verify nothing from the other dialect survived -----------------------

output.split("\n").forEach((line, index) => {
  const { code } = splitCode(line);
  if (!code) return;

  for (const pattern of config.forbidden) {
    const leftover = code.match(pattern);
    if (leftover) {
      fail(
        `Refusing to write: found ${leftover[0]} at line ${index + 1}, which ` +
          `${config.label} does not accept.\n    ${line.trim()}\n` +
          `  Add a mapping for it in scripts/use-db-provider.mjs.`,
      );
    }
  }
});

// Rule 3 from the schema header: an unsized id or foreign key silently becomes
// NVarChar(1000) on SQL Server and blows the 900-byte index key limit.
if (target === "sqlserver") {
  const unsizedId = output.match(/^\s*id\s+String\s+@id\s+@default\(cuid\(\)\)\s*$/m);
  if (unsizedId) {
    fail(
      "Found an `id` column without @db.NVarChar(30). On SQL Server it would " +
        "become NVarChar(1000) and break the 900-byte index key limit.",
    );
  }
}

if (currentProvider === target && output === schema) {
  console.log(`\n  Already targeting ${config.label}. Nothing to change.\n`);
  process.exit(0);
}

writeFileSync(SCHEMA_PATH, output, "utf8");

console.log(`
  Schema switched:  ${currentProvider}  ->  ${target}   (${config.label})

  Next:
    1. Point DATABASE_URL at the new server, e.g.
       ${config.urlExample}
    2. npm run db:generate
    3. npm run db:push        (or db:migrate for a versioned migration)
    4. npm run db:seed
`);
