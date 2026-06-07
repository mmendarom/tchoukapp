import {
  MatchReportData,
  PeriodReportData,
  ReportLocationMaps,
  ReportStat,
  ReportSubstitution,
  reportEmptyLabel,
} from '../domain/reportData';
import { CourtLocation } from '../domain/types';

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const scoreText = (uruguay: number, opponent: number, opponentName = 'Rival') =>
  `Uruguay ${uruguay} - ${opponent} ${opponentName}`;

const topItems = (items: ReportStat[], limit = 3) => items.slice(0, limit);

const statListHtml = (items: ReportStat[], emptyText = reportEmptyLabel) =>
  items.length === 0
    ? `<p class="muted">${escapeHtml(emptyText)}</p>`
    : `<table><tbody>${items
        .map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="number">${item.total}</td></tr>`)
        .join('')}</tbody></table>`;

const stringListHtml = (items: string[]) =>
  items.length === 0
    ? `<p class="muted">${escapeHtml(reportEmptyLabel)}</p>`
    : `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;

const substitutionsHtml = (items: ReportSubstitution[]) =>
  items.length === 0
    ? '<p class="muted">Sin cambios registrados.</p>'
    : `<ul>${items
        .map((item) =>
          item.kind === 'lineup_swap'
            ? `<li>${escapeHtml(item.periodLabel)} ${escapeHtml(item.clockLabel)} - intercambio en cancha: ${escapeHtml(item.playerA ?? item.playerOut)} -> ${escapeHtml(item.playerB ?? item.playerIn)}</li>`
            : `<li>${escapeHtml(item.periodLabel)} ${escapeHtml(item.clockLabel)} - entra ${escapeHtml(item.playerIn)}, sale ${escapeHtml(item.playerOut)}</li>`,
        )
        .join('')}</ul>`;

const insightsHtml = (items: Array<{ title: string; description: string; suggestedAction: string }>, limit?: number) => {
  const visibleItems = typeof limit === 'number' ? items.slice(0, limit) : items;

  return visibleItems.length === 0
    ? '<p class="muted">Sin alertas tácticas.</p>'
    : `<ul>${visibleItems
        .map((item) => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.description)} <em>${escapeHtml(item.suggestedAction)}</em></li>`)
        .join('')}</ul>`;
};

const densityForLocation = (location: CourtLocation, locations: CourtLocation[]) =>
  locations.filter((other) => Math.hypot(location.x - other.x, location.y - other.y) <= 0.08).length;

export const renderReportCourtMap = (title: string, locations: CourtLocation[]) => {
  const width = 320;
  const height = 190;
  const margin = 16;
  const innerWidth = width - margin * 2;
  const innerHeight = height - margin * 2;

  const markers = locations
    .map((location, index) => {
      const x = margin + Math.min(Math.max(location.x, 0), 1) * innerWidth;
      const y = margin + Math.min(Math.max(location.y, 0), 1) * innerHeight;
      const density = densityForLocation(location, locations);
      const radius = Math.min(4 + density * 1.3, 10);
      const opacity = Math.min(0.45 + density * 0.12, 0.92);

      return `<circle data-map-point="${index}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}" fill="#e84f3d" fill-opacity="${opacity.toFixed(2)}" stroke="#7a1f14" stroke-width="0.8" />`;
    })
    .join('');

  return `
    <div class="map-card">
      <h4>${escapeHtml(title)}</h4>
      ${
        locations.length === 0
          ? '<div class="empty-map">Sin ubicaciones registradas</div>'
          : `<svg class="court-map" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}">
              <rect x="${margin}" y="${margin}" width="${innerWidth}" height="${innerHeight}" rx="8" fill="#fbfdf8" stroke="#1f6b4d" stroke-width="2" />
              <line x1="${width / 2}" y1="${margin}" x2="${width / 2}" y2="${height - margin}" stroke="#9cb7aa" stroke-width="1.5" stroke-dasharray="5 5" />
              <path d="M ${margin} ${height / 2 - 46} A 48 48 0 0 1 ${margin} ${height / 2 + 46}" fill="none" stroke="#9cb7aa" stroke-width="1.5" />
              <path d="M ${width - margin} ${height / 2 - 46} A 48 48 0 0 0 ${width - margin} ${height / 2 + 46}" fill="none" stroke="#9cb7aa" stroke-width="1.5" />
              ${markers}
            </svg>`
      }
    </div>
  `;
};

const renderMapGrid = (maps: ReportLocationMaps) => `
  <div class="map-grid">
    ${renderReportCourtMap('Donde hicimos los puntos', maps.uruguayPoints)}
    ${renderReportCourtMap('Donde nos hicieron puntos', maps.opponentPoints)}
    ${renderReportCourtMap('Donde nos defendieron', maps.opponentDefenses)}
  </div>
