---
titulo: A Survey on Retrieval-Augmented Generation for LLMs — Evaluation and Optimization
tipo: paper_academico
autores: Yu, Y.; Xiong, F.; Luo, Y.; Zhang, R.; et al.
año: 2024
venue: arXiv preprint arXiv:2405.07437
url: https://arxiv.org/abs/2405.07437
relevancia: ALTA - Marco de evaluación RAG y pipeline Auepora aplicables al agente
categorias: [RAG, evaluacion, pipeline, chunking, retrieval, generacion, alucinaciones, optimizacion]
---

# Survey on RAG: Evaluación y Optimización del Pipeline

## Contribución Principal

Este survey sistematiza el estado del arte de RAG (Retrieval-Augmented Generation) para LLMs, con énfasis en:
1. **Taxonomía del pipeline RAG** — componentes, técnicas, variantes
2. **Framework de evaluación Auepora** — métricas y dimensiones de calidad
3. **Problemas abiertos y estrategias de optimización**

---

## Pipeline RAG Canónico

### 4 Etapas Fundamentales

```
Query → [Pre-Retrieval] → [Retrieval] → [Post-Retrieval] → [Generation]
```

| Etapa | Componentes | Objetivo |
|-------|-------------|---------|
| **Pre-Retrieval** | Reformulación de query, expansión, descomposición | Mejorar calidad de la consulta |
| **Retrieval** | Dense/Sparse/Hybrid retrieval, reranking | Recuperar chunks relevantes |
| **Post-Retrieval** | Reranker, filtrado, compresión contextual | Seleccionar pasajes más útiles |
| **Generation** | LLM + contexto RAG, prompt engineering | Respuesta grounded en evidencia |

---

## Framework de Evaluación AUEPORA

### 7 Dimensiones de Evaluación

| Dimensión | Qué Mide | Métrica Clave |
|-----------|----------|---------------|
| **Accuracy** | Corrección factual de la respuesta | F1, EM |
| **Uncertainty** | Calibración de confianza del modelo | Brier Score |
| **Efficiency** | Latencia, costo computacional | Tokens/segundo, latencia P95 |
| **Practicality** | Utilidad para el usuario final | Human rating |
| **Originality** | No parafrasear vs. sintetizar | ROUGE-L |
| **Relevance** | Pertinencia del contexto recuperado | NDCG, MRR |
| **Absence of Hallucination** | Evitar afirmaciones no sustentadas | Faithfulness score |

### Métricas de Retrieval

```
Precision@k = chunks relevantes en top-k / k
Recall@k    = chunks relevantes recuperados / total relevantes
NDCG@k      = ranking ponderado por posición
MRR         = 1 / posición del primer resultado correcto
```

### Métricas de Generation

| Métrica | Fórmula Conceptual | Herramienta |
|---------|-------------------|------------|
| Faithfulness | % claims sustentados por contexto | RAGAS |
| Answer Relevance | Similitud semántica respuesta-query | RAGAS |
| Context Precision | % contexto relevante usado | RAGAS |
| Context Recall | % información relevante del gold recuperada | RAGAS |

---

## Técnicas de Pre-Retrieval

### Query Reformulation
Estrategias para mejorar la consulta antes del retrieval:

1. **HyDE (Hypothetical Document Embeddings):** Generar un documento hipotético con la respuesta esperada, luego buscar documentos similares a ese hipotético.
   - Ventaja: alínea el espacio semántico entre query y documentos
   - Aplicación al agente: si el usuario pregunta "¿debo tomar crédito hipotecario?", generar respuesta hipotética y buscar documentos similares

2. **Query Expansion:** Ampliar la consulta con términos relacionados
   - Sinónimos financieros: "hipoteca" ↔ "crédito inmobiliario", "CAE" ↔ "costo total"
   - Uso de LLM para generar variantes de la pregunta

3. **Sub-Query Decomposition:** Dividir preguntas complejas en sub-queries
   - Ejemplo: "¿Qué APV me conviene con renta de $1.5M?" → {¿Cuál es mi tramo tributario?} + {¿Régimen A o B para ese tramo?} + {¿Qué instituciones ofrecen APV con TAC bajo?}

---

## Técnicas de Retrieval

### Métodos Comparados

| Método | Cómo Funciona | Ventaja | Desventaja |
|--------|--------------|---------|-----------|
| **BM25 (Sparse)** | TF-IDF + regularización | Eficiente, preciso con keywords exactas | Falla con sinónimos, contexto semántico |
| **Dense Retrieval** | Embeddings vectoriales (FAISS, etc.) | Captura semántica, sinonimia | Costoso, requiere fine-tuning dominio |
| **Hybrid (BM25 + Dense)** | Combinación lineal de scores | Mejor de ambos mundos | Mayor complejidad |
| **Multi-vector** | Múltiples vectores por documento | Mayor granularidad | Más almacenamiento |

**Recomendación para finanzas:** Hybrid retrieval — BM25 captura términos técnicos exactos (CAE, TMC, UF, APV), Dense captura consultas semánticas naturales.

### Chunking Strategies

| Estrategia | Tamaño | Mejor Para |
|-----------|--------|-----------|
| Fixed-size | 256-512 tokens | Documentos uniformes |
| Sentence-level | Variable | Texto narrativo |
| Semantic chunking | Variable | Documentos heterogéneos |
| Hierarchical | Parent + child chunks | Documentos estructurados (leyes, informes) |

