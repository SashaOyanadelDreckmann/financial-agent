---
titulo: Agentic RAG — Arquitectura Multi-Agente para Retrieval-Augmented Generation
tipo: paper_academico
autores: Sawarkar, K.; Mangal, A.; Solanki, S.H.
año: 2024
venue: arXiv preprint arXiv:2501.05249
url: https://arxiv.org/abs/2501.05249
relevancia: ALTA - Arquitectura A-RAG con 8 agentes especializados aplicable al agente financiero
categorias: [agentic_RAG, multi_agente, fintech, pipeline, evaluacion, retrieval_especializado]
---

# Agentic RAG (A-RAG): Arquitectura Multi-Agente para RAG Financiero

## Contribución Principal

Agentic RAG (A-RAG) propone extender el pipeline RAG estándar con **agentes especializados** que mejoran cada etapa del proceso, resultando en respuestas más precisas, contextualizadas y verificadas.

### Diferencia vs. RAG Estándar

| Aspecto | RAG Estándar | Agentic RAG |
|---------|-------------|-------------|
| Recuperación | Búsqueda única | Multi-agente con re-intento |
| Query | Sin transformar | Reformulada + descompuesta |
| Contexto | Chunks raw | Verificado + re-rankeado |
| Respuesta | Una pasada | Evaluada + corregida |
| Control de calidad | Ninguno | QA Agent dedicado |

---

## Los 8 Agentes del Pipeline A-RAG

### Arquitectura General

```
Query → [1.Router] → [2.Reformulator] → [3.SubQuery Gen]
                                                ↓
                              [4.Retriever] ← ← ←
                                    ↓
                         [5.Reranker/Validator]
                                    ↓
                           [6.QA Evaluator]
                                    ↓
                         [7.Acronym Resolver]
                                    ↓
                          [8.Response Synthesizer]
                                    ↓
                            Respuesta Final
```

### Descripción de Cada Agente

#### Agente 1: Router
- **Función:** Clasificar la query y dirigirla al pipeline o herramienta adecuada
- **Decisión:** ¿Buscar en RAG? ¿Usar calculadora? ¿Necesita información del perfil?
- **Ejemplo financiero:**
  - "¿Qué es el CAE?" → RAG (definición)
  - "Calcula mi CAE" → Calculadora
  - "¿Cuál mi carga financiera?" → Perfil + Cálculo

#### Agente 2: Query Reformulator
- **Función:** Mejorar la query antes del retrieval
- **Técnicas:** Expansión de sinónimos, corrección ortográfica, normalización terminológica
- **Ejemplo:**
  ```
  Input:  "quiero saber sobre el interes maximo que me pueden cobrar"
  Output: "Tasa Máxima Convencional (TMC) Chile crédito consumo límite legal"
  ```
- **Impacto:** Mejora Recall@5 en hasta 23% (Yu et al., 2024)

#### Agente 3: Sub-Query Generator
- **Función:** Descomponer preguntas complejas en sub-preguntas específicas
- **Cuándo activar:** Preguntas que requieren múltiples piezas de información
- **Ejemplo financiero:**
  ```
  Query compleja: "¿Me conviene refinanciar mi deuda hipotecaria?"

  Sub-queries generadas:
  1. "¿Cuáles son los costos de prepago de un crédito hipotecario?"
  2. "¿Cómo calcular el beneficio de refinanciar a tasa más baja?"
  3. "¿Qué documentos se necesitan para refinanciamiento hipotecario?"
  4. "¿Cuándo es conveniente refinanciar una hipoteca en Chile?"
  ```

#### Agente 4: Retriever
- **Función:** Ejecutar las búsquedas en el corpus RAG
- **Implementación:** Hybrid search (BM25 + Dense embeddings)
- **Input:** Sub-queries del Agente 3
- **Output:** Chunks rankeados con score de relevancia
- **Estrategia para finanzas:** Metadata filtering por categoría (normativa vs. tasas vs. educación)

#### Agente 5: Reranker / Validator
- **Función:** Reordenar y validar chunks recuperados
- **Criterios de validación:**
  - Relevancia semántica con la query
  - Vigencia temporal (fecha del documento)
  - Consistencia con otros chunks recuperados
- **Filtros:** Umbral de score > 0.7; documentos > 24 meses → alerta de desactualización

#### Agente 6: QA Evaluator
- **Función:** Verificar si el contexto recuperado es suficiente para responder
- **Decisión:**
  - Si suficiente → pasar a Agente 7
  - Si insuficiente → reformular y re-intentar retrieval (max 2 iteraciones)
  - Si definitivamente insuficiente → responder "no tengo información suficiente"
- **Impacto:** Reduce respuestas con información incompleta en ~40%

#### Agente 7: Acronym / Technical Term Resolver
- **Función:** Expandir acrónimos y términos técnicos financieros
- **Relevancia especial en finanzas:** El dominio está lleno de acrónimos
- **Diccionario:**
  ```
  APV → Ahorro Previsional Voluntario
  CAE → Carga Anual Equivalente
  CMF → Comisión para el Mercado Financiero
  TMC → Tasa Máxima Convencional
  TAC → Tasa de Costo Anual
  UF  → Unidad de Fomento
  UTM → Unidad Tributaria Mensual
  AFP → Administradora de Fondos de Pensiones
  AGF → Administradora General de Fondos
  SFA → Sistema de Finanzas Abiertas
  TPM → Tasa de Política Monetaria (Banco Central)
  IPC → Índice de Precios al Consumidor
  LTV → Loan to Value (crédito hipotecario)
  DICOM → Registro de morosos (Equifax Chile)
  ```

