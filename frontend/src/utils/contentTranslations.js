/**
 * Traductions statiques du contenu dynamique
 * Pour traduire les opportunités, actualités, secteurs, pays, etc.
 * Supporte les 29 langues de PENDO
 */

// ============================================================
// Traductions des secteurs des marchés boursiers (africanExchanges)
// Clé = valeur française utilisée dans africanExchanges.js > topSectors
// ============================================================
export const marketSectorTranslations = {
  "Banques": {
    fr: "Banques", en: "Banks", es: "Bancos", ar: "بنوك", de: "Banken", pt: "Bancos",
    wo: "Banques", bm: "Banques", yo: "Awọn Banki", ig: "Ụlọ akụ", ha: "Bankuna",
    sw: "Benki", am: "ባንኮች", af: "Banke", zu: "Amabhange", xh: "Iibhanki",
    sn: "Mabhanga", st: "Dibanka", ee: "Ga dzidzime", ln: "Banki", tw: "Bankuo",
    ff: "Banques", fo: "Banques", kg: "Banques", sg: "Banques", tn: "Dibanka",
    ts: "Tibhangi", nd: "Amabhanga", ss: "Emabhanga"
  },
  "Télécoms": {
    fr: "Télécoms", en: "Telecom", es: "Telecomunicaciones", ar: "اتصالات", de: "Telekommunikation", pt: "Telecomunicações",
    wo: "Télécoms", bm: "Télécoms", yo: "Ibaraẹnisọrọ", ig: "Ekwurịta ọkụ", ha: "Sadarwa",
    sw: "Mawasiliano", am: "ቴሌኮም", af: "Telekommunikasie", zu: "Ezokuxhumana", xh: "Unxibelelwano",
    sn: "Zvekutaurirana", st: "Mehala", ee: "Kakakaɖoɖo", ln: "Télécoms", tw: "Kasafobea",
    ff: "Télécoms", fo: "Télécoms", kg: "Télécoms", sg: "Télécoms", tn: "Megala",
    ts: "Riqingho", nd: "Ezokuxhumana", ss: "Kuxhumana"
  },
  "Mines": {
    fr: "Mines", en: "Mining", es: "Minería", ar: "تعدين", de: "Bergbau", pt: "Mineração",
    wo: "Mines", bm: "Mines", yo: "Iwakusa", ig: "Mgbochi", ha: "Hakar ma'adinai",
    sw: "Madini", am: "ማዕድን", af: "Mynbou", zu: "Ezomgodi", xh: "Imigodi",
    sn: "Migodhi", st: "Merafo", ee: "Anyigbadede", ln: "Mines", tw: "Sika tuo",
    ff: "Mines", fo: "Mines", kg: "Mines", sg: "Mines", tn: "Meepô",
    ts: "Magodini", nd: "Imigodi", ss: "Imigodzi"
  },
  "Finance": {
    fr: "Finance", en: "Finance", es: "Finanzas", ar: "مالية", de: "Finanzen", pt: "Finanças",
    wo: "Finance", bm: "Finance", yo: "Iṣuna", ig: "Ego", ha: "Kudi",
    sw: "Fedha", am: "ፋይናንስ", af: "Finansies", zu: "Ezezimali", xh: "Ezemali",
    sn: "Zvemari", st: "Ditjhelete", ee: "Gadzidzime", ln: "Finance", tw: "Sika dwumadie",
    ff: "Finance", fo: "Finance", kg: "Finance", sg: "Finance", tn: "Ditšhelete",
    ts: "Timali", nd: "Ezemali", ss: "Timali"
  },
  "Consommation": {
    fr: "Consommation", en: "Consumer Goods", es: "Consumo", ar: "استهلاك", de: "Konsum", pt: "Consumo",
    wo: "Consommation", bm: "Consommation", yo: "Ohun elo", ig: "Ihe oriri", ha: "Kayan masarufi",
    sw: "Bidhaa", am: "ፍጆታ", af: "Verbruikers", zu: "Ukudla", xh: "Ukutya",
    sn: "Zvekushandiswa", st: "Tshebediso", ee: "Nuɖuɖu", ln: "Consommation", tw: "Adetɔn",
    ff: "Consommation", fo: "Consommation", kg: "Consommation", sg: "Consommation", tn: "Tiriso",
    ts: "Ku tirhisa", nd: "Ukusetshenziswa", ss: "Kusetjentiswa"
  },
  "Industrie": {
    fr: "Industrie", en: "Industry", es: "Industria", ar: "صناعة", de: "Industrie", pt: "Indústria",
    wo: "Industrie", bm: "Industrie", yo: "Ilé-iṣẹ́", ig: "Ụlọ ọrụ", ha: "Masana'antu",
    sw: "Viwanda", am: "ኢንዱስትሪ", af: "Nywerheid", zu: "Ezimboni", xh: "Ishishini",
    sn: "Zvemaindasitiri", st: "Indasteri", ee: "Dɔwɔƒe", ln: "Industrie", tw: "Adwumayɛbea",
    ff: "Industrie", fo: "Industrie", kg: "Industrie", sg: "Industrie", tn: "Intaseteri",
    ts: "Indasitiri", nd: "Imboni", ss: "Imboni"
  },
  "Ciment": {
    fr: "Ciment", en: "Cement", es: "Cemento", ar: "إسمنت", de: "Zement", pt: "Cimento",
    wo: "Ciment", bm: "Ciment", yo: "Simenti", ig: "Simenti", ha: "Siminti",
    sw: "Saruji", am: "ሲሚንቶ", af: "Sement", zu: "Usimende", xh: "Isamente",
    sn: "Simende", st: "Samente", ee: "Simenti", ln: "Ciment", tw: "Simenti",
    ff: "Ciment", fo: "Ciment", kg: "Ciment", sg: "Ciment", tn: "Samente",
    ts: "Simende", nd: "Isamente", ss: "Simenede"
  },
  "Pétrole & Gaz": {
    fr: "Pétrole & Gaz", en: "Oil & Gas", es: "Petróleo y Gas", ar: "نفط وغاز", de: "Öl & Gas", pt: "Petróleo e Gás",
    wo: "Pétrole & Gaz", bm: "Pétrole & Gaz", yo: "Epo & Gaasi", ig: "Mmanụ & Gas", ha: "Mai & Gas",
    sw: "Mafuta na Gesi", am: "ነዳጅ እና ጋዝ", af: "Olie & Gas", zu: "Uwoyela negesi", xh: "Ioyile negesi",
    sn: "Mafuta neGasi", st: "Oli le Gase", ee: "Ami kple Gas", ln: "Pétrole & Gaz", tw: "Ngo ne Gas",
    ff: "Pétrole & Gaz", fo: "Pétrole & Gaz", kg: "Pétrole & Gaz", sg: "Pétrole & Gaz", tn: "Oli le Gase",
    ts: "Oyili na Gasi", nd: "Amafutha leGesi", ss: "Emafutha neGesi"
  },
  "Énergie": {
    fr: "Énergie", en: "Energy", es: "Energía", ar: "طاقة", de: "Energie", pt: "Energia",
    wo: "Énergie", bm: "Énergie", yo: "Agbara", ig: "Ike", ha: "Makamashi",
    sw: "Nishati", am: "ኃይል", af: "Energie", zu: "Amandla", xh: "Amandla",
    sn: "Simba", st: "Matla", ee: "Ŋusẽ", ln: "Énergie", tw: "Ahoɔden",
    ff: "Énergie", fo: "Énergie", kg: "Énergie", sg: "Énergie", tn: "Maatla",
    ts: "Matimba", nd: "Amandla", ss: "Emandla"
  },
  "Immobilier": {
    fr: "Immobilier", en: "Real Estate", es: "Inmobiliario", ar: "عقارات", de: "Immobilien", pt: "Imobiliário",
    wo: "Immobilier", bm: "Immobilier", yo: "Ohun-ìní", ig: "Ụlọ", ha: "Gidaje",
    sw: "Mali isiyohamishika", am: "ሪል እስቴት", af: "Eiendom", zu: "Izakhiwo", xh: "Ipropati",
    sn: "Zvivako", st: "Matlo", ee: "Aƒeɖoɖo", ln: "Immobilier", tw: "Adan",
    ff: "Immobilier", fo: "Immobilier", kg: "Immobilier", sg: "Immobilier", tn: "Matlo",
    ts: "Yindlu", nd: "Izindlu", ss: "Tindlu"
  },
  "Distribution": {
    fr: "Distribution", en: "Distribution", es: "Distribución", ar: "توزيع", de: "Vertrieb", pt: "Distribuição",
    wo: "Distribution", bm: "Distribution", yo: "Ìpínpín", ig: "Nkesa", ha: "Rarraba",
    sw: "Usambazaji", am: "ስርጭት", af: "Verspreiding", zu: "Ukusabalalisa", xh: "Ukusasazwa",
    sn: "Kugovera", st: "Phatlalatso", ee: "Mɔmɔme", ln: "Distribution", tw: "Nkyɛmu",
    ff: "Distribution", fo: "Distribution", kg: "Distribution", sg: "Distribution", tn: "Kabo",
    ts: "Ku avanyisa", nd: "Ukwaba", ss: "Kusabalalisa"
  },
  "Loterie": {
    fr: "Loterie", en: "Lottery", es: "Lotería", ar: "يانصيب", de: "Lotterie", pt: "Loteria",
    wo: "Loterie", bm: "Loterie", yo: "Lotiri", ig: "Lotarị", ha: "Lottery",
    sw: "Bahati nasibu", am: "ሎተሪ", af: "Lotery", zu: "Ilotho", xh: "Ilotho",
    sn: "Lotari", st: "Lottery", ee: "Lottery", ln: "Loterie", tw: "Lottery",
    ff: "Loterie", fo: "Loterie", kg: "Loterie", sg: "Loterie", tn: "Lottery",
    ts: "Lothari", nd: "Ilotho", ss: "Ilotho"
  },
  "Boissons": {
    fr: "Boissons", en: "Beverages", es: "Bebidas", ar: "مشروبات", de: "Getränke", pt: "Bebidas",
    wo: "Boissons", bm: "Boissons", yo: "Ohun mimu", ig: "Ihe ọṅụṅụ", ha: "Abubuwan sha",
    sw: "Vinywaji", am: "መጠጦች", af: "Drankies", zu: "Iziphuzo", xh: "Iziselo",
    sn: "Zvinwiwa", st: "Dino", ee: "Nunɔameɖeɖe", ln: "Boissons", tw: "Nsa",
    ff: "Boissons", fo: "Boissons", kg: "Boissons", sg: "Boissons", tn: "Dino",
    ts: "Swinwi", nd: "Okunathwayo", ss: "Tintfo tekunatsa"
  },
  "Construction": {
    fr: "Construction", en: "Construction", es: "Construcción", ar: "بناء", de: "Bau", pt: "Construção",
    wo: "Construction", bm: "Construction", yo: "Iṣẹ́ ìkọ́lé", ig: "Owuwu", ha: "Gini",
    sw: "Ujenzi", am: "ግንባታ", af: "Konstruksie", zu: "Ukwakha", xh: "Ukwakhiwa",
    sn: "Kuvaka", st: "Kaho", ee: "Xɔtutu", ln: "Construction", tw: "Nsisie",
    ff: "Construction", fo: "Construction", kg: "Construction", sg: "Construction", tn: "Kago",
    ts: "Ku aka", nd: "Ukwakha", ss: "Kwakha"
  },
  "Agriculture": {
    fr: "Agriculture", en: "Agriculture", es: "Agricultura", ar: "زراعة", de: "Landwirtschaft", pt: "Agricultura",
    wo: "Agriculture", bm: "Agriculture", yo: "Iṣẹ́ Ogbin", ig: "Ọrụ ugbo", ha: "Noma",
    sw: "Kilimo", am: "ግብርና", af: "Landbou", zu: "Ezolimo", xh: "Ezolimo",
    sn: "Kurima", st: "Temo", ee: "Agbledede", ln: "Agriculture", tw: "Kuadwuma",
    ff: "Agriculture", fo: "Agriculture", kg: "Agriculture", sg: "Agriculture", tn: "Temo",
    ts: "Vurimi", nd: "Ukulima", ss: "Tekulima"
  },
  "Conglomérat": {
    fr: "Conglomérat", en: "Conglomerate", es: "Conglomerado", ar: "تكتل", de: "Konglomerat", pt: "Conglomerado",
    wo: "Conglomérat", bm: "Conglomérat", yo: "Ẹgbẹ́-ilé-iṣẹ́", ig: "Nnukwu ụlọ ọrụ", ha: "Kamfanoni",
    sw: "Kampuni kubwa", am: "ኮንግሎመሬት", af: "Konglomeraat", zu: "Inkampani enkulu", xh: "Inkampani enkulu",
    sn: "Kambani huru", st: "Khampani e kgolo", ee: "Habɔbɔ", ln: "Conglomérat", tw: "Adwumakuo kɛseɛ",
    ff: "Conglomérat", fo: "Conglomérat", kg: "Conglomérat", sg: "Conglomérat", tn: "Khampani e kgolo",
    ts: "Khampani leyikulu", nd: "Inkampani enkulu", ss: "Inkampani lenkhulu"
  },
  "Tourisme": {
    fr: "Tourisme", en: "Tourism", es: "Turismo", ar: "سياحة", de: "Tourismus", pt: "Turismo",
    wo: "Tourisme", bm: "Tourisme", yo: "Irin-ajo", ig: "Njem", ha: "Yawon shakatawa",
    sw: "Utalii", am: "ቱሪዝም", af: "Toerisme", zu: "Ezokuvakasha", xh: "Uhendle",
    sn: "Zvokushanyira", st: "Bohahlauli", ee: "Tɔtrɔ", ln: "Tourisme", tw: "Akwantuo",
    ff: "Tourisme", fo: "Tourisme", kg: "Tourisme", sg: "Tourisme", tn: "Bojanala",
    ts: "Vuendzi", nd: "Ukuvakatsha", ss: "Kuvakasha"
  },
  "Services": {
    fr: "Services", en: "Services", es: "Servicios", ar: "خدمات", de: "Dienstleistungen", pt: "Serviços",
    wo: "Services", bm: "Services", yo: "Iṣẹ́ ìpèsè", ig: "Ọrụ", ha: "Ayyuka",
    sw: "Huduma", am: "አገልግሎቶች", af: "Dienste", zu: "Izinsizakalo", xh: "Iinkonzo",
    sn: "Masevhisi", st: "Ditshebeletso", ee: "Dɔwɔnawo", ln: "Services", tw: "Ɔsom",
    ff: "Services", fo: "Services", kg: "Services", sg: "Services", tn: "Ditirelo",
    ts: "Vukorhokeri", nd: "Izinsiza", ss: "Tinsita"
  },
  "Commerce": {
    fr: "Commerce", en: "Retail", es: "Comercio", ar: "تجارة", de: "Handel", pt: "Comércio",
    wo: "Commerce", bm: "Commerce", yo: "Iṣòwò", ig: "Ahịa", ha: "Kasuwanci",
    sw: "Biashara", am: "ንግድ", af: "Handel", zu: "Ezohwebo", xh: "Urhwebo",
    sn: "Zvekutengeserana", st: "Kgwebo", ee: "Asitsatsa", ln: "Commerce", tw: "Aguadie",
    ff: "Commerce", fo: "Commerce", kg: "Commerce", sg: "Commerce", tn: "Kgwebo",
    ts: "Bindzu", nd: "Ukuthengisa", ss: "Kwentsenga"
  },
  "Technologie": {
    fr: "Technologie", en: "Technology", es: "Tecnología", ar: "تكنولوجيا", de: "Technologie", pt: "Tecnologia",
    wo: "Technologie", bm: "Technologie", yo: "Ìmọ̀-ẹ̀rọ", ig: "Teknụzụ", ha: "Fasaha",
    sw: "Teknolojia", am: "ቴክኖሎጂ", af: "Tegnologie", zu: "Ubuchwepheshe", xh: "Iteknoloji",
    sn: "Tekinoroji", st: "Theknoloji", ee: "Teknolodzi", ln: "Technologie", tw: "Nhyehyɛe",
    ff: "Technologie", fo: "Technologie", kg: "Technologie", sg: "Technologie", tn: "Thekenoloji",
    ts: "Thekinoloji", nd: "Ithekhinoloji", ss: "Thekinoloji"
  },
  "Santé": {
    fr: "Santé", en: "Healthcare", es: "Salud", ar: "صحة", de: "Gesundheit", pt: "Saúde",
    wo: "Santé", bm: "Santé", yo: "Ìlera", ig: "Ahụ ike", ha: "Kiwon lafiya",
    sw: "Afya", am: "ጤና", af: "Gesondheid", zu: "Ezempilo", xh: "Ezempilo",
    sn: "Hutano", st: "Bophelo", ee: "Lãmesese", ln: "Santé", tw: "Apɔmuden",
    ff: "Santé", fo: "Santé", kg: "Santé", sg: "Santé", tn: "Boitekanelo",
    ts: "Rihanyo", nd: "Impilo", ss: "Imphilo"
  },
  "Infrastructure": {
    fr: "Infrastructure", en: "Infrastructure", es: "Infraestructura", ar: "بنية تحتية", de: "Infrastruktur", pt: "Infraestrutura",
    wo: "Infrastructure", bm: "Infrastructure", yo: "Àwọn ohun àmúṣe", ig: "Akụrụngwa", ha: "Kayan more",
    sw: "Miundombinu", am: "መሰረተ ልማት", af: "Infrastruktuur", zu: "Ingqalasizinda", xh: "Iziseko",
    sn: "Zvishandiso", st: "Motheo", ee: "Dɔwɔƒekpɔkpɔ", ln: "Infrastructure", tw: "Nneɛma a ɛhia",
    ff: "Infrastructure", fo: "Infrastructure", kg: "Infrastructure", sg: "Infrastructure", tn: "Motheo",
    ts: "Xisekelo", nd: "Ingqalasizinda", ss: "Ingcikitsi"
  },
  "Transport": {
    fr: "Transport", en: "Transport", es: "Transporte", ar: "نقل", de: "Transport", pt: "Transporte",
    wo: "Transport", bm: "Transport", yo: "Gbígbe", ig: "Njem", ha: "Sufuri",
    sw: "Usafiri", am: "ትራንስፖርት", af: "Vervoer", zu: "Ezokuthutha", xh: "Ezothutho",
    sn: "Zvekufambisa", st: "Dipalangwang", ee: "Mɔzɔzɔ", ln: "Transport", tw: "Akwantu",
    ff: "Transport", fo: "Transport", kg: "Transport", sg: "Transport", tn: "Dipalangwa",
    ts: "Vutleketli", nd: "Ezokuthutha", ss: "Kwetfutfwa"
  },
  "Éducation": {
    fr: "Éducation", en: "Education", es: "Educación", ar: "تعليم", de: "Bildung", pt: "Educação",
    wo: "Éducation", bm: "Éducation", yo: "Ẹ̀kọ́", ig: "Agụmakwụkwọ", ha: "Ilimi",
    sw: "Elimu", am: "ትምህርት", af: "Onderwys", zu: "Imfundo", xh: "Imfundo",
    sn: "Dzidzo", st: "Thuto", ee: "Nufiala", ln: "Éducation", tw: "Adesua",
    ff: "Éducation", fo: "Éducation", kg: "Éducation", sg: "Éducation", tn: "Thuto",
    ts: "Dyondzo", nd: "Imfundo", ss: "Imfundvo"
  },
  "Télécommunications": {
    fr: "Télécommunications", en: "Telecommunications", es: "Telecomunicaciones", ar: "اتصالات", de: "Telekommunikation", pt: "Telecomunicações",
    wo: "Télécommunications", bm: "Télécommunications", yo: "Ibaraẹnisọrọ", ig: "Ekwurịta ọkụ", ha: "Sadarwa",
    sw: "Mawasiliano", am: "ቴሌኮሙኒኬሽን", af: "Telekommunikasie", zu: "Ezokuxhumana", xh: "Unxibelelwano",
    sn: "Zvekutaurirana", st: "Mehala", ee: "Kakakaɖoɖo", ln: "Télécommunications", tw: "Kasafobea",
    ff: "Télécommunications", fo: "Télécommunications", kg: "Télécommunications", sg: "Télécommunications", tn: "Megala",
    ts: "Riqingho", nd: "Ezokuxhumana", ss: "Kuxhumana"
  }
};

