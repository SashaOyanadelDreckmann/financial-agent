---
titulo: Model Context Protocol (MCP) — Estandarización de Interacción LLM-Herramientas
tipo: paper_academico
autores: Hou, X.; Zhao, Y.; Liu, Y.; Yang, Z.; Wang, K.; Li, L.; Luo, X.; Lo, D.; Grundy, J.; Wang, H.
año: 2025
venue: arXiv preprint arXiv:2503.23278
url: https://arxiv.org/abs/2503.23278
relevancia: CRÍTICA - Protocolo de orquestación central de las herramientas del agente
categorias: [MCP, herramientas, protocolo, orquestacion, LLM, agente, tool_use, integracion]
---

# Model Context Protocol (MCP): Estandarización de Interacción LLM-Herramientas

## Definición y Propósito

El **Model Context Protocol (MCP)** es un protocolo abierto desarrollado por Anthropic que define una interfaz **estandarizada** para que los modelos de lenguaje interactúen con herramientas externas, fuentes de datos y servicios.

### Analogía Clave
> MCP es para los LLMs lo que USB fue para los periféricos: un estándar universal que elimina la integración ad-hoc.

### Problema que Resuelve
Sin MCP, cada integración LLM-herramienta requería código personalizado:
- Agente A → integración custom con base de datos
- Agente B → integración custom con API de tasas
- Agente C → integración custom con calculadora financiera

Con MCP:
- Cualquier herramienta compatible puede conectarse a cualquier LLM compatible
- Un servidor MCP expone sus capacidades una vez; todos los clientes las descubren automáticamente

---

## Arquitectura MCP

### Componentes

```
┌─────────────────────────────────────┐
│           MCP HOST                  │
│  (LLM Application / Claude)        │
│                                     │
│  ┌─────────────┐  ┌──────────────┐  │
│  │ MCP Client  │  │ MCP Client   │  │
│  │ (Herramienta│  │ (RAG Server) │  │
│  │    1)       │  │              │  │
│  └──────┬──────┘  └──────┬───────┘  │
└─────────│────────────────│──────────┘
          │                │
    ┌─────▼─────┐    ┌─────▼─────┐
    │MCP Server │    │MCP Server │
    │(Database) │    │(Calc API) │
    └───────────┘    └───────────┘
```

| Componente | Rol |
|-----------|-----|
| **MCP Host** | La aplicación LLM que orquesta (Claude, GPT, etc.) |
| **MCP Client** | Módulo dentro del host que habla con un servidor |
| **MCP Server** | Servicio externo que expone herramientas via protocolo MCP |

### Tipos de Capacidades que Expone un Servidor MCP

| Tipo | Descripción | Ejemplo Financiero |
|------|-------------|-------------------|
| **Tools** | Funciones ejecutables por el LLM | Calcular CAE, consultar tasa |
| **Resources** | Datos legibles (archivos, URIs) | Documentos RAG, regulaciones |
| **Prompts** | Templates de prompts reutilizables | Formato de análisis de perfil |
| **Sampling** | El servidor puede solicitar al LLM | Interpretación de resultado |

---

## Protocolo de Comunicación

### Formato de Mensaje (JSON-RPC 2.0)

```json
// Host → Server: Solicitar lista de herramientas
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}

// Server → Host: Respuesta con herramientas disponibles
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "calcular_cae",
        "description": "Calcula la Carga Anual Equivalente de un crédito",
        "inputSchema": {
          "type": "object",
          "properties": {
            "monto": {"type": "number", "description": "Monto del crédito en CLP"},
            "tasa_mensual": {"type": "number", "description": "Tasa mensual en decimal"},
            "cuotas": {"type": "integer", "description": "Número de cuotas"},
            "gastos_adicionales": {"type": "number", "description": "Comisiones + seguros"}
          },
          "required": ["monto", "tasa_mensual", "cuotas"]
        }
      }
    ]
  }
}

// Host → Server: Ejecutar herramienta
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "calcular_cae",
    "arguments": {
      "monto": 5000000,
      "tasa_mensual": 0.015,
      "cuotas": 36,
      "gastos_adicionales": 150000
    }
  },
  "id": 2
}
```

### Transportes Soportados

| Transporte | Caso de Uso |
|-----------|------------|
| **stdio** | Proceso local (subproceso) — ideal para herramientas locales |
| **HTTP + SSE** | Servidor remoto, comunicación en tiempo real |
| **WebSocket** | Comunicación bidireccional en tiempo real |

---

## Ciclo de Vida de una Sesión MCP

```
1. INITIALIZE
   Host → Server: {protocolVersion, capabilities, clientInfo}
   Server → Host: {protocolVersion, capabilities, serverInfo}

2. CAPABILITY DISCOVERY
   Host: tools/list, resources/list, prompts/list

3. OPERATION
   Host ↔ Server: Llamadas a herramientas, lecturas de recursos

4. SHUTDOWN
   Host → Server: notifications/cancelled o cierre de conexión
```

---

## Ventajas para el Agente Financiero

### 1. Modularidad
Cada capacidad del agente es un servidor MCP independiente:
```
agente_financiero/
├── mcp_servers/
│   ├── rag_server.py          # Búsqueda en corpus RAG
│   ├── calculadora_server.py  # CAE, dividendo, carga financiera
│   ├── tasas_server.py        # Consulta tasas CMF (scraping/API)
│   ├── perfil_server.py       # Gestión perfil del usuario
│   └── alertas_server.py      # Reglas de alerta financiera
```

