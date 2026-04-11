# Índice Maestro del Corpus RAG
## Agente Conversacional para Finanzas Personales — Chile

**Tesis:** Magíster en Ciencia de los Datos, Universidad de Chile, 2025
**Última actualización:** 2026-04
**Total documentos:** 18
**Total categorías:** 5

---

## Resumen del Corpus

| Categoría | Documentos | Relevancia | Cobertura |
|-----------|-----------|-----------|----------|
| Normativa y regulación | 3 | CRÍTICA | Ley 21.521, NCG 514, SFA |
| Educación financiera (CMF Educa) | 6 | ALTA | Productos, seguros, APV, sistema, fintech, glosario |
| Informes estadísticos | 1 | ALTA | Endeudamiento hogares 2024 |
| Datos de mercado | 2 | ALTA | Tasas, fondos mutuos |
| Papers académicos | 6 | ALTA–CRÍTICA | RAG, ReAct, MCP, A-RAG, Metadata, LLMs en finanzas |

---

## 1. NORMATIVA Y REGULACIÓN

### 1.1 Ley 21.521 — Ley Fintec
**Archivo:** `normativa/ley_21521_fintec.md`
**Relevancia:** CRÍTICA
**Fuente:** CMF Educa / Diario Oficial
**Contenido clave:**
- Marco legal del ecosistema fintech chileno
- 7 servicios regulados (financiamiento participativo, asesoría, SFA, etc.)
- Sistema de Finanzas Abiertas (SFA): concepto y habilitación legal
- Actores: IPI, PSBI, PSIP, IPC y sus roles
- Cronograma de implementación obligatoria (julio 2027)
- Implicaciones para diseño del agente (acceso a datos SFA)

**Categorías RAG:** `[normativa, SFA, fintech, ley, regulacion, open_banking]`
**Tipo de pregunta:** definicion, regulatoria
**Vigencia:** Promulgada 2023, implementación 2025-2027

---

### 1.2 NCG N°514 — Reglamento Técnico SFA
**Archivo:** `normativa/sfa_normativa_ncg514.md`
**Relevancia:** CRÍTICA
**Fuente:** CMF — Norma de Carácter General N°514
**Contenido clave:**
- Estructura 3 niveles del SFA (proveedores de datos, PSI, usuarios)
- Categorías de datos por fase (transaccional, crediticio, inversión)
- Especificaciones técnicas de APIs (latencia 5 min, historial 24 meses)
- Framework de consentimiento y revocación
- Cronograma fásico de implementación (tabla detallada)
- 8 principios transversales del SFA
- Sandbox regulatorio y régimen simplificado

**Categorías RAG:** `[normativa, SFA, NCG514, API, consentimiento, datos_financieros]`
**Tipo de pregunta:** regulatoria, técnica

---

### 1.3 SFA — Foro de Participantes
**Archivo:** `normativa/sfa_foro_participantes.md`
**Relevancia:** MEDIA
**Fuente:** CMF Institucional
**Contenido clave:**
- Participantes del foro (ABIF, FinteChile, COOPERA, AACH, BancoEstado)
- Gobernanza del SFA (2 niveles: regulatorio CMF + técnico grupos trabajo)
- 4 grupos de trabajo técnico (Infraestructura, Especificaciones, Seguridad, UX)
- 4 tipos de institución en el SFA y sus roles

**Categorías RAG:** `[SFA, gobernanza, participantes, actores_sistema]`
**Tipo de pregunta:** contextual

---

## 2. EDUCACIÓN FINANCIERA (CMF EDUCA)

### 2.1 Productos Bancarios en Chile
**Archivo:** `cmf_educa/productos_bancarios_chile.md`
**Relevancia:** CRÍTICA
**Fuente:** CMF Educa
**Contenido clave:**
- **Tarjeta de crédito:** CAE, TMC, pago mínimo vs. total, avances, cuotas sin interés
- **Crédito de consumo:** características, variables a comparar (CAE, plazo, monto)
- **Cuenta corriente:** línea de crédito, cheques, sobregiro, tarifas
- **Cuenta Vista (Cuenta RUT):** BancoEstado, gratuita, transferencias, inclusión
- **Crédito hipotecario:** LTV, tasas (fija/variable/mixta), UF, seguros obligatorios
- Tabla de variables de decisión por tipo de producto

