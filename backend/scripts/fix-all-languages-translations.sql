-- Script de correction des traductions pour TOUTES les langues
-- Opportunités principales

-- Opportunité 22: Parc Éolien 300 MW - Tanger
UPDATE investment_opportunities
SET
  -- Anglais
  title_en = 'Wind Farm 300 MW - Tangier',
  description_en = 'Morocco targets 52% green energy by 2030. Park with 120 latest generation turbines. Optimal location with constant winds of 9-11 m/s.',
  summary_en = '300 MW wind farm in Tangier region with guaranteed 20-year purchase contract',
  -- Portugais
  title_pt = 'Parque Eólico 300 MW - Tânger',
  description_pt = 'Marrocos visa 52% de energia verde até 2030. Parque com 120 turbinas de última geração. Localização ideal com ventos constantes de 9-11 m/s.',
  summary_pt = 'Parque eólico de 300 MW na região de Tânger com contrato de compra garantido de 20 anos',
  -- Allemand
  title_de = 'Windpark 300 MW - Tanger',
  description_de = 'Marokko strebt bis 2030 52% grüne Energie an. Park mit 120 Turbinen der neuesten Generation. Optimaler Standort mit konstanten Winden von 9-11 m/s.',
  summary_de = '300-MW-Windpark in der Region Tanger mit garantiertem 20-jährigem Kaufvertrag'
WHERE slug = 'parc-eolien-300-mw-tanger';

-- Opportunité 23: Production Hydrogène Vert - Égypte
UPDATE investment_opportunities
SET
  -- Anglais
  title_en = 'Green Hydrogen Production - Egypt',
  description_en = 'Egypt plans to become a green hydrogen hub for Europe. 2 GW electrolysis plant powered by solar and wind. Proximity to Suez Canal for export.',
  summary_en = 'Mega green hydrogen production project in Suez Canal area, 2 GW capacity',
  -- Portugais
  title_pt = 'Produção de Hidrogênio Verde - Egito',
  description_pt = 'Egito planeja se tornar um centro de hidrogênio verde para a Europa. Planta de eletrólise de 2 GW alimentada por energia solar e eólica. Proximidade ao Canal de Suez para exportação.',
  summary_pt = 'Mega projeto de produção de hidrogênio verde na área do Canal de Suez, capacidade de 2 GW',
  -- Allemand
  title_de = 'Grüne Wasserstoffproduktion - Ägypten',
  description_de = 'Ägypten plant, ein grünes Wasserstoffzentrum für Europa zu werden. 2-GW-Elektrolyseanlage mit Solar- und Windenergie. Nähe zum Suezkanal für Export.',
  summary_de = 'Mega-Grünwasserstoff-Produktionsprojekt im Suezkanal-Gebiet, 2 GW Kapazität'
WHERE slug = 'production-hydrogene-vert-egypte';

-- Opportunité 24: Hub Technologique - Rwanda
UPDATE investment_opportunities
SET
  -- Anglais
  title_en = 'Technology Hub and Data Center - Kigali',
  description_en = 'Rwanda positions itself as the "Singapore of Africa". Tier 3 data center of 5000 m², startup park, incubator. 4G/5G fiber optics already available.',
  summary_en = 'World-class technology hub in Kigali with Tier 3 data center, startup park',
  -- Portugais
  title_pt = 'Hub Tecnológico e Centro de Dados - Kigali',
  description_pt = 'Ruanda se posiciona como o "Singapura da África". Data center Tier 3 de 5000 m², parque de startups, incubadora. Fibra óptica 4G/5G já disponível.',
  summary_pt = 'Hub tecnológico de classe mundial em Kigali com data center Tier 3, parque de startups',
  -- Allemand
  title_de = 'Technologie-Hub und Rechenzentrum - Kigali',
  description_de = 'Ruanda positioniert sich als "Singapur Afrikas". Tier-3-Rechenzentrum von 5000 m², Startup-Park, Inkubator. 4G/5G-Glasfaser bereits verfügbar.',
  summary_de = 'Weltklasse-Technologie-Hub in Kigali mit Tier-3-Rechenzentrum, Startup-Park'
WHERE slug = 'hub-technologique-rwanda';

-- Actualités principales

