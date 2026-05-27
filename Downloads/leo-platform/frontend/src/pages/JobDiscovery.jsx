import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { C } from "../lib/tokens";
import api from "../lib/api";
import { Spinner, Badge, EmptyState, ProgressBar, Tag } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";

const SOURCES_LABEL = {
  linkedin: "LinkedIn", naukri: "Naukri", wellfound: "Wellfound",
  indeed: "Indeed", internshala: "Internshala", ycombinator: "YC",
};

const REMOTE_OPTIONS = [
  { id: "any", label: "Any" },
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "office", label: "On-site" },
];

const EXP_OPTIONS = [
  { id: "entry", label: "Entry" },
  { id: "mid", label: "Mid" },
  { id: "senior", label: "Senior" },
  { id: "staff", label: "Staff+" },
];

function CompanyLogo({ domain, name, size = 44 }) {
  const initial = (name || "?")[0].toUpperCase();
  const [failed, setFailed] = useState(false);
  if (!domain || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 10,
        background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
        display: "grid", placeItems: "center", color: "#fff",
        fontSize: size * 0.4, fontWeight: 700, flexShrink: 0,
      }}>{initial}</div>
    );
  }
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      width={size} height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: 10, objectFit: "contain", background: "#fff", padding: 4, flexShrink: 0 }}
    />
  );
}

