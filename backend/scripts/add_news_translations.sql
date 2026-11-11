-- Ajout des colonnes de traduction multilingue pour la table news
-- Langues africaines (23 langues) + Internationales déjà présentes

-- Afrique de l'Ouest
ALTER TABLE news ADD COLUMN title_wo TEXT;
ALTER TABLE news ADD COLUMN summary_wo TEXT;
ALTER TABLE news ADD COLUMN content_wo TEXT;

ALTER TABLE news ADD COLUMN title_bm TEXT;
ALTER TABLE news ADD COLUMN summary_bm TEXT;
ALTER TABLE news ADD COLUMN content_bm TEXT;

ALTER TABLE news ADD COLUMN title_yo TEXT;
ALTER TABLE news ADD COLUMN summary_yo TEXT;
ALTER TABLE news ADD COLUMN content_yo TEXT;

ALTER TABLE news ADD COLUMN title_ig TEXT;
ALTER TABLE news ADD COLUMN summary_ig TEXT;
ALTER TABLE news ADD COLUMN content_ig TEXT;

ALTER TABLE news ADD COLUMN title_ha TEXT;
ALTER TABLE news ADD COLUMN summary_ha TEXT;
ALTER TABLE news ADD COLUMN content_ha TEXT;

ALTER TABLE news ADD COLUMN title_ff TEXT;
ALTER TABLE news ADD COLUMN summary_ff TEXT;
ALTER TABLE news ADD COLUMN content_ff TEXT;

ALTER TABLE news ADD COLUMN title_fon TEXT;
ALTER TABLE news ADD COLUMN summary_fon TEXT;
ALTER TABLE news ADD COLUMN content_fon TEXT;

ALTER TABLE news ADD COLUMN title_tw TEXT;
ALTER TABLE news ADD COLUMN summary_tw TEXT;
ALTER TABLE news ADD COLUMN content_tw TEXT;

ALTER TABLE news ADD COLUMN title_ee TEXT;
ALTER TABLE news ADD COLUMN summary_ee TEXT;
ALTER TABLE news ADD COLUMN content_ee TEXT;

-- Afrique Centrale
ALTER TABLE news ADD COLUMN title_ln TEXT;
ALTER TABLE news ADD COLUMN summary_ln TEXT;
ALTER TABLE news ADD COLUMN content_ln TEXT;

ALTER TABLE news ADD COLUMN title_kg TEXT;
ALTER TABLE news ADD COLUMN summary_kg TEXT;
ALTER TABLE news ADD COLUMN content_kg TEXT;

ALTER TABLE news ADD COLUMN title_sg TEXT;
ALTER TABLE news ADD COLUMN summary_sg TEXT;
ALTER TABLE news ADD COLUMN content_sg TEXT;

-- Afrique de l'Est
ALTER TABLE news ADD COLUMN title_sw TEXT;
ALTER TABLE news ADD COLUMN summary_sw TEXT;
ALTER TABLE news ADD COLUMN content_sw TEXT;

ALTER TABLE news ADD COLUMN title_am TEXT;
ALTER TABLE news ADD COLUMN summary_am TEXT;
ALTER TABLE news ADD COLUMN content_am TEXT;

-- Afrique Australe
ALTER TABLE news ADD COLUMN title_af TEXT;
ALTER TABLE news ADD COLUMN summary_af TEXT;
ALTER TABLE news ADD COLUMN content_af TEXT;

ALTER TABLE news ADD COLUMN title_zu TEXT;
ALTER TABLE news ADD COLUMN summary_zu TEXT;
ALTER TABLE news ADD COLUMN content_zu TEXT;

ALTER TABLE news ADD COLUMN title_xh TEXT;
ALTER TABLE news ADD COLUMN summary_xh TEXT;
ALTER TABLE news ADD COLUMN content_xh TEXT;

ALTER TABLE news ADD COLUMN title_sn TEXT;
ALTER TABLE news ADD COLUMN summary_sn TEXT;
ALTER TABLE news ADD COLUMN content_sn TEXT;

ALTER TABLE news ADD COLUMN title_st TEXT;
ALTER TABLE news ADD COLUMN summary_st TEXT;
ALTER TABLE news ADD COLUMN content_st TEXT;

ALTER TABLE news ADD COLUMN title_tn TEXT;
ALTER TABLE news ADD COLUMN summary_tn TEXT;
ALTER TABLE news ADD COLUMN content_tn TEXT;

ALTER TABLE news ADD COLUMN title_ts TEXT;
ALTER TABLE news ADD COLUMN summary_ts TEXT;
ALTER TABLE news ADD COLUMN content_ts TEXT;

ALTER TABLE news ADD COLUMN title_nd TEXT;
ALTER TABLE news ADD COLUMN summary_nd TEXT;
ALTER TABLE news ADD COLUMN content_nd TEXT;

ALTER TABLE news ADD COLUMN title_ss TEXT;
ALTER TABLE news ADD COLUMN summary_ss TEXT;
ALTER TABLE news ADD COLUMN content_ss TEXT;