-- Article 22: BRVM
UPDATE news
SET
  -- Anglais
  title_en = 'BRVM achieves new historic record with +22% in 2026',
  summary_en = 'West African regional stock exchange shows exceptional performance driven by tech and finance',
  content_en = 'The Regional Securities Exchange (BRVM) closed the first half of 2026 with a remarkable 22% increase in its BRVM-C composite index. Banking stocks rose 28%, while the technology sector jumped 35%. This performance is attributed to the influx of international institutional investors, attracted by the economic growth of the WAEMU zone (6.5% GDP growth expected in 2026). Daily transaction volume doubled, reaching 8 billion FCFA per day. Analysts predict this upward trend will continue with the upcoming integration of new tech companies into the market.',
  -- Portugais
  title_pt = 'BRVM atinge novo recorde histórico com +22% em 2026',
  summary_pt = 'Bolsa regional da África Ocidental mostra desempenho excepcional impulsionado por tecnologia e finanças',
  content_pt = 'A Bolsa Regional de Valores Mobiliários (BRVM) fechou o primeiro semestre de 2026 com um aumento notável de 22% em seu índice composto BRVM-C. As ações bancárias subiram 28%, enquanto o setor de tecnologia saltou 35%. Este desempenho é atribuído ao influxo de investidores institucionais internacionais, atraídos pelo crescimento econômico da zona UEMOA (crescimento do PIB de 6,5% esperado em 2026). O volume diário de transações dobrou, atingindo 8 bilhões de FCFA por dia. Os analistas preveem que esta tendência ascendente continuará com a próxima integração de novas empresas de tecnologia no mercado.',
  -- Allemand
  title_de = 'BRVM erreicht neuen historischen Rekord mit +22% im Jahr 2026',
  summary_de = 'Westafrikanische Regionalbörse zeigt außergewöhnliche Leistung durch Technologie und Finanzen',
  content_de = 'Die Regionale Wertpapierbörse (BRVM) schloss das erste Halbjahr 2026 mit einem bemerkenswerten Anstieg von 22% ihres zusammengesetzten Index BRVM-C ab. Bankaktien stiegen um 28%, während der Technologiesektor um 35% zulegte. Diese Leistung wird dem Zustrom internationaler institutioneller Investoren zugeschrieben, die vom Wirtschaftswachstum der WAEMU-Zone angezogen werden (6,5% BIP-Wachstum für 2026 erwartet). Das tägliche Transaktionsvolumen verdoppelte sich und erreichte 8 Milliarden FCFA pro Tag. Analysten prognostizieren, dass dieser Aufwärtstrend mit der bevorstehenden Integration neuer Technologieunternehmen in den Markt anhalten wird.'
WHERE id = 22;

-- Article 23: JSE Crypto
UPDATE news
SET
  -- Anglais
  title_en = 'Johannesburg Stock Exchange JSE launches regulated crypto trading',
  summary_en = 'First African exchange to integrate crypto asset trading platform with regulatory approval',
  content_en = 'The Johannesburg Stock Exchange (JSE), Africa''s largest exchange with a market cap of $800 billion, announced the launch of its regulated cryptocurrency trading platform. Investors will be able to trade Bitcoin, Ethereum and 8 other cryptocurrencies approved by FSCA (Financial Sector Conduct Authority). This launch puts Africa at the forefront of global fintech adoption. Trading is done with strict financial monitoring mechanisms and protection that comply with international standards. Expected volume: $500 million in the first year.',
  -- Portugais
  title_pt = 'Bolsa de Johannesburgo JSE lança negociação regulamentada de criptomoedas',
  summary_pt = 'Primeira bolsa africana a integrar plataforma de negociação de ativos cripto com aprovação regulatória',
  content_pt = 'A Bolsa de Valores de Joanesburgo (JSE), a maior bolsa da África com capitalização de mercado de US$ 800 bilhões, anunciou o lançamento de sua plataforma de negociação de criptomoedas regulamentada. Os investidores poderão negociar Bitcoin, Ethereum e 8 outras criptomoedas aprovadas pela FSCA (Autoridade de Conduta do Setor Financeiro). Este lançamento coloca a África na vanguarda da adoção global de fintech. A negociação é feita com mecanismos rigorosos de monitoramento financeiro e proteção que cumprem os padrões internacionais. Volume esperado: US$ 500 milhões no primeiro ano.',
  -- Allemand
  title_de = 'Johannesburg Börse JSE startet regulierten Krypto-Handel',
  summary_de = 'Erste afrikanische Börse zur Integration einer Krypto-Asset-Handelsplattform mit behördlicher Genehmigung',
  content_de = 'Die Johannesburg Stock Exchange (JSE), Afrikas größte Börse mit einer Marktkapitalisierung von 800 Milliarden US-Dollar, kündigte die Einführung ihrer regulierten Kryptowährungs-Handelsplattform an. Anleger können Bitcoin, Ethereum und 8 weitere von der FSCA (Financial Sector Conduct Authority) genehmigte Kryptowährungen handeln. Diese Einführung stellt Afrika an die Spitze der globalen Fintech-Akzeptanz. Der Handel erfolgt mit strengen finanziellen Überwachungsmechanismen und Schutz, die internationalen Standards entsprechen. Erwartetes Volumen: 500 Millionen US-Dollar im ersten Jahr.'
WHERE id = 23;

SELECT 'Traductions corrigées pour EN, PT, DE' as message;
