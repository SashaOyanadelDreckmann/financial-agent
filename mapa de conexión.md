# Visión mental del proyecto (mapa de conexión)

## Backend — apps/api
Aquí vive **la inteligencia y la lógica**. Todo lo que “piensa”, decide, calcula o consulta datos está acá.

agents/  
→ **Cerebro del sistema**  
- `core.agent/` → razonador principal (decide qué hacer, cuándo simular, cuándo preguntar)  
- `diagnostic/` → genera diagnóstico financiero  
- `intake/` → analiza formularios y contexto inicial  
- `interviewer.agent.ts` / `followup.agent.ts` → conducción conversacional  

mcp/  
→ **Caja de herramientas del agente**  
- tools/ → cálculos, simulaciones, scraping, RAG, indicadores económicos  
- knowledge/ → definiciones financieras  
- registry + runMCPTool → ejecución controlada de herramientas  

orchestrator/  
→ **Sistema nervioso**  
- decide qué agente actúa  
- mantiene el flujo de conversación  
- conecta mensaje → agente → respuesta  

routes/  
→ **Puertas HTTP**  
- lo único que ve el frontend  
- expone conversación, intake, diagnóstico, simulaciones  

services/  
→ **Servicios puros**  
- LLM, RAG, storage, simulaciones  
- no saben nada de UI  

schemas / types  
→ **Contratos y forma de los datos**  

server.ts  
→ **Arranque del backend**  


---

## Frontend — apps/web
Aquí vive **la experiencia**. Todo lo visible y lo interactivo.

app/  
→ **Rutas y pantallas**  
- `/agent` → chat principal  
- `/intake` → cuestionario guiado  
- `/diagnosis` → resultado y narrativa  
- `/interview` → modo entrevista  

components/  
→ **Bloques visuales**  
- burbujas del agente  
- cards de diagnóstico  
- gráficos, documentos, citas  

lib/  
→ **Pegamento frontend-backend**  
- `api.ts` → cliente HTTP  
- `handleAgentResponse.ts` → traduce respuesta del agente a UI  
- `uiEventDispatcher.ts` → efectos visuales y acciones  

state/  
→ **Memoria del usuario**  
- chat.store → historial  
- session.store → sesión activa  
- profile.store → perfil financiero  

styles / motion  
→ **Estética y animaciones**  


---

## Shared — packages/shared
→ **Lenguaje común**

- tipos de intake  
- eventos de UI  
- contratos compartidos  
Backend y frontend hablan el mismo idioma gracias a esto.


---

## Flujo completo (de extremo a extremo)

Usuario  
→ Frontend (pantalla / componente)  
→ `lib/api.ts`  
→ Backend `routes/`  
→ `orchestrator`  
→ `agent` + `mcp tools`  
→ respuesta estructurada  
→ Frontend traduce a UI  
→ Estado se guarda  
→ Usuario ve, interactúa, continúa


---

📌 **Idea clave**  
- Backend = pensar  
- Frontend = mostrar  
- Shared = acordar  
- Orchestrator = coordinar  

Todo lo demás son órganos especializados trabajando en conjunto.
