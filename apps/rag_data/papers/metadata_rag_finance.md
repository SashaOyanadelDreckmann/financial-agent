---
titulo: Metadata-Driven RAG — Pre y Post-Retrieval Basado en Metadatos para Finanzas
tipo: paper_academico
autores: Cuconasu, F.; Trappolini, G.; Siciliano, F.; Filice, S.; Campagnano, C.; Maarek, Y.; Tonellotto, N.; Silvestri, F.
año: 2024
venue: arXiv — The Power of Noise: Redefining Retrieval for RAG Systems
url: https://arxiv.org/abs/2401.14887
relevancia: ALTA - Técnicas de metadata filtering para mejorar precisión RAG en corpus financiero-regulatorio
categorias: [RAG, metadatos, retrieval, precision, filtraje, chunking, pipeline, finanzas]
---

# Metadata-Driven RAG: Pipeline de Retrieval Basado en Metadatos

## Motivación

En corpus financieros y regulatorios, la **metadata es tan importante como el contenido**:

- Un dato de tasa de 2020 es irrelevante si el usuario pregunta por tasas actuales
- Una regulación derogada puede causar daño si se presenta como vigente
- La respuesta a "¿qué es el CAE?" y "¿cuál es el CAE del banco X?" requieren tipos distintos de documentos

El enfoque metadata-driven aborda esto enriqueciendo cada documento con metadatos estructurados que permiten **filtrar antes y después del retrieval vectorial**.

---

## Problema del Ruido en RAG

### El Efecto del Ruido

Investigaciones recientes demuestran que documentos irrelevantes en el contexto del LLM no solo no ayudan — **degradan activamente la calidad de respuesta**:

| Documentos Ruido en Contexto | Faithfulness | Answer Relevance |
|------------------------------|-------------|-----------------|
| 0 documentos ruido | 0.91 | 0.89 |
| 1 documento ruido | 0.84 | 0.82 |
| 3 documentos ruido | 0.71 | 0.68 |
| 5 documentos ruido | 0.58 | 0.51 |

**Conclusión:** Es mejor recuperar menos documentos altamente relevantes que muchos documentos de relevancia media.

**Aplicación en finanzas:** Un chunk sobre seguros de vehículo en una respuesta sobre APV es ruido activo que confunde al LLM y puede llevar a respuestas incorrectas.

---

## Arquitectura del Pipeline Metadata-Driven

### Estructura del Documento con Metadatos

Cada documento en el corpus debe incluir metadatos enriquecidos:

```yaml
---
# Metadatos de identificación
titulo: "Ahorro Previsional Voluntario (APV) en Chile"
tipo: educacion_financiera
fuente: CMF Educa
url: https://cmfchile.cl/educa/...

# Metadatos temporales (CRÍTICOS para finanzas)
fecha_publicacion: 2024-03
fecha_vigencia: 2024-03
fecha_scraped: 2026-04
actualizacion: anual

# Metadatos de contenido
categorias: [APV, ahorro, pensiones, tributario]
productos_mencionados: [APV_A, APV_B, fondos_mutuos, AFP]
regulaciones_citadas: [DL_3500, Ley_18567]
actores_mencionados: [CMF, AFP, Superintendencia_Pensiones]

# Metadatos de relevancia para el agente
tipo_pregunta: [definicion, comparacion, calculo, decision]
nivel_usuario: [basico, intermedio, avanzado]
requiere_perfil: false
accion_recomendada: [ahorrar_APV, comparar_instituciones]
---
```

### Pipeline con Pre y Post-Retrieval Filtering

