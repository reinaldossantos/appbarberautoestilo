'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { ServiceCard } from './service-card';
import type { Service } from '@/lib/domain/types';
import { canBook } from '@/lib/domain/catalog';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const filters = [
  { id: 'all', label: 'Todos' },
  { id: 'available', label: 'Para agendar' },
  { id: 'soon', label: 'Em breve' },
] as const;

export function ServiceCatalog({ services }: { services: Service[] }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const visible = services.filter(
    (service) =>
      normalize(service.name).includes(normalize(search)) &&
      (filter === 'all' ||
        (filter === 'available'
          ? canBook(service)
          : service.status === 'coming_soon')),
  );
  return (
    <>
      <div className="catalog-tools">
        <label className="catalog-search">
          <Search size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar serviço"
            placeholder="Qual cuidado você procura?"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="catalog-filters" aria-label="Filtrar serviços">
          {filters.map((item) => (
            <button
              key={item.id}
              className="catalog-filter"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <p className="catalog-count" role="status">
        {visible.length}{' '}
        {visible.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}
      </p>
      {visible.length ? (
        <div className="service-grid">
          {visible.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="panel empty-state">
          <SlidersHorizontal size={32} />
          <h2>Nenhum serviço por aqui.</h2>
          <p>Tente outro nome ou escolha todos os serviços.</p>
          <button
            className="button button-outline"
            onClick={() => {
              setSearch('');
              setFilter('all');
            }}
          >
            Limpar filtros
          </button>
        </div>
      )}
    </>
  );
}
