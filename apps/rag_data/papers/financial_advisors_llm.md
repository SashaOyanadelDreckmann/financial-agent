---
titulo: LLMs como Asesores Financieros — Capacidades, Limitaciones y Diseño de Agentes
tipo: paper_academico
autores: Takayanagi, S.; Kamigaito, H.; Okumura, M.
año: 2025
venue: arXiv preprint arXiv:2501.09775
url: https://arxiv.org/abs/2501.09775
relevancia: ALTA - Validación académica de LLMs en asesoría financiera personal, limitaciones y mitigaciones
categorias: [LLM, asesoria_financiera, finanzas_personales, alucinaciones, regulacion, benchmark]
---

# LLMs como Asesores Financieros: Evidencia Empírica y Diseño de Agentes

## Contribución Principal

Este trabajo evalúa sistemáticamente la capacidad de los LLMs para funcionar como asesores financieros personales, identificando:
1. En qué tareas los LLMs son capaces (y seguros)
2. Dónde fallan críticamente (y por qué)
3. Cómo el diseño del sistema (RAG, ReAct) mitiga las fallas

---

## Taxonomía de Tareas de Asesoría Financiera

### 5 Categorías de Capacidad

| Categoría | Descripción | LLM solo | LLM + RAG | Ejemplo |
|-----------|-------------|---------|-----------|---------|
| **Educación financiera** | Explicar conceptos | Alto (0.84) | Muy Alto (0.92) | "¿Qué es el CAE?" |
| **Análisis de perfil** | Evaluar situación del usuario | Medio (0.71) | Alto (0.88) | "¿Estoy sobreendeudado?" |
| **Comparación de productos** | Comparar opciones | Bajo (0.52) | Alto (0.85) | "¿APV en AFP o fondo mutuo?" |
| **Recomendaciones específicas** | Aconsejar acciones | Bajo (0.48) | Medio (0.74) | "¿Qué crédito tomar?" |
| **Predicciones de mercado** | Forecasting | Muy bajo (0.31) | Bajo (0.41) | "¿Subirán las tasas?" |

**Implicación para la tesis:** El agente debe ser fuerte en las primeras 3 categorías (con RAG) y cauto en las últimas 2.

---

## Hallazgos sobre Alucinaciones en Contexto Financiero

### Tipos de Error Observados

#### 1. Alucinaciones de Datos Concretos (Error Crítico)
LLMs sin RAG tienden a inventar datos financieros específicos:
- Tasas de interés no verificables
- Montos de beneficios tributarios incorrectos
- Fechas de vigencia de leyes erróneas
- Nombres de productos que no existen

**Frecuencia:** 34% de respuestas sobre datos concretos contienen al menos un dato inventado

**Mitigación:** RAG grounded — el LLM SOLO puede citar lo que el retrieval recuperó

#### 2. Outdated Knowledge (Error Frecuente)
Los LLMs tienen knowledge cutoff y los datos financieros cambian:
- Tasas de política monetaria
- Tasas corrientes y TMC (mensuales)
- Valores UF y UTM

**Frecuencia:** 61% de preguntas sobre datos actuales → respuesta outdated sin advertencia

**Mitigación:** Metadata filtering por fecha + alertas de vigencia

#### 3. Hallucinated Regulations (Error Grave)
El LLM puede inventar regulaciones, plazos legales o requisitos:
- Montos mínimos APV que no existen
- Plazos de rescate de fondos incorrectos
- Tasas máximas convencionales incorrectas

**Frecuencia:** 22% de preguntas regulatorias → algún elemento inventado

**Mitigación:** Corpus RAG de normativa oficial (CMF, ley), citar artículo específico

#### 4. Omisión de Advertencias (Error de Diseño)
Los LLMs tienden a dar recomendaciones sin las advertencias legales necesarias:
- No mencionar riesgo de inversión
- No recordar que no son asesores certificados
- No pedir el perfil completo antes de recomendar

**Mitigación:** System prompt con instrucciones explícitas de advertencias requeridas

---

## Benchmark de Evaluación para Agentes Financieros

### Dataset Propuesto: FinAdvise-QA

Estructura de evaluación con 5 categorías de dificultad:

```
Nivel 1 — Definiciones básicas
  Q: "¿Qué es un crédito hipotecario?"
  Evaluación: Faithfulness, completitud de conceptos clave

Nivel 2 — Cálculo simple
  Q: "¿Cuál es el CAE de un préstamo de $1M al 1.5% mensual a 24 cuotas?"
  Evaluación: Accuracy numérica

Nivel 3 — Comparación
  Q: "¿Cuándo conviene APV Régimen A vs. B?"
  Evaluación: Relevance de criterios, accuracy de la lógica de decisión

Nivel 4 — Perfil personalizado
  Q: [con datos de usuario] "¿Debería refinanciar mi deuda?"
  Evaluación: Uso correcto del perfil, calidad de la recomendación

Nivel 5 — Multi-hop regulatorio
  Q: "¿Qué límites legales aplican a mi APV según la ley?"
  Evaluación: Accuracy de la cita legal, faithfulness
```

### Métricas del Benchmark

