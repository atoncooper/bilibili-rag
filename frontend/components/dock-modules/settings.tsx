"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useDockContext } from "@/lib/dock-context";
import { settingsApi, type CredentialsStatus } from "@/lib/api";
import type { DockPanelProps } from "@/lib/dock-registry";

/* ──── Inline SVG Icons ──── */

function LLMIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".08"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".08"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".08"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".08"/>
      <line x1="10" y1="6.5" x2="14" y2="6.5" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="10" y1="17.5" x2="14" y2="17.5" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="6.5" y1="10" x2="6.5" y2="14" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="17.5" y1="10" x2="17.5" y2="14" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" stroke="currentColor" strokeWidth=".5" fillOpacity=".6"/>
      <circle cx="17.5" cy="17.5" r="1.8" fill="currentColor" stroke="currentColor" strokeWidth=".5" fillOpacity=".9"/>
    </svg>
  );
}

function EmbeddingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="2" width="14" height="16" rx="1.8" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".06"/>
      <rect x="3" y="5" width="14" height="16" rx="1.8" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity=".03" strokeOpacity=".3"/>
      <circle cx="9" cy="7" r=".8" fill="currentColor" fillOpacity=".5"/>
      <circle cx="12" cy="7" r=".8" fill="currentColor" fillOpacity=".3"/>
      <circle cx="15" cy="7" r=".8" fill="currentColor" fillOpacity=".7"/>
      <circle cx="9" cy="10" r=".8" fill="currentColor" fillOpacity=".7"/>
      <circle cx="12" cy="10" r=".8" fill="currentColor" fillOpacity=".5"/>
      <circle cx="15" cy="10" r=".8" fill="currentColor" fillOpacity=".3"/>
      <circle cx="9" cy="13" r=".8" fill="currentColor" fillOpacity=".3"/>
      <circle cx="12" cy="13" r=".8" fill="currentColor" fillOpacity=".7"/>
      <circle cx="15" cy="13" r=".8" fill="currentColor" fillOpacity=".5"/>
      <line x1="9" y1="10" x2="12" y2="7" stroke="currentColor" strokeWidth=".4" strokeOpacity=".3"/>
      <line x1="12" y1="10" x2="15" y2="7" stroke="currentColor" strokeWidth=".4" strokeOpacity=".3"/>
      <line x1="15" y1="10" x2="12" y2="13" stroke="currentColor" strokeWidth=".4" strokeOpacity=".3"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity=".06"/>
      <path d="M12 8v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="16.5" r=".8" fill="currentColor"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" fill="none"/>
      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2L2 22h20L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity=".08"/>
      <path d="M12 10v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="17.5" r=".8" fill="currentColor"/>
    </svg>
  );
}


/* ──── Main Component ──── */