**Categorías RAG:** `[productos, credito, hipotecario, consumo, tarjeta, cuenta_corriente, cuenta_RUT]`
**Tipo de pregunta:** definicion, comparacion, decision

---

### 2.2 Seguros en Chile
**Archivo:** `cmf_educa/seguros_chile.md`
**Relevancia:** ALTA
**Fuente:** CMF Educa / SICS
**Contenido clave:**
- 16 tipos de seguro: vida, SVA, APV seguros, rentas vitalicias, salud, accidentes, SOAP, incendio, desgravamen, robo, vehículos, cesantía, escolaridad, RC, SOAPEX
- Tabla de cobertura SOAP en UF (fallecimiento, invalidez, daños)
- SICS (Sistema de Consulta de Seguros) — cómo consultar pólizas vigentes
- Distinción crítica: AFC vs. seguro de cesantía vinculado a crédito
- Tabla de actores por tipo de seguro

**Categorías RAG:** `[seguros, vida, salud, SOAP, desgravamen, cesantia, hipotecario, incendio]`
**Tipo de pregunta:** definicion, comparacion, alerta

---

### 2.3 APV — Ahorro Previsional Voluntario
**Archivo:** `cmf_educa/apv_ahorro_previsional.md`
**Relevancia:** ALTA
**Fuente:** CMF Educa
**Contenido clave:**
- 3 modalidades: cotizaciones voluntarias, depósitos APV, depósitos convenidos
- 6 tipos de institución autorizada (AFP, AGF, seguros, corredoras, bancos)
- Régimen A (bonificación 15%, hasta 6 UTM/año) vs. Régimen B (rebaja base imponible)
- Límites de aporte: 50 UF/mes cotizaciones, 600 UF/año depósitos APV
- Retiro anticipado: tributación + penalidad 3%
- TAC por nivel de costo (tabla + impacto 10 años)
- Mercado APV 2025: $14 billones USD total, AFP 42%, seguros 23.7%
- Ejemplo práctico para renta $1.5M

**Categorías RAG:** `[APV, ahorro, pension, tributario, regimen_A, regimen_B, TAC, fondos_mutuos]`
**Tipo de pregunta:** definicion, comparacion, calculo, decision

---

### 2.4 Sistema Financiero Chileno
**Archivo:** `cmf_educa/sistema_financiero_chileno.md`
**Relevancia:** ALTA
**Fuente:** CMF Educa
**Contenido clave:**
- CMF: misión, alcance de supervisión (bancos, seguros, valores, fintech)
- Tabla de actores del sistema (bancos, AFP, AGF, corredoras, fintechs, Banco Central)
- 4 categorías de productos financieros
- Asimetría de información: selección adversa y riesgo moral
- Indicadores de endeudamiento 2024 (tabla completa)
- Digitalización: tendencias y brechas
- SFA como habilitador del agente
- Variables clave del dominio (CAE, TMC, UF, UTM, TAC, LTV, carga financiera)

**Categorías RAG:** `[sistema_financiero, CMF, actores, asimetria_informacion, digitalizacion, SFA]`
**Tipo de pregunta:** definicion, contextual

---

### 2.5 Fintech en Chile
**Archivo:** `cmf_educa/fintec_overview.md`
**Relevancia:** ALTA
**Fuente:** CMF Educa / CMF Institucional
**Contenido clave:**
- Cronología del ecosistema fintech chileno (2010-2027)
- 7 servicios regulados por Ley 21.521
- Principales actores fintech (Fintual, Mach, Tenpo, Cumplo, etc.)
- Impacto en inclusión financiera
- SFA: escenario presente (sin datos) vs. futuro (con APIs)
- Sandbox regulatorio CMF
- Diferenciadores del agente vs. fintechs existentes

**Categorías RAG:** `[fintech, inclusion_financiera, SFA, actores_fintech, ley_21521]`
**Tipo de pregunta:** contextual, comparacion

---

### 2.6 Glosario de Términos Financieros — CMF Educa
**Archivo:** `cmf_educa/glosario_terminos_financieros.md`
**Relevancia:** ALTA
**Fuente:** CMF Educa — Glosario oficial (cmfchile.cl/educa/621/w3-propertyname-505.html)
**Contenido clave:**
- ~200 términos financieros con definiciones oficiales CMF (A–V)
- Términos clave para el agente: APV, CAE, Carga financiera, CMF, Crédito hipotecario, Crédito consumo, DICOM, ETF, Fondos mutuos, LTV, Sobreendeudamiento, TAC, TMC, UF, UTM
- Tabla de cobertura SOAP en UF
- Tabla de rangos de carga financiera con evaluación
- **Tabla de acrónimos completa** (26 acrónimos del dominio financiero chileno)
- Definiciones enriquecidas con contexto de uso para el agente

