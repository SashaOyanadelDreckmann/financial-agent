---
titulo: ReAct — Synergizing Reasoning and Acting in Language Models
tipo: paper_academico
autores: Yao, S.; Zhao, J.; Yu, D.; Du, N.; Shafran, I.; Narasimhan, K.; Cao, Y.
año: 2023
venue: arXiv preprint arXiv:2210.03629
url: https://arxiv.org/abs/2210.03629
relevancia: CRÍTICA - Paradigma arquitectónico central del agente conversacional propuesto
categorias: [ReAct, razonamiento, accion, LLM, agente, reduccion_alucinaciones, QA]
---

# ReAct: Synergizing Reasoning and Acting in Language Models

## Resumen

ReAct presenta un paradigma unificado donde los modelos de lenguaje **intercalan trazas de razonamiento y acciones ejecutables** en una misma trayectoria de resolución, permitiendo que ambos procesos se retroalimenten mutuamente durante la resolución de tareas complejas.

## Problema que Resuelve

### Limitaciones de Enfoques Anteriores
1. **Solo razonamiento (Chain-of-Thought):** El modelo puede generar cadenas de pensamiento plausibles pero incorrectas, sin verificación externa. Propenso a alucinaciones.
2. **Solo acciones:** No hay estructura de razonamiento que guíe qué acciones tomar. Difícil gestionar objetivos complejos.
3. **Separación de razonamiento y acción:** No permite que el razonamiento se actualice con evidencia obtenida del entorno.

---

## Paradigma ReAct

### Ciclo Fundamental

```
Observación → Pensamiento → Acción → Observación → Pensamiento → Acción → ...
```

### Componentes

| Componente | Descripción | Impacto en Entorno |
|-----------|-------------|-------------------|
| **Pensamiento (Thought)** | Traza de razonamiento en lenguaje natural | Ninguno (interno) |
| **Acción (Action)** | Operación sobre el entorno (búsqueda, consulta, cálculo) | Sí — modifica estado |
| **Observación (Observation)** | Resultado de la acción | Input para siguiente ciclo |

### Rol de las Trazas de Pensamiento
Las trazas de pensamiento NO modifican el entorno pero son fundamentales para:
- **Descomponer objetivos** en subobjetivos manejables
- **Planificar secuencias** de acciones
- **Sintetizar observaciones** previas
- **Detectar inconsistencias** en el razonamiento
- **Funcionar como memoria de trabajo** del agente

---

## Ventajas Demostradas

### 1. Reducción de Alucinaciones
Al anclar el razonamiento en evidencia recuperada del entorno (Wikipedia, bases de datos), ReAct reduce significativamente las "alucinaciones" — afirmaciones incorrectas generadas por el modelo.

**Mecanismo:** El modelo no solo razona internamente; verifica contra fuentes externas en cada paso.

### 2. Interpretabilidad
Las trazas de pensamiento son **legibles por humanos**, permitiendo:
- Inspeccionar por qué el agente tomó cada decisión
- Identificar dónde falla el razonamiento
- Auditar el proceso de decisión (crítico en finanzas)

### 3. Corrección de Errores
Si una acción retorna información inesperada, el pensamiento puede reconocer el error y replantear la estrategia.

---

## Resultados Empíricos

| Tarea | Dataset | Mejora ReAct vs. Baseline |
|-------|---------|--------------------------|
| QA multihop | HotpotQA | Supera baselines solo-razonamiento |
| Verificación de hechos | FEVER | Supera baselines |
| Toma de decisiones | ALFWorld (juego texto) | **+34%** sobre mejor baseline |
| Toma de decisiones | WebShop | **+10%** sobre mejor baseline |

---

## Implementación

### Sin Reentrenamiento
ReAct se implementa mediante **prompting con ejemplos en contexto** (few-shot):
- Se muestran al modelo trayectorias humanas ejemplares (pensamiento + acción + observación)
- El modelo aprende a replicar el patrón
- No requiere modificar la arquitectura del modelo
- Flexible según densidad de razonamiento requerida por la tarea

---

## Aplicación al Agente Financiero (Tesis)

### Flujo ReAct en Finanzas Personales

```
USUARIO: "¿Cuál es el mejor crédito hipotecario para mí?"

Pensamiento: Necesito conocer el perfil del usuario (ingresos, deuda actual,
             monto requerido, plazo) antes de comparar productos.

Acción: [Consultar perfil usuario] → ingreso=$2M, deuda_actual=15%,
        monto_requerido=UF3000, plazo=20años

Pensamiento: Con carga financiera actual de 15%, si agrego hipoteca con
             dividendo ~UF15/mes (~$570K), llegaré a ~43% de carga.
             Necesito comparar tasas actuales.

Acción: [Consultar RAG tasas_hipotecarias] → tasa_fija_promedio=4.8% UF,
        tasa_variable=3.2%+TPM

Pensamiento: Para este perfil, tasa fija da más certeza dado nivel de
             endeudamiento ya elevado. CAE estimado a 20 años tasa fija...

Acción: [Calcular CAE y carga financiera total] → CAE=5.1%, carga_total=42%

Pensamiento: Carga del 42% está en zona de alto riesgo (>35%). Debo alertar
             al usuario y explorar alternativas (menor monto, mayor plazo).

RESPUESTA: "Basado en tu perfil, un crédito hipotecario a tasa fija de ~4.8%
            UF anual sería viable. Sin embargo, tu carga financiera resultante
            (42%) es elevada. Te recomendaría..."
```

### Por Qué ReAct es Adecuado para Finanzas
1. **Factualidad crítica:** En finanzas, un dato incorrecto puede causar daño material. ReAct permite verificar contra fuentes externas (RAG).
2. **Trazabilidad requerida:** La regulación exige justificar recomendaciones. Las trazas de pensamiento son el rastro de auditoría.
3. **Complejidad multi-paso:** Comparar productos financieros requiere múltiples consultas, cálculos y síntesis. ReAct estructura este proceso.
4. **Corrección de errores:** Si un usuario da información incorrecta, el ciclo ReAct puede detectar inconsistencias y preguntar.

---

## Conexión con Marco Teórico (Russell & Norvig)

ReAct es una instancia moderna del **agente racional** clásico:
- **Percepción:** observaciones del entorno (respuestas de herramientas, contexto del usuario)
- **Decisión:** trazas de razonamiento que seleccionan la siguiente acción
- **Acción:** ejecución sobre herramientas/fuentes externas
- **Racionalidad:** maximiza calidad de respuesta bajo información incompleta

---

## Referencias Relacionadas
- RAG Survey (Yu et al., 2024) — complementa la etapa de "acción de recuperación"
- MCP (Hou et al., 2025) — estandariza las "acciones" del agente ReAct
- Russell & Norvig (2010) — marco teórico de agentes racionales
