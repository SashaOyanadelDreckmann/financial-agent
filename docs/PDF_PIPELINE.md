# Pipeline PDF Profesional

Flujo:
1. Tool MCP genera simulación
2. agent_blocks + CHART_UPDATE se renderizan en chat
3. persist_suggestion → CHOICE
4. Usuario confirma
5. Se llama doc.generate_pdf
6. PDF se guarda y retorna como artifact

Playwright permite:
- gráficos reales
- layout consistente
- export A4 premium
