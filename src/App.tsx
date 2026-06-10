import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Search,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react";
import {
  analyzeProductImage,
  fileToBase64,
  verifyAnalysisWithSearch,
  type AnalysisResult,
  type VerificationResult,
} from "@/lib/gemini";
import logo from "@/assets/logo.png";


function gradeColor(grade: string): string {
  const g = grade?.trim().toUpperCase().charAt(0);
  if (g === "A") return "text-success";
  if (g === "B") return "text-primary";
  if (g === "C") return "text-warning";
  return "text-destructive";
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-primary";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}

function NovaApp() {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setVerification(null);
    setVerifyError(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const { data, mimeType } = await fileToBase64(file);
      const analysis = await analyzeProductImage(data, mimeType);
      setResult(analysis);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while analyzing the image.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    setVerifying(true);
    setVerifyError(null);
    setVerification(null);
    (async () => {
      try {
        const v = await verifyAnalysisWithSearch(result);
        if (!cancelled) setVerification(v);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setVerifyError(
            err instanceof Error ? err.message : "Verification failed.",
          );
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setError(null);
    setVerification(null);
    setVerifyError(null);
  }

  return (
    <div dir="ltr" className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header */}
        <header className="mb-10 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/80 to-background ring-1 ring-primary/30 shadow-[0_0_30px_-5px_oklch(0.78_0.14_195/0.6)]">
              <img src={logo} alt="NovaApp logo" width={56} height={56} className="h-10 w-10 object-contain drop-shadow-[0_0_8px_oklch(0.78_0.14_195/0.6)]" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Nova<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">App</span>
            </h1>
          </div>

          <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
            Snap any food or cosmetic product and get an instant
            scientific breakdown of its ingredients, hazards, and marketing
            honesty.
          </p>
        </header>

        {/* Upload */}
        {!preview && (
          <section className="rounded-3xl border border-border/60 bg-card/40 p-8 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="rounded-2xl bg-secondary/60 p-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Start a new scan</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Take a clear photo of the back of the product where the
                  ingredient list is visible.
                </p>
              </div>
              <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-accent px-5 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/20 transition hover:opacity-95 active:scale-[0.98]"
                >
                  <Camera className="h-5 w-5" />
                  Use Camera
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-5 py-3 font-medium text-foreground transition hover:bg-secondary"
                >
                  <Upload className="h-5 w-5" />
                  Upload Image
                </button>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPick}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPick}
              />
            </div>
          </section>
        )}

        {/* Preview + Loading */}
        {preview && (
          <section className="mb-8 grid gap-6 md:grid-cols-[1fr_2fr]">
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40">
              <img
                src={preview}
                alt="Selected product"
                className="aspect-square w-full object-cover"
              />
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  Selected image
                </span>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-md px-3 py-1 text-xs text-muted-foreground transition hover:bg-secondary"
                >
                  Change
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {loading && (
                <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/40 p-10 text-center">
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Analyzing ingredients & auditing marketing claims…
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Analysis failed</p>
                    <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
              )}

              {result && <Summary result={result} />}
            </div>
          </section>
        )}

        {result && (
          <VerifyPanel
            verifying={verifying}
            verification={verification}
            error={verifyError}
          />
        )}

        {result && <Details result={result} />}

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          NovaApp is for informational purposes only. Always consult a qualified
          professional for medical or regulatory advice.
        </footer>
      </div>
    </div>
  );
}

function Summary({ result }: { result: AnalysisResult }) {
  const meta = result.analysis_metadata;
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {meta?.category_ar || "Product"}
          </p>
          <h2 className="mt-1 truncate text-xl font-semibold">
            {meta?.product_name_ar || "Unidentified product"}
          </h2>
        </div>
        <div className={`text-right ${gradeColor(meta?.integrity_grade ?? "")}`}>
          <div className="text-4xl font-bold leading-none">
            {meta?.integrity_grade || "—"}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Grade
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Safety score</span>
          <span className={`text-2xl font-bold ${scoreColor(meta?.safety_score ?? 0)}`}>
            {Math.round(meta?.safety_score ?? 0)}
            <span className="text-sm font-normal text-muted-foreground">/100</span>
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-destructive via-warning to-success transition-all"
            style={{ width: `${Math.max(0, Math.min(100, meta?.safety_score ?? 0))}%` }}
          />
        </div>
      </div>

      {result.final_expert_verdict_ar && (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          {result.final_expert_verdict_ar}
        </p>
      )}
    </div>
  );
}