function JobCard({ job, onSave, onUnsave }) {
  const matchColor = job.match_pct >= 85 ? C.teal : job.match_pct >= 70 ? C.accent : C.amber;
  const remoteBadge = { remote: { color: "teal", label: "Remote" }, hybrid: { color: "amber", label: "Hybrid" }, office: { color: "purple", label: "On-site" } }[job.remote_type] || { color: "accent", label: job.remote_type };

  return (
    <div className="leo-card hover" data-testid={`job-${job.job_id}`} style={{ position: "relative", padding: 20 }}>
      {job.is_startup && (
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <Badge color="amber">⚡ STARTUP</Badge>
        </div>
      )}
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <CompanyLogo domain={job.company_domain} name={job.company} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="font-display" style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, lineHeight: 1.3, marginBottom: 2 }}>{job.role}</h3>
          <p style={{ fontSize: 12, color: C.textSecondary }}>{job.company}</p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <Badge color={remoteBadge.color}>{remoteBadge.label}</Badge>
        <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 6, color: C.textSecondary }}>📍 {job.location}</span>
        <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 6, color: C.textSecondary }}>⏱ {job.experience_level}</span>
      </div>

      {job.salary && (
        <div style={{ fontSize: 13, color: C.teal, fontWeight: 700, marginBottom: 10 }}>💰 {job.salary}</div>
      )}

      {job.description && (
        <p style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5, marginBottom: 12, minHeight: 36 }}>{job.description}</p>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Match</span>
          <span className="font-display" style={{ fontSize: 16, fontWeight: 700, color: matchColor }}>{job.match_pct}%</span>
        </div>
        <ProgressBar value={job.match_pct} color={matchColor} />
      </div>

      {job.hiring_probability !== undefined && (
        <div style={{ marginBottom: 12, fontSize: 11, color: C.textMuted }}>
          🎯 Hiring probability: <span style={{ color: C.amber, fontWeight: 600 }}>{job.hiring_probability}%</span>
        </div>
      )}

      {(job.missing_skills || []).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: C.red, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Missing skills</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {job.missing_skills.slice(0, 4).map((s, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 7px", background: C.redSoft, borderRadius: 4, color: C.red, fontWeight: 600 }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, textDecoration: "none" }}>
          <button data-testid={`apply-${job.job_id}`} className="leo-btn leo-btn-primary" style={{ width: "100%", padding: "9px 12px", fontSize: 12 }}>
            Apply on {SOURCES_LABEL[job.source] || job.source} →
          </button>
        </a>
        <button
          data-testid={`save-${job.job_id}`}
          onClick={() => (job.saved ? onUnsave(job) : onSave(job))}
          className="leo-btn"
          title={job.saved ? "Unsave" : "Save"}
          style={{
            padding: "9px 12px", borderRadius: 10, fontSize: 14,
            background: job.saved ? C.amberSoft : "rgba(255,255,255,0.04)",
            color: job.saved ? C.amber : C.textMuted,
            border: `1px solid ${job.saved ? "rgba(245,166,35,0.3)" : C.border}`,
          }}>{job.saved ? "★" : "☆"}</button>
      </div>

      {/* Alt sources */}
      {job.alt_urls && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {Object.entries(job.alt_urls).map(([src, url]) => (
            src !== job.source && (
              <a key={src} href={url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, color: C.textMuted, textDecoration: "none", padding: "2px 6px", background: "rgba(255,255,255,0.02)", borderRadius: 4 }}>
                {SOURCES_LABEL[src] || src} ↗
              </a>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobDiscovery() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState("");
  const [role, setRole] = useState("Senior Software Engineer");
  const [location, setLocation] = useState("Bengaluru");
  const [remoteType, setRemoteType] = useState("any");
  const [experience, setExperience] = useState("mid");
  const [startupFocus, setStartupFocus] = useState(true);

  const [jobs, setJobs] = useState([]);
  const [tab, setTab] = useState("discover"); // discover|saved|all
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [usage, setUsage] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const loadList = useCallback(async (which = tab) => {
    setLoadingList(true);
    const params = new URLSearchParams();
    if (which === "saved") params.set("saved_only", "true");
    if (remoteType !== "any") params.set("remote_type", remoteType);
    const [j, u, s] = await Promise.all([
      api.get(`/jobs?${params.toString()}`),
      api.get("/jobs/usage"),
      api.get("/jobs/stats"),
    ]);
    setJobs(j.data);
    setUsage(u.data);
    setStats(s.data);
    setLoadingList(false);
  }, [tab, remoteType]);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/resumes");
      setResumes(data);
      const a = data.find((r) => r.is_active) || data[0];
      if (a) setResumeId(a.resume_id);
      await loadList("discover");
    })();
    // eslint-disable-next-line
  }, []);

  useEffect(() => { loadList(tab); /* eslint-disable-next-line */ }, [tab, remoteType]);

  const discover = async () => {
    setError(""); setLoading(true);
    try {
      const { data } = await api.post("/jobs/discover", {
        resume_id: resumeId || null,
        role,
        location,
        remote_type: remoteType,
        experience_level: experience,
        startup_focus: startupFocus,
        count: 12,
      });
      // Prepend new jobs
      setJobs((prev) => [...data.jobs, ...prev.filter((p) => !data.jobs.find((n) => n.job_id === p.job_id))]);
      // Refresh usage + stats
      const [u, s] = await Promise.all([api.get("/jobs/usage"), api.get("/jobs/stats")]);
      setUsage(u.data); setStats(s.data);
      setTab("discover");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch jobs");
    }
    setLoading(false);
  };

  const save = async (job) => {
    await api.post(`/jobs/${job.job_id}/save`);
    setJobs((prev) => prev.map((j) => j.job_id === job.job_id ? { ...j, saved: true } : j));
    setStats((s) => s ? { ...s, saved: s.saved + 1 } : s);
  };
  const unsave = async (job) => {
    await api.post(`/jobs/${job.job_id}/unsave`);
    if (tab === "saved") {
      setJobs((prev) => prev.filter((j) => j.job_id !== job.job_id));
    } else {
      setJobs((prev) => prev.map((j) => j.job_id === job.job_id ? { ...j, saved: false } : j));
    }
    setStats((s) => s ? { ...s, saved: Math.max(0, s.saved - 1) } : s);
  };

  return (
    <div className="fade-up" data-testid="jobs-page">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 className="font-display" style={{ fontSize: 32, fontWeight: 700, color: C.textPrimary, letterSpacing: "-0.02em" }}>Job Discovery</h1>
          <p style={{ color: C.textSecondary, fontSize: 14, marginTop: 6 }}>
            AI-matched roles from LinkedIn · Naukri · Wellfound · Indeed · Internshala
          </p>
        </div>
        {usage && (
          <div className="leo-card" style={{ padding: "14px 18px", minWidth: 240 }}>
            <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Today's quota</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
              <span className="font-display" style={{ fontSize: 22, fontWeight: 700, color: C.accent }}>{usage.jobs_used_today}</span>
              <span style={{ fontSize: 13, color: C.textMuted }}>/ {usage.unlimited ? "∞" : usage.jobs_per_day}</span>
              <span style={{ marginLeft: "auto" }}><Badge color="accent">{usage.plan_name}</Badge></span>
            </div>
            {!usage.unlimited && (
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={(usage.jobs_used_today / Math.max(1, usage.jobs_per_day)) * 100} color={C.accent} />
              </div>
            )}
            {!usage.unlimited && usage.remaining === 0 && (
              <Link to="/pricing" style={{ display: "block", marginTop: 8, fontSize: 11, color: C.amber, textDecoration: "none", fontWeight: 600 }}>
                Upgrade for more jobs →
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
          {[
            { label: "Total discovered", value: stats.total, icon: "🔍", color: C.accent },
            { label: "Saved", value: stats.saved, icon: "★", color: C.amber },
            { label: "Startup jobs", value: stats.startup, icon: "⚡", color: C.teal },
            { label: "Remote", value: stats.remote, icon: "🌍", color: C.purple },
            { label: "Avg match", value: `${stats.avg_match}%`, icon: "🎯", color: C.green },
          ].map((s) => (
            <div key={s.label} className="leo-card" style={{ padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${s.color}1f`, color: s.color, display: "grid", placeItems: "center", fontSize: 14 }}>{s.icon}</div>
              <div>
                <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Discovery form */}
      <div className="leo-card" style={{ marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Role</label>
            <input data-testid="job-role" value={role} onChange={(e) => setRole(e.target.value)} className="leo-input" style={{ marginTop: 6 }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Location</label>
            <input data-testid="job-location" value={location} onChange={(e) => setLocation(e.target.value)} className="leo-input" style={{ marginTop: 6 }} />
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Work mode</label>
            <select data-testid="job-remote" value={remoteType} onChange={(e) => setRemoteType(e.target.value)} className="leo-input" style={{ marginTop: 6 }}>
              {REMOTE_OPTIONS.map((o) => <option key={o.id} value={o.id} style={{ background: C.bgCard }}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Experience</label>
            <select data-testid="job-exp" value={experience} onChange={(e) => setExperience(e.target.value)} className="leo-input" style={{ marginTop: 6 }}>
              {EXP_OPTIONS.map((o) => <option key={o.id} value={o.id} style={{ background: C.bgCard }}>{o.label}</option>)}
            </select>
          </div>
          <button data-testid="job-discover" onClick={discover} disabled={loading} className="leo-btn leo-btn-primary" style={{ padding: "12px 20px", fontSize: 13 }}>
            {loading ? <Spinner color="#fff" /> : "✦ Discover"}
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, fontSize: 12, color: C.textSecondary }}>
          {resumes.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>Resume:</span>
              <select data-testid="job-resume" value={resumeId} onChange={(e) => setResumeId(e.target.value)} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.textPrimary, padding: "4px 8px", borderRadius: 6, fontSize: 12 }}>
                {resumes.map((r) => <option key={r.resume_id} value={r.resume_id} style={{ background: C.bgCard }}>{r.name}</option>)}
              </select>
            </div>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input data-testid="job-startup" type="checkbox" checked={startupFocus} onChange={(e) => setStartupFocus(e.target.checked)} style={{ accentColor: C.accent }} />
            <span>⚡ Prioritize startup jobs</span>
          </label>
          {usage && <span style={{ marginLeft: "auto", color: C.textMuted, fontSize: 11 }}>Sources: {usage.sources.map((s) => SOURCES_LABEL[s]).join(" · ")}</span>}
        </div>

        {error && <div data-testid="jobs-error" style={{ marginTop: 12, padding: 10, background: C.redSoft, color: C.red, borderRadius: 8, fontSize: 12 }}>{error}{error.includes("limit") && <Link to="/pricing" style={{ marginLeft: 8, color: C.amber, fontWeight: 600 }}>Upgrade →</Link>}</div>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[
          { id: "discover", label: `Recommended (${jobs.filter((j) => !j.saved).length})` },
          { id: "saved", label: `Saved (${stats?.saved || 0})` },
          { id: "all", label: "All discovered" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`} className="leo-btn" style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            background: tab === t.id ? C.accentSoft : "rgba(255,255,255,0.04)",
            border: `1px solid ${tab === t.id ? C.accent : C.border}`,
            color: tab === t.id ? C.accent : C.textSecondary,
          }}>{t.label}</button>
        ))}
      </div>

      {/* Job grid */}
      {loadingList ? <div style={{ padding: 40, display: "grid", placeItems: "center" }}><Spinner size={28} /></div>
        : jobs.length === 0 ? (
          <EmptyState icon="🔍" title={tab === "saved" ? "No saved jobs yet" : "Discover your first match"}
            description={tab === "saved" ? "Star jobs you like to save them here." : "Click ✦ Discover to find AI-matched roles."}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {jobs.map((j) => <JobCard key={j.job_id} job={j} onSave={save} onUnsave={unsave} />)}
          </div>
        )
      }
    </div>
  );
}
