import {
  MatchReportData,
  PeriodReportData,
  ReportEffectivenessRow,
  ReportLocationMaps,
  ReportPlayerPerformance,
  ReportPlayerPerformanceRow,
  ReportStat,
  ReportSubstitution,
  reportEmptyLabel,
} from '../domain/reportData';
import { COURT_VISUAL_GEOMETRY } from '../domain/courtVisual';
import { CourtLocation } from '../domain/types';

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const scoreText = (ownTeamName: string, ownScore: number, opponentScore: number, opponentName = 'Rival') =>
  `${ownTeamName} ${ownScore} - ${opponentScore} ${opponentName}`;

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;
const clampPercent = (value: number) => Math.max(0, Math.min(100, value));
const formatCount = (value: number, singular: string, plural: string) => `${value} ${value === 1 ? singular : plural}`;
const PERFORMANCE_ROW_LIMIT = 7;
const SECTOR_ROW_LIMIT = 5;
const percent = (value: number) => `${value}%`;

type ReportInsightItem = {
  severity?: string;
  title: string;
  description: string;
  suggestedAction: string;
};

const statListHtml = (items: ReportStat[], emptyText = reportEmptyLabel) =>
  items.length === 0
    ? `<p class="muted">${escapeHtml(emptyText)}</p>`
    : `<table><tbody>${items
        .map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="number">${item.total}</td></tr>`)
        .join('')}</tbody></table>`;

const sectorStatsHtml = (items: ReportStat[], emptyText = reportEmptyLabel, limit = SECTOR_ROW_LIMIT) => {
  const visibleItems = items.slice(0, limit);
  const maxTotal = visibleItems[0]?.total ?? 0;

  if (visibleItems.length === 0) {
    return `<p class="muted">${escapeHtml(emptyText)}</p>`;
  }

  return `<div class="sector-list">${visibleItems.map((item) => {
    const width = maxTotal > 0 ? clampPercent((item.total / maxTotal) * 100) : 0;
    return `<div class="sector-row">
      <div class="sector-meta"><span>${escapeHtml(item.label)}</span><strong>${item.total}</strong></div>
      <div class="sector-track" style="height:7px;background-color:#e1e9f0;"><div class="sector-bar" style="width:${width.toFixed(1)}%;height:7px;background-color:#577c9d;">&nbsp;</div></div>
    </div>`;
  }).join('')}${items.length > limit ? `<p class="more-rows">+${items.length - limit} sectores más</p>` : ''}</div>`;
};

const stringListHtml = (items: string[]) =>
  items.length === 0
    ? `<p class="muted">${escapeHtml(reportEmptyLabel)}</p>`
    : `<ol>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>`;

const legacyEffectivenessNoteHtml = (count: number) =>
  count > 0
    ? '<p class="note">Algunas defensas rivales antiguas no tienen jugador asociado y no cuentan para la efectividad individual.</p>'
    : '';

const effectivenessHtml = (items: ReportEffectivenessRow[], legacyOpponentDefensesWithoutPlayer = 0) => `
  ${
    items.length === 0
      ? '<p class="muted">Sin tiros registrados.</p>'
      : `<table class="effectiveness-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Puntos convertidos</th>
              <th>Tiros atajados</th>
              <th>Errados</th>
              <th>Tiros generados</th>
              <th>Efectividad</th>
            </tr>
          </thead>
          <tbody>
            ${items.slice(0, PERFORMANCE_ROW_LIMIT)
              .map((item) => `<tr>
                <td>${escapeHtml(item.playerName)}</td>
                <td class="number">${item.goals}</td>
                <td class="number">${item.rivalDefendedShots}</td>
                <td class="number">${item.ownPointsAgainst}</td>
                <td class="number">${item.shotAttempts}</td>
                <td class="number">${escapeHtml(formatPercent(item.effectiveness))}</td>
              </tr>`)
              .join('')}
          </tbody>
        </table>`
  }
  ${items.length > PERFORMANCE_ROW_LIMIT ? `<p class="more-rows">+${items.length - PERFORMANCE_ROW_LIMIT} jugadores más</p>` : ''}
  ${legacyEffectivenessNoteHtml(legacyOpponentDefensesWithoutPlayer)}