// ============================================================
// Traductions des secteurs (opportunités) — ancien format gardé pour compatibilité
// ============================================================
export const sectorTranslations = {
  "Énergie": { en: "Energy", fr: "Énergie", es: "Energía", ar: "طاقة", de: "Energie", pt: "Energia", sw: "Nishati", am: "ኃይል", ha: "Makamashi", yo: "Agbara", ig: "Ike", zu: "Amandla", xh: "Amandla", af: "Energie", sn: "Simba", st: "Matla" },
  "Technologie": { en: "Technology", fr: "Technologie", es: "Tecnología", ar: "تكنولوجيا", de: "Technologie", pt: "Tecnologia", sw: "Teknolojia", am: "ቴክኖሎጂ", ha: "Fasaha", yo: "Ìmọ̀-ẹ̀rọ", ig: "Teknụzụ", zu: "Ubuchwepheshe", xh: "Iteknoloji", af: "Tegnologie", sn: "Tekinoroji", st: "Theknoloji" },
  "Finance": { en: "Finance", fr: "Finance", es: "Finanzas", ar: "مالية", de: "Finanzen", pt: "Finanças", sw: "Fedha", am: "ፋይናንስ", ha: "Kudi", yo: "Iṣuna", ig: "Ego", zu: "Ezezimali", xh: "Ezemali", af: "Finansies", sn: "Zvemari", st: "Ditjhelete" },
  "Agriculture": { en: "Agriculture", fr: "Agriculture", es: "Agricultura", ar: "زراعة", de: "Landwirtschaft", pt: "Agricultura", sw: "Kilimo", am: "ግብርና", ha: "Noma", yo: "Iṣẹ́ Ogbin", ig: "Ọrụ ugbo", zu: "Ezolimo", xh: "Ezolimo", af: "Landbou", sn: "Kurima", st: "Temo" },
  "Immobilier": { en: "Real Estate", fr: "Immobilier", es: "Inmobiliario", ar: "عقارات", de: "Immobilien", pt: "Imobiliário", sw: "Mali isiyohamishika", am: "ሪል እስቴት", ha: "Gidaje", yo: "Ohun-ìní", ig: "Ụlọ", zu: "Izakhiwo", xh: "Ipropati", af: "Eiendom", sn: "Zvivako", st: "Matlo" },
  "Santé": { en: "Healthcare", fr: "Santé", es: "Salud", ar: "صحة", de: "Gesundheit", pt: "Saúde", sw: "Afya", am: "ጤና", ha: "Kiwon lafiya", yo: "Ìlera", ig: "Ahụ ike", zu: "Ezempilo", xh: "Ezempilo", af: "Gesondheid", sn: "Hutano", st: "Bophelo" },
  "Infrastructure": { en: "Infrastructure", fr: "Infrastructure", es: "Infraestructura", ar: "بنية تحتية", de: "Infrastruktur", pt: "Infraestrutura", sw: "Miundombinu", am: "መሰረተ ልማት", ha: "Kayan more", yo: "Àwọn ohun àmúṣe", ig: "Akụrụngwa", zu: "Ingqalasizinda", xh: "Iziseko", af: "Infrastruktuur", sn: "Zvishandiso", st: "Motheo" },
  "Industrie": { en: "Industry", fr: "Industrie", es: "Industria", ar: "صناعة", de: "Industrie", pt: "Indústria", sw: "Viwanda", am: "ኢንዱስትሪ", ha: "Masana'antu", yo: "Ilé-iṣẹ́", ig: "Ụlọ ọrụ", zu: "Ezimboni", xh: "Ishishini", af: "Nywerheid", sn: "Zvemaindasitiri", st: "Indasteri" },
  "Télécommunications": { en: "Telecommunications", fr: "Télécommunications", es: "Telecomunicaciones", ar: "اتصالات", de: "Telekommunikation", pt: "Telecomunicações", sw: "Mawasiliano", am: "ቴሌኮሙኒኬሽን", ha: "Sadarwa", yo: "Ibaraẹnisọrọ", ig: "Ekwurịta ọkụ", zu: "Ezokuxhumana", xh: "Unxibelelwano", af: "Telekommunikasie", sn: "Zvekutaurirana", st: "Mehala" },
  "Transport": { en: "Transport", fr: "Transport", es: "Transporte", ar: "نقل", de: "Transport", pt: "Transporte", sw: "Usafiri", am: "ትራንስፖርት", ha: "Sufuri", yo: "Gbígbe", ig: "Njem", zu: "Ezokuthutha", xh: "Ezothutho", af: "Vervoer", sn: "Zvekufambisa", st: "Dipalangwang" },
  "Éducation": { en: "Education", fr: "Éducation", es: "Educación", ar: "تعليم", de: "Bildung", pt: "Educação", sw: "Elimu", am: "ትምህርት", ha: "Ilimi", yo: "Ẹ̀kọ́", ig: "Agụmakwụkwọ", zu: "Imfundo", xh: "Imfundo", af: "Onderwys", sn: "Dzidzo", st: "Thuto" },
  "Commerce": { en: "Retail", fr: "Commerce", es: "Comercio", ar: "تجارة", de: "Handel", pt: "Comércio", sw: "Biashara", am: "ንግድ", ha: "Kasuwanci", yo: "Iṣòwò", ig: "Ahịa", zu: "Ezohwebo", xh: "Urhwebo", af: "Handel", sn: "Zvekutengeserana", st: "Kgwebo" },
  "Tourisme": { en: "Tourism", fr: "Tourisme", es: "Turismo", ar: "سياحة", de: "Tourismus", pt: "Turismo", sw: "Utalii", am: "ቱሪዝም", ha: "Yawon shakatawa", yo: "Irin-ajo", ig: "Njem", zu: "Ezokuvakasha", xh: "Uhendle", af: "Toerisme", sn: "Zvokushanyira", st: "Bohahlauli" }
};