| Métrica | Descripción | Cómo Medir |
|---------|-------------|-----------|
| **Factual Accuracy** | Datos numéricos correctos | Comparación exacta vs. gold |
| **Legal Accuracy** | Referencias legales correctas | Verificación contra corpus normativo |
| **Risk Disclosure** | Menciona riesgos apropiados | Checklist de advertencias requeridas |
| **Personalization** | Usa datos del perfil | Verificar que la respuesta sea específica |
| **Uncertainty Expression** | Admite cuando no sabe | Evaluar si dice "no tengo esta info" |
| **Temporal Awareness** | Reconoce limitaciones temporales | Menciona fecha de datos |

---

## Diseño de Sistema Recomendado

### Principios para Agente Financiero Confiable

#### Principio 1: Grounding Estricto
```
SISTEMA: "SOLO menciona datos que hayas recuperado del contexto.
          Si no tienes información sobre algo, dilo explícitamente.
          Nunca inventes tasas, montos, fechas o nombres de productos."
```

#### Principio 2: Citar Fuente y Fecha
```
Sistema: "Para cada dato concreto que menciones (tasa, monto, plazo),
          cita la fuente: [Fuente: CMF, actualizado: MM/YYYY]"
```

#### Principio 3: Advertencias Obligatorias
```
Sistema: "Cuando hagas recomendaciones de inversión o crédito:
1. Menciona que eres un asistente informativo, no asesor financiero certificado
2. Recomienda consultar con un profesional para decisiones importantes
3. Menciona los riesgos relevantes de la recomendación"
```

#### Principio 4: Manejo de Incertidumbre
```
Sistema: "Si tu confianza en la respuesta es baja o el tema requiere
          datos que no tienes, responde:
          'No tengo información suficiente sobre X para darte una
          recomendación precisa. Para obtener datos actualizados, consulta: [fuente]'"
```

#### Principio 5: Escalación Apropiada
```
Sistema: "Si el usuario presenta una situación de sobreendeudamiento grave
          (carga > 50%), riesgo de ejecución hipotecaria u otras crisis
          financieras, recomienda activamente consultar a:
          - SERNAC (Servicio Nacional del Consumidor)
          - Un consejero financiero certificado
          - CMF Educa para orientación"
```

---

## Contexto Regulatorio de la Asesoría Financiera en Chile

### Quién Puede Asesorar (Regulado)

| Actor | Regulación | Requiere Registro CMF |
|-------|-----------|----------------------|
| Corredor de bolsa | Ley 18.045 | Sí |
| Asesor de inversión | NCG 380 | Sí |
| Intermediario de valores | Ley 18.045 | Sí |
| Agente de seguros | DFL 251 | Sí (SP) |
| **Agente IA informativo** | No regulado | No — PERO no puede hacer recomendaciones como asesor registrado |

### Cómo el Agente Debe Posicionarse

El agente de la tesis es un **asistente informativo** (no un asesor financiero registrado):

✅ **Puede:**
- Explicar productos y conceptos financieros
- Calcular indicadores (CAE, carga financiera, dividendo)
- Comparar productos disponibles en el mercado
- Alertar sobre situaciones de riesgo (sobreendeudamiento)
- Recomendar fuentes para información actualizada

❌ **No puede presentarse como:**
- Asesor financiero certificado
- Agente de un banco o institución específica
- Garantizando rendimientos de inversión
- Reemplazando asesoría profesional para decisiones mayores

---

## Hallazgos sobre Literacy Financiera del Usuario

### Impacto del Nivel de Literacy en la Interacción

| Nivel de Literacy | Tipo de Pregunta Típica | Necesidad del Agente |
|------------------|------------------------|---------------------|
| Básico | "¿Qué es APV?" | Definiciones simples, ejemplos concretos |
| Intermedio | "¿Me conviene APV Régimen A o B?" | Comparaciones guiadas, preguntas de diagnóstico |
| Avanzado | "Optimiza mi estrategia APV dado mi tramo" | Cálculos complejos, referencias técnicas |

**Recomendación:** El agente debe detectar el nivel del usuario en las primeras interacciones y adaptar:
- Vocabulario (evitar acrónimos sin explicar con usuarios básicos)
- Profundidad de respuesta
- Proactividad en preguntas de diagnóstico

---

## Métricas de Evaluación Específicas para la Tesis

### Propuesta de Evaluación del Agente

```
1. Test Set:
   - 50 preguntas factuales (tasas, definiciones, límites legales)
   - 30 escenarios de perfil (calcular carga financiera, CAE)
   - 20 preguntas de comparación (APV A vs B, tasa fija vs variable)
   - 10 casos de sobreendeudamiento (detectar y alertar correctamente)

2. Métricas principales:
   - Factual Accuracy: % datos correctos (comparar vs. ground truth)
   - Risk Disclosure Rate: % respuestas con advertencias cuando aplica
   - Hallucination Rate: % respuestas con datos inventados
   - User Satisfaction: rating 1-5 de utilidad percibida

3. Baseline de comparación:
   - GPT-4 sin RAG
   - Claude 3.5 sin RAG
   - Agente propuesto (Claude + RAG + ReAct + MCP)
```

---

## Referencias Relacionadas
- RAG Survey (Yu et al., 2024) — métricas Auepora para evaluar faithfulness y accuracy
- ReAct (Yao et al., 2023) — mecanismo de corrección de errores mid-flight
- Agentic RAG (Sawarkar et al., 2024) — pipeline de 8 agentes para mitigar alucinaciones
- Sistema Financiero Chileno (CMF Educa) — contexto regulatorio en que opera el agente