export default function SettingsPanel({ isOpen }: DockPanelProps) {
  const ctx = useDockContext();
  const sessionId = ctx.sessionId;

  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmBaseUrl, setLlmBaseUrl] = useState("");
  const [llmModel, setLlmModel] = useState("");
  const [showLlmKey, setShowLlmKey] = useState(false);

  const [embApiKey, setEmbApiKey] = useState("");
  const [embBaseUrl, setEmbBaseUrl] = useState("");
  const [embModel, setEmbModel] = useState("");
  const [showEmbKey, setShowEmbKey] = useState(false);

  const [status, setStatus] = useState<CredentialsStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (isOpen && sessionId) {
      loadStatus();
    }
  }, [isOpen, sessionId]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadStatus = async () => {
    if (!sessionId) return;
    try {
      const data = await settingsApi.getCredentialsStatus(sessionId);
      setStatus(data);
      setLlmBaseUrl(data.llm_base_url || "");
      setLlmModel(data.llm_model || "");
      setEmbBaseUrl(data.embedding_base_url || "");
      setEmbModel(data.embedding_model || "");
    } catch { /* silent */ }
  };

  const handleSave = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      await settingsApi.setCredentials(sessionId, {
        ...(llmApiKey && { llm_api_key: llmApiKey }),
        ...(llmBaseUrl && { llm_base_url: llmBaseUrl }),
        ...(llmModel && { llm_model: llmModel }),
        ...(embApiKey && { embedding_api_key: embApiKey }),
        ...(embBaseUrl && { embedding_base_url: embBaseUrl }),
        ...(embModel && { embedding_model: embModel }),
      });
      setLlmApiKey("");
      setEmbApiKey("");
      showToast("Credentials saved", "success");
      await loadStatus();
    } catch (e) {
      showToast("Failed to save: " + (e instanceof Error ? e.message : "unknown"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionId) return;
    if (!confirm("Revert to system default keys? This may incur charges.")) return;
    setDeleting(true);
    try {
      await settingsApi.deleteCredentials(sessionId);
      setLlmApiKey("");
      setEmbApiKey("");
      showToast("Reverted to system defaults", "success");
      await loadStatus();
    } catch (e) {
      showToast("Failed to delete: " + (e instanceof Error ? e.message : "unknown"), "error");
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sk-panel">
      {/* Toast */}
      {toast && (
        <div className={`sk-toast ${toast.type}`}>
          <span className="sk-toast-icon">{toast.type === "success" ? <CheckIcon /> : <AlertIcon />}</span>
          {toast.message}
        </div>
      )}

      <div className="sk-head">
        <h2>API Credentials</h2>
        <p>Bring your own keys for LLM chat and embedding services.</p>
      </div>

      {/* ── LLM Section ── */}
      <div className="sk-card">
        <div className="sk-card-head">
          <span className="sk-card-icon"><LLMIcon /></span>
          <h3>LLM</h3>
          {status && (
            <span className={`sk-chip ${status.llm_is_configured ? "on" : "off"}`}>
              {status.llm_is_configured ? (
                <><CheckIcon /> {status.llm_masked_key}</>
              ) : (
                <><AlertIcon /> unconfigured &mdash; billing applies</>
              )}
            </span>
          )}
        </div>

        <div className="sk-field">
          <label>
            API Key
            {status?.llm_is_configured && !llmApiKey && (
              <span className="sk-label-tag">already set</span>
            )}
          </label>
          <div className="sk-input-wrap">
            <input
              type={showLlmKey ? "text" : "password"}
              value={llmApiKey}
              onChange={e => setLlmApiKey(e.target.value)}
              placeholder={status?.llm_is_configured && !llmApiKey ? "••••••••" : "sk-…"}
              className="sk-input"
            />
            <button type="button" className="sk-eye" onClick={() => setShowLlmKey(!showLlmKey)}>
              {showLlmKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="sk-field">
          <label>Base URL</label>
          <input
            type="text"
            value={llmBaseUrl}
            onChange={e => setLlmBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="sk-input"
          />
        </div>

        <div className="sk-field">
          <label>Model</label>
          <input
            type="text"
            value={llmModel}
            onChange={e => setLlmModel(e.target.value)}
            placeholder="gpt-4o"
            className="sk-input"
          />
        </div>
      </div>

      {/* ── Embedding Section ── */}
      <div className="sk-card">
        <div className="sk-card-head">
          <span className="sk-card-icon"><EmbeddingIcon /></span>
          <h3>Embedding</h3>
          {status && (
            <span className={`sk-chip ${status.embedding_is_configured ? "on" : "off"}`}>
              {status.embedding_is_configured ? (
                <><CheckIcon /> {status.embedding_masked_key}</>
              ) : (
                <><AlertIcon /> unconfigured &mdash; billing applies</>
              )}
            </span>
          )}
        </div>

        <div className="sk-field">
          <label>
            API Key
            {status?.embedding_is_configured && !embApiKey && (
              <span className="sk-label-tag">already set</span>
            )}
          </label>
          <div className="sk-input-wrap">
            <input
              type={showEmbKey ? "text" : "password"}
              value={embApiKey}
              onChange={e => setEmbApiKey(e.target.value)}
              placeholder={status?.embedding_is_configured && !embApiKey ? "••••••••" : "sk-…"}
              className="sk-input"
            />
            <button type="button" className="sk-eye" onClick={() => setShowEmbKey(!showEmbKey)}>
              {showEmbKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="sk-field">
          <label>Base URL</label>
          <input
            type="text"
            value={embBaseUrl}
            onChange={e => setEmbBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="sk-input"
          />
        </div>

        <div className="sk-field">
          <label>Model</label>
          <input
            type="text"
            value={embModel}
            onChange={e => setEmbModel(e.target.value)}
            placeholder="text-embedding-3-small"
            className="sk-input"
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="sk-actions">
        <button className="sk-btn sk-btn-primary" onClick={handleSave} disabled={saving || !sessionId}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="sk-btn sk-btn-ghost" onClick={handleDelete} disabled={deleting || !sessionId}>
          {deleting ? "Removing…" : "Revert to defaults"}
        </button>
      </div>

      {/* ── Notice ── */}
      <div className="sk-note">
        <span className="sk-note-icon"><InfoIcon /></span>
        <div>
          <p>Without your own keys the system falls back to shared defaults — <strong>charges apply</strong>.</p>
          <p>Changing the embedding model requires rebuilding the knowledge base.</p>
        </div>
      </div>

      <style jsx>{`
        .sk-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 20px 22px;
          overflow-y: auto;
          background: var(--panel-bg, #fff);
          color: var(--fg, #18181b);
          font-family: system-ui, -apple-system, sans-serif;
        }

        /* ── Toast ── */
        .sk-toast {
          position: absolute;
          top: 12px;
          right: 14px;
          padding: 7px 14px;
          border-radius: 7px;
          font-size: 12.5px;
          font-weight: 500;
          z-index: 100;
          display: flex;
          align-items: center;
          gap: 7px;
          animation: skSlideIn .25s ease;
          backdrop-filter: blur(8px);
        }
        .sk-toast.success {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }
        .sk-toast.error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .sk-toast-icon { display: flex; }
        @keyframes skSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        /* ── Header ── */
        .sk-head h2 {
          font-size: 17px;
          font-weight: 620;
          margin: 0 0 2px;
          letter-spacing: -0.01em;
        }
        .sk-head p {
          font-size: 12.5px;
          color: var(--fg-muted, #71717a);
          margin: 0;
        }

        /* ── Card ── */
        .sk-card {
          border: 1px solid var(--border, #e4e4e7);
          border-radius: 10px;
          padding: 15px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--card-bg, #fafafa);
          transition: border-color .15s;
        }
        .sk-card:focus-within {
          border-color: var(--accent, #52525b);
        }

        .sk-card-head {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sk-card-head h3 {
          font-size: 13.5px;
          font-weight: 600;
          margin: 0;
          letter-spacing: -0.01em;
        }
        .sk-card-icon {
          display: flex;
          color: var(--fg-muted, #71717a);
        }

        /* ── Chip ── */
        .sk-chip {
          font-size: 11px;
          padding: 2px 10px;
          border-radius: 999px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        .sk-chip.on {
          background: #f0fdf4;
          color: #166534;
        }
        .sk-chip.off {
          background: #fffbeb;
          color: #92400e;
        }

        /* ── Field ── */
        .sk-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sk-field label {
          font-size: 11px;
          font-weight: 550;
          color: var(--fg-muted, #71717a);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sk-label-tag {
          font-size: 10px;
          font-weight: 500;
          text-transform: none;
          letter-spacing: 0;
          color: #166534;
          background: #f0fdf4;
          padding: 1px 6px;
          border-radius: 3px;
        }

        .sk-input {
          width: 100%;
          padding: 7px 10px;
          border: 1px solid var(--border, #d4d4d8);
          border-radius: 6px;
          font-size: 13px;
          background: var(--input-bg, #fff);
          color: var(--fg, #18181b);
          outline: none;
          transition: border-color .15s, box-shadow .15s;
          font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
        }
        .sk-input::placeholder {
          font-family: system-ui, -apple-system, sans-serif;
          color: #a1a1aa;
        }
        .sk-input:focus {
          border-color: var(--accent, #52525b);
          box-shadow: 0 0 0 2.5px rgba(82, 82, 91, 0.1);
        }

        .sk-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .sk-input-wrap .sk-input {
          padding-right: 36px;
        }
        .sk-eye {
          position: absolute;
          right: 4px;
          background: none;
          border: none;
          padding: 5px;
          cursor: pointer;
          color: var(--fg-muted, #a1a1aa);
          display: flex;
          border-radius: 4px;
          transition: color .12s, background .12s;
        }
        .sk-eye:hover {
          color: var(--fg, #18181b);
          background: var(--hover, #f4f4f5);
        }

        /* ── Actions ── */
        .sk-actions {
          display: flex;
          gap: 10px;
        }
        .sk-btn {
          flex: 1;
          padding: 9px 0;
          border: none;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 550;
          cursor: pointer;
          transition: opacity .15s, background .15s, transform .1s;
          letter-spacing: -0.01em;
        }
        .sk-btn:active:not(:disabled) { transform: scale(0.98); }
        .sk-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .sk-btn-primary {
          background: var(--fg, #18181b);
          color: #fff;
        }
        .sk-btn-primary:hover:not(:disabled) { background: var(--fg, #27272a); }
        .sk-btn-ghost {
          background: transparent;
          color: #dc2626;
          border: 1px solid var(--border, #e4e4e7);
        }
        .sk-btn-ghost:hover:not(:disabled) {
          background: #fef2f2;
        }

        /* ── Note ── */
        .sk-note {
          font-size: 11.5px;
          color: var(--fg-muted, #71717a);
          padding: 11px 13px;
          background: var(--bg-muted, #f4f4f5);
          border-radius: 8px;
          line-height: 1.65;
          display: flex;
          gap: 8px;
        }
        .sk-note-icon {
          flex-shrink: 0;
          margin-top: 1px;
          color: var(--fg-muted, #a1a1aa);
        }
        .sk-note p {
          margin: 0 0 3px;
        }
        .sk-note p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}