// Traductions des sous-secteurs
export const subsectorTranslations = {
  "Éolien": { en: "Wind Power", fr: "Éolien" },
  "Solaire": { en: "Solar", fr: "Solaire" },
  "Hydrogène": { en: "Hydrogen", fr: "Hydrogène" },
  "Fintech": { en: "Fintech", fr: "Fintech" },
  "IA": { en: "AI", fr: "IA" },
  "Cloud": { en: "Cloud", fr: "Cloud" },
  "E-commerce": { en: "E-commerce", fr: "E-commerce" },
  "Blockchain": { en: "Blockchain", fr: "Blockchain" },
  "Banque Mobile": { en: "Mobile Banking", fr: "Banque Mobile" },
  "Assurance": { en: "Insurance", fr: "Assurance" },
  "Céréales": { en: "Grains", fr: "Céréales" },
  "Cacao": { en: "Cocoa", fr: "Cacao" },
  "Café": { en: "Coffee", fr: "Café" },
  "Aquaculture": { en: "Aquaculture", fr: "Aquaculture" },
  "Résidentiel": { en: "Residential", fr: "Résidentiel" },
  "Commercial": { en: "Commercial", fr: "Commercial" },
  "Logistique": { en: "Logistics", fr: "Logistique" },
  "Hôtellerie": { en: "Hospitality", fr: "Hôtellerie" },
  "Routes": { en: "Roads", fr: "Routes" },
  "Ports": { en: "Ports", fr: "Ports" },
  "Aéroports": { en: "Airports", fr: "Aéroports" },
  "Télécoms": { en: "Telecom", fr: "Télécoms" },
  "5G": { en: "5G", fr: "5G" },
  "Pharmaceutique": { en: "Pharmaceutical", fr: "Pharmaceutique" },
  "Cliniques": { en: "Clinics", fr: "Cliniques" },
  "Automobile": { en: "Automotive", fr: "Automobile" },
  "Textile": { en: "Textile", fr: "Textile" },
  "Mines": { en: "Mining", fr: "Mines" },
  "Pétrole & Gaz": { en: "Oil & Gas", fr: "Pétrole & Gaz" }
};

