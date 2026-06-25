import type { QueryClient } from '@tanstack/react-query';
import type { Car, PaginatedResponse } from '@/types';

/** Met à jour is_favorite dans toutes les listes véhicules en cache. */
export function patchCarsFavorite(queryClient: QueryClient, carId: number, isFavorite: boolean) {
  queryClient.setQueriesData({ queryKey: ['cars'] }, (old: unknown) => {
    if (old == null) return old;

    if (Array.isArray(old)) {
      return (old as Car[]).map((c) =>
        c.id === carId ? { ...c, is_favorite: isFavorite } : c,
      );
    }

    if (typeof old === 'object' && 'data' in old && Array.isArray((old as PaginatedResponse<Car>).data)) {
      const page = old as PaginatedResponse<Car>;
      return {
        ...page,
        data: page.data.map((c) =>
          c.id === carId ? { ...c, is_favorite: isFavorite } : c,
        ),
      };
    }

    return old;
  });

  queryClient.setQueriesData({ queryKey: ['car', String(carId)] }, (old: unknown) => {
    if (!old || typeof old !== 'object') return old;
    const car = old as Car;
    return car.id === carId ? { ...car, is_favorite: isFavorite } : car;
  });
}

/** Ajoute ou retire un véhicule de la liste favoris en cache. */
export function patchFavoritesList(queryClient: QueryClient, car: Car, isFavorite: boolean) {
  queryClient.setQueryData<Car[]>(['favorites'], (old) => {
    const list = old ?? [];
    if (isFavorite) {
      if (list.some((c) => c.id === car.id)) return list;
      return [{ ...car, is_favorite: true }, ...list];
    }
    return list.filter((c) => c.id !== car.id);
  });
}
