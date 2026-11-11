import i18n from 'i18next';

// jsPDF et XLSX chargés à la demande (lazy) — économise ~30MB du bundle initial
let _jsPDF = null;
let _autoTable = null;
let _XLSX = null;

async function loadPdfLibs() {
  if (!_jsPDF) {
    const [jspdfMod, autoTableMod] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);
    _jsPDF = jspdfMod.jsPDF;
    _autoTable = autoTableMod.default;
  }
  return { jsPDF: _jsPDF, autoTable: _autoTable };
}

async function loadXlsx() {
  if (!_XLSX) {
    const mod = await import('xlsx');
    _XLSX = mod;
  }
  return _XLSX;
}

/**
 * Exporter les données du portefeuille en PDF
 */
export const exportPortfolioPDF = async (portfolioData, summary) => {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  const t = i18n.t;

  // En-tête
  doc.setFontSize(20);
  doc.setTextColor(249, 115, 22); // Orange
  doc.text(t('exports.portfolioReport'), 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${t('exports.generatedAt')} ${new Date().toLocaleDateString(i18n.language || 'fr-FR')} ${t('exports.at', 'à')} ${new Date().toLocaleTimeString(i18n.language || 'fr-FR')}`, 14, 28);

  // Résumé financier
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(t('exports.financialSummary'), 14, 40);

  const summaryData = [
    [t('exports.totalPortfolioValue'), formatCurrency(summary.portfolioValue)],
    [t('exports.totalInvestment'), formatCurrency(summary.totalCost)],
    [t('exports.totalGainLoss'), formatCurrency(summary.totalGainLoss)],
    [t('exports.return'), `${summary.totalGainLossPercent >= 0 ? '+' : ''}${summary.totalGainLossPercent.toFixed(2)}%`],
    [t('exports.availableBalance'), formatCurrency(summary.cashBalance)],
    [t('exports.numberOfHoldings'), summary.numberOfHoldings.toString()]
  ];

  autoTable(doc, {
    startY: 45,
    head: [[t('exports.indicator'), t('exports.value')]],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22] },
    margin: { left: 14 }
  });

  // Détails des positions
  doc.setFontSize(14);
  doc.text(t('exports.positionDetails'), 14, doc.previousAutoTable.finalY + 15);

  const holdingsData = portfolioData.map(holding => [
    holding.market_id,
    holding.stock_name || holding.market_id,
    holding.quantity.toString(),
    formatCurrency(holding.average_price),
    formatCurrency(holding.current_price),
    formatCurrency(holding.current_value),
    `${holding.gain_loss_percent >= 0 ? '+' : ''}${holding.gain_loss_percent.toFixed(2)}%`
  ]);

  autoTable(doc, {
    startY: doc.previousAutoTable.finalY + 20,
    head: [[t('exports.ticker'), t('exports.name'), t('exports.quantity'), t('exports.averagePrice'), t('exports.currentPrice'), t('exports.totalValue'), t('exports.performance')]],
    body: holdingsData,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22] },
    styles: { fontSize: 8 },
    margin: { left: 14 }
  });

  // Pied de page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} sur ${pageCount} | ${t('exports.pendo')}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Télécharger
  doc.save(`PENDO_Portfolio_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Exporter les analytics en PDF
 */
export const exportAnalyticsPDF = async (portfolioSummary, performanceData, timeRange) => {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  const t = i18n.t;

  // En-tête
  doc.setFontSize(20);
  doc.setTextColor(249, 115, 22);
  doc.text(t('exports.analyticsReport'), 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`${t('exports.period')}: ${timeRange} ${t('exports.days')} | ${t('exports.generatedAt')} ${new Date().toLocaleDateString(i18n.language || 'fr-FR')}`, 14, 28);

  // Vue d'ensemble
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(t('exports.overview'), 14, 40);

  const { holdings, summary } = portfolioSummary;

  // Calculer les statistiques
  const sectorAllocation = {};
  holdings.forEach(h => {
    const sector = h.sector || 'Autres';
    if (!sectorAllocation[sector]) {
      sectorAllocation[sector] = { value: 0, count: 0 };
    }
    sectorAllocation[sector].value += h.current_value || 0;
    sectorAllocation[sector].count += 1;
  });

  const overviewData = [
    [t('exports.totalValue'), formatCurrency(summary.totalValue)],
    [t('exports.averageReturn'), `${summary.totalGainLossPercent >= 0 ? '+' : ''}${summary.totalGainLossPercent.toFixed(2)}%`],
    [t('exports.activePositions'), holdings.length.toString()],
    [t('exports.representedSectors'), Object.keys(sectorAllocation).length.toString()]
  ];

  autoTable(doc, {
    startY: 45,
    head: [[t('exports.indicator'), t('exports.value')]],
    body: overviewData,
    theme: 'striped',
    headStyles: { fillColor: [249, 115, 22] },
    margin: { left: 14 }
  });

  // Répartition par secteur
  doc.setFontSize(14);
  doc.text(t('exports.sectorAllocation'), 14, doc.previousAutoTable.finalY + 15);

  const sectorData = Object.entries(sectorAllocation).map(([sector, data]) => [
    sector,
    formatCurrency(data.value),
    `${((data.value / summary.totalValue) * 100).toFixed(1)}%`,
    data.count.toString()
  ]);

  autoTable(doc, {
    startY: doc.previousAutoTable.finalY + 20,
    head: [[t('exports.sector'), t('exports.value'), t('exports.share'), t('exports.positions')]],
    body: sectorData,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22] },
    margin: { left: 14 }
  });

  // Top performers
  const topPerformers = [...holdings]
    .sort((a, b) => (b.gain_loss_percent || 0) - (a.gain_loss_percent || 0))
    .slice(0, 5);

  if (topPerformers.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(t('exports.topPerformances'), 14, 20);

    const topData = topPerformers.map(h => [
      h.market_id,
      h.stock_name || h.market_id,
      formatCurrency(h.current_value),
      `${h.gain_loss_percent >= 0 ? '+' : ''}${h.gain_loss_percent.toFixed(2)}%`,
      formatCurrency(h.gain_loss)
    ]);

    autoTable(doc, {
      startY: 25,
      head: [[t('exports.ticker'), t('exports.name'), t('exports.value'), t('exports.performance'), t('exports.gainLoss')]],
      body: topData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] }, // Vert
      margin: { left: 14 }
    });
  }

  // Performance historique
  if (performanceData && performanceData.length > 0) {
    doc.setFontSize(14);
    doc.text(t('exports.performanceHistory'), 14, doc.previousAutoTable.finalY + 15);

    const perfData = performanceData.slice(0, 10).map(point => [
      new Date(point.date).toLocaleDateString(i18n.language || 'fr-FR'),
      formatCurrency(point.total_value),
      `${point.total_gain_loss_percent >= 0 ? '+' : ''}${point.total_gain_loss_percent.toFixed(2)}%`,
      formatCurrency(point.total_gain_loss)
    ]);

    autoTable(doc, {
      startY: doc.previousAutoTable.finalY + 20,
      head: [[t('exports.date'), t('exports.totalValue'), t('exports.performance'), t('exports.gain')]],
      body: perfData,
      theme: 'striped',
      headStyles: { fillColor: [249, 115, 22] },
      styles: { fontSize: 8 },
      margin: { left: 14 }
    });
  }

  // Pied de page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} sur ${pageCount} | ${t('exports.pendo')}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`PENDO_Analytics_${timeRange}j_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * Exporter le portefeuille en Excel
 */