**Para corpus financiero-regulatorio:** Hierarchical chunking — el padre es la sección completa (e.g., "Tasas Hipotecarias"), el hijo es el párrafo específico. Retrieval sobre hijos, contexto del padre.

---

## Técnicas de Post-Retrieval

### Reranking
El modelo recupera top-k chunks y luego aplica un reranker más potente:

```
BM25/Dense → top-20 candidates → Cross-encoder reranker → top-5 final
```

**Cross-encoders:** Procesan query + documento juntos → score de relevancia más preciso
- Ejemplo: `ms-marco-MiniLM-L-12-v2` (inglés), modelos fine-tuneados en español

### Contextual Compression
Eliminar partes del chunk que no son relevantes para la query antes de pasarlas al LLM:
- Reduce ruido en el contexto
- Mejora faithfulness de la respuesta
- Ahorra tokens (costo)

### Lost in the Middle
Hallazgo crítico: los LLMs tienden a ignorar información en el **medio** del contexto largo.

**Solución:** Ordenar chunks más relevantes al inicio y al final del prompt, no en el medio.

---

## Problemas de Alucinación en RAG

### Tipos de Alucinación

| Tipo | Descripción | Ejemplo en Finanzas |
|------|-------------|---------------------|
| **Factual** | Datos incorrectos no presentes en contexto | Inventar tasa de interés |
| **Attributional** | Atribuir información a fuente incorrecta | Decir que CMF publicó algo que no publicó |
| **Faithfulness** | Inferir más allá de lo que dice el contexto | Recomendar producto no mencionado |
| **Grounded** | Información real pero fuera de contexto | Tasa de 2020 para pregunta sobre 2024 |

### Mitigaciones en RAG Financiero

1. **Citar fuente y fecha** de cada dato recuperado
2. **Umbrales de confianza** — si score < 0.7, decir "no tengo información suficiente"
3. **Verificación cruzada** — para datos críticos (tasas, montos legales), buscar en 2+ fuentes
4. **Fecha de vigencia** — alertar si el documento recuperado tiene más de 6 meses

---

## Evaluación RAG para Agente Financiero

### Dataset de Evaluación Recomendado

Crear dataset de pares (query, gold_answer, gold_context):

```python
# Ejemplo de entrada de evaluación
{
  "query": "¿Cuál es la TMC vigente para crédito consumo a 1-3 años?",
  "gold_answer": "Según el certificado CMF [mes], la TMC es X% mensual",
  "gold_context": ["tasas_credito_chile.md, sección TMC"],
  "categoria": "tasas_reguladas",
  "dificultad": "factual_lookup"
}
```

### Categorías de Preguntas para Evaluación

| Categoría | Ejemplo | Métrica Clave |
|-----------|---------|---------------|
| Factual lookup | "¿Qué es el CAE?" | Faithfulness |
| Comparación | "¿APV Régimen A o B para renta $2M?" | Answer Relevance |
| Multi-hop | "Si tengo 40% carga financiera y quiero hipoteca..." | Context Recall |
| Regulatoria | "¿Cuándo es obligatorio el SFA?" | Accuracy |
| Cálculo | "CAE con tasa 1.5% mensual a 24 cuotas" | Accuracy |

---

## Optimización del Pipeline RAG

### Configuraciones Clave (Hyperparámetros)

| Parámetro | Rango a Probar | Impacto |
|-----------|---------------|---------|
| Chunk size | 256, 512, 1024 tokens | Retrieval precision vs. context |
| Overlap | 0%, 10%, 20% | Continuidad entre chunks |
| Top-k retrieval | 3, 5, 10 | Recall vs. ruido |
| Reranker threshold | 0.5, 0.7, 0.9 | Precision vs. recall |
| Embedding model | text-embedding-3-large, paraphrase-multilingual | Calidad semántica |

### Pipeline Óptimo para Finanzas Personales

```
Query del usuario
    ↓
Preprocessor (normalizar términos financieros: "tasa máxima" → TMC)
    ↓
HyDE o Sub-query decomposition (para preguntas complejas)
    ↓
Hybrid Retrieval (BM25 + Dense, top-20)
    ↓
Cross-encoder Reranker (→ top-5)
    ↓
Contextual Compression (eliminar texto irrelevante)
    ↓
Ordenar por relevancia (más relevante al inicio)
    ↓
LLM Generation con prompt estructurado
    ↓
Faithfulness check (opcional, para datos críticos)
    ↓
Respuesta al usuario con fuentes citadas
```

---

## Conexión con Arquitectura de la Tesis

### Por Qué Este Survey es Relevante

1. **Pipeline de evaluación:** Auepora provee el marco para evaluar el agente con métricas establecidas
2. **Chunking strategy:** La tesis usa documentos regulatorios y educativos — hierarchical chunking es ideal
3. **Hybrid retrieval:** Términos financieros exactos (BM25) + consultas naturales (Dense)
4. **Anti-alucinación:** Crítico en finanzas — citar fuente y fecha en cada recomendación
5. **Benchmarks:** Comparar agente contra baselines usando RAGAS y las métricas del survey

---

## Referencias Relacionadas
- Agentic RAG (arXiv:2501.05249) — extiende el pipeline con agentes especializados
- Metadata-Driven RAG — complementa con pre/post retrieval basado en metadatos
- ReAct (Yao et al., 2023) — el ciclo Thought-Action de ReAct se integra con el pipeline RAG