`;

const summaryCardsHtml = (report: MatchReportData) => `
  <section>
    <h2>Resumen ejecutivo</h2>
    <div class="summary-grid">
      ${report.executiveSummary.map((item) => `<div><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></div>`).join('')}
    </div>
    <h3>Alertas tácticas principales</h3>
    ${insightsHtml(report.totals.insights, 3)}
  </section>
`;

const periodHtml = (period: PeriodReportData, opponentName: string) => `
  <section class="period-section">
    <h2>${escapeHtml(period.periodLabel)}</h2>
    <p class="score">${escapeHtml(scoreText(period.score.uruguay, period.score.opponent, opponentName))}</p>
    <div class="grid">
      <div><strong>Puntos Uruguay</strong><span>${period.uruguayPoints}</span></div>
      <div><strong>Puntos rival</strong><span>${period.opponentPoints}</span></div>
      <div><strong>Puntos en contra</strong><span>${period.ownPoints}</span></div>
      <div><strong>Puntos en contra del rival</strong><span>${period.opponentOwnPoints}</span></div>
      <div><strong>Defensas del rival</strong><span>${period.opponentDefenses}</span></div>
    </div>
    <div class="two-col">
      <div>
        <h3>Goleadores</h3>
        ${statListHtml(period.topScorers, 'Sin puntos de Uruguay.')}
        <h3>Defensas</h3>
        ${statListHtml(period.defenses, 'Sin defensas registradas.')}
        <h3>Defensas del rival</h3>
        ${statListHtml(period.opponentDefenseZones, 'Sin ubicaciones registradas.')}
      </div>
      <div>
        <h3>Faltas</h3>
        ${statListHtml(period.faltas, 'Sin faltas registradas.')}
        <h3>Puntos en contra</h3>
        ${statListHtml(period.ownPointsByPlayer, 'Sin puntos en contra.')}
        <h3>Errores totales</h3>
        ${statListHtml(period.totalErrors, 'Sin errores registrados.')}
      </div>
    </div>
    <h3>Cambios</h3>
    ${substitutionsHtml(period.substitutions)}
    <h3>Alertas tácticas</h3>
    ${insightsHtml(period.insights)}
    <h3>Mapas del tiempo</h3>
    ${renderMapGrid(period.maps)}
  </section>
`;

export function buildMatchReportHtml(report: MatchReportData) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #102033; margin: 24px; line-height: 1.35; }
    h1 { font-size: 28px; margin: 0 0 6px; }
    h2 { font-size: 20px; margin: 22px 0 8px; border-bottom: 2px solid #dbe4ef; padding-bottom: 5px; }
    h3 { font-size: 15px; margin: 14px 0 5px; color: #19344d; }
    h4 { font-size: 12px; margin: 0 0 6px; color: #19344d; }
    p { margin: 4px 0; }
    ul, ol { margin: 4px 0 8px 18px; padding: 0; }
    li { margin: 2px 0; }
    table { border-collapse: collapse; width: 100%; margin: 4px 0 10px; }
    td { border-bottom: 1px solid #e3ebf4; padding: 5px 3px; font-size: 12px; }
    .number { font-weight: 900; text-align: right; }
    .hero { background: #102033; color: white; padding: 18px; border-radius: 8px; margin-bottom: 16px; }
    .hero p { color: #d9e6f2; }
    .score { font-size: 18px; font-weight: 900; }
    .grid, .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }
    .summary-grid { grid-template-columns: repeat(3, 1fr); }
    .grid div, .summary-grid div { border: 1px solid #dbe4ef; border-radius: 8px; padding: 8px; background: #f7fafc; }
    .grid strong, .summary-grid strong { display: block; font-size: 11px; color: #5d6b7a; }
    .grid span, .summary-grid span { display: block; font-size: 17px; font-weight: 900; margin-top: 3px; }
    .summary-grid span { font-size: 13px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .map-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
    .map-card { border: 1px solid #dbe4ef; border-radius: 8px; padding: 8px; background: #f7fafc; break-inside: avoid; }
    .court-map { width: 100%; height: auto; display: block; }
    .empty-map { height: 118px; border: 1px dashed #b7c5d3; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #5d6b7a; font-size: 12px; text-align: center; padding: 8px; }
    .muted { color: #5d6b7a; }
    section { break-inside: avoid; margin-bottom: 14px; }
    .period-section { break-inside: auto; }
    .note { background: #f4f7fb; border-left: 4px solid #0b6bcb; padding: 8px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${escapeHtml(report.title)}</h1>
    <p>${escapeHtml(report.matchLabel)}</p>
    <p>${escapeHtml(report.dateLabel)} - ${escapeHtml(report.venueLabel)}</p>
    <p>${escapeHtml(report.competitionLabel)}</p>
    <p class="score">${escapeHtml(scoreText(report.finalScore.uruguay, report.finalScore.opponent, report.opponent))}</p>
  </div>

  ${summaryCardsHtml(report)}

  <section>
    <h2>Resultado por tiempos</h2>
    <ul>
      ${report.scoreByPeriod.map((item) => `<li>${escapeHtml(item.periodLabel)}: ${escapeHtml(scoreText(item.score.uruguay, item.score.opponent, report.opponent))}</li>`).join('')}
    </ul>
  </section>

  ${report.periods.map((period) => periodHtml(period, report.opponent)).join('')}

  <section>
    <h2>Totales del partido</h2>
    <p class="score">${escapeHtml(scoreText(report.finalScore.uruguay, report.finalScore.opponent, report.opponent))}</p>
    <div class="two-col">
      <div>
        <h3>Goleadores</h3>
        ${statListHtml(report.totals.topScorers, 'Sin puntos de Uruguay.')}
        <h3>Defensas</h3>
        ${statListHtml(report.totals.defenses, 'Sin defensas registradas.')}
        <p><strong>Defensas del rival:</strong> ${report.totals.opponentDefenses}</p>
        <h3>Faltas</h3>
        ${statListHtml(report.totals.faltas, 'Sin faltas registradas.')}
      </div>
      <div>
        <h3>Puntos en contra</h3>
        ${statListHtml(report.totals.ownPointsByPlayer, 'Sin puntos en contra.')}
        <p><strong>Puntos en contra del rival:</strong> ${report.totals.opponentOwnPoints}</p>
        <h3>Errores totales</h3>
        ${statListHtml(report.totals.totalErrors, 'Sin errores registrados.')}
        <h3>Alertas tácticas</h3>
        ${insightsHtml(report.totals.insights)}
      </div>
    </div>
    <h3>Cambios</h3>
    ${substitutionsHtml(report.totals.substitutions)}
    <h3>Intercambios en cancha</h3>
    ${substitutionsHtml(report.totals.substitutions.filter((item) => item.kind === 'lineup_swap'))}
    <h3>Mapas totales</h3>
    ${renderMapGrid(report.totalMaps)}
  </section>

  <section>
    <h2>Zonas principales</h2>
    <div class="three-col">
      <h3>Zonas donde hicimos puntos</h3>
      ${statListHtml(report.zones.attack, 'Sin ubicación registrada.')}
      <h3>Zonas donde nos hicieron puntos</h3>
      ${statListHtml(report.zones.against, 'Sin ubicación registrada.')}
      <h3>Zonas donde nos defendieron</h3>
      ${statListHtml(report.zones.defended, 'Sin ubicaciones registradas.')}
    </div>
  </section>

  <section>
    <h2>Formaciones</h2>
    <h3>Formación inicial</h3>
    ${stringListHtml(report.lineups.initial)}
    <h3>Formación final</h3>
    ${stringListHtml(report.lineups.final)}
  </section>

  <section>
    <h2>Notas</h2>
    <p>${escapeHtml(report.notes)}</p>
  </section>
</body>
</html>`;
}