`;

const attackPerformanceRowHtml = (item: ReportPlayerPerformanceRow) => {
  const convertedWidth = item.shotAttempts > 0 ? clampPercent((item.goals / item.shotAttempts) * 100) : 0;
  const effectiveness = typeof item.effectiveness === 'number' ? formatPercent(item.effectiveness) : 'Sin tiros';

  return `<div class="performance-row">
    <div class="performance-meta"><strong>${escapeHtml(item.playerName)}</strong><span>${item.goals}/${item.shotAttempts} tiros · ${escapeHtml(effectiveness)}</span></div>
    <div class="performance-track attack-track" style="height:12px;background-color:#d8ecf8;">
      <div class="attempt-bar" style="width:100%;height:12px;background-color:#9dcff0;">
        <div class="converted-bar" style="width:${convertedWidth.toFixed(1)}%;height:12px;background-color:#075ca8;">&nbsp;</div>
      </div>
    </div>
    <small>${formatCount(item.rivalDefendedShots, 'atajado', 'atajados')} · ${formatCount(item.ownPointsAgainst, 'errado', 'errados')}</small>
  </div>`;
};

const defensePerformanceRowHtml = (item: ReportPlayerPerformanceRow, totalDefenses: number) => {
  const width = totalDefenses > 0 ? clampPercent((item.defenses / totalDefenses) * 100) : 0;

  return `<div class="performance-row">
    <div class="performance-meta"><strong>${escapeHtml(item.playerName)}</strong><span>${formatCount(item.defenses, 'defensa', 'defensas')}</span></div>
    <div class="performance-track defense-track" style="height:12px;background-color:#cce8e3;"><div class="defense-bar" style="width:${width.toFixed(1)}%;height:12px;background-color:#0b6b61;">&nbsp;</div></div>
  </div>`;
};

const performanceHtml = (performance: ReportPlayerPerformance) => {
  const attackRows = performance.rows
    .filter((row) => row.shotAttempts > 0)
    .sort((a, b) =>
      b.goals - a.goals ||
      b.shotAttempts - a.shotAttempts ||
      (b.effectiveness ?? 0) - (a.effectiveness ?? 0) ||
      a.ownPointsAgainst - b.ownPointsAgainst ||
      a.playerName.localeCompare(b.playerName),
    );
  const defenseRows = performance.rows
    .filter((row) => row.defenses > 0)
    .sort((a, b) => b.defenses - a.defenses || b.defenseShare - a.defenseShare || a.playerName.localeCompare(b.playerName));
  const visibleAttackRows = attackRows.slice(0, PERFORMANCE_ROW_LIMIT);
  const visibleDefenseRows = defenseRows.slice(0, PERFORMANCE_ROW_LIMIT);

  return `<div class="performance-grid">
    <div class="performance-column attack-performance-card">
      <h4>Ataque</h4>
      <p class="performance-legend">Rendimiento ofensivo · <span class="legend-attempt"></span> Tiros generados <span class="legend-converted"></span> Puntos convertidos</p>
      ${attackRows.length === 0 ? '<p class="muted">Sin tiros registrados.</p>' : visibleAttackRows.map(attackPerformanceRowHtml).join('')}
      ${attackRows.length > PERFORMANCE_ROW_LIMIT ? `<p class="more-rows">+${attackRows.length - PERFORMANCE_ROW_LIMIT} jugadores más</p>` : ''}
    </div>
    <div class="performance-column defense-performance-card">
      <h4>Defensa</h4>
      <p class="performance-legend"><span class="legend-defense"></span> Contribución defensiva</p>
      ${defenseRows.length === 0 ? '<p class="muted">Sin defensas registradas.</p>' : visibleDefenseRows.map((row) => defensePerformanceRowHtml(row, performance.totalDefenses)).join('')}
      ${defenseRows.length > PERFORMANCE_ROW_LIMIT ? `<p class="more-rows">+${defenseRows.length - PERFORMANCE_ROW_LIMIT} jugadores más</p>` : ''}
    </div>
  </div>`;
};

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

const insightPriority: Record<string, number> = {
  'Puntos regalados': 10,
  'Errores repetidos': 20,
  'Lo están anulando': 30,
  'Baja efectividad': 40,
  'Zona vulnerable': 50,
  'Zona bloqueada': 60,
  'Aporte defensivo': 70,
  'Buen rendimiento ofensivo': 80,
  'Baja participación': 100,
};

const compactInsightDetail = (item: ReportInsightItem, zoneStats: ReportStat[] = []) => {
  const description = item.description.trim().replace(/\.$/, '');
  const repeatedErrors = description.match(/^(.+?) acumula (\d+) errores$/i);
  const blockedPlayer = description.match(/^A (.+?) le defendieron (\d+) tiros y lleva (\d+\/\d+)$/i);
  const shootingStat = description.match(/^(.+?): (\d+\/\d+) en tiros \((\d+%)\)$/i);
  const strongDefense = description.match(/^(.+?) sostiene defensa con (\d+) defensas$/i);
  const ownPoints = description.match(/(\d+) puntos en contra/i);
  const matchingZone = zoneStats.find((zone) => description.includes(zone.label));

  if (item.title === 'Errores repetidos' && repeatedErrors) {
    return `${repeatedErrors[1]} · ${repeatedErrors[2]} errores`;
  }

  if (item.title === 'Lo están anulando' && blockedPlayer) {
    return `${blockedPlayer[1]} · ${blockedPlayer[3]} tiros · ${formatCount(Number(blockedPlayer[2]), 'atajado', 'atajados')}`;
  }

  if ((item.title === 'Baja efectividad' || item.title === 'Buen rendimiento ofensivo') && shootingStat) {
    return `${shootingStat[1]} · ${shootingStat[2]} tiros · ${shootingStat[3]}`;
  }

  if (item.title === 'Aporte defensivo' && strongDefense) {
    return `${strongDefense[1]} · ${strongDefense[2]} defensas`;
  }

  if (item.title === 'Puntos regalados' && ownPoints) {
    return `${ownPoints[1]} puntos en contra`;
  }

  if ((item.title === 'Zona vulnerable' || item.title === 'Zona bloqueada') && matchingZone) {
    const unit = item.title === 'Zona vulnerable' ? 'puntos' : 'atajadas';
    return `${matchingZone.label} · ${formatCount(matchingZone.total, item.title === 'Zona vulnerable' ? 'punto' : 'atajada', unit)}`;
  }

  return description;
};

const prioritizedInsights = (items: ReportInsightItem[], limit: number) => {
  const indexed = items.map((item, index) => ({ item, index }));
  const withoutLowInvolvement = indexed.filter(({ item }) => item.title !== 'Baja participación');
  const candidates = withoutLowInvolvement.length > 0 ? withoutLowInvolvement : indexed;
  const seen = new Set<string>();

  return candidates
    .filter(({ item }) => {
      const key = `${item.title}|${item.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (insightPriority[a.item.title] ?? 90) - (insightPriority[b.item.title] ?? 90) || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item);
};