#### Agente 8: Response Synthesizer
- **Función:** Generar la respuesta final integrando todo el contexto
- **Características:**
  - Citar fuentes específicas
  - Adaptar lenguaje al nivel del usuario
  - Incluir advertencias cuando corresponda (e.g., "esto es orientativo, no asesoría financiera")
  - Proponer seguimiento ("¿quieres que calculemos el costo total?")

---

## Resultados Cuantitativos Reportados

### Mejoras vs. RAG Estándar

| Métrica | RAG Estándar | A-RAG | Mejora |
|---------|-------------|-------|--------|
| Faithfulness | 0.71 | 0.89 | **+25%** |
| Answer Relevance | 0.74 | 0.91 | **+23%** |
| Context Precision | 0.68 | 0.86 | **+26%** |
| Respuestas incompletas | 18% | 8% | **-56%** |

### Tarea Específica: QA Financiero Multi-Hop

| Tarea | Baseline (RAG simple) | A-RAG |
|-------|----------------------|-------|
| Preguntas factuales simples | 0.82 | 0.91 |
| Preguntas multi-step | 0.51 | 0.78 |
| Preguntas de comparación | 0.44 | 0.73 |
| Preguntas regulatorias | 0.67 | 0.84 |

---

## Aplicación Específica al Agente Financiero (Tesis)

### Flujo Completo para Pregunta Compleja

```
USUARIO: "Tengo $2M de sueldo, una deuda de consumo de $300K/mes y quiero
          saber si puedo tomar un crédito hipotecario de UF 2.500 a 20 años"

[Agente 1 - Router]
→ Requiere: perfil + cálculo + consulta RAG (hipotecario)
→ Activar pipeline completo

[Agente 2 - Reformulator]
→ "elegibilidad crédito hipotecario Chile carga financiera"
→ "requisitos banco hipotecario Chile ingreso"

[Agente 3 - Sub-Query Generator]
→ Q1: "¿Cuánto es el dividendo de UF 2500 a 20 años a tasa fija?"
→ Q2: "¿Cuál es la carga financiera máxima para aprobar hipotecario?"
→ Q3: "¿Qué documentos se necesitan para hipotecario Chile?"
→ Q4: "¿Qué representa UF 2500 en CLP actual?"

[Agente 4 - Retriever]
→ Q1: calculadora [dividendo=UF 19 aprox]
→ Q2: RAG [tasas_credito_chile.md → carga <30-35%]
→ Q3: RAG [productos_bancarios_chile.md → documentos]
→ Q4: RAG [tasas_credito_chile.md → UF ~$37.000]

[Agente 5 - Reranker]
→ Filtrar resultados relevantes, descartar chunks con info >18 meses

[Agente 6 - QA Evaluator]
→ Contexto suficiente para responder

[Agente 7 - Acronym Resolver]
→ Expandir UF, CAE, TMC, LTV en la respuesta

[Agente 8 - Synthesizer]
→ Carga actual: 300K/2M = 15%
→ Dividendo estimado: UF 19 ≈ $703K
→ Carga total con hipoteca: (300K + 703K)/2M = 50%
→ ALERTA: Carga del 50% = zona de sobreendeudamiento

RESPUESTA:
"Con tu ingreso de $2M y deuda actual de $300K/mes (15% de carga),
agregar un dividendo de ~$703K por hipoteca de UF 2.500 llevaría tu
carga financiera total a ~50%, que según CMF es la frontera del
sobreendeudamiento. Muchos bancos limitan aprobaciones a 30-35%.

Alternativas a evaluar:
1. Reducir el monto: UF 2.000 → dividendo ~$562K, carga 43%
2. Aumentar plazo: 25 años → dividendo menor
3. Prepagar deuda consumo primero

¿Quieres que simulemos alguna de estas alternativas?"
```

---

## Integración con ReAct y MCP

### Cómo se Relacionan

```
ReAct Thought-Action-Observation
          ↕
    A-RAG Pipeline (los 8 agentes son "herramientas" del ciclo ReAct)
          ↕
    MCP (protocolo de comunicación con cada agente/herramienta)
```

- **ReAct** provee el ciclo de razonamiento que decide cuándo y qué buscar
- **A-RAG** provee el pipeline de búsqueda y síntesis especializado
- **MCP** estandariza la comunicación entre el LLM y cada componente A-RAG

---

## Consideraciones de Implementación

### Costos del Pipeline A-RAG

| Agente | Costo Computacional | Latencia Estimada |
|--------|--------------------|--------------------|
| Router | Bajo (clasificación) | ~100ms |
| Reformulator | Medio (LLM call) | ~500ms |
| SubQuery Generator | Medio (LLM call) | ~800ms |
| Retriever | Bajo (búsqueda vectorial) | ~200ms |
| Reranker | Medio (cross-encoder) | ~400ms |
| QA Evaluator | Medio (LLM call) | ~600ms |
| Acronym Resolver | Muy bajo (lookup) | ~50ms |
| Synthesizer | Alto (LLM call) | ~1500ms |
| **TOTAL** | — | **~4-5 segundos** |

**Optimización:** Para preguntas simples (factual lookup), el Router puede saltear Agentes 2, 3 y 6.

---

## Referencias Relacionadas
- RAG Survey (Yu et al., 2024) — métricas de evaluación usadas para medir mejoras A-RAG
- ReAct (Yao et al., 2023) — paradigma de razonamiento que coordina el pipeline A-RAG
- Metadata-Driven RAG — técnica complementaria para mejora del retrieval
- MCP (Hou et al., 2025) — protocolo para los servidores de cada agente A-RAG
