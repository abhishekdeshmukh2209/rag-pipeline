# Optional database scripts

The live demo indexes **markdown from the filesystem or classpath** and does **not**
require a database. These scripts are for **extending** the project when you want
to store documents and chunks in PostgreSQL (for example, multi-user ingestion,
versioning, or hybrid search).

See `docs/DEVELOPMENT.md` for how they fit into a larger architecture.

## Apply with `psql`

```bash
psql -h localhost -U your_user -d rag_demo -f 001_schema_documents_chunks.sql
psql -h localhost -U your_user -d rag_demo -f 002_seed_sample_data.sql
```

Create the database first:

```sql
CREATE DATABASE rag_demo;
```

Adjust connection flags for your environment (SSL, port, role).
