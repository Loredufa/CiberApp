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

          new Paragraph({
            text: "📌 Justificación del Resultado",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({ text: "Fortalezas", heading: HeadingLevel.HEADING_2 }),
          ...bullets(jus.fortalezas, 0),
          new Paragraph({ text: "Debilidades", heading: HeadingLevel.HEADING_2 }),
          ...bullets(jus.debilidades, 0),
          new Paragraph({
            text: "Implicancias",
            heading: HeadingLevel.HEADING_2,
          }),
          ...bullets(jus.implicancias, 0),

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

/** --- Conversor simple desde Markdown a DOCX --- **/

function parseBoldRuns(line: string): TextRun[] {
  // convierte **negrita** a TextRuns con bold
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? new TextRun({ text: part.slice(2, -2), bold: true })
        : new TextRun({ text: part })
    );
}

export async function descargarDocxDesdeMarkdown(
  md: string,
  filename = "EstadoMadurez-NISTCSF.docx"
) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const children: Paragraph[] = [];
  let firstHeadingProcessed = false;

  for (const raw of lines) {
    const line = raw.trimRight();

    if (line.trim() === "") {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // Headings #..######
    const m = line.match(/^(#{1,6})\s+(.*)$/);
    if (m) {
      const level = m[1].length;
      const text = m[2];

      if (!firstHeadingProcessed && level === 2) {
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text, bold: true, size: 32 })],
          })
        );
        firstHeadingProcessed = true;
      } else {
        const hl =
          level === 1
            ? HeadingLevel.HEADING_1
            : level === 2
            ? HeadingLevel.HEADING_2
            : level === 3
            ? HeadingLevel.HEADING_3
            : level === 4
            ? HeadingLevel.HEADING_4
            : level === 5
            ? HeadingLevel.HEADING_5
            : HeadingLevel.HEADING_6;
        children.push(new Paragraph({ text, heading: hl }));
      }
      continue;
    }

    // Bullets: -, *, •
    const mb = line.match(/^\s*[-*•]\s+(.*)$/);
    if (mb) {
      children.push(
        new Paragraph({ bullet: { level: 0 }, children: parseBoldRuns(mb[1]) })
      );
      continue;
    }

    // Párrafo normal
    children.push(new Paragraph({ children: parseBoldRuns(line) }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