// Traductions des types d'opportunités
export const opportunityTypeTranslations = {
  "Projet Énergétique": { en: "Energy Project", fr: "Projet Énergétique" },
  "Méga Projet": { en: "Mega Project", fr: "Méga Projet" },
  "Startup Tech": { en: "Tech Startup", fr: "Startup Tech" },
  "Scale-up": { en: "Scale-up", fr: "Scale-up" },
  "Fonds d'Investissement": { en: "Investment Fund", fr: "Fonds d'Investissement" },
  "Infrastructure": { en: "Infrastructure", fr: "Infrastructure" },
  "Développement Immobilier": { en: "Real Estate Development", fr: "Développement Immobilier" },
  "Expansion Commerciale": { en: "Business Expansion", fr: "Expansion Commerciale" },
  "Projet Agricole": { en: "Agricultural Project", fr: "Projet Agricole" },
  "Usine de Production": { en: "Manufacturing Plant", fr: "Usine de Production" }
};

// Traductions des niveaux de risque
export const riskLevelTranslations = {
  "low": { en: "Low", fr: "Faible" },
  "medium": { en: "Medium", fr: "Moyen" },
  "high": { en: "High", fr: "Élevé" }
};

// Traductions des stades
export const stageTranslations = {
  "Pré-amorçage": { en: "Pre-seed", fr: "Pré-amorçage" },
  "Amorçage": { en: "Seed", fr: "Amorçage" },
  "Série A": { en: "Series A", fr: "Série A" },
  "Série B": { en: "Series B", fr: "Série B" },
  "Croissance": { en: "Growth", fr: "Croissance" },
  "Développement": { en: "Development", fr: "Développement" },
  "Expansion": { en: "Expansion", fr: "Expansion" },
  "Mature": { en: "Mature", fr: "Mature" }
};

