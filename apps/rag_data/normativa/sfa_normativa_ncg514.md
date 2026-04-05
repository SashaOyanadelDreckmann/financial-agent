---
titulo: NCG N°514 - Normativa Técnica del Sistema de Finanzas Abiertas (SFA)
tipo: normativa_regulatoria
fuente: Comisión para el Mercado Financiero (CMF)
url: https://www.cmfchile.cl/portal/prensa/615/w3-article-96458.html
url_actualizacion: https://www.cmfchile.cl/portal/prensa/615/w3-article-100482.html
fecha_actualizacion: 2025-11
relevancia: CRÍTICA - Estándar técnico que debe cumplir cualquier sistema conectado al SFA
categorias: [SFA, APIs, consentimiento, seguridad, interoperabilidad, open_finance]
---

# NCG N°514 — Normativa Técnica Sistema de Finanzas Abiertas

## Estado Actual (2025)

La CMF ha abierto consulta pública sobre modificaciones que incorporan el Anexo Técnico N°3. La norma ha recibido más de 400 comentarios de 32 entidades. La implementación obligatoria se extendió a **julio 2027**.

## Estructura Regulatoria (3 Niveles)

| Nivel | Contenido |
|-------|-----------|
| Nivel 1 | Lineamientos generales y principios |
| Nivel 2 | Definiciones técnicas detalladas |
| Nivel 3 | Manuales técnicos operativos (en desarrollo durante implementación) |

## Categorías de Datos Compartidos

### Fase 1 — Información Pública (Primeros)
- Términos y condiciones generales de productos financieros
- Canales de atención al cliente
- Información de sucursales y puntos de acceso

### Fase 2 — Datos de Personas Naturales y Jurídicas
- Información de cuentas y saldos
- Historial de transacciones (últimos 24 meses)
- Condiciones contractuales vigentes
- Productos financieros contratados

## Actores Obligados (IPIs - Instituciones Proveedoras de Información)
- Bancos (todos los supervisados por CMF)
- Emisores de tarjetas de crédito
- Aseguradoras
- Administradoras de fondos
- Cooperativas de crédito fiscalizadas por CMF

## Estándares Técnicos de APIs

### Especificaciones Técnicas (Anexo Técnico N°3)
- Directorio de participantes con certificados y firmas digitales
- Nomenclaturas y códigos de respuesta estandarizados
- Paginación de resultados
- Métricas de disponibilidad (SLA)
- TPM/TPS (transacciones por minuto/segundo)
- Sistema de monitoreo de calidad de información

### Requisitos de Disponibilidad
- API principal + mecanismo alternativo (réplica funcional para contingencias)
- Disponibilidad definida en SLA con métricas verificables

### Requisitos de Latencia Transaccional
- Datos de transacciones: disponibles en **máximo 5 minutos** desde que aparecen en el sistema del proveedor
- Datos históricos requeridos: **24 meses** hacia atrás

## Gestión de Consentimiento (Marco Técnico)

- Generación y administración de consentimiento digitalizado
- Representantes legales y apoderados pueden autorizar directamente
- Autorizaciones de pago existentes se extienden a transacciones SFA
- Revocación de consentimiento debe procesarse en tiempo real

## Cronograma de Implementación (Actualizado 2025)

| Fase | Actores | Plazo |
|------|---------|-------|
| Piloto voluntario | Todos | Pre-vigencia obligatoria |
| Piloto obligatorio (SLA reducido) | Todos | 2 meses post-vigencia |
| Vigencia obligatoria | Bancos + emisores tarjetas | Julio 2027 |
| Vigencia obligatoria | Cooperativas + aseguradoras | +18 meses |
| Vigencia obligatoria | Administradoras de fondos | +36 meses |
| Implementación completa | Todo el sistema | ~5 años desde Ley |

## Régimen Simplificado

Entidades del **Grupo 2** (no bancarias) con menos de 50,000 clientes activos pueden:
- Participar voluntariamente con condiciones relajadas
- Proveer solo información de canales de servicio
- Evitar implementación completa de APIs

## Sandbox de Pruebas

La CMF provisionará **entornos sandbox** antes del lanzamiento oficial para que entidades puedan:
- Probar integraciones técnicas
- Validar estándares de API
- Capacitar equipos técnicos

## Principios Transversales

Todas las instituciones deben observar:
1. **Proporcionalidad** (carga regulatoria según tamaño)
2. **Calidad** de datos compartidos
3. **Transparencia** hacia usuarios
4. **Seguridad y privacidad** de datos
5. **No discriminación** entre actores
6. **Interoperabilidad** técnica

## Impacto en Diseño de Agentes Financieros

Para un agente conversacional que consuma datos del SFA:
- Debe manejar autenticación mediante certificados del Directorio SFA
- Debe gestionar consentimientos granulares por tipo de dato
- Debe implementar revocación de consentimiento en tiempo real
- Debe cumplir con requisitos de auditoría y trazabilidad
- Debe operar en sandbox durante pruebas
- Debe manejar latencia de hasta 5 minutos en datos transaccionales
