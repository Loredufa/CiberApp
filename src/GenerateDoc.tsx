// src/GenerateDoc.tsx
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";

type Analisis = {
  resumen?: {
    promedio_actual?: number;
    promedio_objetivo?: number;
    brecha?: number;
  };
  justificacion?: {
    fortalezas?: string[];
    debilidades?: string[];
    implicancias?: string[];
  };
  plan?: {
    corto_plazo?: string[];
    mediano_plazo?: string[];
    largo_plazo?: string[];
  };
};

const fmt = (n: unknown) =>
  typeof n === "number" ? n.toFixed(2) : (n as string) ?? "-";

const bullets = (items?: string[], level = 0) =>
  (items ?? []).map(
    (t) =>
      new Paragraph({
        bullet: { level },
        children: [new TextRun(String(t))],
      })
  );

export async function descargarDocx(
  analisis: Analisis,
  filename = "EstadoMadurez-NISTCSF.docx"
) {
  const resumen = analisis?.resumen ?? {};
  const jus = analisis?.justificacion ?? {};
  const plan = analisis?.plan ?? {};

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Título
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text:
                  "Estado de Madurez en Ciberseguridad – Basado en NIST CSF 2.0",
                bold: true,
                size: 32,
              }),
            ],
          }),

          // Resumen
          new Paragraph({
            text: "📊 Resumen del Puntaje de Madurez",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun(
                `Puntaje promedio actual: ${fmt(resumen.promedio_actual)}`
              ),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun(
                `Puntaje objetivo: ${fmt(resumen.promedio_objetivo)}`
              ),
            ],
          }),
          new Paragraph({
            children: [new TextRun(`Brecha de madurez: ${fmt(resumen.brecha)}`)],
          }),

          // Justificación
          new Paragraph({
            text: "📌 Justificación del Resultado",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: "Fortalezas",
            heading: HeadingLevel.HEADING_2,
          }),
          ...bullets(jus.fortalezas, 0),

          new Paragraph({
            text: "Debilidades",
            heading: HeadingLevel.HEADING_2,
          }),
          ...bullets(jus.debilidades, 0),

          new Paragraph({
            text: "Implicancias",
            heading: HeadingLevel.HEADING_2,
          }),
          ...bullets(jus.implicancias, 0),

          // Plan
          new Paragraph({
            text: "🚀 Plan para Avanzar en la Madurez",
            heading: HeadingLevel.HEADING_1,
          }),

          new Paragraph({
            text: "Corto Plazo (0 – 6 meses)",
            heading: HeadingLevel.HEADING_2,
          }),
          ...bullets(plan.corto_plazo, 0),

          new Paragraph({
            text: "Mediano Plazo (6 – 18 meses)",
            heading: HeadingLevel.HEADING_2,
          }),
          ...bullets(plan.mediano_plazo, 0),

          new Paragraph({
            text: "Largo Plazo (18 – 36 meses)",
            heading: HeadingLevel.HEADING_2,
          }),
          ...bullets(plan.largo_plazo, 0),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
