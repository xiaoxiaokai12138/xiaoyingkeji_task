export function Feedback({ title, detail, onRetry }: { title: string; detail?: string; onRetry?: () => void }) {
  return <div className="feedback" role={onRetry ? "alert" : "status"}><span className="feedback-symbol" aria-hidden="true">✧</span><h2>{title}</h2>{detail && <p>{detail}</p>}{onRetry && <button className="button secondary" onClick={onRetry}>重新加载</button>}</div>;
}