**Categorías RAG:** `[glosario, definiciones, terminos_financieros, educacion, acrónimos, vocabulario]`
**Tipo de pregunta:** definicion, aclaracion_termino
**Uso en pipeline:** Agente 7 (Acronym Resolver) del A-RAG; pre-retrieval para normalización de términos

---

## 3. INFORMES ESTADÍSTICOS

### 3.1 Endeudamiento de los Hogares — CMF 2024
**Archivo:** `informes/endeudamiento_hogares_2024.md`
**Relevancia:** ALTA
**Fuente:** CMF — Informe de Endeudamiento Hogares, Junio 2024
**Contenido clave:**
- Deuda mediana: $1.9M CLP
- Carga financiera promedio: 13.6%
- Apalancamiento: 2.3x ingreso mensual
- Hogares sobreendeudados: 950.000 personas (16.5%)
- Composición: 75% hipotecaria, 25% consumo
- Variación: consumo -13%, hipotecario +2.7%
- Brechas género y región (norte más afectado)
- **Tabla de rangos de alerta** (<10%, 10-20%, 20-35%, 35-50%, >50%)

**Categorías RAG:** `[endeudamiento, hogares, estadisticas, carga_financiera, sobreendeudamiento, alerta]`
**Tipo de pregunta:** contextual, alerta, comparacion_perfil
**Vigencia:** Datos a Junio 2024

---

## 4. DATOS DE MERCADO

### 4.1 Tasas de Crédito Chile
**Archivo:** `mercado/tasas_credito_chile.md`
**Relevancia:** CRÍTICA
**Fuente:** CMF — tasas.cmfchile.cl
**Contenido clave:**
- Tipos de operaciones con tasa regulada (tabla)
- Tasas hipotecarias históricas: 2.0-3.0% (2020-21), 4.0-5.5% (2023-24)
- Crédito consumo: rangos por plazo (90d-1a: 1.5-2.5% mensual)
- CAE: qué incluye, cómo interpretar, comparación
- TAC fondos mutuos por tipo (0.2-4.8% anual)
- UF (~$37.000-38.000 CLP) y UTM (~$65.000-66.000 CLP) 2024
- AFC cesantía: tasas cotización plazo fijo vs. indefinido
- Tabla fuentes y frecuencia de actualización

**Categorías RAG:** `[tasas, CAE, TMC, TAC, UF, UTM, hipotecario, consumo, mercado]`
**Tipo de pregunta:** factual, calculo, comparacion
**Vigencia:** Referencial — actualizar mensualmente desde tasas.cmfchile.cl

---

### 4.2 Fondos Mutuos y Comisiones
**Archivo:** `mercado/fondos_mutuos_comisiones.md`
**Relevancia:** ALTA
**Fuente:** CMF Portal Comisiones Fondos Mutuos
**Contenido clave:**
- Tipos de fondos mutuos por riesgo (tabla con horizonte mínimo)
- Equivalencia multifondos AFP ↔ fondos mutuos
- TAC: qué incluye, impacto a largo plazo (tabla 10-30 años)
- TAC por categoría: renta variable (1.1-4.8%), renta fija (0.2-2.0%)
- TAC APV específicos por institución (Fintual 0.49%, tradicionales 1-3%)
- Principales AGF con AUM y TAC referencial
- **Árbol de decisión para recomendación APV**
- Ejemplo de recomendación completa (renta $2.5M, 35 años)
- Marco normativo: Ley 20.712
- Protección al inversionista: segregación patrimonial

**Categorías RAG:** `[fondos_mutuos, TAC, AGF, APV, comisiones, inversion, renta_variable, renta_fija]`
**Tipo de pregunta:** comparacion, calculo, decision
**Vigencia:** TAC referencial — verificar en portal CMF

---

## 5. PAPERS ACADÉMICOS