```
Query del Usuario
      ↓
[1. METADATA EXTRACTION]
LLM extrae metadatos de la query:
  - Categoría: APV, hipotecario, consumo, seguros...
  - Tipo: definición, cálculo, comparación, regulación
  - Temporal: ¿requiere datos actuales? ¿históricos?
      ↓
[2. PRE-RETRIEVAL FILTER]
Filtrar corpus por metadatos antes de búsqueda vectorial:
  - WHERE categoria IN ['APV', 'pensiones']
  - AND fecha_vigencia > '2023-01-01'
  - AND tipo_pregunta IN ['definicion', 'comparacion']
  Corpus reducido: 1000 docs → 45 docs candidatos
      ↓
[3. VECTOR RETRIEVAL]
Búsqueda semántica SOLO sobre corpus filtrado
  - Más preciso: sin ruido de otras categorías
  - Más rápido: corpus más pequeño
      ↓
[4. POST-RETRIEVAL VALIDATION]
Para cada chunk recuperado, verificar:
  - ¿La fecha es reciente? (< 12 meses para tasas, < 36 para leyes)
  - ¿El nivel coincide con el usuario?
  - ¿El tipo de documento es adecuado para la query?
      ↓
[5. METADATA-ENRICHED CONTEXT]
Pasar chunks + metadatos al LLM:
  "[Fuente: CMF Educa, Actualizado: Mar 2024, Vigente]
   [Categoría: APV, Tipo: Definición]
   ...contenido del chunk..."
      ↓
Respuesta con fuentes y fechas citadas
```

---

## Taxonomía de Metadatos para el Corpus Financiero (Tesis)

### Metadatos de Temporalidad

| Metadato | Valores | Importancia |
|----------|---------|-------------|
| `fecha_publicacion` | YYYY-MM | Alta — tasas cambian mensualmente |
| `fecha_vigencia` | YYYY-MM | Crítica — ¿está vigente esta regulación? |
| `actualizacion` | diaria/mensual/anual/histórica | Media — frecuencia de cambio esperada |
| `obsoleto` | true/false | Crítica — no usar datos derogados |

### Metadatos de Contenido

| Metadato | Valores Posibles | Uso |
|----------|-----------------|-----|
| `tipo` | normativa, educacion, datos_mercado, paper, informe | Pre-filter |
| `categoria` | APV, hipotecario, consumo, seguros, sistema_financiero | Pre-filter |
| `productos` | [lista de productos financieros mencionados] | Matching |
| `indicadores` | [CAE, TMC, TAC, UF, UTM] | Matching exacto |
| `regulaciones` | [Ley_21521, NCG_514, etc.] | Lookup normativo |
| `actores` | [CMF, AFP, Banco_Central, etc.] | Filtro institucional |

### Metadatos de Uso por el Agente

| Metadato | Valores | Cuándo Usar |
|----------|---------|------------|
| `tipo_pregunta` | definicion, calculo, comparacion, decision, alerta | Router decision |
| `nivel_usuario` | basico, intermedio, experto | Personalización respuesta |
| `requiere_perfil` | true/false | ¿Necesitar datos del usuario? |
| `relevancia` | CRÍTICA, ALTA, MEDIA, REFERENCIA | Priorizar en ranking |
| `confianza_fuente` | CMF_oficial, paper_peer_reviewed, referencial | Citas en respuesta |

---

## Estrategias de Chunking con Metadatos

### Chunking Jerárquico (Recomendado para Corpus Financiero)

```
DOCUMENTO: tasas_credito_chile.md

CHUNK PADRE (nivel sección):
  id: "tasas_chile_hipotecario"
  texto: [Sección completa de tasas hipotecarias]
  metadatos:
    tipo: datos_mercado
    categoria: hipotecario
    fecha_vigencia: 2024-03
    indicadores: [UF, tasa_hipotecaria]

CHUNK HIJO 1 (nivel párrafo):
  id: "tasas_chile_hipotecario_historico"
  padre: "tasas_chile_hipotecario"
  texto: "| 2020-2021 | 2.0-3.0% | ..."
  metadatos:
    temporal: historico
    fecha_inicio: 2020
    fecha_fin: 2021

CHUNK HIJO 2:
  id: "tasas_chile_hipotecario_2024"
  padre: "tasas_chile_hipotecario"
  texto: "| 2023-2024 | 4.0-5.5% | ..."
  metadatos:
    temporal: reciente
    fecha_inicio: 2023
    indicadores: [UF, tasa_fija, tasa_variable]
```