function Details({ result }: { result: AnalysisResult }) {
  const { positive = [], negative = [], questionable = [] } =
    result.detailed_components ?? {};
  const audit = result.marketing_integrity_audit;

  // Highlight warning ingredients = hazard_score >= 7 OR all negatives
  return (
    <div className="space-y-6">
      {negative.length > 0 && (
        <section>
          <SectionHeader
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="danger"
            title="Harmful / High-Risk Ingredients"
            count={negative.length}
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {negative.map((item, i) => {
              const high = (item.hazard_score ?? 0) >= 7;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border p-4 ${
                    high
                      ? "border-destructive/60 bg-destructive/10 shadow-[0_0_25px_-10px_oklch(0.65_0.24_25/0.6)]"
                      : "border-warning/40 bg-warning/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.name_en}</p>
                      {item.name_ar && item.name_ar !== item.name_en && (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.name_ar}
                        </p>
                      )}
                    </div>
                    <HazardBadge score={item.hazard_score} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                    {item.health_risk_ar}
                  </p>
                  {item.regulatory_status_ar && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        Regulatory:&nbsp;
                      </span>
                      {item.regulatory_status_ar}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {questionable.length > 0 && (
        <section>
          <SectionHeader
            icon={<HelpCircle className="h-5 w-5" />}
            tone="warning"
            title="Questionable Ingredients"
            count={questionable.length}
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {questionable.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-warning/30 bg-warning/5 p-4"
              >
                <p className="font-semibold">{item.name_en}</p>
                {item.name_ar && item.name_ar !== item.name_en && (
                  <p className="text-xs text-muted-foreground">{item.name_ar}</p>
                )}
                <p className="mt-2 text-sm text-foreground/90">
                  {item.reason_for_concern_ar}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {positive.length > 0 && (
        <section>
          <SectionHeader
            icon={<CheckCircle2 className="h-5 w-5" />}
            tone="success"
            title="Beneficial Ingredients"
            count={positive.length}
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {positive.map((item, i) => (
              <div
                key={i}
                className="rounded-2xl border border-success/30 bg-success/5 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.name_en}</p>
                    {item.name_ar && item.name_ar !== item.name_en && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.name_ar}
                      </p>
                    )}
                  </div>
                  {item.evidence_level && (
                    <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-medium uppercase text-success">
                      {item.evidence_level}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-foreground/90">
                  {item.scientific_benefit_ar}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {audit &&
        (audit.detected_claims_ar?.length || audit.deceptive_practices?.length) && (
          <section>
            <SectionHeader
              icon={<XCircle className="h-5 w-5" />}
              tone="primary"
              title="Marketing Integrity Audit"
            />
            <div className="mt-3 rounded-2xl border border-border/60 bg-card/40 p-5">
              {audit.detected_claims_ar?.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Detected claims
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {audit.detected_claims_ar.map((c, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {audit.deceptive_practices?.length > 0 && (
                <div className="mt-5 space-y-3">
                  {audit.deceptive_practices.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-destructive/40 bg-destructive/10 p-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-destructive">
                          “{d.claim_ar}”
                        </p>
                        <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-medium uppercase text-destructive">
                          {d.tactic_type_en}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground/90">
                        {d.scientific_reality_ar}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {audit.marketing_honesty_rating_ar && (
                <p className="mt-4 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    Honesty rating:&nbsp;
                  </span>
                  {audit.marketing_honesty_rating_ar}
                </p>
              )}
            </div>
          </section>
        )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  tone: "danger" | "warning" | "success" | "primary";
}) {
  const tones: Record<string, string> = {
    danger: "text-destructive",
    warning: "text-warning",
    success: "text-success",
    primary: "text-primary",
  };
  return (
    <div className="flex items-center gap-2">
      <span className={tones[tone]}>{icon}</span>
      <h3 className="text-base font-semibold">{title}</h3>
      {typeof count === "number" && (
        <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-xs text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

function HazardBadge({ score }: { score: number }) {
  const s = score ?? 0;
  const tone =
    s >= 7
      ? "bg-destructive text-destructive-foreground"
      : s >= 3
        ? "bg-warning text-warning-foreground"
        : "bg-success text-success-foreground";
  return (
    <span
      className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${tone}`}
      title="Hazard score (1-10)"
    >
      {s}/10
    </span>
  );
}

function verdictTone(verdict: string): string {
  const v = verdict?.toLowerCase() ?? "";
  if (v.includes("confirm") && !v.includes("partial")) return "text-success border-success/40 bg-success/10";
  if (v.includes("partial") || v.includes("mostly")) return "text-primary border-primary/40 bg-primary/10";
  if (v.includes("disput")) return "text-destructive border-destructive/40 bg-destructive/10";
  return "text-warning border-warning/40 bg-warning/10";
}

function VerifyPanel({
  verifying,
  verification,
  error,
}: {
  verifying: boolean;
  verification: VerificationResult | null;
  error: string | null;
}) {
  return (
    <section className="mt-2 mb-6">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Fact-check with Google Search</h3>
          </div>
          {verifying ? (
            <span className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verifying…
            </span>
          ) : verification ? (
            <span className="flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs text-success">
              <Search className="h-3.5 w-3.5" />
              Verified
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Automatically cross-checks the AI analysis against live Google Search results from regulatory and scientific sources.
        </p>


        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        )}

        {verification && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${verdictTone(verification.verdict)}`}>
                {verification.verdict}
              </span>
              <span className="text-xs text-muted-foreground">
                Confidence:{" "}
                <span className="font-semibold text-foreground">{verification.confidence}%</span>
              </span>
            </div>

            {verification.summary && (
              <p className="text-sm leading-relaxed text-foreground/90">{verification.summary}</p>
            )}

            {verification.corrections.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Corrections & nuances</p>
                <ul className="mt-2 space-y-1.5">
                  {verification.corrections.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/90">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {verification.sources.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Sources</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {verification.sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-foreground/90 transition hover:bg-secondary"
                      title={s.title}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default NovaApp;
