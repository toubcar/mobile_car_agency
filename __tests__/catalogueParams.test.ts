import { activeFilterCount, apiParamsFromQuery, queryFromRoute, routeFromQuery } from '@/utils/catalogueParams';

describe('filtres du catalogue', () => {
  it('lit les paramètres de route et ignore ce qui n\'a pas de sens', () => {
    const query = queryFromRoute({
      location: ' Casablanca ',
      category: 'SUV',
      min_price: '300',
      max_price: 'abc',
      seats: '0',
      transmission: 'Automatic,Manual',
      fuel_type: ['Diesel'],
      sort: 'price_asc',
    });

    expect(query).toMatchObject({
      location: 'Casablanca',
      category: 'SUV',
      min_price: 300,
      max_price: undefined,
      seats: undefined,
      transmission: ['Automatic', 'Manual'],
      sort: 'price_asc',
    });
    expect(query.fuel_type).toEqual(['Diesel']);
  });

  it('refuse un tri inconnu', () => {
    expect(queryFromRoute({ sort: 'by_color' }).sort).toBeUndefined();
  });

  it('écrit des paramètres de route sans les champs vides ni le tri par défaut', () => {
    expect(routeFromQuery({ location: 'Rabat', brand: '', transmission: ['Automatic', 'Manual'], seats: 5, sort: 'default' })).toEqual({
      location: 'Rabat',
      transmission: 'Automatic,Manual',
      seats: '5',
    });
  });

  it('un aller-retour garde les filtres', () => {
    const query = { q: 'logan', location: 'Fès', min_price: 200, max_price: 600, fuel_type: ['Diesel'], sort: 'newest' as const };
    expect(queryFromRoute(routeFromQuery(query))).toMatchObject(query);
  });

  it('envoie 20 véhicules par page à l\'API', () => {
    expect(apiParamsFromQuery({ location: 'Rabat' })).toEqual({ location: 'Rabat', per_page: 20 });
  });

  it('compte les filtres actifs (la recherche libre et le tri n\'en font pas partie)', () => {
    expect(activeFilterCount({})).toBe(0);
    expect(activeFilterCount({ q: 'logan', sort: 'price_asc' })).toBe(0);
    expect(activeFilterCount({ location: 'Rabat', start_date: '2026-12-01', end_date: '2026-12-04', min_price: 100, fuel_type: ['Diesel'] })).toBe(4);
    expect(activeFilterCount({ start_date: '2026-12-01' })).toBe(0);
  });
});