// Traductions des tailles d'entreprise
export const companySizeTranslations = {
  "Start-up": { en: "Startup", fr: "Start-up" },
  "PME": { en: "SME", fr: "PME" },
  "Moyenne entreprise": { en: "Mid-size company", fr: "Moyenne entreprise" },
  "Grande entreprise": { en: "Large company", fr: "Grande entreprise" },
  "Multinationale": { en: "Multinational", fr: "Multinationale" }
};

// Traductions des pays
export const countryTranslations = {
  "Maroc": { en: "Morocco", fr: "Maroc" },
  "Égypte": { en: "Egypt", fr: "Égypte" },
  "Nigeria": { en: "Nigeria", fr: "Nigeria" },
  "Afrique du Sud": { en: "South Africa", fr: "Afrique du Sud" },
  "Kenya": { en: "Kenya", fr: "Kenya" },
  "Ghana": { en: "Ghana", fr: "Ghana" },
  "Côte d'Ivoire": { en: "Ivory Coast", fr: "Côte d'Ivoire" },
  "Sénégal": { en: "Senegal", fr: "Sénégal" },
  "Éthiopie": { en: "Ethiopia", fr: "Éthiopie" },
  "Tanzanie": { en: "Tanzania", fr: "Tanzanie" },
  "Ouganda": { en: "Uganda", fr: "Ouganda" },
  "Rwanda": { en: "Rwanda", fr: "Rwanda" },
  "Tunisie": { en: "Tunisia", fr: "Tunisie" },
  "Algérie": { en: "Algeria", fr: "Algérie" },
  "Zambie": { en: "Zambia", fr: "Zambie" },
  "Zimbabwe": { en: "Zimbabwe", fr: "Zimbabwe" },
  "Botswana": { en: "Botswana", fr: "Botswana" },
  "Maurice": { en: "Mauritius", fr: "Maurice" },
  "Namibie": { en: "Namibia", fr: "Namibie" },
  "Angola": { en: "Angola", fr: "Angola" },
  "Mozambique": { en: "Mozambique", fr: "Mozambique" }
};

