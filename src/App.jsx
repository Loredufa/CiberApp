import { useRef, useState } from "react";
import "./App.css";
import { descargarDocx, descargarDocxDesdeMarkdown } from "./GenerateDoc.tsx";
import PentestUpload from "./PentestUpload.jsx";



const NIST_FILE_FIELD = "data";
const NIST_WEBHOOK_URL = "/webhook/nist-csf";

function extractFilenameFromDisposition(disposition) {
  if (!disposition) return null;
  const m =
    disposition.match(/filename\*=UTF-8''([^;]+)$/i) ||
    disposition.match(/filename="?([^";]+)"?/i);
  try { return m ? decodeURIComponent(m[1]) : null; } catch { return m ? m[1] : null; }
}

// Iconos SVG (ciberseguridad)
const IconShield = (props) => (
  <svg width="72" height="72" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconRadar = (props) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" {...props}>
    <path d="M12 21a9 9 0 1 0-9-9" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 3v3m0 12v3m9-9h-3M6 12H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 12l6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export default function App() {
  // ====== Estado NIST ======
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  function onPickFile(e) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setError(""); setStatus(""); }
  }
  function onDrop(e) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setError(""); setStatus(""); }
  }
  function onDragOver(e) { e.preventDefault(); setDragOver(true); }
  function onDragLeave() { setDragOver(false); }

  async function handleSubmit(e) {
    e.preventDefault(); setError(""); setStatus("");
    if (!NIST_WEBHOOK_URL) { setError("Configura VITE_N8N_WEBHOOK_URL_NIST o usa el proxy /api/nist"); return; }
    if (!file) { setError("Selecciona un archivo (.xlsx/.xls/.xlsm/.csv)"); return; }

    try {
      setSubmitting(true); setStatus("Subiendo archivo y generando informe…");
      const form = new FormData(); form.append(NIST_FILE_FIELD, file, file.name);
      const res = await fetch(NIST_WEBHOOK_URL, { method: "POST", body: form });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Servidor respondió ${res.status}. ${text || "Revisa el flujo NIST en n8n"}`);
      }

      const ct = (res.headers.get("content-type") || "").toLowerCase();

      if (
        ct.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
        ct.includes("application/octet-stream")
      ) {
        const blob = await res.blob();
        const suggested =
          extractFilenameFromDisposition(res.headers.get("content-disposition")) ||
          "EstadoMadurez-NISTCSF.docx";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = suggested; a.click(); URL.revokeObjectURL(url);
        setStatus("Informe NIST descargado ✅"); return;
      }

      if (ct.includes("application/json")) {
        const json = await res.json();
        await descargarDocx(json, "EstadoMadurez-NISTCSF.docx");
        setStatus("Informe NIST descargado ✅"); return;
      }

      if (ct.includes("text/plain") || ct.includes("text/markdown")) {
        const md = await res.text();
        await descargarDocxDesdeMarkdown(md, "EstadoMadurez-NISTCSF.docx");
        setStatus("Informe NIST descargado ✅"); return;
      }

      const txt = await res.text();
      setStatus(`Respuesta de texto recibida: ${txt.slice(0, 160)}…`);
    } catch (err) {
      console.error(err); setError(err.message || "Ocurrió un error");
    } finally { setSubmitting(false); }
  }

  return (
    <div className="app-root">
      <div className="app-container">
        <header className="brand-header">
          <div className="brand-icons">
            <IconShield />
            <h1 className="brand-title">CiberApp — Herramientas de Ciberseguridad</h1>
            <IconRadar />
          </div>
          <div className="brand-subtitle">NIST (izquierda) y Pentest (derecha) en un solo panel.</div>
        </header>

        <div className="main-grid">
          {/* ===== Panel NIST ===== */}
          <section className="panel">
            <h2>Estado de Madurez – NIST CSF 2.0</h2>
            <p className="desc">
              Sube un Excel con los puntajes; el sistema generará un <strong>.docx</strong> con
              el resumen, justificación y plan (corto, mediano y largo plazo).
            </p>

            <form onSubmit={handleSubmit}>
              <div
                className={`dropzone${dragOver ? " over" : ""}`}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => inputRef.current?.click()}
              >
                <div className="title">Arrastra y suelta tu archivo aquí</div>
                <div className="hint">o haz clic para seleccionar</div>
                <div className="accept">Acepta: .xlsx, .xls, .xlsm, .csv</div>
                {file && (
                  <div style={{ marginTop: 12, fontSize: 14 }}>
                    📁 <strong>{file.name}</strong>{" "}
                    <span style={{ opacity: 0.6 }}>({(file.size / 1024).toFixed(1)} KB)</span>
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

              <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="btn" disabled={submitting || !file}>
                  {submitting ? "Generando…" : "Generar informe (.docx)"}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => { setFile(null); setError(""); setStatus(""); if (inputRef.current) inputRef.current.value = ""; }}
                  disabled={submitting && !file}
                >
                  Limpiar
                </button>
                <span className="badge">
                  Webhook NIST:{" "}
                  <code style={{ opacity: 0.8, marginLeft: 6 }}>
                    {NIST_WEBHOOK_URL || "— no configurado —"}
                  </code>
                </span>
              </div>
            </form>

            {status && <div className="alert info">{status}</div>}
            {error && <div className="alert err">{error}</div>}
          </section>

          {/* ===== Panel Pentest ===== */}
          <section>
            <PentestUpload />
          </section>
        </div>
      </div>
    </div>
  );
}
