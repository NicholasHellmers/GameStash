import type { Game } from '../../types';

export interface GameCatalogState {
  games: Game[];
  isLoading: boolean;
  error: string | null;
}