### 5.1 ReAct — Reasoning and Acting in LLMs
**Archivo:** `papers/react_reasoning_acting.md`
**Relevancia:** CRÍTICA
**Autores:** Yao et al. (2023)
**Contenido clave:**
- Paradigma Thought-Action-Observation (ciclo fundamental)
- Reducción de alucinaciones por grounding en evidencia externa
- Interpretabilidad de trazas de pensamiento
- Resultados: +34% ALFWorld, +10% WebShop vs. baselines
- Implementación via few-shot prompting (sin reentrenamiento)
- **Ejemplo completo ReAct en finanzas** (recomendación hipotecaria paso a paso)
- Conexión con agente racional (Russell & Norvig)

**Categorías RAG:** `[ReAct, razonamiento, accion, LLM, agente, reduccion_alucinaciones]`

---

### 5.2 RAG Survey — Evaluación y Optimización
**Archivo:** `papers/rag_survey_evaluation.md`
**Relevancia:** ALTA
**Autores:** Yu et al. (2024)
**Contenido clave:**
- Pipeline RAG canónico: Pre-Retrieval → Retrieval → Post-Retrieval → Generation
- **Framework AUEPORA** (7 dimensiones: Accuracy, Uncertainty, Efficiency, Practicality, Originality, Relevance, Absence of Hallucination)
- Métricas: Precision@k, Recall@k, NDCG, MRR, Faithfulness, Answer Relevance
- HyDE, Query Expansion, Sub-Query Decomposition
- Hybrid retrieval (BM25 + Dense) — recomendado para finanzas
- Chunking strategies: fixed, sentence, semantic, hierarchical
- Lost in the Middle — ordenar chunks relevantes primero/último
- Tipos de alucinación (factual, attributional, faithfulness, grounded)
- Dataset de evaluación propuesto para agente financiero

**Categorías RAG:** `[RAG, evaluacion, pipeline, chunking, retrieval, metricas, alucinaciones]`

---

### 5.3 MCP — Model Context Protocol
**Archivo:** `papers/mcp_model_context_protocol.md`
**Relevancia:** CRÍTICA
**Autores:** Hou et al. (2025)
**Contenido clave:**
- Arquitectura: Host, Client, Server
- Tipos de capacidades: Tools, Resources, Prompts, Sampling
- Protocolo JSON-RPC 2.0 con ejemplos de mensajes
- Transportes: stdio, HTTP+SSE, WebSocket
- Ciclo de vida de sesión MCP (Initialize, Discovery, Operation, Shutdown)
- **Estructura de servidores MCP para el agente** (RAG, calculadora, tasas, perfil, alertas)
- Ejemplo completo de flujo con cálculo de dividendo hipotecario
- Integración ReAct ↔ MCP: Thought→Action→Observation = LLM→tool_call→MCP result

**Categorías RAG:** `[MCP, protocolo, herramientas, orquestacion, tool_use, integracion]`

---

### 5.4 Agentic RAG (A-RAG)
**Archivo:** `papers/agentic_rag_fintech.md`
**Relevancia:** ALTA
**Autores:** Sawarkar et al. (2024)
**Contenido clave:**
- **8 agentes especializados:** Router, Reformulator, SubQuery Generator, Retriever, Reranker, QA Evaluator, Acronym Resolver, Synthesizer
- Mejoras vs. RAG estándar: Faithfulness +25%, Context Precision +26%, respuestas incompletas -56%
- Resultados por tipo de pregunta (factual: 0.91, multi-step: 0.78, comparación: 0.73)
- **Diccionario de acrónimos financieros** (APV, CAE, CMF, TMC, TAC, UF, UTM, AFP, AGF, SFA, TPM, IPC, LTV, DICOM)
- Ejemplo completo de flujo A-RAG para elegibilidad hipotecaria con $2M ingreso
- Latencia estimada por agente (total ~4-5 segundos)
- Integración con ReAct y MCP

**Categorías RAG:** `[agentic_RAG, multi_agente, pipeline, acronimos, evaluacion, fintech]`

---

### 5.5 Metadata-Driven RAG
**Archivo:** `papers/metadata_rag_finance.md`
**Relevancia:** ALTA
**Autores:** Cuconasu et al. (2024)
**Contenido clave:**
- El ruido degrada faithfulness: 5 docs ruido → faithfulness 0.58 (desde 0.91)
- Schema de metadatos para corpus financiero (temporalidad, contenido, uso)
- Pipeline Pre-Retrieval + Post-Retrieval filtering
- Chunking jerárquico (parent + child) para documentos regulatorios
- Código Python de MetadataFilter y schema Pydantic
- Resultados: RAG + pre+post-filter F1=0.81 vs. RAG sin metadatos F1=0.61
- **Tablas de vigencia por tipo de dato** (UF: diaria, TMC: mensual, leyes: verificar)
- Mensajes de alerta de temporalidad para el agente

