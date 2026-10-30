'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container section">
      <div className="panel empty-state">
        <h1 style={{ fontSize: 32 }}>Não foi possível carregar.</h1>
        <p>Verifique sua conexão e tente novamente.</p>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </div>
  );
}
