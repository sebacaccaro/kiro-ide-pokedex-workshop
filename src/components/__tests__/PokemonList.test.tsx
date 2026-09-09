import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PokemonListEntry } from '../../lib/generation';
import { PokemonList } from '../PokemonList';

const entries: readonly PokemonListEntry[] = [
  { id: 1, name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
  { id: 4, name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
  { id: 7, name: 'squirtle', url: 'https://pokeapi.co/api/v2/pokemon/7/' },
];

// jsdom non implementa IntersectionObserver: forniamo uno stub controllabile che
// cattura la callback e permette di simulare l'intersezione della sentinella.
type ObserverCallback = (entries: readonly { isIntersecting: boolean }[]) => void;

let lastObserverCallback: ObserverCallback | null = null;

class MockIntersectionObserver {
  constructor(callback: ObserverCallback) {
    lastObserverCallback = callback;
  }

  observe = vi.fn();

  unobserve = vi.fn();

  disconnect = vi.fn();

  takeRecords = vi.fn(() => []);
}

function triggerIntersection(): void {
  lastObserverCallback?.([{ isIntersecting: true }]);
}

beforeEach(() => {
  lastObserverCallback = null;
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PokemonList', () => {
  it('rende una riga per ciascuna voce con numero e nome (Req 6.7, 7.4)', () => {
    render(
      <PokemonList
        entries={entries}
        isLoadingMore={false}
        onSelect={vi.fn()}
        onReachEnd={vi.fn()}
      />,
    );

    expect(screen.getByText(/bulbasaur/i)).toBeInTheDocument();
    expect(screen.getByText(/charmander/i)).toBeInTheDocument();
    expect(screen.getByText(/squirtle/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('pokemon-types')).toHaveLength(entries.length);
  });

  it('invoca onSelect con l\u0027id della riga selezionata (Req 1.6)', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PokemonList
        entries={entries}
        isLoadingMore={false}
        onSelect={onSelect}
        onReachEnd={vi.fn()}
      />,
    );

    await user.click(screen.getByText(/charmander/i));

    expect(onSelect).toHaveBeenCalledWith(4);
  });

  it('mostra un indicatore di caricamento incrementale in coda quando isLoadingMore (Req 2.2)', () => {
    render(
      <PokemonList
        entries={entries}
        isLoadingMore
        onSelect={vi.fn()}
        onReachEnd={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('non mostra l\u0027indicatore incrementale quando isLoadingMore \u00e8 false (Req 2.2)', () => {
    render(
      <PokemonList
        entries={entries}
        isLoadingMore={false}
        onSelect={vi.fn()}
        onReachEnd={vi.fn()}
      />,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('invoca onReachEnd quando la sentinella entra nel viewport (Req 1.4)', () => {
    const onReachEnd = vi.fn();
    render(
      <PokemonList
        entries={entries}
        isLoadingMore={false}
        onSelect={vi.fn()}
        onReachEnd={onReachEnd}
      />,
    );

    triggerIntersection();

    expect(onReachEnd).toHaveBeenCalledTimes(1);
  });
});
