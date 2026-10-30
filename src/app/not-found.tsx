import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container section empty-state">
      <h1>Página não encontrada</h1>
      <p>Vamos encontrar o caminho de volta.</p>
      <Link href="/" className="button button-gold">
        Voltar ao início
      </Link>
    </div>
  );
}