const insightsHtml = (items: ReportInsightItem[], limit: number, zoneStats: ReportStat[] = []) => {
  const visibleItems = prioritizedInsights(items, limit);

  return visibleItems.length === 0
    ? '<p class="muted">Sin alertas tácticas.</p>'
    : `<div class="insight-grid">${visibleItems
        .map((item) => `<div class="insight-card insight-${escapeHtml(item.severity ?? 'info')}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(compactInsightDetail(item, zoneStats))}</span></div>`)
        .join('')}</div>`;
};

const densityForLocation = (location: CourtLocation, locations: CourtLocation[]) =>
  locations.filter((other) => Math.hypot(location.x - other.x, location.y - other.y) <= 0.08).length;

const markerStyles = {
  uruguay: { fill: '#0b6bcb', stroke: '#073f78', label: 'Punto Uruguay' },
  opponent: { fill: '#e84f3d', stroke: '#7a1f14', label: 'Punto rival' },
  opponentDefense: { fill: '#7c3aed', stroke: '#4c1d95', label: 'Defensa rival' },
};

export const renderReportCourtMap = (
  title: string,
  locations: CourtLocation[],
  markerVariant: keyof typeof markerStyles = 'uruguay',
) => {
  const markerStyle = markerStyles[markerVariant];

  const markers = locations
    .map((location, index) => {
      const normalizedX = Math.min(Math.max(location.x, 0), 1);
      const normalizedY = Math.min(Math.max(location.y, 0), 1);
      const x = normalizedX * 100;
      const y = normalizedY * 100;
      const density = densityForLocation(location, locations);
      const size = Math.min(11 + density * 3, 25);
      const opacity = Math.min(0.66 + density * 0.08, 0.96);

      return `<span
        class="report-map-point"
        data-map-point="${index}"
        data-normalized-x="${normalizedX.toFixed(3)}"
        data-normalized-y="${normalizedY.toFixed(3)}"
        aria-label="${escapeHtml(markerStyle.label)} ${index + 1}"
        style="left:${x.toFixed(2)}%; top:${y.toFixed(2)}%; width:${size.toFixed(1)}px; height:${size.toFixed(1)}px; margin-left:${(-size / 2).toFixed(1)}px; margin-top:${(-size / 2).toFixed(1)}px; background:${markerStyle.fill}; border-color:${markerStyle.stroke}; opacity:${opacity.toFixed(2)};"
      ></span>`;
    })
    .join('');

  return `
    <div class="map-card">
      <h4>${escapeHtml(title)}</h4>
      ${
        locations.length === 0
          ? '<div class="empty-map">Sin ubicaciones registradas.</div>'
          : `<div class="report-court-map" role="img" aria-label="${escapeHtml(title)}">
              <div class="report-court-center-lane"></div>
              <div class="report-court-center-line"></div>
              <div class="report-court-lane-line report-court-lane-one"></div>
              <div class="report-court-lane-line report-court-lane-two"></div>
              <div class="report-court-horizontal-guide report-court-horizontal-top"></div>
              <div class="report-court-horizontal-guide report-court-horizontal-middle"></div>
              <div class="report-court-horizontal-guide report-court-horizontal-bottom"></div>
              <div class="report-court-frame-area report-court-frame-area-left"></div>
              <div class="report-court-frame-area report-court-frame-area-right"></div>
              <div class="report-court-area report-court-area-left"></div>
              <div class="report-court-area report-court-area-right"></div>
              ${markers}
            </div>`
      }
    </div>
  `;
};

const renderMapStack = (maps: ReportLocationMaps) => `
  <div class="map-stack">
    ${renderReportCourtMap('Donde hicimos los puntos', maps.uruguayPoints, 'uruguay')}
    ${renderReportCourtMap('Donde nos hicieron puntos', maps.opponentPoints, 'opponent')}
    ${renderReportCourtMap('Donde nos defendieron', maps.opponentDefenses, 'opponentDefense')}
  </div>
