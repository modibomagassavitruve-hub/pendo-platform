-- Correction des traductions arabes mal traduites
-- Opportunité: Parc Éolien 300 MW - Tanger
UPDATE investment_opportunities
SET
  title_ar = 'مزرعة رياح 300 ميجاوات - طنجة',
  summary_ar = 'مزرعة رياح بقدرة 300 ميجاوات في منطقة طنجة مع عقد شراء مضمون لمدة 20 عامًا',
  description_ar = 'يستهدف المغرب 52% من الطاقة الخضراء بحلول 2030. المزرعة تضم 120 توربينًا من أحدث جيل. موقع مثالي برياح ثابتة 9-11 م/ث.'
WHERE slug = 'parc-eolien-300-mw-tanger';

-- Opportunité: Production Hydrogène Vert - Égypte
UPDATE investment_opportunities
SET
  title_ar = 'إنتاج الهيدروجين الأخضر - مصر',
  summary_ar = 'مشروع ضخم لإنتاج الهيدروجين الأخضر في منطقة قناة السويس، بقدرة 2 جيجاوات',
  description_ar = 'تخطط مصر لتصبح مركزًا للهيدروجين الأخضر لأوروبا. مصنع تحليل كهربائي بقدرة 2 جيجاوات يعمل بالطاقة الشمسية والرياح. قرب قناة السويس للتصدير.'
WHERE slug = 'production-hydrogene-vert-egypte';

-- Opportunité: Hub Technologique - Rwanda
UPDATE investment_opportunities
SET
  title_ar = 'مركز تكنولوجي ومركز بيانات - كيغالي',
  summary_ar = 'مركز تكنولوجي عالمي المستوى في كيغالي مع مركز بيانات من المستوى 3، حديقة للشركات الناشئة',
  description_ar = 'تضع رواندا نفسها كـ "سنغافورة أفريقيا". مركز بيانات من المستوى 3 بمساحة 5000 م²، حديقة شركات ناشئة، حاضنة. شبكة ألياف بصرية 4G/5G متوفرة بالفعل.'
WHERE slug = 'hub-technologique-rwanda';

SELECT 'Traductions arabes corrigées avec succès' as message;