### 2. Estandarización
- Cualquier LLM que implemente MCP puede usar estas herramientas
- Facilita testing: cada servidor es testeado independientemente
- Facilita extensión: agregar herramienta = agregar un servidor MCP

### 3. Seguridad
MCP define mecanismos para:
- **Autorización:** El host aprueba cada llamada a herramienta
- **Scoping:** Cada cliente tiene acceso solo a sus herramientas asignadas
- **Auditoría:** Cada llamada queda registrada (relevante para REGULACIÓN)

### 4. Integración con ReAct
```
Ciclo ReAct ← → MCP
-----------------
Pensamiento    → LLM decide qué herramienta necesita
Acción         → LLM emite tool_call via MCP
Observación    → MCP Server ejecuta y retorna resultado
```

---

## Implementación para el Agente Financiero (Tesis)

### Servidor RAG (rag_server.py)

```python
# Ejemplo de herramienta MCP para RAG
{
  "name": "consultar_rag",
  "description": "Busca información en el corpus de finanzas personales chilenas",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Pregunta o términos a buscar"
      },
      "categoria": {
        "type": "string",
        "enum": ["normativa", "tasas", "productos", "seguros", "apv", "educacion"],
        "description": "Categoría opcional para filtrar el corpus"
      },
      "top_k": {
        "type": "integer",
        "default": 5,
        "description": "Número de documentos a recuperar"
      }
    },
    "required": ["query"]
  }
}
```

### Servidor Calculadora Financiera (calculadora_server.py)

```python
# Herramientas matemáticas para el agente
herramientas = [
  "calcular_cae",           # Carga Anual Equivalente
  "calcular_dividendo",     # Dividendo hipotecario mensual
  "calcular_carga_financiera",  # % ingreso en deudas
  "simular_apv_beneficio",  # Beneficio tributario APV A vs B
  "comparar_creditos",      # Comparar dos créditos por CAE
  "calcular_ahorro_interes" # Ahorros por prepago parcial
]
```

### Flujo Completo del Agente con MCP

```
USUARIO: "¿Cuánto pagaría de dividendo por UF 3000 a 20 años tasa fija 4.8%?"

AGENTE (Pensamiento):
  El usuario quiere calcular un dividendo hipotecario.
  Necesito: monto=UF3000, plazo=20años(240 cuotas), tasa=4.8%UF anual.

AGENTE → MCP [calculadora_server] → calcular_dividendo:
  {
    "monto_uf": 3000,
    "tasa_anual_uf": 0.048,
    "n_cuotas": 240
  }

MCP [calculadora_server] → AGENTE:
  {
    "dividendo_uf": 18.5,
    "total_pagar_uf": 4440,
    "intereses_totales_uf": 1440
  }

AGENTE (Pensamiento):
  Dividendo de UF 18.5 ≈ $686,000 CLP (a $37,100/UF).
  Necesito contextualizarlo con la carga financiera del usuario.

AGENTE → MCP [perfil_server] → obtener_perfil:
  {} → ingreso_mensual: $2,500,000

AGENTE → MCP [calculadora_server] → calcular_carga_financiera:
  {ingresos: 2500000, deudas_mensuales: [686000]}

MCP → AGENTE:
  {carga_financiera: 0.274, evaluacion: "elevado"}

RESPUESTA FINAL:
  "Para UF 3.000 a 20 años con tasa fija 4.8% UF anual, tu dividendo mensual
  sería aproximadamente UF 18,5 (~$686.000 CLP). Esto representaría el 27%
  de tu ingreso, lo cual está en zona elevada. Te recomendaría..."
```

---

## Comparación con Alternativas

| Enfoque | Ventajas | Desventajas |
|---------|---------|------------|
| **MCP** | Estándar, modular, auditable | Requiere implementar servidores |
| **LangChain Tools** | Ecosistema rico | Vendor lock-in, coupling alto |
| **Function Calling directo** | Sencillo | No estandarizado, difícil de escalar |
| **Custom REST APIs** | Flexible | Sin descubrimiento automático |

---

## Estado del Ecosistema MCP (2025)

- **Anthropic** — Claude implementa MCP nativamente (host y cliente)
- **VS Code Copilot** — soporte experimental MCP
- **Servidores públicos:** Base de datos, GitHub, Slack, Google Drive, etc.
- **Adoption:** Creciendo rápidamente en la comunidad AI/LLM

---

## Implicancias para Evaluación de la Tesis

La adopción de MCP permite al agente:
1. **Reproducibilidad:** Cada herramienta testeable en aislamiento
2. **Escalabilidad:** Agregar nuevos servicios (e.g., conexión API CMF real) sin reescribir el agente
3. **Alineación con SFA:** Cuando el Sistema de Finanzas Abiertas esté disponible (2027), las APIs de las instituciones podrán exponerse como servidores MCP

---

## Referencias Relacionadas
- ReAct (Yao et al., 2023) — Thought-Action-Observation cycle que usa MCP como capa de acción
- Ley 21.521 / NCG 514 — SFA que eventualmente proveería datos vía APIs estandarizadas
- Claude API Documentation — Implementación de reference de MCP host
