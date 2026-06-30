import { clampLocation } from '../domain/court';
import { COURT_VISUAL_GEOMETRY } from '../domain/courtVisual';
import {
  formatStatsReportPercent,
  StatsMatchReport,
  StatsReportErrorRow,
  StatsReportLocation,
  StatsReportPlayerRow,
  StatsReportSectorStat,
  StatsReportTeamSection,
} from '../domain/statsMatchReportData';

const escapeHtml = (value: string | number | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderEmpty = (text: string) => `<p class="empty">${escapeHtml(text)}</p>`;

type DotClass = 'dot-home' | 'dot-away' | 'dot-defense';

const renderCourtMarkers = (locations: StatsReportLocation[], dotClass: DotClass) =>
  locations
    .map((row, index) => {
      const location = clampLocation(row.location);
      const left = Math.min(Math.max(location.x * 100, 2), 98);
      const top = Math.min(Math.max(location.y * 100, 4), 96);

      return `<span class="map-dot ${dotClass}" style="left:${left}%; top:${top}%;" title="${escapeHtml(row.label)}">${index + 1}</span>`;
    })
    .join('');

const renderCourtMap = (
  title: string,
  locations: StatsReportLocation[],
  dotClass: DotClass,
  emptyText: string,
) => `
  <article class="map-card">
    <h4>${escapeHtml(title)}</h4>
    <p class="map-count">${locations.length} ubicaciones</p>
    <div class="court" aria-label="${escapeHtml(title)}">
      <span class="court-center-lane"></span>
      <span class="court-center-line"></span>
      <span class="court-lane court-lane-one"></span>
      <span class="court-lane court-lane-two"></span>
      <span class="court-h court-h-top"></span>
      <span class="court-h court-h-middle"></span>
      <span class="court-h court-h-bottom"></span>
      <span class="court-frame court-frame-left"></span>
      <span class="court-frame court-frame-right"></span>
      <span class="court-forbidden court-forbidden-left"></span>
      <span class="court-forbidden court-forbidden-right"></span>
      ${locations.length > 0 ? renderCourtMarkers(locations, dotClass) : `<span class="empty-map">${escapeHtml(emptyText)}</span>`}
    </div>
  </article>
`;

const renderPlayerTable = (
  title: string,
  rows: StatsReportPlayerRow[],
  detail: (row: StatsReportPlayerRow) => string,
  emptyText: string,
) => `
  <article class="list-card">
    <h4>${escapeHtml(title)}</h4>
    ${rows.length === 0 ? renderEmpty(emptyText) : `
      <table>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.playerName)}</td>
              <td class="num">${escapeHtml(detail(row))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}
  </article>
`;

const renderSectorTable = (title: string, sectors: StatsReportSectorStat[], emptyText: string) => `
  <article class="list-card">
    <h4>${escapeHtml(title)}</h4>
    ${sectors.length === 0 ? renderEmpty(emptyText) : `
      <table>
        <tbody>
          ${sectors.map((sector) => `
            <tr>
              <td>${escapeHtml(sector.label)}</td>
              <td class="num">${sector.total}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}
  </article>
