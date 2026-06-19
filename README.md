# mcp-doc-search

A small [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that gives
an LLM grounded search and retrieval over a local folder of documents. The model calls
`search_docs` to find relevant sources, then `get_document` to read and cite them, so
answers stay grounded in your files instead of the model's memory.

Built as a focused, forward-deployed pattern: the simplest thing that makes retrieval
real and citable, ready to drop into an enterprise workflow and extend with embeddings or
evals.

## Tools

| Tool | What it does |
|------|--------------|
| `search_docs` | Ranks documents in the docs folder against a query and returns top matches with snippets and scores. |
| `get_document` | Returns the full text of a document by id, for citation or deeper reading. |

## Quick start

```bash
npm install
npm run build
DOCS_DIR=./docs npm start
```

The server speaks MCP over stdio, so it is launched by an MCP client rather than used
directly.

### Use with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "doc-search": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-doc-search/dist/index.js"],
      "env": { "DOCS_DIR": "/absolute/path/to/your/docs" }
    }
  }
}
```

Then ask Claude something answerable from your docs, for example:
"Search the docs for the KYC retry policy and cite the source."

## How it works

1. On startup the server indexes every `.md` / `.txt` file in `DOCS_DIR`.
2. `search_docs` scores documents with a term-frequency relevance measure and returns
   ranked snippets.
3. `get_document` returns full text for citation.

Scoring is intentionally simple. The point is the grounded retrieval contract, which is
swappable for vector embeddings without changing the tool interface.

## Roadmap

- Vector embeddings + chunking for semantic search
- PDF ingestion with OCR for scanned documents
- A small eval set to measure answer groundedness

## License

MIT
