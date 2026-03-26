// apps/api/src/server.ts
import { createApp } from './app';

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});

/* MCP bootstrap */
import { bootstrapMCP } from './mcp/bootstrap';
bootstrapMCP();