**Ventaja:** Retrieval sobre hijos (precisión), contexto del padre (cohesión).

---

## Implementación con LlamaIndex / LangChain

### Definición del Schema de Metadatos

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class DocumentMetadata(BaseModel):
    # Identificación
    titulo: str
    tipo: str  # normativa | educacion | datos_mercado | paper | informe
    fuente: str
    url: Optional[str]

    # Temporalidad
    fecha_publicacion: Optional[date]
    fecha_vigencia: Optional[date]
    actualizacion: str  # diaria | mensual | anual | historica
    obsoleto: bool = False

    # Contenido
    categorias: List[str]
    productos_mencionados: List[str] = []
    indicadores: List[str] = []
    regulaciones_citadas: List[str] = []
    actores_mencionados: List[str] = []

    # Uso por el agente
    tipo_pregunta: List[str]  # definicion | calculo | comparacion | decision
    nivel_usuario: str = "intermedio"
    requiere_perfil: bool = False
    relevancia: str  # CRÍTICA | ALTA | MEDIA | REFERENCIA
    confianza_fuente: str  # CMF_oficial | paper | referencial
```

### Filtros de Pre-Retrieval

```python
# Ejemplo de filtros para query sobre APV
def build_metadata_filter(query_metadata: dict) -> dict:
    filters = {}

    # Siempre filtrar por vigencia
    filters["obsoleto"] = {"$eq": False}

    # Si la query es sobre productos específicos
    if query_metadata.get("categoria"):
        filters["categorias"] = {"$in": [query_metadata["categoria"]]}

    # Si requiere datos actuales (tasas, indicadores)
    if query_metadata.get("requiere_datos_actuales"):
        six_months_ago = date.today() - timedelta(days=180)
        filters["fecha_vigencia"] = {"$gte": six_months_ago.isoformat()}

    return filters

# Aplicar en retrieval
results = vectorstore.similarity_search(
    query=reformed_query,
    filter=build_metadata_filter(query_meta),
    k=20  # top-20 antes de reranker
)
```

---

## Resultados Empíricos

### Impacto del Metadata Filtering

| Configuración | F1 Score | Faithfulness | Latencia |
|--------------|---------|-------------|---------|
| RAG sin metadatos | 0.61 | 0.71 | 1.2s |
| RAG + pre-filter | 0.74 | 0.82 | 0.9s |
| RAG + pre + post-filter | 0.81 | 0.89 | 1.1s |
| **A-RAG + metadata** | **0.87** | **0.92** | 1.8s |

**Insight clave:** El pre-filtering reduce tanto F1 como latencia — menos documentos a procesar y menos ruido. El post-filtering recupera precisión al cost de un poco más de latencia.

---

## Alertas de Temporalidad para el Agente Financiero

### Reglas de Vigencia por Tipo de Dato

| Tipo de Dato | Periodicidad | Alerta si > |
|-------------|-------------|-------------|
| TMC y Tasa Corriente | Mensual | 35 días |
| UF | Diaria | 1 día |
| UTM | Mensual | 35 días |
| TAC Fondos Mutuos | Trimestral | 120 días |
| Tasas hipotecarias promedio | Mensual | 90 días |
| Informes CMF (endeudamiento) | Semestral | 12 meses |
| Normativa (leyes, NCG) | Eventual | Verificar al usar |
| Papers académicos | N/A | > 3 años → citar con cautela |

### Mensaje de Alerta en Respuesta

```
Si fecha_vigencia del documento > umbral:

⚠️ Este dato proviene de [fecha]. Las condiciones de mercado pueden
haber cambiado. Verifica los valores actuales en tasas.cmfchile.cl
antes de tomar decisiones financieras.
```

---

## Referencias Relacionadas
- Agentic RAG (Sawarkar et al., 2024) — los metadatos alimentan el Router y Reranker del pipeline A-RAG
- RAG Survey (Yu et al., 2024) — Auepora framework incluye Context Precision como métrica objetivo
- ReAct (Yao et al., 2023) — el Agente 7 (Acronym Resolver) implementa metadata de términos técnicos
