/**
 * Utilitaires pour filtrer et trier les données
 */

export const applyFilters = (data, filters) => {
  let filtered = [...data];

  // Recherche textuelle
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(item =>
      item.symbol?.toLowerCase().includes(searchLower) ||
      item.name?.toLowerCase().includes(searchLower) ||
      item.market_id?.toLowerCase().includes(searchLower)
    );
  }

  // Filtre par bourse
  if (filters.exchange && filters.exchange !== 'all') {
    filtered = filtered.filter(item =>
      item.exchange?.toLowerCase() === filters.exchange.toLowerCase()
    );
  }

  // Filtre par secteur
  if (filters.sector && filters.sector !== 'all') {
    filtered = filtered.filter(item =>
      item.sector === filters.sector
    );
  }

  // Filtre par prix minimum
  if (filters.priceMin && filters.priceMin !== '') {
    const min = parseFloat(filters.priceMin);
    filtered = filtered.filter(item => item.price >= min);
  }

  // Filtre par prix maximum
  if (filters.priceMax && filters.priceMax !== '') {
    const max = parseFloat(filters.priceMax);
    filtered = filtered.filter(item => item.price <= max);
  }

  // Filtre par variation minimum
  if (filters.changeMin && filters.changeMin !== '') {
    const min = parseFloat(filters.changeMin);
    filtered = filtered.filter(item =>
      (item.change_percent || item.change || 0) >= min
    );
  }

  // Filtre par variation maximum
  if (filters.changeMax && filters.changeMax !== '') {
    const max = parseFloat(filters.changeMax);
    filtered = filtered.filter(item =>
      (item.change_percent || item.change || 0) <= max
    );
  }

  // Tri
  if (filters.sortBy) {
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (filters.sortBy) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'symbol':
          aVal = a.symbol || a.market_id || '';
          bVal = b.symbol || b.market_id || '';
          break;
        case 'price':
          aVal = a.price || 0;
          bVal = b.price || 0;
          break;
        case 'change':
          aVal = a.change_percent || a.change || 0;
          bVal = b.change_percent || b.change || 0;
          break;
        case 'volume':
          aVal = a.volume || 0;
          bVal = b.volume || 0;
          break;
        default:
          return 0;
      }

      // Comparaison
      if (typeof aVal === 'string') {
        return filters.sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return filters.sortOrder === 'asc'
          ? aVal - bVal
          : bVal - aVal;
      }
    });
  }

  return filtered;
};

export const getUniqueValues = (data, key) => {
  const values = data.map(item => item[key]).filter(Boolean);
  return [...new Set(values)].sort();
};
