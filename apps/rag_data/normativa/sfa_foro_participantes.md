---
titulo: Foro Sistema de Finanzas Abiertas - Participantes y Estructura
tipo: normativa_institucional
fuente: CMF Chile - Portal Foro SFA
url: https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-47700.html
fecha_scraped: 2026-04
relevancia: ALTA - Ecosistema real de actores del SFA que interactuarán con el agente
categorias: [SFA, actores, gobernanza, open_finance, interoperabilidad]
---

# Foro Sistema de Finanzas Abiertas — Participantes y Estructura

## Propósito del Foro

Cuerpo consultivo y colaborativo creado por la CMF bajo la Ley 21.521 para promover competencia, innovación e inclusión financiera a través del Sistema de Finanzas Abiertas.

**Contacto oficial:** leyfintec@cmfchile.cl

## Instituciones Participantes

| Institución | Tipo |
|-------------|------|
| ABIF (Asociación de Bancos e Instituciones Financieras) | Banca |
| FinteChile (Asociación de Innovación Fintech) | Fintech |
| Asociación de la Industria Financiera del Retail | Retail financiero |
| CAJAS DE CHILE (Cajas de Compensación) | Previsión |
| COOPERA (Cooperativas de Crédito) | Cooperativas |
| AACH (Asociación de Aseguradoras) | Seguros |
| BancoEstado | Banca pública |

## Estructura de Gobernanza (2 Niveles)

### Nivel 1
- Grupo Asesor
- Secretaría Técnica

### Nivel 2 — Grupos de Trabajo Técnico
1. **Infraestructura** — Arquitectura técnica del SFA
2. **Especificaciones de Intercambio de Datos** — Formatos y estándares
3. **Seguridad, Perfiles y Autenticación** — Certificados, OAuth, identidad
4. **Experiencia de Usuario (UX)** — Flujos de consentimiento y onboarding

## Tipos de Instituciones en el SFA

| Tipo | Rol | Obligatoriedad |
|------|-----|----------------|
| Proveedores de Información (PI) | Comparten datos del cliente | Obligatorio (IPIs) |
| Proveedores de Servicios Basados en Información (PSBI) | Usan datos para crear servicios | Voluntario |
| Proveedores de Cuentas (IPC) | Mantienen cuentas del cliente | Obligatorio |
| Proveedores de Iniciación de Pagos (PSIP) | Ejecutan pagos | Voluntario |

## Mecanismo de Intercambio

El SFA permite:
- Intercambio automatizado mediante APIs estandarizadas
- Acceso remoto con estándares de seguridad definidos
- Consentimiento explícito del cliente para cada tipo de dato
- Interoperabilidad entre distintos tipos de instituciones

## Principios Obligatorios

Todas las instituciones participantes deben observar:
1. **Proporcionalidad** — Carga regulatoria según tamaño e impacto
2. **Calidad** — Datos precisos, actualizados y completos
3. **Transparencia** — Información clara para usuarios y regulador
4. **Seguridad y privacidad** — Protección de datos personales
5. **No discriminación** — Acceso igualitario entre actores equivalentes
6. **Interoperabilidad** — Compatibilidad técnica entre sistemas

## Relevancia para el Agente Conversacional

Un agente financiero chileno que simule o acceda al SFA deberá:
- Conocer qué instituciones son IPIs obligados (fuentes de datos)
- Entender el flujo de consentimiento granular del usuario
- Manejar autenticación compatible con los estándares del Grupo 3 del Foro
- Diseñar UX de consentimiento alineada con el Grupo 4 del Foro
- Estructurar requests de datos según especificaciones del Grupo 2
