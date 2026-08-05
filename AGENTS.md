<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the relevant symbols' verbatim source plus the call paths between them — including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source.
- Useful companions: `codegraph query <symbol>` (search symbols), `codegraph callers <symbol>`, `codegraph callees <symbol>`, `codegraph impact <symbol>` (blast radius), `codegraph status` (index freshness).

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
