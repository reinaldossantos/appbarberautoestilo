export default function Loading() {
  return (
    <div className="container section" role="status" aria-label="Carregando">
      <div className="skeleton" />
      <p className="muted">Preparando tudo para você…</p>
    </div>
  );
}