`;

const summaryCardsHtml = (report: MatchReportData) => {
  const preferredLabels = [
    'Top ataque',
    'Top defensa',
    'Efectividad ofensiva total',
    'Puntos en contra',
    'Sector vulnerable',
    'Sector donde mas nos defendieron',
  ];
  const cards = preferredLabels
    .map((label) => report.executiveSummary.find((item) => item.label === label))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return `
  <section class="executive-section">
    <h2>Resumen ejecutivo</h2>
    <div class="summary-grid">
      ${cards.map((item) => `<div class="summary-card"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.value)}</span></div>`).join('')}
    </div>
    <h3>Claves tácticas</h3>
    ${insightsHtml(report.totals.insights, 3, [...report.zones.against, ...report.zones.defended])}
  </section>
`;
};

const periodHtml = (period: PeriodReportData, ownTeamName: string, opponentName: string) => `
  <section class="period-section">
    <h2>${escapeHtml(period.periodLabel)}</h2>
    <p class="score">${escapeHtml(scoreText(ownTeamName, period.score.uruguay, period.score.opponent, opponentName))}</p>
    <div class="grid">
      <div><strong>Puntos ${escapeHtml(ownTeamName)}</strong><span>${period.uruguayPoints}</span></div>
      <div><strong>Puntos rival</strong><span>${period.opponentPoints}</span></div>
      <div><strong>Puntos en contra</strong><span>${period.ownPoints}</span></div>
      <div><strong>Puntos en contra del rival</strong><span>${period.opponentOwnPoints}</span></div>
      <div><strong>Defensas del rival</strong><span>${period.opponentDefenses}</span></div>
      <div><strong>Defensas ${escapeHtml(ownTeamName)}</strong><span>${period.performance.totalDefenses}</span></div>
      <div><strong>Errores</strong><span>${period.totalErrors.reduce((sum, item) => sum + item.total, 0)}</span></div>
    </div>
    <h3>Rendimiento del tiempo</h3>
    ${performanceHtml(period.performance)}
    <div class="two-col">
      <div>
        <h3>Goleadores</h3>
        ${statListHtml(period.topScorers, `Sin puntos de ${ownTeamName}.`)}
        <h3>Defensas</h3>
        ${statListHtml(period.defenses, 'Sin defensas registradas.')}
        <h3>Efectividad ofensiva</h3>
        ${effectivenessHtml(period.effectiveness, period.legacyOpponentDefensesWithoutPlayer)}
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
    <h3>Lectura del tiempo</h3>
    ${insightsHtml(period.insights, 5, [...period.opponentScoringZones, ...period.opponentDefenseZones])}
    <div class="two-col tactical-sectors">
      <div class="sector-card"><h3>Zonas donde nos entraron</h3>${sectorStatsHtml(period.opponentScoringZones, 'Sin ubicaciones registradas.')}</div>
      <div class="sector-card"><h3>Zonas donde nos defendieron</h3>${sectorStatsHtml(period.opponentDefenseZones, 'Sin ubicaciones registradas.')}</div>
    </div>
    <div class="report-map-section">
      <h3>Mapas del tiempo</h3>
      ${renderMapStack(period.maps)}
    </div>
  </section>
