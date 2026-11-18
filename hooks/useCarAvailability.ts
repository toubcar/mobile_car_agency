import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { carsService } from '@/services/cars.service';
import { toIsoDate } from '@/utils/dates';

/** Les jours pris d'un véhicule sur un an (réservations et maintenance) : ce que le calendrier grise en rouge. */
export function useCarAvailability(carId: number | undefined) {
  const range = useMemo(() => {
    const from = new Date();
    from.setHours(12, 0, 0, 0);
    const to = new Date(from);
    to.setFullYear(to.getFullYear() + 1);
    return { from: toIsoDate(from), to: toIsoDate(to) };
  }, []);

  const query = useQuery({
    queryKey: ['car-availability', carId, range.from],
    queryFn: () => carsService.getAvailability(carId as number, range.from, range.to),
    enabled: typeof carId === 'number' && Number.isFinite(carId) && carId > 0,
    staleTime: 60_000,
  });

  const unavailable = useMemo(() => new Set(query.data?.unavailable ?? []), [query.data]);

  return { unavailable, bookable: query.data?.bookable ?? true, isLoading: query.isLoading, refetch: query.refetch };
}