// Fonction helper pour obtenir une traduction
export const getTranslation = (text, translations, language) => {
  if (!text) return text;
  const lang = language ? language.substring(0, 2).toLowerCase() : 'fr';
  const translation = translations[text];
  if (!translation) return text;
  return translation[lang] || translation['en'] || text;
};

// Fonction pour traduire un secteur de marché (pour africanExchanges)
export const translateMarketSector = (sectorName, language) => {
  return getTranslation(sectorName, marketSectorTranslations, language);
};

// Fonction pour traduire un objet opportunité complet
export const translateOpportunity = (opportunity, language) => {
  if (!opportunity || language === 'fr') return opportunity;

  return {
    ...opportunity,
    sector: getTranslation(opportunity.sector, sectorTranslations, language),
    subsector: getTranslation(opportunity.subsector, subsectorTranslations, language),
    country_name: getTranslation(opportunity.country_name, countryTranslations, language),
    opportunity_type: getTranslation(opportunity.opportunity_type, opportunityTypeTranslations, language),
    risk_level: getTranslation(opportunity.risk_level, riskLevelTranslations, language),
    stage: getTranslation(opportunity.stage, stageTranslations, language),
    company_size: getTranslation(opportunity.company_size, companySizeTranslations, language),
  };
};

// Export de toutes les traductions
export default {
  marketSectorTranslations,
  sectorTranslations,
  subsectorTranslations,
  opportunityTypeTranslations,
  riskLevelTranslations,
  stageTranslations,
  companySizeTranslations,
  countryTranslations,
  getTranslation,
  translateMarketSector,
  translateOpportunity
};