**Categorías RAG:** `[metadata, retrieval, filtraje, precision, temporalidad, chunking, vigencia]`

---

### 5.6 LLMs como Asesores Financieros
**Archivo:** `papers/financial_advisors_llm.md`
**Relevancia:** ALTA
**Autores:** Takayanagi et al. (2025)
**Contenido clave:**
- Taxonomía de 5 tareas (educación 0.92, análisis perfil 0.88, comparación 0.85, recomendación 0.74, predicción 0.41 con RAG)
- **Tipos de alucinación financiera:** datos concretos (34%), outdated (61%), regulaciones (22%)
- Benchmark FinAdvise-QA: 5 niveles de dificultad
- 6 métricas: Factual Accuracy, Legal Accuracy, Risk Disclosure, Personalization, Uncertainty Expression, Temporal Awareness
- **5 principios de diseño:** Grounding, Citar fuente/fecha, Advertencias, Incertidumbre, Escalación
- Marco regulatorio chileno: quién puede asesorar (registros CMF)
- Posicionamiento del agente: informativo ≠ asesor certificado
- Detección de nivel de literacy y adaptación

**Categorías RAG:** `[LLM, asesoria_financiera, alucinaciones, evaluacion, regulacion, advertencias]`

---

## Estrategia de Chunking Recomendada

### Por Tipo de Documento

| Tipo de Documento | Estrategia | Chunk Size | Overlap |
|------------------|-----------|-----------|--------|
| Normativa (leyes, NCG) | Jerárquico (artículo > párrafo) | 512 tokens | 10% |
| Educativo (CMF Educa) | Semántico (sección > párrafo) | 384 tokens | 15% |
| Datos de mercado | Fixed-size | 256 tokens | 5% |
| Papers académicos | Semántico (sección > punto) | 512 tokens | 10% |
| Informes estadísticos | Jerárquico (tabla = un chunk) | 384 tokens | 10% |

### Metadatos Mínimos por Chunk

```python
{
    "doc_id": "string",
    "titulo": "string",
    "tipo": "normativa|educacion|mercado|paper|informe",
    "categoria": "lista de categorías",
    "fecha_vigencia": "YYYY-MM",
    "obsoleto": False,
    "relevancia": "CRÍTICA|ALTA|MEDIA|REFERENCIA",
    "tipo_pregunta": "lista de tipos",
    "fuente": "string",
    "confianza": "oficial|paper_peer_reviewed|referencial"
}
```

---

## Retrieval Pipeline Recomendado

```
Query usuario
    ↓
[Acronym Resolver] → normalizar términos financieros
    ↓
[Router] → ¿RAG? ¿Calculadora? ¿Perfil? ¿Todo?
    ↓
[Metadata Extractor] → categoría, temporal, tipo_pregunta
    ↓
[Pre-Retrieval Filter] → filtrar corpus por metadatos
    ↓
[Query Reformulator] → HyDE o expansión de términos
    ↓
[Sub-Query Generator] → para preguntas complejas
    ↓
[Hybrid Retrieval BM25+Dense] → top-20 por sub-query
    ↓
[Cross-encoder Reranker] → top-5 final
    ↓
[QA Evaluator] → ¿contexto suficiente?
    ↓
[Temporal Validator] → alertas de vigencia
    ↓
[Response Synthesizer + ReAct] → respuesta con citas
    ↓
Respuesta al usuario
```

---

## Actualización del Corpus

| Documento | Frecuencia de Actualización | Fuente |
|-----------|---------------------------|--------|
| `tasas_credito_chile.md` | Mensual | tasas.cmfchile.cl |
| `fondos_mutuos_comisiones.md` | Trimestral | CMF Portal Comisiones |
| `endeudamiento_hogares_2024.md` | Semestral | CMF Informes |
| `apv_ahorro_previsional.md` | Anual o al cambiar | CMF Educa |
| `productos_bancarios_chile.md` | Anual o al cambiar | CMF Educa |
| `ley_21521_fintec.md` | Al promulgar modificaciones | Diario Oficial |
| `sfa_normativa_ncg514.md` | Al publicar nuevas NCG | CMF Institucional |
| Papers académicos | Al publicar papers relevantes | arXiv, Google Scholar |