export const exportPortfolioExcel = async (portfolioData, summary) => {
  const XLSX = await loadXlsx();
  const t = i18n.t;

  // Feuille 1: Résumé
  const summarySheet = XLSX.utils.json_to_sheet([
    { [t('exports.indicator')]: t('exports.totalPortfolioValue'), [t('exports.value')]: summary.portfolioValue },
    { [t('exports.indicator')]: t('exports.totalInvestment'), [t('exports.value')]: summary.totalCost },
    { [t('exports.indicator')]: t('exports.totalGainLoss'), [t('exports.value')]: summary.totalGainLoss },
    { [t('exports.indicator')]: t('exports.return'), [t('exports.value')]: summary.totalGainLossPercent },
    { [t('exports.indicator')]: t('exports.availableBalance'), [t('exports.value')]: summary.cashBalance },
    { [t('exports.indicator')]: t('exports.numberOfHoldings'), [t('exports.value')]: summary.numberOfHoldings }
  ]);

  // Feuille 2: Positions
  const holdingsData = portfolioData.map(holding => ({
    [t('exports.ticker')]: holding.market_id,
    [t('exports.name')]: holding.stock_name || holding.market_id,
    'Secteur': holding.sector || 'N/A',
    [t('exports.quantity')]: holding.quantity,
    [t('exports.averagePrice')]: holding.average_price,
    [t('exports.currentPrice')]: holding.current_price,
    [t('exports.totalValue')]: holding.current_value,
    'Coût Total': holding.total_cost,
    [t('exports.gainLoss')]: holding.gain_loss,
    [t('exports.performance')]: holding.gain_loss_percent,
    'Variation Journalière (%)': holding.daily_change
  }));

  const holdingsSheet = XLSX.utils.json_to_sheet(holdingsData);

  // Créer le classeur
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');
  XLSX.utils.book_append_sheet(workbook, holdingsSheet, 'Positions');

  // Télécharger
  XLSX.writeFile(workbook, `PENDO_Portfolio_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Exporter les transactions en Excel
 */
export const exportTransactionsExcel = async (transactions) => {
  const XLSX = await loadXlsx();
  const t = i18n.t;

  const transactionsData = transactions.map(tx => ({
    'Date': new Date(tx.transaction_date).toLocaleDateString(i18n.language || 'fr-FR'),
    'Ticker': tx.ticker,
    'Type': tx.transaction_type === 'buy' ? t('portfolio.buyAction') : t('portfolio.sellAction'),
    'Quantité': tx.quantity,
    'Prix': tx.price,
    'Montant Total': tx.total_amount,
    'Frais': tx.fees,
    'Montant Net': tx.net_amount,
    'Notes': tx.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(transactionsData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  XLSX.writeFile(workbook, `PENDO_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Formater une valeur en devise
 */
function formatCurrency(value) {
  if (!value && value !== 0) return '0 XOF';
  return new Intl.NumberFormat(i18n.language || 'fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0
  }).format(value);
}
