#!/usr/bin/env node
/**
 * mcp-doc-search
 * A Model Context Protocol server that exposes grounded document search and retrieval
 * over a local folder. An LLM client (Claude Desktop, etc.) can call these tools to
 * answer questions using only the provided documents, with source attribution.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, resolve } from "node:path";

const DOCS_DIR = resolve(process.env.DOCS_DIR ?? "docs");
const TEXT_EXT = new Set([".md", ".txt", ".markdown"]);

interface Doc {
  id: string;
  text: string;
  tokens: string[];
}

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function loadDocs(dir: string): Doc[] {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  const docs: Doc[] = [];
  for (const name of entries) {
    const full = join(dir, name);
    if (!statSync(full).isFile() || !TEXT_EXT.has(extname(name))) continue;
    const text = readFileSync(full, "utf8");
    docs.push({ id: name, text, tokens: tokenize(text) });
  }
  return docs;
}

/** Simple TF-based relevance score. Good enough to demonstrate grounded retrieval. */
function score(queryTokens: string[], doc: Doc): number {
  if (doc.tokens.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const t of doc.tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  let s = 0;
  for (const q of queryTokens) s += counts.get(q) ?? 0;
  return s / Math.sqrt(doc.tokens.length);
}

function snippet(text: string, queryTokens: string[], radius = 160): string {
  const lower = text.toLowerCase();
  let at = -1;
  for (const q of queryTokens) {
    const i = lower.indexOf(q);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1) return text.slice(0, radius).trim();
  const start = Math.max(0, at - radius / 2);
  return (start > 0 ? "..." : "") + text.slice(start, start + radius).trim() + "...";
}

const docs = loadDocs(DOCS_DIR);

const server = new McpServer({ name: "mcp-doc-search", version: "0.1.0" });

server.registerTool(
  "search_docs",
  {
    title: "Search documents",
    description:
      "Search the local document set for a query and return the most relevant documents with snippets. Use this to ground answers in real sources before responding.",
    inputSchema: {
      query: z.string().describe("Natural language query or keywords"),
      limit: z.number().int().min(1).max(10).default(3).describe("Max results"),
    },
  },
  async ({ query, limit }) => {
    const qt = tokenize(query);
    const ranked = docs
      .map((d) => ({ id: d.id, s: score(qt, d), snip: snippet(d.text, qt) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, limit);

    if (ranked.length === 0) {
      return { content: [{ type: "text", text: `No matches for "${query}".` }] };
    }
    const text = ranked
      .map((r, i) => `${i + 1}. [${r.id}] (score ${r.s.toFixed(2)})\n   ${r.snip}`)
      .join("\n\n");
    return { content: [{ type: "text", text }] };
  }
);

server.registerTool(
  "get_document",
  {
    title: "Get document",
    description: "Return the full text of a document by its id (filename), for citation or deeper reading.",
    inputSchema: { id: z.string().describe("Document id, e.g. a filename returned by search_docs") },
  },
  async ({ id }) => {
    const doc = docs.find((d) => d.id === id);
    if (!doc) return { content: [{ type: "text", text: `Document not found: ${id}` }], isError: true };
    return { content: [{ type: "text", text: doc.text }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`mcp-doc-search ready. Indexed ${docs.length} document(s) from ${DOCS_DIR}.`);
