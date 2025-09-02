// src/App.jsx
import { useRef, useState } from "react";
import { descargarDocx } from "./GenerateDoc";

// 1) Configura la URL del webhook de n8n
//    - Ponla en tu .env como VITE_N8N_WEBHOOK_URL="https://tu-n8n/webhook/analisis"
//    - o ajusta el fallback de abajo:
const WEBHOOK_URL =
  import.meta.env.VITE_N8N_WEBHOOK_URL_NIST 

// 2) Nombre del campo de archivo que espera tu Webhook en n8n (ajústalo si es necesario)
const FILE_FIELD_NAME = "file";

export default function App() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function onPickFile(e) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError("");
      setStatus("");
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setError("");
      setStatus("");
    }
  }

  function onDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  function extractFilenameFromDisposition(disposition) {
    if (!disposition) return null;
    const m =
      disposition.match(/filename\*=UTF-8''([^;]+)$/i) ||
      disposition.match(/filename="?([^"]+)"?/i);
    try {
      return m ? decodeURIComponent(m[1]) : null;
    } catch {
      return m ? m[1] : null;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setStatus("");

    if (!file) {
      setError("Primero selecciona un archivo (.xlsx, .xls, .xlsm o .csv)");
      return;
    }

    try {
      setSubmitting(true);
      setStatus("Subiendo archivo y generando informe…");

      const form = new FormData();
      form.append(FILE_FIELD_NAME, file, file.name);

      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        body: form,
      });

      // Si el servidor no responde 2xx, intenta leer mensaje y mostrar
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Servidor respondió ${res.status}. ${text || "Revisa el flujo en n8n"}`
        );
      }

      const ct = (res.headers.get("content-type") || "").toLowerCase();

      // Caso A: n8n devuelve DOCX directo
      if (
        ct.includes(
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) ||
        ct.includes("application/octet-stream")
      ) {
        const blob = await res.blob();
        const suggested =
          extractFilenameFromDisposition(
            res.headers.get("content-disposition")
          ) || "EstadoMadurez-NISTCSF.docx";

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = suggested;
        a.click();
        URL.revokeObjectURL(url);

        setStatus("Informe generado y descargado ✅");
        return;
      }

      // Caso B: n8n devuelve JSON (el análisis) → generamos DOCX en el front
      if (ct.includes("application/json")) {
        const data = await res.json();
        await descargarDocx(data, "EstadoMadurez-NISTCSF.docx");
        setStatus("Informe generado y descargado ✅");
        return;
      }

      // Otros tipos (texto, html, etc.)
      const fallback = await res.text();
      throw new Error(
        `Tipo de respuesta no esperado (${ct}). Contenido: ${fallback.slice(
          0,
          200
        )}…`
      );
    } catch (err) {
      console.error(err);
      setError(err.message || "Ocurrió un error desconocido");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        background: "#0e1016",
        color: "#e6e8f0",
        padding: "24px",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,Ubuntu,Inter,sans-serif",
      }}
    >
      <div
        style={{
          width: "min(880px, 100%)",
          background: "#151924",
          border: "1px solid #273043",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 10px 35px rgba(0,0,0,.4)",
        }}
      >
        <h1 style={{ margin: "0 0 6px", fontSize: 28 }}>
          Estado de Madurez – NIST CSF 2.0
        </h1>
        <p style={{ margin: "0 0 20px", opacity: 0.8 }}>
          Sube un Excel con los puntajes; el sistema generará un{" "}
          <strong>.docx</strong> con el resumen, justificación y plan (corto,
          mediano y largo plazo).
        </p>

        <form onSubmit={handleSubmit}>
          {/* Zona de drag & drop */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#7aa2ff" : "#3a4761"}`,
              background: dragOver ? "#0f1b3a" : "#0f1420",
              borderRadius: 12,
              padding: 28,
              textAlign: "center",
              cursor: "pointer",
              transition: "all .15s ease",
            }}
          >
            <div style={{ fontSize: 18, marginBottom: 4, fontWeight: 600 }}>
              Arrastra y suelta tu archivo aquí
            </div>
            <div style={{ opacity: 0.75, marginBottom: 10 }}>
              o haz clic para seleccionar
            </div>
            <div style={{ fontSize: 13, opacity: 0.6 }}>
              Acepta: .xlsx, .xls, .xlsm, .csv
            </div>
            {file && (
              <div style={{ marginTop: 12, fontSize: 14 }}>
                🗂️ <strong>{file.name}</strong>{" "}
                <span style={{ opacity: 0.6 }}>
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.csv"
              onChange={onPickFile}
              style={{ display: "none" }}
            />
          </div>

          {/* Botones */}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginTop: 18,
              alignItems: "center",
            }}
          >
            <button
              type="submit"
              disabled={submitting || !file}
              style={{
                background: submitting ? "#33405a" : "#4f7cff",
                color: "white",
                border: 0,
                borderRadius: 10,
                padding: "12px 16px",
                fontWeight: 600,
                cursor: submitting || !file ? "not-allowed" : "pointer",
                transition: "background .15s ease",
              }}
            >
              {submitting ? "Generando…" : "Generar informe (.docx)"}
            </button>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setError("");
                setStatus("");
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={submitting && !file}
              style={{
                background: "transparent",
                color: "#c8d1e8",
                border: "1px solid #36415a",
                borderRadius: 10,
                padding: "12px 16px",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Limpiar
            </button>
          </div>
        </form>

        {/* Estados */}
        {status && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#0e1e34",
              border: "1px solid #283754",
              color: "#a6c0ff",
              fontSize: 14,
            }}
          >
            {status}
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              borderRadius: 10,
              background: "#2a1113",
              border: "1px solid #5e272b",
              color: "#ffb4b4",
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 22, fontSize: 12, opacity: 0.55 }}>
          Webhook: <code>{WEBHOOK_URL}</code>
        </div>
      </div>
    </div>
  );
}