const statLines = (title: string, items: ReportStat[], emptyText: string, limit = 3) => [
  title,
  ...(items.length === 0 ? [`- ${emptyText}`] : topItems(items, limit).map((item) => `- ${item.label}: ${item.total}`)),
];

const topZoneLine = (title: string, items: ReportStat[]) => `${title}: ${items[0] ? `${items[0].label} (${items[0].total})` : 'Sin ubicaciones registradas.'}`;

export function buildMatchReportText(report: MatchReportData) {
  const lines = [
    report.title,
    report.matchLabel,
    `${report.dateLabel} - ${report.venueLabel}`,
    scoreText(report.finalScore.uruguay, report.finalScore.opponent, report.opponent),
    '',
    'Resultado por tiempos',
    ...report.scoreByPeriod.map((item) => `- ${item.periodLabel}: ${scoreText(item.score.uruguay, item.score.opponent, report.opponent)}`),
    '',
    ...statLines('Top 3 goleadores', report.totals.topScorers, 'Sin puntos de Uruguay.'),
    '',
    ...statLines('Top defensas', report.totals.defenses, 'Sin defensas registradas.'),
    '',
    ...statLines('Faltas', report.totals.faltas, 'Sin faltas registradas.'),
    '',
    ...statLines('Puntos en contra', report.totals.ownPointsByPlayer, 'Sin puntos en contra.'),
    '',
    `Puntos en contra del rival: ${report.totals.opponentOwnPoints}`,
    `Defensas del rival: ${report.totals.opponentDefenses}`,
    '',
    'Zonas principales',
    `- ${topZoneLine('Donde hicimos puntos', report.zones.attack)}`,
    `- ${topZoneLine('Donde nos hicieron puntos', report.zones.against)}`,
    `- ${topZoneLine('Donde nos defendieron', report.zones.defended)}`,
    '',
    'Alertas tácticas',
    ...(report.totals.insights.length === 0
      ? ['- Sin alertas tácticas.']
      : report.totals.insights.slice(0, 3).map((item) => `- ${item.title}: ${item.description}`)),
    '',
    'Notas',
    report.notes,
  ];

  return lines.join('\n');
}