`;

export function buildMatchReportHtml(report: MatchReportData) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #102033; margin: 24px; line-height: 1.35; }
    h1 { font-size: 28px; margin: 0 0 6px; }
    h2 { font-size: 20px; margin: 22px 0 8px; border-bottom: 2px solid #dbe4ef; padding-bottom: 5px; break-after: avoid; page-break-after: avoid; }
    h3 { font-size: 15px; margin: 14px 0 5px; color: #19344d; }
    h4 { font-size: 12px; margin: 0 0 6px; color: #19344d; }
    p { margin: 4px 0; }
    ul, ol { margin: 4px 0 8px 18px; padding: 0; }
    li { margin: 2px 0; }
    table { border-collapse: collapse; width: 100%; margin: 4px 0 10px; }
    td { border-bottom: 1px solid #e3ebf4; padding: 5px 3px; font-size: 12px; }
    th { border-bottom: 2px solid #dbe4ef; color: #5d6b7a; font-size: 10px; padding: 5px 3px; text-align: left; text-transform: uppercase; }
    .number { font-weight: 900; text-align: right; }
    .hero { background: #102033; color: white; padding: 18px; border-radius: 8px; margin-bottom: 16px; break-inside: avoid; page-break-inside: avoid; }
    .hero p { color: #d9e6f2; }
    .score { font-size: 18px; font-weight: 900; }
    .hero .score { color: #ffffff; font-size: 28px; letter-spacing: .3px; margin-top: 10px; }
    .grid, .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }
    .summary-grid { grid-template-columns: repeat(3, 1fr); }
    .grid div, .summary-grid div { border: 1px solid #dbe4ef; border-radius: 8px; padding: 8px; background: #f7fafc; }
    .grid strong, .summary-grid strong { display: block; font-size: 11px; color: #5d6b7a; }
    .grid span, .summary-grid span { display: block; font-size: 17px; font-weight: 900; margin-top: 3px; }
    .summary-grid span { font-size: 13px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .executive-section, .summary-card { break-inside: avoid; page-break-inside: avoid; }
    .summary-card { border-top: 4px solid #0b6bcb !important; min-height: 62px; }
    .report-map-section { break-inside: avoid; page-break-inside: avoid; margin-top: 14px; }
    .report-map-section h3 { break-after: avoid; page-break-after: avoid; margin-top: 18px; }
    .map-stack { display: block; margin-top: 8px; }
    .map-card { border: 1px solid #dbe4ef; border-radius: 8px; padding: 14px; background: #f7fafc; break-inside: avoid; page-break-inside: avoid; margin: 0 0 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .map-card h4 { font-size: 15px; margin-bottom: 10px; }
    .report-court-map { position: relative; width: 100%; height: 260px; min-height: 260px; display: block; overflow: hidden; border: 2px solid #188038; border-radius: 8px; background: #e9f7ee; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .report-court-center-lane { position: absolute; left: ${percent(COURT_VISUAL_GEOMETRY.centerLaneLeftPercent)}; top: 0; bottom: 0; width: ${percent(COURT_VISUAL_GEOMETRY.centerLaneWidthPercent)}; background: rgba(255,255,255,0.16); }
    .report-court-center-line { position: absolute; top: 0; bottom: 0; left: 50%; width: 0; border-left: 2px dashed #9cb7aa; }
    .report-court-lane-line { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(24,128,56,0.22); }
    .report-court-lane-one { left: ${percent(COURT_VISUAL_GEOMETRY.laneOneLeftPercent)}; }
    .report-court-lane-two { left: ${percent(COURT_VISUAL_GEOMETRY.laneTwoLeftPercent)}; }
    .report-court-horizontal-guide { position: absolute; left: 0; right: 0; height: 1px; background: rgba(24,128,56,0.14); }
    .report-court-horizontal-top { top: ${percent(COURT_VISUAL_GEOMETRY.horizontalTopPercent)}; }
    .report-court-horizontal-middle { top: ${percent(COURT_VISUAL_GEOMETRY.horizontalMiddlePercent)}; background: rgba(24,128,56,0.2); }
    .report-court-horizontal-bottom { top: ${percent(COURT_VISUAL_GEOMETRY.horizontalBottomPercent)}; }
    .report-court-frame-area { position: absolute; top: 0; bottom: 0; width: ${percent(COURT_VISUAL_GEOMETRY.frameAreaWidthPercent)}; background: rgba(11,107,203,0.07); }
    .report-court-frame-area-left { left: 0; border-right: 1px solid rgba(47,125,69,0.35); }
    .report-court-frame-area-right { right: 0; border-left: 1px solid rgba(47,125,69,0.35); }
    .report-court-area { position: absolute; top: ${percent(COURT_VISUAL_GEOMETRY.forbiddenAreaTopPercent)}; width: ${percent(COURT_VISUAL_GEOMETRY.forbiddenAreaWidthPercent)}; height: ${percent(COURT_VISUAL_GEOMETRY.forbiddenAreaHeightPercent)}; border: 2px solid rgba(180,35,24,0.45); background: rgba(180,35,24,0.06); border-radius: 999px; }
    .report-court-area-left { left: ${percent(COURT_VISUAL_GEOMETRY.forbiddenAreaOffsetPercent)}; }
    .report-court-area-right { right: ${percent(COURT_VISUAL_GEOMETRY.forbiddenAreaOffsetPercent)}; }
    .report-map-point { position: absolute; z-index: 4; display: block; border: 2px solid; border-radius: 999px; box-shadow: 0 0 0 3px rgba(255,255,255,0.72); box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .empty-map { height: 220px; border: 1px dashed #b7c5d3; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #5d6b7a; font-size: 13px; text-align: center; padding: 12px; }
    .muted { color: #5d6b7a; }
    section { break-inside: auto; margin-bottom: 14px; }
    .period-section { break-inside: auto; page-break-inside: auto; }
    .note { background: #f4f7fb; border-left: 4px solid #0b6bcb; padding: 8px; border-radius: 6px; }
    .effectiveness-table { margin-top: 4px; }
    .performance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 8px 0 12px; break-inside: avoid; page-break-inside: avoid; }
    .performance-column { background: #f7fafc; border: 1px solid #c7d6e5; border-radius: 8px; padding: 10px; break-inside: avoid; page-break-inside: avoid; }
    .attack-performance-card { border-top: 5px solid #075ca8; }
    .defense-performance-card { border-top: 5px solid #0b6b61; }
    .performance-row { margin: 8px 0; break-inside: avoid; page-break-inside: avoid; }
    .performance-meta { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; }
    .performance-meta span, .performance-row small { color: #5d6b7a; }
    .performance-track { height: 12px; border: 1px solid #9fb4c8; border-radius: 6px; overflow: hidden; margin: 4px 0; background-color: #dbe4ef; }
    .attempt-bar, .converted-bar, .defense-bar { display: block; min-height: 12px; border-radius: 5px; }
    .attempt-bar { background-color: #9dcff0; }
    .converted-bar { background-color: #075ca8; }
    .defense-bar { background-color: #0b6b61; }
    .performance-legend { color: #5d6b7a; font-size: 9px; }
    .legend-attempt, .legend-converted, .legend-defense { display: inline-block; width: 12px; height: 7px; margin: 0 4px 0 2px; border: 1px solid #7890a5; }
    .legend-attempt { background-color: #9dcff0; }
    .legend-converted { background-color: #075ca8; }
    .legend-defense { background-color: #0b6b61; }
    .more-rows { color: #5d6b7a; font-size: 10px; font-weight: 800; margin-top: 6px; }
    .insight-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; margin: 6px 0 10px; }
    .insight-card { background: #f7fafc; border: 1px solid #dbe4ef; border-left: 5px solid #5d7f9d; border-radius: 7px; padding: 8px; break-inside: avoid; page-break-inside: avoid; }
    .insight-card strong, .insight-card span { display: block; }
    .insight-card strong { color: #19344d; font-size: 11px; }
    .insight-card span { color: #43576b; font-size: 10px; margin-top: 2px; }
    .insight-warning { border-left-color: #b42318; background: #fff6f4; }
    .tactical-sectors { break-inside: avoid; page-break-inside: avoid; }
    .sector-card { border: 1px solid #dbe4ef; border-radius: 8px; padding: 9px; background: #f9fbfd; break-inside: avoid; page-break-inside: avoid; }
    .sector-row { margin: 7px 0; break-inside: avoid; page-break-inside: avoid; }
    .sector-meta { display: grid; grid-template-columns: 1fr auto; gap: 8px; font-size: 10px; }
    .sector-meta strong { text-align: right; }
    .sector-track { border-radius: 4px; overflow: hidden; margin-top: 3px; }
    .sector-bar { display: block; border-radius: 4px; }
    .three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    @media print {
      .performance-grid, .performance-column, .performance-row, .insight-card, .sector-card, .sector-row, .map-card { break-inside: avoid; page-break-inside: avoid; }
      .report-map-section h3, h2, h3 { break-after: avoid; page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${escapeHtml(report.title)}</h1>
    <p>${escapeHtml(report.matchLabel)}</p>
    ${report.teamPoolName ? `<p>Plantel: ${escapeHtml(report.teamPoolName)}</p>` : ''}
    <p>${escapeHtml(report.dateLabel)} - ${escapeHtml(report.venueLabel)}</p>
    <p>${escapeHtml(report.competitionLabel)}</p>
    <p class="score">${escapeHtml(scoreText(report.ownTeamName, report.finalScore.uruguay, report.finalScore.opponent, report.opponent))}</p>
  </div>

  ${summaryCardsHtml(report)}

  <section>
    <h2>Resultado por tiempos</h2>
    <ul>
      ${report.scoreByPeriod.map((item) => `<li>${escapeHtml(item.periodLabel)}: ${escapeHtml(scoreText(report.ownTeamName, item.score.uruguay, item.score.opponent, report.opponent))}</li>`).join('')}
    </ul>
  </section>

  ${report.periods.map((period) => periodHtml(period, report.ownTeamName, report.opponent)).join('')}

  <section>
    <h2>Totales del partido</h2>
    <p class="score">${escapeHtml(scoreText(report.ownTeamName, report.finalScore.uruguay, report.finalScore.opponent, report.opponent))}</p>
    <h3>Rendimiento total</h3>
    ${performanceHtml(report.totals.performance)}
    <div class="two-col">
      <div>
        <h3>Goleadores</h3>
        ${statListHtml(report.totals.topScorers, `Sin puntos de ${report.ownTeamName}.`)}
        <h3>Defensas</h3>
        ${statListHtml(report.totals.defenses, 'Sin defensas registradas.')}
        <p><strong>Defensas del rival:</strong> ${report.totals.opponentDefenses}</p>
        <h3>Efectividad ofensiva total</h3>
        ${effectivenessHtml(report.totals.effectiveness, report.totals.legacyOpponentDefensesWithoutPlayer)}
        <h3>Faltas</h3>
        ${statListHtml(report.totals.faltas, 'Sin faltas registradas.')}
      </div>
      <div>
        <h3>Puntos en contra</h3>
        ${statListHtml(report.totals.ownPointsByPlayer, 'Sin puntos en contra.')}
        <p><strong>Puntos en contra del rival:</strong> ${report.totals.opponentOwnPoints}</p>
        <h3>Errores totales</h3>
        ${statListHtml(report.totals.totalErrors, 'Sin errores registrados.')}
      </div>
    </div>
    <h3>Lectura final</h3>
    ${insightsHtml(report.totals.insights, 6, [...report.zones.against, ...report.zones.defended])}
    <h3>Cambios</h3>
    ${substitutionsHtml(report.totals.substitutions)}
    <h3>Intercambios en cancha</h3>
    ${substitutionsHtml(report.totals.substitutions.filter((item) => item.kind === 'lineup_swap'))}
    <div class="report-map-section">
      <h3>Mapas totales</h3>
      ${renderMapStack(report.totalMaps)}
    </div>
  </section>

  <section>
    <h2>Sectores tácticos principales</h2>
    <div class="three-col">
      <div class="sector-card"><h3>Zonas donde hicimos puntos</h3>${sectorStatsHtml(report.zones.attack, 'Sin ubicación registrada.')}</div>
      <div class="sector-card"><h3>Zonas vulnerables</h3>${sectorStatsHtml(report.zones.against, 'Sin ubicación registrada.')}</div>
      <div class="sector-card"><h3>Zonas donde el rival nos defendió</h3>${sectorStatsHtml(report.zones.defended, 'Sin ubicaciones registradas.')}</div>
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

const topZoneLine = (title: string, items: ReportStat[]) => `${title}: ${items[0] ? `${items[0].label} (${items[0].total})` : 'Sin ubicaciones registradas.'}`;

const topAttackText = (performance: ReportPlayerPerformance) => {
  const player = performance.topAttack[0];
  return player
    ? `Top ataque: ${player.playerName} · ${player.goals}/${player.shotAttempts} tiros · ${formatPercent(player.effectiveness ?? 0)} · ${formatCount(player.rivalDefendedShots, 'atajado', 'atajados')} · ${formatCount(player.ownPointsAgainst, 'errado', 'errados')}.`
    : 'Top ataque: Sin tiros registrados.';
};

const topDefenseText = (performance: ReportPlayerPerformance) => {
  const player = performance.topDefense[0];
  return player ? `Top defensa: ${player.playerName} ${formatCount(player.defenses, 'defensa', 'defensas')}.` : 'Top defensa: Sin defensas registradas.';
};

const totalEffectivenessText = (performance: ReportPlayerPerformance) =>
  performance.totalShotAttempts > 0
    ? `Efectividad total: ${performance.totalGoals}/${performance.totalShotAttempts} tiros · ${formatPercent(performance.totalGoals / performance.totalShotAttempts)}.`
    : 'Efectividad total: Sin tiros registrados.';

export function buildMatchReportText(report: MatchReportData) {
  const lines = [
    report.title,
    report.matchLabel,
    ...(report.teamPoolName ? [`Plantel: ${report.teamPoolName}`] : []),
    `${report.dateLabel} - ${report.venueLabel}`,
    scoreText(report.ownTeamName, report.finalScore.uruguay, report.finalScore.opponent, report.opponent),
    topAttackText(report.totals.performance),
    topDefenseText(report.totals.performance),
    totalEffectivenessText(report.totals.performance),
    topZoneLine('Zona vulnerable', report.zones.against),
    topZoneLine('Zona bloqueada', report.zones.defended),
    ...(report.totals.legacyOpponentDefensesWithoutPlayer > 0
      ? ['Nota: algunas defensas rivales antiguas no tienen jugador asociado y no cuentan para la efectividad individual.']
      : []),
    '',
    'Notas',
    report.notes,
  ];

  return lines.join('\n');
}
