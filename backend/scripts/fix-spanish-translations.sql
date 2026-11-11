-- Correction des traductions espagnoles mal traduites
-- Opportunité: Parc Éolien 300 MW
UPDATE investment_opportunities
SET
  title_es = 'Parque Eólico 300 MW - Tánger',
  summary_es = 'Parque eólico de 300 MW en la región de Tánger con contrato de compra garantizado de 20 años',
  description_es = 'Marruecos apunta a un 52% de energía verde para 2030. Parque con 120 aerogeneradores de última generación. Ubicación óptima con vientos constantes de 9-11 m/s.'
WHERE slug = 'parc-eolien-300-mw-tanger';

-- Opportunité: Production Hydrogène Vert - Égypte
UPDATE investment_opportunities
SET
  title_es = 'Producción de Hidrógeno Verde - Egipto',
  summary_es = 'Mega proyecto de producción de hidrógeno verde en la zona del Canal de Suez, 2 GW de capacidad',
  description_es = 'Egipto planea convertirse en un centro de hidrógeno verde para Europa. Planta de electrólisis de 2 GW alimentada por energía solar y eólica. Proximidad al Canal de Suez para exportación.'
WHERE slug = 'production-hydrogene-vert-egypte';

-- Opportunité: Hub Technologique - Rwanda
UPDATE investment_opportunities
SET
  title_es = 'Hub Tecnológico y Centro de Datos - Kigali',
  summary_es = 'Hub tecnológico de clase mundial en Kigali con centro de datos de nivel 3, parque de startups',
  description_es = 'Ruanda se posiciona como el "Singapur de África". Centro de datos de nivel 3 de 5000 m², parque de startups, incubadora. Fibra óptica 4G/5G ya disponible.'
WHERE slug = 'hub-technologique-rwanda';

SELECT 'Traductions espagnoles corrigées avec succès' as message;
