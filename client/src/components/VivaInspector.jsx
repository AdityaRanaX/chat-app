import React, { useState, useEffect } from "react";
import axios from "axios";

export default function VivaInspector({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("redis");
  const [cacheStats, setCacheStats] = useState(null);
  const [cacheLoading, setCacheLoading] = useState(false);

  // Agent State
  const [agentPrompt, setAgentPrompt] = useState("List all active users in the directory");
  const [agentResult, setAgentResult] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentTools, setAgentTools] = useState([]);

  // Eval State
  const [evalResult, setEvalResult] = useState(null);
  const [evalLoading, setEvalLoading] = useState(false);

  // Events State
  const [eventLogs, setEventLogs] = useState([]);

  // API Base URL
  const API_URL = "http://localhost:5000";

  // Fetch Cache Stats
  const fetchCacheStats = async () => {
    setCacheLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/cache/stats`);
      setCacheStats(res.data);
    } catch (err) {
      console.error("Cache fetch error", err);
    } finally {
      setCacheLoading(false);
    }
  };

  // Clear Cache
  const clearCache = async () => {
    try {
      await axios.post(`${API_URL}/api/cache/clear`);
      fetchCacheStats();
    } catch (err) {
      console.error("Clear cache error", err);
    }
  };

  // Run Agent Query
  const runAgent = async (e) => {
    if (e) e.preventDefault();
    setAgentLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/agent/query`, { prompt: agentPrompt });
      setAgentResult(res.data);
    } catch (err) {
      console.error("Agent error", err);
    } finally {
      setAgentLoading(false);
    }
  };

  // Fetch Agent Tools
  const fetchAgentTools = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/agent/tools`);
      setAgentTools(res.data.tools || []);
    } catch (err) {}
  };

  // Run LLM Evaluation
  const runEval = async () => {
    setEvalLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/eval/run`);
      setEvalResult(res.data);
    } catch (err) {
      console.error("Eval error", err);
    } finally {
      setEvalLoading(false);
    }
  };

  // Setup SSE Event Stream
  useEffect(() => {
    if (!isOpen) return;
    fetchCacheStats();
    fetchAgentTools();

    const eventSource = new EventSource(`${API_URL}/api/events/stream`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "INIT_HISTORY") {
          setEventLogs(data.history || []);
        } else {
          setEventLogs((prev) => [data, ...prev.slice(0, 49)]);
        }
      } catch (err) {}
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(8px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div style={{
        background: "#0f172a",
        color: "#f8fafc",
        width: "100%",
        maxWidth: "960px",
        height: "85vh",
        borderRadius: "16px",
        border: "1px solid #334155",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        overflow: "hidden"
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#1e293b"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🎓</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700" }}>Viva AI & System Architecture Inspector</h2>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>Live demonstration dashboard for SSR, Redis, Multi-Step Agent, LLM Eval & Events</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#334155",
              color: "#f8fafc",
              border: "none",
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #1e293b",
          background: "#0f172a",
          padding: "0 1rem"
        }}>
          {[
            { id: "redis", label: "⚡ Redis Cache", icon: "⚡" },
            { id: "agent", label: "🤖 Multi-Step Agent & Tools", icon: "🤖" },
            { id: "eval", label: "📊 LLM Eval", icon: "📊" },
            { id: "events", label: "📡 Event Bus", icon: "📡" },
            { id: "ssr", label: "🌐 SSR Dashboard", icon: "🌐" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "1rem 1.25rem",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #6366f1" : "2px solid transparent",
                color: activeTab === tab.id ? "#818cf8" : "#94a3b8",
                fontWeight: activeTab === tab.id ? "700" : "500",
                cursor: "pointer",
                fontSize: "0.9rem",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", background: "#0f172a" }}>

          {/* TAB 1: REDIS CACHE */}
          {activeTab === "redis" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem 0" }}>Redis & Memory Cache Inspector</h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>Shows live cache mode, hits/misses, and cached query keys.</p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={fetchCacheStats} style={{ background: "#334155", color: "white", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer" }}>↻ Refresh Stats</button>
                  <button onClick={clearCache} style={{ background: "#ef4444", color: "white", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer" }}>🗑 Clear Cache</button>
                </div>
              </div>

              {cacheStats && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div style={{ background: "#1e293b", padding: "1.25rem", borderRadius: "12px", border: "1px solid #334155" }}>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Cache Mode</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#10b981", marginTop: "4px" }}>{cacheStats.mode}</div>
                  </div>
                  <div style={{ background: "#1e293b", padding: "1.25rem", borderRadius: "12px", border: "1px solid #334155" }}>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Cache Hits</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#6366f1", marginTop: "4px" }}>{cacheStats.hits}</div>
                  </div>
                  <div style={{ background: "#1e293b", padding: "1.25rem", borderRadius: "12px", border: "1px solid #334155" }}>
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Cache Misses</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#f59e0b", marginTop: "4px" }}>{cacheStats.misses}</div>
                  </div>
                </div>
              )}

              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "1.25rem", border: "1px solid #334155" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", color: "#cbd5e1" }}>Currently Cached Keys ({cacheStats?.cachedKeysCount || 0})</h4>
                {cacheStats?.cachedKeys && cacheStats.cachedKeys.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "#38bdf8" }}>
                    {cacheStats.cachedKeys.map((key, i) => (
                      <li key={i} style={{ marginBottom: "4px", fontFamily: "monospace" }}>{key}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: "#94a3b8", margin: 0 }}>No keys cached currently. Navigate around the chat app to populate user directory & message cache!</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MULTI-STEP AGENT & TOOLS */}
          {activeTab === "agent" && (
            <div>
              <form onSubmit={runAgent} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <input
                  type="text"
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  placeholder="Enter prompt (e.g. List user directory, Show chat statistics, Calculate cache metrics)"
                  style={{
                    flex: 1,
                    background: "#1e293b",
                    border: "1px solid #334155",
                    color: "white",
                    padding: "10px 14px",
                    borderRadius: "8px"
                  }}
                />
                <button
                  type="submit"
                  disabled={agentLoading}
                  style={{
                    background: "#6366f1",
                    color: "white",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  {agentLoading ? "Executing ReAct Loop..." : "Run Agent Task"}
                </button>
              </form>

              {/* Agent Execution Trace */}
              {agentResult && (
                <div style={{ background: "#1e293b", borderRadius: "12px", padding: "1.25rem", border: "1px solid #334155", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0, color: "#10b981" }}>✅ ReAct Execution Trace (Total Duration: {agentResult.durationMs}ms)</h4>
                    <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Steps: {agentResult.totalSteps}</span>
                  </div>

                  {agentResult.steps.map((s, idx) => (
                    <div key={idx} style={{ background: "#0f172a", borderLeft: "3px solid #6366f1", padding: "10px 14px", marginBottom: "8px", borderRadius: "4px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#818cf8", fontWeight: "bold" }}>STEP {s.step}: {s.phase}</div>
                      {s.thought && <div style={{ color: "#e2e8f0", fontSize: "0.85rem", marginTop: "2px" }}>Thought: {s.thought}</div>}
                      {s.toolName && <div style={{ color: "#f59e0b", fontSize: "0.85rem", marginTop: "2px" }}>Function Call: <code>{s.toolName}({JSON.stringify(s.arguments)})</code></div>}
                      {s.output && <div style={{ color: "#38bdf8", fontSize: "0.85rem", marginTop: "2px" }}>Observation: {JSON.stringify(s.output)}</div>}
                      {s.finalAnswer && <div style={{ color: "#34d399", fontSize: "0.9rem", fontWeight: "bold", marginTop: "4px" }}>Final Answer: {s.finalAnswer}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Available Tools Schemas */}
              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "1.25rem", border: "1px solid #334155" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", color: "#cbd5e1" }}>Tool Definitions (Function Calling Schema)</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {agentTools.map((t, idx) => (
                    <div key={idx} style={{ background: "#0f172a", padding: "10px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <div style={{ color: "#38bdf8", fontFamily: "monospace", fontWeight: "bold" }}>{t.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" }}>{t.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LLM EVAL */}
          {activeTab === "eval" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem 0" }}>LLM Evaluation & Benchmark Framework</h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>Benchmarks agent tool precision, groundedness, latency, and relevancy.</p>
                </div>
                <button
                  onClick={runEval}
                  disabled={evalLoading}
                  style={{
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  {evalLoading ? "Running Benchmarks..." : "▶ Run LLM Evaluation"}
                </button>
              </div>

              {evalResult ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ background: "#1e293b", padding: "1rem", borderRadius: "12px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Tool Precision</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#10b981" }}>{evalResult.metrics.toolPrecision}</div>
                    </div>
                    <div style={{ background: "#1e293b", padding: "1rem", borderRadius: "12px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Groundedness</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#6366f1" }}>{evalResult.metrics.groundedness}</div>
                    </div>
                    <div style={{ background: "#1e293b", padding: "1rem", borderRadius: "12px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Avg Latency</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#f59e0b" }}>{evalResult.metrics.averageLatencyMs}</div>
                    </div>
                    <div style={{ background: "#1e293b", padding: "1rem", borderRadius: "12px", border: "1px solid #334155" }}>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Relevance Score</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#38bdf8" }}>{evalResult.metrics.relevanceScore}</div>
                    </div>
                  </div>

                  <div style={{ background: "#1e293b", borderRadius: "12px", padding: "1.25rem", border: "1px solid #334155" }}>
                    <h4 style={{ margin: "0 0 0.75rem 0", color: "#cbd5e1" }}>Benchmark Suite Results</h4>
                    {evalResult.details.map((d, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", background: "#0f172a", padding: "10px", borderRadius: "6px", marginBottom: "6px" }}>
                        <div>
                          <div style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>"{d.prompt}"</div>
                          <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "2px" }}>Expected: {d.expectedTool} | Actual: {d.actualTool}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ background: d.passed ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)", color: d.passed ? "#34d399" : "#f87171", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "bold" }}>
                            {d.passed ? "PASSED" : "FAILED"}
                          </span>
                          <div style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "2px" }}>{d.latencyMs}ms</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: "#1e293b", borderRadius: "12px", padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                  Click "Run LLM Evaluation" to benchmark tool selection precision, groundedness, and system latency live.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EVENT BUS */}
          {activeTab === "events" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem 0" }}>Live Event Bus Stream (SSE)</h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>Decoupled event streaming channel logging system events.</p>
                </div>
                <span style={{ background: "rgba(16,185,129,0.2)", color: "#34d399", padding: "4px 10px", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "bold" }}>● SSE Connected</span>
              </div>

              <div style={{ background: "#1e293b", borderRadius: "12px", padding: "1rem", border: "1px solid #334155", maxHeight: "400px", overflowY: "auto" }}>
                {eventLogs.map((log, i) => (
                  <div key={i} style={{ background: "#0f172a", borderLeft: "3px solid #38bdf8", padding: "8px 12px", marginBottom: "6px", borderRadius: "4px", fontSize: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#38bdf8", fontWeight: "bold", fontFamily: "monospace" }}>{log.type}</span>
                      <span style={{ color: "#64748b", fontSize: "0.75rem" }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {log.payload && <pre style={{ margin: "4px 0 0 0", color: "#cbd5e1", fontSize: "0.75rem", background: "none" }}>{JSON.stringify(log.payload)}</pre>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SSR PREVIEW */}
          {activeTab === "ssr" && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <span style={{ fontSize: "3rem" }}>🌐</span>
              <h3 style={{ margin: "1rem 0 0.5rem 0" }}>Server-Side Rendering (SSR) Engine</h3>
              <p style={{ color: "#94a3b8", maxWidth: "600px", margin: "0 auto 1.5rem auto" }}>
                The Express backend renders fully structured HTML pages on the server before transmitting them to the client. This offers instant First Contentful Paint (FCP) and maximum SEO efficiency.
              </p>
              <a
                href={`${API_URL}/ssr/dashboard`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#6366f1",
                  color: "white",
                  textDecoration: "none",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  display: "inline-block"
                }}
              >
                🔗 Open Live SSR Dashboard Page in New Tab
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
