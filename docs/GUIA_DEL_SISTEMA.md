# Guía del sistema · Financiera-Mente

Documentación integral de funcionalidades del prototipo de tesis en finanzas abiertas.

---

## 1. Visión general

**Financiera-Mente** es un prototipo académico de tesis que evalúa si un agente conversacional puede:

- Levantar contexto personal financiero
- Explicar conceptos y marco regulatorio (CMF)
- Generar análisis claros y reportes PDF profesionales
- Apoyar decisiones financieras cotidianas sin sustituir asesoría profesional

**Alcance:** apoyo informativo, simulaciones orientativas y educación financiera.  
**Límite:** no reemplaza asesoría profesional personalizada.

---

## 2. Páginas y flujo

| Ruta | Descripción |
|------|-------------|
| `/` | Portada: proyecto de tesis, objetivos, CTAs (Comenzar evaluación, Demo rápida, Ingresar) |
| `/register` | Registro de usuario |
| `/login` | Inicio de sesión (con botón directo a registro) |
| `/demo` | Demo del agente sin panel: solo hoja de chat para preguntas rápidas |
| `/intake` | Cuestionario inicial de contexto financiero (5 pasos) |
| `/interview` | Entrevista guiada por bloques |
| `/diagnosis` | Perfil y lectura consolidada del usuario |
| `/agent` | Chat principal con panel, barra de conocimiento y módulos |

---

## 3. Intake (cuestionario inicial)

**Paso 1 · Contexto personal**
- Edad
- Situación laboral: empleado, independiente, dependiente+independiente, estudiante, estudiante+dependiente, estudiante+independiente, cesante, etc.
- Profesión u ocupación

**Paso 2 · Ingresos y gastos**
- Rango de ingresos mensuales (incluye sin ingresos, variable/estacional)
- Ingreso mensual exacto (opcional)
- Cobertura de gastos (sobra, justo, a veces no alcanza, no cubre)
- Seguimiento de gastos (sí, a veces, no)

**Paso 3 · Ahorro, inversión y deudas**
- ¿Tiene ahorros o inversiones?
- Rango de ahorro (si aplica)
- Monto exacto (opcional)
- ¿Tiene deudas activas?

**Paso 4 · Productos financieros**
- Tipo de producto (autocompletado: tarjeta crédito/débito, cuenta corriente/vista, créditos, seguros, fondos, etc.)
- Institución (autocompletado: bancos e instituciones financieras de Chile)
- Costo mensual, notas
- Puede continuar sin productos

**Paso 5 · Conocimiento financiero**
- Pills de conceptos (interés, CAE, inflación, liquidez, diversificación, etc.)
- Reacción ante caída de inversión
- Autoevaluación de comprensión (0–10)
- Nivel de estrés financiero (0–10)

---

## 4. Agente y chat principal (`/agent`)

### 4.1 Chat y controles

- **Tabs 1, 2, 3:** tres hojas de conversación para separar objetivos por escenario
- **Hist:** historial completo del chat activo
- **Flechas:** modo de panel (amplio, intermedio, compacto)
- **B/N:** modo monocromo para lectura
- **Conversación:** modo llamada en tiempo real con voz (reconocimiento + síntesis)
- **Cerrar sesión:** cierra sesión y redirige a login

### 4.2 Barra de conocimiento

- Porcentaje de progreso según hitos completados
- Checkboxes: Presupuesto útil, Transacciones verificadas, Objetivo definido, etc.
- Al 100% se habilita la **Hoja A4 negra** (contexto completo para plan 30-60-90)

### 4.3 Panel derecho

- Objetivo activo y modo cognitivo del agente
- Siguiente desbloqueo
- **Presupuesto:** modal profesional con tabla extendida
- **Transacciones:** modal de finanzas abiertas con productos e instituciones
- Biblioteca de documentos y documentos recientes

### 4.4 Presupuesto profesional

Modal con tabla de flujo mensual:

- **Categoría** (ej. Sueldo, Vivienda, Alimentación)
- **Tipo** (Ingreso / Gasto)
- **Producto/servicio** (cuenta corriente, tarjeta crédito, crédito consumo, etc.)
- **Institución** (bancos e instituciones de Chile)
- **Cuenta/producto** (etiqueta del producto)
- **Frecuencia** (mensual, quincenal, trimestral, anual, único)
- **Medio** (transferencia, débito, crédito, PAC/PAT, efectivo, billetera digital)
- **Monto**
- **Nota**

Resumen: ingresos, gastos, balance, recurrencia, movimientos únicos, filas con producto/cuenta.  
**Enviar al chat:** inyecta la tabla y pide diagnóstico por categorías.

### 4.5 Transacciones y finanzas abiertas

- **Catálogo de productos:** tarjeta débito/crédito, cuenta corriente/vista, créditos, seguros, fondos, etc.
- **Institución:** selector con bancos e instituciones de Chile
- **Simulación de login:** credenciales demo o aleatorias
- **Carga de cartolas:** PDF/Excel/CSV (etiquetadas por producto e institución)
- La evidencia se inyecta en el contexto del agente

---

## 5. Informes PDF

El agente genera PDFs reales cuando el usuario pide informes, reportes o documentos:

- **Portada** con título, subtítulo y ficha del documento
- **Índice general** (secciones, gráficos, tablas)
- **Índice de gráficos** (si hay gráficos)
- **Desarrollo** con secciones narrativas, gráficos con título y explicación, tablas
- **Estilos:** corporativo, minimalista, técnico
- **Tipos:** análisis, diagnóstico, simulación

Cada gráfico incluye: título, explicación automática, imagen, métricas clave (inicio, cierre, variación, tendencia).

---

## 6. Modo conversación (llamada en tiempo real)

- Botón **Conversación** en el header del chat
- Interfaz minimalista tipo llamada
- Reconocimiento de voz (Web Speech API)
- Síntesis de voz del agente (voz femenina castellana, más rápida y cálida)
- Transcripción en vivo de lo que dice el usuario
- Historial de turnos recientes
- Desacoplado de la barra de conocimiento

---

## 7. Demo rápida (`/demo`)

- Versión del agente sin panel
- Solo hoja de chat para preguntas
- No requiere login
- Acceso desde la portada

---

## 8. Catálogos centrales

**Productos/servicios financieros** (`lib/financialCatalog.ts`):
- Cuenta corriente, vista/prepago, tarjeta débito/crédito
- Línea de crédito, crédito consumo, hipotecario, automotriz
- Seguros, fondos mutuos, acciones/ETF, depósitos a plazo

**Instituciones de Chile**:
- Bancos (BancoEstado, Santander, BCI, Scotiabank, Falabella, Ripley, etc.)
- Cooperativas (Coopeuch, Oriencoop, etc.)
- Cajas (Los Andes, La Araucana, 18, Los Héroes)
- Aseguradoras (Consorcio, BICE Vida, MetLife, SURA, MAPFRE, etc.)
- Inversiones (LarrainVial, Banchile, Fintual, Racional, etc.)
- Fintechs (Tenpo, Mach, Mercado Pago, Copec Pay)

---

## 9. Backend y API

- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- **Sesión:** `GET /api/session`
- **Agente:** `POST /api/agent` (mensaje + historial + contexto)
- **Intake:** `POST /intake/submit`
- **Transcripción:** `POST /api/transcribe` (si aplica)

---

## 10. Límites del sistema

- No realiza transacciones reales
- No sustituye asesoría financiera personalizada
- Preferir fuentes oficiales y citar evidencia cuando aplique
- Proyecto de tesis: prototipo académico, no producto comercial final