`;

const renderErrorTable = (rows: StatsReportErrorRow[]) => `
  <article class="list-card">
    <h4>Errores y pérdidas</h4>
    ${rows.length === 0 ? renderEmpty('Sin errores registrados.') : `
      <table>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(row.label)}</td>
              <td class="num">${row.total}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}
  </article>
`;

const formatShootingLine = (row: StatsReportPlayerRow) =>
  `${row.points}/${row.attempts} · ${row.attempts > 0 ? formatStatsReportPercent(row.effectiveness) : 'Sin tiros'}`;

const renderTeamSection = (section: StatsReportTeamSection, side: 'home' | 'away') => `
  <section class="team-section">
    <header class="team-header">
      <div>
        <span class="team-side">${side === 'home' ? 'Local' : 'Visitante'}</span>
        <h2>${escapeHtml(section.teamName)}${section.category ? ` · ${escapeHtml(section.category)}` : ''}</h2>
      </div>
      <strong>${section.points} a favor · ${section.pointsAgainst} en contra</strong>
    </header>
    <div class="metric-grid">
      <article><span>Intentos</span><strong>${section.attempts}</strong></article>
      <article><span>Efectividad</span><strong>${section.attempts > 0 ? formatStatsReportPercent(section.effectiveness) : '—'}</strong></article>
      <article><span>Defensas</span><strong>${section.defenses}</strong></article>
      <article><span>Errores</span><strong>${section.errors}</strong></article>
    </div>
    <div class="map-grid">
      ${renderCourtMap('Dónde tiró', section.shotLocations, side === 'home' ? 'dot-home' : 'dot-away', 'Sin puntos ubicados.')}
      ${renderCourtMap('Dónde defendió', section.defenseLocations, 'dot-defense', 'Sin defensas ubicadas.')}
    </div>
    ${section.shotsWithoutLocation > 0 ? `<p class="empty">${section.shotsWithoutLocation} puntos sin ubicación registrada.</p>` : ''}
    <div class="list-grid">
      ${renderPlayerTable('Quién tiró', section.topAttackers, formatShootingLine, 'Sin tiros registrados.')}
      ${renderPlayerTable('Destacados en defensa', section.topDefenders, (row) => `${row.defenses}`, 'Sin defensas registradas.')}
    </div>
    <div class="list-grid">
      ${renderSectorTable('Dónde convierte', section.scoringSectors, 'Sin sectores de conversión.')}
      ${renderSectorTable('Dónde le anotan', section.concededSectors, 'No le anotaron con ubicación.')}
      ${renderSectorTable('Dónde le defienden', section.defendedAgainstSectors, 'Sin tiros atajados en contra.')}
      ${renderErrorTable(section.errorBreakdown)}
    </div>
  </section>
`;

export function buildStatsMatchReportHtml(report: StatsMatchReport) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef5fb;
      color: #0b1f33;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 12px;
      line-height: 1.35;
    }
    main { padding: 24px; }
    h1, h2, h3, h4, p { margin: 0; }
    .cover {
      border-radius: 18px;
      background: linear-gradient(135deg, #0b1f33, #0b6bcb);
      color: #fff;
      padding: 24px;
      margin-bottom: 16px;
    }
    .cover h1 { font-size: 28px; }
    .cover .score { font-size: 22px; font-weight: 900; margin-top: 6px; }
    .cover .meta { color: #d7e5f2; font-weight: 700; margin-top: 8px; }
    .team-section {
      background: #fff;
      border: 1px solid #dbe4ef;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .team-header {
      align-items: flex-start;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .team-side {
      color: #0b6bcb;
      display: block;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .team-header h2 { font-size: 20px; }
    .team-header strong {
      background: #f0f7ff;
      border: 1px solid #d9ebff;
      border-radius: 999px;
      color: #0b6bcb;
      padding: 6px 10px;
      white-space: nowrap;
    }
    .metric-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 12px;
    }
    .metric-grid article {
      background: #f7fafc;
      border: 1px solid #dbe4ef;
      border-radius: 12px;
      padding: 8px;
    }
    .metric-grid span {
      color: #5d6b7a;
      display: block;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .metric-grid strong { display: block; font-size: 18px; margin-top: 2px; }
    .map-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .list-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 12px;
    }
    .map-card, .list-card {
      background: #fff;
      border: 1px solid #dbe4ef;
      border-radius: 12px;
      padding: 10px;
      break-inside: avoid;
    }
    .map-card h4, .list-card h4 { font-size: 13px; margin-bottom: 6px; }
    .map-count { color: #5d6b7a; font-size: 10px; font-weight: 900; margin-bottom: 8px; text-transform: uppercase; }
    .court {
      background: #e9f7ee;
      border: 2px solid #188038;
      border-radius: 10px;
      height: 260px;
      overflow: hidden;
      position: relative;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .court-center-lane {
      position: absolute;
      top: 0;
      bottom: 0;
      left: ${COURT_VISUAL_GEOMETRY.centerLaneLeftPercent}%;
      width: ${COURT_VISUAL_GEOMETRY.centerLaneWidthPercent}%;
      background: rgba(255, 255, 255, 0.16);
    }
    .court-center-line {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 50%;
      width: 2px;
      background: #2f7d45;
    }
    .court-lane {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 1px;
      background: rgba(24, 128, 56, 0.22);
    }
    .court-lane-one { left: ${COURT_VISUAL_GEOMETRY.laneOneLeftPercent}%; }
    .court-lane-two { left: ${COURT_VISUAL_GEOMETRY.laneTwoLeftPercent}%; }
    .court-h {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(24, 128, 56, 0.16);
    }
    .court-h-top { top: ${COURT_VISUAL_GEOMETRY.horizontalTopPercent}%; }
    .court-h-middle { top: ${COURT_VISUAL_GEOMETRY.horizontalMiddlePercent}%; background: rgba(24, 128, 56, 0.24); }
    .court-h-bottom { top: ${COURT_VISUAL_GEOMETRY.horizontalBottomPercent}%; }
    .court-frame {
      position: absolute;
      top: 0;
      bottom: 0;
      width: ${COURT_VISUAL_GEOMETRY.frameAreaWidthPercent}%;
      background: rgba(11, 107, 203, 0.08);
    }
    .court-frame-left { left: 0; border-right: 1px solid rgba(47, 125, 69, 0.35); }
    .court-frame-right { right: 0; border-left: 1px solid rgba(47, 125, 69, 0.35); }
    .court-forbidden {
      position: absolute;
      top: ${COURT_VISUAL_GEOMETRY.forbiddenAreaTopPercent}%;
      width: ${COURT_VISUAL_GEOMETRY.forbiddenAreaWidthPercent}%;
      height: ${COURT_VISUAL_GEOMETRY.forbiddenAreaHeightPercent}%;
      border: 2px solid rgba(180, 35, 24, 0.45);
      border-radius: 999px;
      background: rgba(180, 35, 24, 0.06);
    }
    .court-forbidden-left { left: ${COURT_VISUAL_GEOMETRY.forbiddenAreaOffsetPercent}%; }
    .court-forbidden-right { right: ${COURT_VISUAL_GEOMETRY.forbiddenAreaOffsetPercent}%; }
    .map-dot {
      align-items: center;
      border: 2px solid #fff;
      border-radius: 999px;
      color: #fff;
      display: flex;
      font-size: 9px;
      font-weight: 900;
      height: 18px;
      justify-content: center;
      margin-left: -9px;
      margin-top: -9px;
      min-width: 18px;
      position: absolute;
      z-index: 5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .dot-home { background: #0b6bcb; }
    .dot-away { background: #b42318; }
    .dot-defense { background: #7c3aed; }
    .empty-map {
      color: #5d6b7a;
      font-weight: 900;
      left: 50%;
      position: absolute;
      top: 52%;
      transform: translate(-50%, -50%);
    }
    table { border-collapse: collapse; width: 100%; }
    td {
      border-bottom: 1px solid #e6eef7;
      padding: 5px 4px;
      text-align: left;
      font-weight: 700;
    }
    td.num { color: #36546f; font-weight: 900; text-align: right; white-space: nowrap; }
    .empty { color: #5d6b7a; font-weight: 700; margin-top: 4px; }
    @page { margin: 14mm; }
  </style>
</head>
<body>
  <main>
    <header class="cover">
      <h1>${escapeHtml(report.title)}</h1>
      <p class="score">${escapeHtml(report.scoreLabel)}</p>
      <p class="meta">${escapeHtml(report.dateLabel)} · ${escapeHtml(report.formatLabel)} · Estado: ${escapeHtml(report.statusLabel)}</p>
    </header>
    ${report.hasEvents ? '' : renderEmpty('No hay acciones registradas en este tramo.')}
    ${renderTeamSection(report.home, 'home')}
    ${renderTeamSection(report.away, 'away')}
  </main>
</body>
</html>`;
}
