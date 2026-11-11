/**
 * Mappings pour convertir les valeurs françaises de la BDD en clés de traduction
 */

// Mapping tailles d'entreprise
export const companySizeMap = {
  'Startup': 'startup',
  'Petite entreprise': 'sme',
  'PME': 'sme',
  'Moyenne Entreprise': 'sme',
  'Grande entreprise': 'large',
  'Grande Entreprise': 'large',
  'Multinationale': 'large'
};

// Mapping étapes de développement
export const stageMap = {
  'Développement': 'early',
  'Démarrage': 'early',
  'Early Stage': 'early',
  'Expansion': 'growth',
  'Croissance': 'growth',
  'Growth': 'growth',
  'Mature': 'mature',
  'Maturité': 'mature'
};

// Mapping horizon d'investissement
export const horizonMap = {
  '1-3 ans': 'short',
  '3-5 ans': 'medium',
  '4-7 ans': 'medium',
  '5-7 ans': 'medium',
  '7-10 ans': 'long',
  '7-10 Ans': 'long',
  '10+ ans': 'long',
  '12-15 ans': 'long',
  '15+ ans': 'long'
};

// Mapping niveaux de risque
export const riskLevelMap = {
  'low': 'low',
  'Faible': 'low',
  'Bas': 'low',
  'medium': 'medium',
  'Moyen': 'medium',
  'Modéré': 'medium',
  'high': 'high',
  'Élevé': 'high',
  'Haut': 'high'
};

// Mapping secteurs (valeurs françaises vers clés)
export const sectorMap = {
  'Énergie': 'energy',
  'Energie': 'energy',
  'Agriculture': 'agriculture',
  'Technologie': 'technology',
  'Tech': 'technology',
  'Finance': 'finance',
  'Fintech': 'fintech',
  'Santé': 'health',
  'Immobilier': 'real_estate',
  'Infrastructure': 'infrastructure',
  'Industrie': 'industry',
  'Commerce': 'commerce',
  'Services': 'services',
  'Transport': 'transport',
  'Éducation': 'education',
  'Tourisme': 'tourism'
};

// Mapping régions
export const regionMap = {
  'Afrique du Nord': 'north_africa',
  'Afrique de l\'Ouest': 'west_africa',
  'Afrique Centrale': 'central_africa',
  'Afrique de l\'Est': 'east_africa',
  'Afrique Australe': 'southern_africa',
  'Panafricain': 'pan_african',
  'Pan-Africain': 'pan_african',
  'Panafricaine': 'pan_african',
  'Pan-African': 'pan_african'
};

/**
 * Fonction helper pour mapper une valeur
 */
export const mapValue = (value, mapping) => {
  if (!value) return null;
  return mapping[value] || value.toLowerCase().replace(/\s+/g, '_');
};
