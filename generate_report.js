const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        AlignmentType, WidthType, BorderStyle, ShadingType, HeadingLevel, PageBreak } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "44546A" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "595959" },
        paragraph: { spacing: { before: 120, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // PORTADA
      new Paragraph({ spacing: { line: 400 }, children: [] }),
      new Paragraph({ spacing: { line: 400 }, children: [] }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({
          text: "ANÁLISIS PROFUNDO",
          bold: true,
          size: 40,
          color: "2E75B6"
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({
          text: "Agente Conversacional Financiero",
          size: 32,
          bold: true,
          color: "44546A"
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({
          text: "Arquitectura, Desempe\u00f1o Mobile y Evaluaci\u00f3n para Finanzas Chile",
          size: 26,
          italic: true,
          color: "595959"
        })]
      }),
      new Paragraph({
        spacing: { line: 400 },
        children: []
      }),
      new Paragraph({
        spacing: { before: 480, after: 120 },
        children: [new TextRun({
          text: "Fecha: 26 de marzo de 2026",
          size: 22,
          color: "595959"
        })]
      }),
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({
          text: "Para: Sasha Oyañadel",
          size: 22,
          color: "595959"
        })]
      }),

      // SALTO DE PÁGINA
      new Paragraph({ children: [new PageBreak()] }),

      // TABLA EJECUTIVA DE CALIFICACIONES
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("RESUMEN EJECUTIVO")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [4680, 4680],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Aspecto", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Calificaci\u00f3n", bold: true, color: "FFFFFF" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Core Agent (Lógica)")]
              }),
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "8.2 / 10", bold: true, size: 28 })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Desempe\u00f1o Mobile")]
              }),
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: "F4D5D5", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "5.8 / 10", bold: true, size: 28, color: "C00000" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Arquitectura General")]
              }),
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "8.5 / 10", bold: true, size: 28 })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Aptitud Finanzas Chile")]
              }),
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "7.6 / 10", bold: true, size: 28 })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: "E2EFDA", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "CALIFICACIÓN GENERAL", bold: true, color: "375623" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 4680, type: WidthType.DXA },
                shading: { fill: "E2EFDA", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "7.5 / 10", bold: true, size: 32, color: "375623" })]
                })]
              })
            ]
          })
        ]
      }),

      new Paragraph({ spacing: { before: 240, after: 120 },
        children: [new TextRun({
          text: "Veredicto: Es un prototipo académico sólido con buen potencial, pero requiere optimizaciones críticas antes de producción mobile.",
          italic: true,
          color: "C00000"
        })]
      }),

      // RECOMENDACIÓN PRINCIPAL
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240 },
        children: [new TextRun("Recomendación Principal")]
      }),

      new Paragraph({
        spacing: { after: 120, line: 360 },
        children: [new TextRun("Para que este agente sea apto para pruebas mobile en producción, DEBE abordar 3 problemas críticos:")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1400, 7960],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1400, type: WidthType.DXA },
                shading: { fill: "C00000", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "🔴 P0", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 7960, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Rediseñar CSS para mobile. Eliminar padding-right: 48% y usar grid/flexbox responsive.", bold: true })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1400, type: WidthType.DXA },
                shading: { fill: "FF9900", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "🟠 P1", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 7960, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Optimizar latencias del core agent (meta.latency_ms). Implementar caching y request batching.", bold: true })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1400, type: WidthType.DXA },
                shading: { fill: "FF9900", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "🟠 P1", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 7960, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Refinar compliance CMF. Añadir más disclaimers y validar límites regulatorios por tipo de usuario.", bold: true })]
                })]
              })
            ]
          })
        ]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // SECCIÓN 1: CORE AGENT
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("1. ANÁLISIS DEL CORE AGENT")]
      }),

      new Paragraph({
        spacing: { before: 120, after: 120, line: 360 },
        children: [new TextRun("El core agent (runCoreAgent en apps/api/src/agents/core.agent/) es el corazón del sistema. Implementa un flujo de razonamiento en 4 pasos.")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("1.1 Flujo de Razonamiento")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1400, 2840, 5120],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1400, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Paso", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2840, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Nombre", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 5120, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Descripción", bold: true, color: "FFFFFF" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1400, type: WidthType.DXA },
                shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "1⃣", bold: true })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2840, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Clasificación")]
              }),
              new TableCell({
                borders,
                width: { size: 5120, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("Detecta intención (information, simulation, decision_support, etc.). Usa completeStructured con CORE_CLASSIFIER_SYSTEM. Retorna confidence score.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1400, type: WidthType.DXA },
                shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "2⃣", bold: true })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2840, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("RAG Automático")]
              }),
              new TableCell({
                borders,
                width: { size: 5120, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("Si confidence < 0.6, busca contexto en RAG (rag.lookup). Obtiene citas y documentos relacionados.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1400, type: WidthType.DXA },
                shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "3⃣", bold: true })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2840, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Planning")]
              }),
              new TableCell({
                borders,
                width: { size: 5120, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("Si classification.requires_tools = true, genera un plan (objective + steps). Cada step tiene un tool y args.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1400, type: WidthType.DXA },
                shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "4⃣", bold: true })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2840, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Ejecución + Respuesta")]
              }),
              new TableCell({
                borders,
                width: { size: 5120, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("Ejecuta tools (runMCPTool) en secuencia. Recolecta outputs y citations. Llama al LLM final (temp=0.4) con todo el contexto.")]
                })]
              })
            ]
          })
        ]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("1.2 Fortalezas")]
      }),

      new Paragraph({
        spacing: { line: 360 },
        children: [new TextRun("✅ Clasificación inteligente: Detecta tipos de consulta (información vs. simulación vs. toma de decisión).\n✅ RAG adaptativo: Busca contexto automáticamente si confianza baja.\n✅ Planning explícito: Genera un plan antes de ejecutar (REACT-like).\n✅ Respuestas estructuradas: Retorna metadata completa (mode, tool_calls, citations, compliance).\n✅ Tracking de latencias: Meta.latency_ms permite monitorear desempeño.\n✅ Manejo de gráficos: Detecta series de datos en outputs y genera ChartBlocks.")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("1.3 Debilidades y Recomendaciones")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2700, 6660],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                shading: { fill: "FFC000", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Debilidad", bold: true })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                shading: { fill: "FFC000", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Recomendación", bold: true })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Temperatura fija (0.4)")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Permitir que temperature varíe según mode. Ej: decision_support → temp=0.3 (más conservador), information → temp=0.5 (más creativo).")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Latencias potenciales en steps")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Implementar caching de tool results. Ejecutar tools en paralelo si los steps son independientes.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Compliance incompleto")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Expandir compliance: validar límites CMF, detectar consultas que requieren asesor, agregar disclaimers por tipo de producto.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Sin guardrails de entrada")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Validar inputs (máximo 500 chars, bloquear SQL injection, detectar abuse patterns).")]
                })]
              })
            ]
          })
        ]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("Calificación Core Agent: 8.2/10")]
      }),

      new Paragraph({
        spacing: { line: 360 },
        children: [new TextRun("✔️ Sólido en arquitectura y separación de concerns.\n✔️ RAG e integración de tools funcionando.\n❌ Falta optimización de latencias.\n❌ Compliance insuficiente para regulaciones CMF.\n➡️ Con iteraciones menores (+caching, +compliance), subiría a 9+.")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // SECCIÓN 2: MOBILE
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("2. ANÁLISIS DE DESEMPEÑO MOBILE")]
      }),

      new Paragraph({
        spacing: { before: 120, after: 120, line: 360 },
        children: [new TextRun("ESTE ES EL PUNTO MÁS CRÍTICO. La versión mobile tiene problemas graves de responsive design que la hacen no apta para testing en dispositivos reales.")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("2.1 Problemas Identificados (CSS)")]
      }),

      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [new TextRun("🔴 CRÍTICO")]
      }),

      new Paragraph({
        spacing: { before: 0, after: 120, line: 360 },
        children: [new TextRun({
          text: ".agent-chat { padding-right: 48%; }\n\nEste es el MAYOR problema. En pantallas de <768px (mobile), esto deja solo ~52% del ancho para el contenido. El chat queda truncado. Solución: usar media queries para remover este padding en mobile (<600px).",
          color: "C00000"
        })]
      }),

      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [new TextRun("🔴 CRÍTICO")]
      }),

      new Paragraph({
        spacing: { before: 0, after: 120, line: 360 },
        children: [new TextRun({
          text: ".agent-panel { width: 48%; position: absolute; }\n\nEn mobile, 48% de ancho es demasiado. El panel derecho debe colapsar a drawer/modal o desaparecer completamente. Actualmente solo hay media queries para 1024px y 768px, pero ninguno adecuado para <600px.",
          color: "C00000"
        })]
      }),

      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [new TextRun("🟠 IMPORTANTE")]
      }),

      new Paragraph({
        spacing: { before: 0, after: 120, line: 360 },
        children: [new TextRun({
          text: ".agent-chat-body { width: 44%; max-width: 60%; }\n\nDefiniciones hardcodeadas que asumen layout desktop. En mobile debe ser 100% del ancho disponible.",
          color: "FF9900"
        })]
      }),

      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [new TextRun("🟠 IMPORTANTE")]
      }),

      new Paragraph({
        spacing: { before: 0, after: 120, line: 360 },
        children: [new TextRun({
          text: ".agent-input textarea { font-size: 50px; max-height: 64px vs 10px; }\n\nInconsistencias y valores contradictorios. En mobile, textarea con 50px font es inutilizable.",
          color: "FF9900"
        })]
      }),

      new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [new TextRun("🟠 IMPORTANTE")]
      }),

      new Paragraph({
        spacing: { before: 0, after: 120, line: 360 },
        children: [new TextRun({
          text: ".agent-chat { height: clamp(560px, 860vh, 860px); }\n\nEl clamp es confuso y valores en px no escalan bien. Usar vh es mejor pero necesita ajuste para mobile.",
          color: "FF9900"
        })]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("2.2 Auditoría CSS Responsive")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2000, 2560, 2560, 2240],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2000, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Breakpoint", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2560, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Estado Actual", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2560, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Problema", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2240, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Score", bold: true, color: "FFFFFF" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2000, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph("Mobile <600px")]
              }),
              new TableCell({
                borders,
                width: { size: 2560, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Sin media query específico")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2560, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun({
                    text: "Chat ocluido por padding-right",
                    color: "C00000",
                    bold: true
                  })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2240, type: WidthType.DXA },
                shading: { fill: "F4D5D5", type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "2/10", bold: true, color: "C00000" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2000, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph("Tablet 600-768px")]
              }),
              new TableCell({
                borders,
                width: { size: 2560, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Sin media query")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2560, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun({
                    text: "Layout incómodo",
                    color: "FF9900"
                  })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2240, type: WidthType.DXA },
                shading: { fill: "FFFBCC", type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "4/10", bold: true, color: "FF9900" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2000, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph("Tablet 768-1024px")]
              }),
              new TableCell({
                borders,
                width: { size: 2560, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("@media (max-width: 768px)")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2560, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun({
                    text: "Ajustes mínimos",
                    color: "FF9900"
                  })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2240, type: WidthType.DXA },
                shading: { fill: "FFFBCC", type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "6/10", bold: true, color: "FF9900" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2000, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph("Desktop >1024px")]
              }),
              new TableCell({
                borders,
                width: { size: 2560, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Optimizado")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2560, type: WidthType.DXA },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("-")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 2240, type: WidthType.DXA },
                shading: { fill: "E2EFDA", type: ShadingType.CLEAR },
                margins: { top: 60, bottom: 60, left: 80, right: 80 },
                children: [new Paragraph({ alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "9/10", bold: true, color: "375623" })]
                })]
              })
            ]
          })
        ]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("2.3 Recomendaciones CSS")]
      }),

      new Paragraph({
        spacing: { before: 120, after: 240, line: 360 },
        children: [new TextRun("1. Agregar media query para <600px:\n   • Remover padding-right: 48% en .agent-chat\n   • Convertir .agent-panel a display: none o drawer modal\n   • .agent-chat-body → width: 100%\n   • .agent-input textarea → font-size: 16px (legible)\n\n2. Usar CSS Grid con auto-fit:\n   • .agent-layout { grid-template-columns: 1fr auto; }\n   • En mobile: grid-template-columns: 1fr; (colapsa a 1 columna)\n\n3. Eliminar valores px hardcodeados:\n   • Usar clamp() y rem para escalabilidad\n   • Ejemplo: padding: clamp(1rem, 2vw, 2rem)\n\n4. Validar con DevTools en iOS Safari (problema común)")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("Calificación Desempeño Mobile: 5.8/10")]
      }),

      new Paragraph({
        spacing: { line: 360 },
        children: [new TextRun("✔️ Existe estructura responsive (media queries en 768px y 1024px).\n❌ CRÍTICO: padding-right: 48% hace el chat inutilizable en mobile.\n❌ Panel derecho no colapsa en pantallas pequeñas.\n❌ Sin breakpoint para <600px (donde está el 80% del uso mobile).\n➡️ FIX ESTIMADO: 2-3 horas de CSS + testing.")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // SECCIÓN 3: ARQUITECTURA
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("3. ARQUITECTURA GENERAL")]
      }),

      new Paragraph({
        spacing: { before: 120, after: 120, line: 360 },
        children: [new TextRun("Estructura: Monorepo pnpm con backend (Express) + frontend (Next.js) + shared types. Separación clara de concerns.")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("3.1 Backend (apps/api)")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2700, 6660],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Componente", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Evaluación", bold: true, color: "FFFFFF" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Agents")]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("✅ 8.5/10. Core agent bien estructurado. Hay diagnosticAgent, intakeAgent, interviewer. Separación clara. Falta optimizar latencias.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("MCP Tools")]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("✅ 8/10. Registry de tools extensible. Hay RAG, simulaciones, cálculos. Buena modularidad. Falta instrumentación (logging, errors).")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Orchestrator")]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("⚠️ 6.5/10. Existe (agentRouter, interview flow). Podría ser más sofisticado (context management, state machine).")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Persistencia")]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("⚠️ 5/10. Filesystem local (DATA_DIR). OK para MVP/tesis, pero NO para producción. Requiere DB/Redis.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Auth")]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("✅ 7/10. Cookies de sesión funcionan. Token aleatorio. Expiración por TTL. Faltan: CSRF, HTTPS enforcement, 2FA.")]
                })]
              })
            ]
          })
        ]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("3.2 Frontend (apps/web)")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2700, 6660],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Aspecto", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Evaluación", bold: true, color: "FFFFFF" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Next.js")]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("✅ 9/10. Excelente choice. App router, SSR, API routes. Bien aprovechado.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Estado")]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("✅ 8/10. Zustand para stores (profile, session, chat). localStorage para persistencia. Bueno para MVP, pero monitorear en producción.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("API Client")]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("⚠️ 6.5/10. Fetch API directo. Falta: retry logic, timeout, request cancellation, error boundaries.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Componentes")]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun("✅ 7.5/10. Modular (ChatRenderer, AgentBlocksRenderer, Cards). Bien organizados. Falta memoization (React.memo) en componentes pesados.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 2700, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph("Responsive")]
              }),
              new TableCell({
                borders,
                width: { size: 6660, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 320 },
                  children: [new TextRun({
                    text: "❌ 3.5/10. CRÍTICO. Visto en sección 2.",
                    color: "C00000",
                    bold: true
                  })]
                })]
              })
            ]
          })
        ]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("Calificación Arquitectura General: 8.5/10")]
      }),

      new Paragraph({
        spacing: { line: 360 },
        children: [new TextRun("✅ Monorepo bien estructurado (pnpm workspaces).\n✅ Separación clara: agents, orchestrator, services, routes.\n✅ MCP tools extensibles.\n✅ Next.js bien aprovechado.\n❌ Persistencia no lista para producción (filesystem).\n❌ Mobile responsive roto.\n❌ Falta instrumentación (logging, error tracking).")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // SECCIÓN 4: FINANZAS CHILE
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("4. APTITUD PARA FINANZAS CHILE")]
      }),

      new Paragraph({
        spacing: { before: 120, after: 120, line: 360 },
        children: [new TextRun("El proyecto está localizado para Chile (productos, instituciones, regulaciones CMF). Análisis detallado.")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("4.1 Fortalezas Locales")]
      }),

      new Paragraph({
        spacing: { line: 360 },
        children: [new TextRun("✅ CATÁLOGO CHILE: Intake con productos específicos (tarjeta crédito, cuenta corriente, créditos, seguros) y bancos/instituciones locales.\n\n✅ TERMINOLOGÍA LOCAL: Preguntas en contexto chileno (dependencia, independencia, CAE, CAT, etc.).\n\n✅ CONCEPTOS CMF: Intenta incorporar framework regulatorio (ver system prompts).\n\n✅ DISCLAIMER SYSTEM: Ya tiene compliance.disclaimers_shown en la respuesta.\n\n✅ CASO USO REAL: Educación financiera para usuario promedio chileno.")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("4.2 Debilidades Regulatorias")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 6360],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                shading: { fill: "FF9900", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Deficiencia", bold: true })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                shading: { fill: "FF9900", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Impacto", bold: true })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Compliance vago")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Compliance retorna is_blocked: false siempre. No hay validación de límites (ej: máximo crédito por persona, prohibición de ciertos productos).")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Sin guardrails por perfil")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("No detecta perfiles vulnerables (adultos mayores, inmigrantes, bajo nivel educativo). CMF exige advertencias especiales para estos grupos.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Simulaciones sin disclaimers")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Cuando mode=simulation, debería mostrar advertencia explícita (\"Esto es una proyección, no es asesoramiento\").")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("Sin auditoría de datos")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("CMF exige registro de consultas sensibles. No hay logging de quién preguntó qué sobre qué productos.")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3000, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("ASNEF / Antecedentes")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 6360, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("El agente no verifica si el usuario tiene antecedentes. Simulaciones podría dar créditos imposibles.")]
                })]
              })
            ]
          })
        ]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("4.3 Recomendaciones CMF")]
      }),

      new Paragraph({
        spacing: { line: 360 },
        children: [new TextRun("1. IMPLEMENTAR GUARDRAILS POR MODO:\n   • decision_support → Mostrar disclaimer claro (\"No es asesoramiento profesional\")\n   • simulation → \"Proyección orientativa, considere variables no incluidas\"\n   • regulation → Enlace a superintendencia.cl y regulación oficial\n\n2. VALIDAR LÍMITES NORMATIVOS:\n   • Máximo crédito según segmento (no asesorar montos imposibles)\n   • Prohibiciones de productos para menores\n   • Tasas máximas permitidas por CMF\n\n3. DETECCIÓN DE PERFILES VULNERABLES:\n   • Si age > 70 o intake.education_level = bajo: destacar riesgos\n   • Sugerir asesor certificado\n\n4. LOGGING AUDITADO:\n   • Registrar: user_id, timestamp, intent, products_discussed, compliance_status\n   • Retener 3 años (requisito CMF)\n\n5. CERTIFICACIÓN DIGITAL:\n   • Obtener Certificado de Ejecutivo Financiero o Asesor (si aplica)\n   • Mostrar credencial en UI")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("Calificación Aptitud Finanzas Chile: 7.6/10")]
      }),

      new Paragraph({
        spacing: { line: 360 },
        children: [new TextRun("✅ Localización buena (productos, instituciones, lenguaje).\n✅ Intake relevante para contexto chileno.\n✅ Comienzo de framework CMF.\n❌ Compliance incompleto (no valida límites).\n❌ Sin detección de perfiles vulnerables.\n❌ Sin logging auditado.\n➡️ Para PASAR regulación CMF, agregar validaciones +3-4 semanas.")]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // CONCLUSIÓN
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun("5. CONCLUSIÓN Y VEREDICTO")]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("¿Es apto para pruebas mobile en producción?")]
      }),

      new Paragraph({
        spacing: { before: 120, after: 240, line: 360, color: "C00000" },
        children: [new TextRun({
          text: "🔴 NO. Actualmente no es apto sin correcciones.\n\nLa razón principal: responsive design completamente roto en <600px (donde se hace >80% de uso mobile).",
          bold: true,
          size: 28
        })]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun("Fases Recomendadas")]
      }),

      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [1800, 3780, 3780],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1800, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Fase", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 3780, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Tareas", bold: true, color: "FFFFFF" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 3780, type: WidthType.DXA },
                shading: { fill: "2E75B6", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "Duración", bold: true, color: "FFFFFF" })]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1800, type: WidthType.DXA },
                shading: { fill: "FFE699", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "FASE 1\nCRÍTICA", bold: true })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 3780, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("• Rediseñar CSS para <600px\n• Remover padding-right\n• Panel → drawer/modal\n• Testing en iPhone/Android")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 3780, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("2-3 días")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1800, type: WidthType.DXA },
                shading: { fill: "FFE699", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "FASE 2\nALTA", bold: true })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 3780, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("• Optimizar latencias core agent\n• Implementar caching\n• Ejecutar tools en paralelo\n• Monitorear con loggings")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 3780, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("3-4 días")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1800, type: WidthType.DXA },
                shading: { fill: "FFE699", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "FASE 3\nALTA", bold: true })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 3780, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("• Expandir compliance CMF\n• Guardrails por modo\n• Logging auditado\n• Testing de cumplimiento")]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 3780, type: WidthType.DXA },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  spacing: { line: 300 },
                  children: [new TextRun("3-4 días")]
                })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 1800, type: WidthType.DXA },
                shading: { fill: "E2EFDA", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "TOTAL", bold: true, color: "375623" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 3780, type: WidthType.DXA },
                shading: { fill: "E2EFDA", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "9 trabajo-días", bold: true, color: "375623" })]
                })]
              }),
              new TableCell({
                borders,
                width: { size: 3780, type: WidthType.DXA },
                shading: { fill: "E2EFDA", type: ShadingType.CLEAR },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({
                  children: [new TextRun({ text: "~2 semanas", bold: true, color: "375623" })]
                })]
              })
            ]
          })
        ]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("Después de Fase 1")]
      }),

      new Paragraph({
        spacing: { line: 360 },
        children: [new TextRun({
          text: "✅ APTO para pruebas mobile básicas (chat funcional, sin crashes)\n\nDespués de Fase 2:\n✅ APTO para pruebas mobile avanzadas (latencias aceptables, buena UX)\n\nDespués de Fase 3:\n✅ APTO para pilotos con usuarios reales (compliance + security auditado)",
          color: "375623"
        })]
      }),

      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun("Recomendación Final")]
      }),

      new Paragraph({
        spacing: { before: 120, after: 120, line: 360 },
        children: [new TextRun({
          text: "Este es un EXCELENTE prototipo académico con muy buen potencial comercial. La arquitectura del backend es sólida, el core agent es inteligente y está bien localizado.",
          bold: true
        })]
      }),

      new Paragraph({
        spacing: { line: 360 },
        children: [new TextRun("Sin embargo, para pasar de \"tesis\" a \"producción mobile\", necesita resolver 3 problemas críticos:\n\n1️⃣ CSS responsive (2-3 días)\n2️⃣ Latencias del agente (3-4 días)\n3️⃣ Compliance CMF (3-4 días)\n\nUna vez completes estas tareas, habrás pasado de 7.5/10 a 8.8+/10 y estarás listo para testing real.\n\nMi diagnóstico: PROTOTIPO SÓLIDO → Con iteraciones enfocadas en 2 semanas → PRODUCTO PILOTO VIABLE.")]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/sessions/great-confident-davinci/mnt/financial-agent/ANALISIS_AGENTE.docx", buffer);
  console.log("✅ Reporte generado: ANALISIS_AGENTE.docx");
});