// Traductions des catégories de news
export const newsCategoryTranslations = {
  "IPO": { en: "IPO", fr: "IPO", es: "OPV", ar: "اكتتاب", de: "Börsengang", pt: "IPO", sw: "IPO", am: "IPO", ha: "IPO" },
  "M&A": { en: "M&A", fr: "M&A", es: "F&A", ar: "اندماج واستحواذ", de: "M&A", pt: "F&A", sw: "M&A", am: "M&A", ha: "M&A" },
  "Earnings": { en: "Earnings", fr: "Résultats", es: "Resultados", ar: "أرباح", de: "Ergebnisse", pt: "Resultados", sw: "Mapato", am: "ገቢዎች", ha: "Ribar" },
  "Monetary Policy": { en: "Monetary Policy", fr: "Politique Monétaire", es: "Política Monetaria", ar: "سياسة نقدية", de: "Geldpolitik", pt: "Política Monetária", sw: "Sera ya Fedha", am: "የገንዘብ ፖሊሲ", ha: "Manufar Kuɗi" },
  "Regulation": { en: "Regulation", fr: "Réglementation", es: "Regulación", ar: "تنظيم", de: "Regulierung", pt: "Regulamentação", sw: "Udhibiti", am: "ደንብ", ha: "Tsari" },
  "Commodities": { en: "Commodities", fr: "Matières Premières", es: "Materias Primas", ar: "سلع", de: "Rohstoffe", pt: "Commodities", sw: "Bidhaa", am: "ሸቀጦች", ha: "Kayayyaki" },
  "Technology": { en: "Technology", fr: "Technologie", es: "Tecnología", ar: "تكنولوجيا", de: "Technologie", pt: "Tecnologia", sw: "Teknolojia", am: "ቴክኖሎጂ", ha: "Fasaha" },
  "Banking": { en: "Banking", fr: "Banque", es: "Banca", ar: "مصرفية", de: "Bankwesen", pt: "Bancário", sw: "Benki", am: "ባንክ", ha: "Banki" },
  "Market Update": { en: "Market Update", fr: "Actualité Marché", es: "Actualización del Mercado", ar: "تحديث السوق", de: "Marktupdate", pt: "Atualização do Mercado", sw: "Sasisho la Soko", am: "የገበያ ዝማኔ", ha: "Sabuntawar Kasuwa" },
  "Investment": { en: "Investment", fr: "Investissement", es: "Inversión", ar: "استثمار", de: "Investition", pt: "Investimento", sw: "Uwekezaji", am: "ኢንቨስትመንት", ha: "Saka hannun jari" },
  "Economy": { en: "Economy", fr: "Économie", es: "Economía", ar: "اقتصاد", de: "Wirtschaft", pt: "Economia", sw: "Uchumi", am: "ኢኮኖሚ", ha: "Tattalin arziki" },
  "Finance": { en: "Finance", fr: "Finance", es: "Finanzas", ar: "مالية", de: "Finanzen", pt: "Finanças", sw: "Fedha", am: "ፋይናንስ", ha: "Kudi" },
  "Business": { en: "Business", fr: "Entreprises", es: "Negocios", ar: "أعمال", de: "Wirtschaft", pt: "Negócios", sw: "Biashara", am: "ንግድ", ha: "Kasuwanci" }
};

// Fonction pour traduire une actualité
export const translateNews = (newsItem, language) => {
  if (!newsItem || language === 'fr') return newsItem;

  return {
    ...newsItem,
    category: getTranslation(newsItem.category, newsCategoryTranslations, language),
  };
};
