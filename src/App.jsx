// src/App.jsx
import { useRef, useState } from "react";
import { descargarDocx, descargarDocxDesdeMarkdown } from "./GenerateDoc";

// URL del webhook (o usa .env VITE_N8N_WEBHOOK_URL_NIST)
const WEBHOOK_URL =
  import.meta.env.VITE_N8N_WEBHOOK_URL_NIST ||
  "https://TU-DOMINIO-N8N/webhook/nist-csf";

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

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Servidor respondió ${res.status}. ${text || "Revisa el flujo en n8n"}`
        );
      }

      const ct = (res.headers.get("content-type") || "").toLowerCase();

      // A) DOCX directo desde n8n
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

      // B) JSON → generamos DOCX en el front
      if (ct.includes("application/json")) {
        const data = await res.json();
        await descargarDocx(data, "EstadoMadurez-NISTCSF.docx");
        setStatus("Informe generado y descargado ✅");
        return;
      }

      // **C) Markdown/texto → generamos DOCX en el front**
      if (ct.includes("text/plain") || ct.includes("text/markdown")) {
        const md = await res.text();
        await descargarDocxDesdeMarkdown(md, "EstadoMadurez-NISTCSF.docx");
        setStatus("Informe generado y descargado ✅");
        return;
      }

      // Cualquier otro tipo
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
    <div className="min-h-screen flex flex-col bg-[var(--background-color)] text-[var(--text-primary)]">
      <header className="sticky top-0 z-50 bg-[var(--background-color)]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[var(--border-color)] py-4">
            <div className="flex items-center gap-3 text-white">
              <div className="text-[var(--primary-color)]">
                <svg
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.5v-3.5C7.29 14 5 11.71 5 9.5c0-1.65 1.35-3 3-3s3 1.35 3 3v1h2V9.5c0-2.76-2.24-5-5-5s-5 2.24-5 5C3 12.36 5.64 15 9 15.5v2h2v-2zm2-9.5c0-1.65 1.35-3 3-3s3 1.35 3 3-1.35 3-3 3-3-1.35-3-3z" />
                </svg>
              </div>
              <h1 className="text-white text-xl font-bold">CyberGuard</h1>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a
                className="nav-link text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                href="#"
              >
                Dashboard
              </a>
              <a
                className="nav-link text-sm font-medium text-[var(--text-primary)]"
                href="#"
              >
                Tools
              </a>
              <a
                className="nav-link text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                href="#"
              >
                Resources
              </a>
              <a
                className="nav-link text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                href="#"
              >
                Support
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <button className="flex items-center justify-center rounded-full h-10 w-10 text-[var(--text-secondary)] hover:bg-[var(--border-color)] hover:text-[var(--text-primary)] transition-colors duration-300">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full size-10 border-2 border-[var(--primary-color)]"
                style={{
                  backgroundImage:
                    'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAicWHVJoPXXiLcblqG7v7qvvNJZ7yjGddvQP36GnbVeR4UpvHQgvuz4s6G4exzbg37KDd2M1LAWrUZbKSdjiRaR5293SwV8kqOLU0MMy3_dIT_HgjMCWsqQb_X3MN48qgOtoe4wSEGXCeA6L-mLeKj5w-FuFwuF2dwoE_vJye29DLSvpe8Rsr3YUp-d6-quvqyh5zJO9Kof_8DK0b4-o7snDcyiB4kLzrnMjMsbwdKo06joT0b5iXjZ26Fau6-n8fJaWJfWDLLmtc")',
                }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-[var(--text-primary)] mb-4 tracking-tight">
              Cybersecurity Document Generators
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-3xl mx-auto">
              Streamline your security workflows with our automated document generation tools. Upload your files and get professional, compliant documents in seconds.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="glassmorphism-card p-8 rounded-2xl flex flex-col">
              <div className="mb-6 flex items-center gap-4">
                <div className="bg-[var(--primary-color)]/10 p-3 rounded-lg text-[var(--primary-color)]">
                  <span className="material-symbols-outlined text-3xl">shield</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)]">NIST Document Generator</h3>
                  <p className="text-[var(--text-secondary)]">Align with NIST standards effortlessly.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => inputRef.current?.click()}
                  className="flex-grow flex flex-col items-center justify-center file-upload-area rounded-xl p-8 text-center cursor-pointer"
                  style={{
                    borderColor: dragOver ? "var(--accent-color)" : undefined,
                    backgroundColor: dragOver ? "rgba(17,115,212,0.1)" : undefined,
                  }}
                >
                  <span className="material-symbols-outlined text-6xl text-[var(--primary-color)] opacity-70 mb-4">
                    cloud_upload
                  </span>
                  <p className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                    Drag & drop your file here
                  </p>
                  <p className="text-[var(--text-secondary)] mb-6">or click to browse</p>
                  {file && (
                    <p className="text-sm text-[var(--text-primary)] mb-6">
                      <strong>{file.name}</strong>
                    </p>
                  )}
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.xlsm,.csv"
                    onChange={onPickFile}
                    className="hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !file}
                  className="btn-primary mt-6 disabled:opacity-50"
                >
                  {submitting ? "Generando…" : "Upload File"}
                </button>
              </form>

              {status && (
                <div className="mt-4 p-3 rounded-md bg-[var(--background-color)] border border-[var(--border-color)] text-[var(--text-primary)] text-sm">
                  {status}
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-md bg-red-900/20 border border-red-700 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="mt-4 text-[var(--text-secondary)] text-xs">
                Webhook: <code>{WEBHOOK_URL}</code>
              </div>
            </div>

            <div className="glassmorphism-card p-8 rounded-2xl flex flex-col">
              <div className="mb-6 flex items-center gap-4">
                <div className="bg-[var(--primary-color)]/10 p-3 rounded-lg text-[var(--primary-color)]">
                  <span className="material-symbols-outlined text-3xl">bug_report</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)]">Pen Test Report Generator</h3>
                  <p className="text-[var(--text-secondary)]">Automate your penetration testing reports.</p>
                </div>
              </div>

              <div className="flex-grow flex flex-col items-center justify-center file-upload-area rounded-xl p-8 text-center cursor-pointer">
                <span className="material-symbols-outlined text-6xl text-[var(--primary-color)] opacity-70 mb-4">
                  upload_file
                </span>
                <p className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                  Drag & drop your Excel file
                </p>
                <p className="text-[var(--text-secondary)] mb-6">XLS, XLSX, or CSV</p>
                <button className="btn-primary">Upload Excel File</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

