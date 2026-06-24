import {
  formatTrainingReportPercent,
  TrainingReportData,
  TrainingReportLocation,
  TrainingReportPlayerDetail,
  TrainingReportSectorStat,
} from '../domain/trainingReportData';
import { TrainingPerformanceAttackRow, TrainingPerformanceDefenseRow } from '../domain/trainingPerformance';
import { clampLocation } from '../domain/court';

const escapeHtml = (value: string | number | undefined) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatPercent = formatTrainingReportPercent;

const formatDiff = (value: number) => value >= 0 ? `+${value}` : `${value}`;

const plural = (value: number, singular: string, pluralLabel: string) => `${value} ${value === 1 ? singular : pluralLabel}`;

const renderEmpty = (text: string) => `<p class="empty">${escapeHtml(text)}</p>`;

export const TRAINING_REPORT_GOAL_MAP_GEOMETRY = {
  mapHeight: '224px',
  frameLeft: '33%',
  frameBottom: '0',
  frameWidth: '34%',
  frameHeight: '18px',
  semicircleLeft: '14%',
  semicircleBottom: '-38%',
  semicircleWidth: '72%',
  semicircleHeight: '76%',
  lowerBandTop: '66.66%',
  upperBandTop: '33.33%',
  centerGuideLeft: '50%',
  zeroLabel: '0° fondo',
  middleLabel: '45° intermedio',
  topLabel: '90° centro del área',
} as const;

const renderSummaryCards = (report: TrainingReportData) => `
  <section class="summary-grid">
    ${report.summaryCards.map((card) => `
      <article class="summary-card">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
      </article>
    `).join('')}
  </section>
`;

const renderTeams = (report: TrainingReportData) => `
  <section class="section">
    <h2>Equipos</h2>
    <div class="team-grid">
      ${report.teams.map((team) => `
        <article class="team-card">
          <h3>${escapeHtml(team.name)}</h3>
          ${team.players.length > 0 ? `
            <ul>
              ${team.players.map((player) => `<li>${escapeHtml(player)}</li>`).join('')}
            </ul>
          ` : renderEmpty('Sin jugadores registrados.')}
        </article>
      `).join('')}
    </div>
  </section>
`;

const renderStandings = (report: TrainingReportData) => `
  <section class="section">
    <h2>Tabla de equipos</h2>
    ${report.standings.length === 0 ? renderEmpty('Sin equipos registrados.') : `
      <table>
        <thead>
          <tr>
            <th>Equipo</th>
            <th>J</th>
            <th>G</th>
            <th>P</th>
            <th>PF</th>
            <th>PC</th>
            <th>DIF</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          ${report.standings.map((team) => `
            <tr>
              <td>${escapeHtml(team.teamName)}</td>
              <td>${team.played}</td>
              <td>${team.wins}</td>
              <td>${team.losses}</td>
              <td>${team.pointsFor}</td>
              <td>${team.pointsAgainst}</td>
              <td class="${team.pointDiff >= 0 ? 'positive' : 'negative'}">${formatDiff(team.pointDiff)}</td>
              <td>${formatPercent(team.winRate)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}
  </section>
`;

const renderAttackRows = (report: TrainingReportData) => {
  const maxAttempts = Math.max(...report.performance.attackRows.map((row) => row.attempts), 1);
  const rows = report.performance.attackRows.filter((row) => row.attempts > 0);

  if (rows.length === 0) {
    return renderEmpty('Sin tiros registrados.');
  }

  return rows.map((row) => renderAttackRow(row, maxAttempts, report.performance.topAttackPlayerIds.has(row.playerId))).join('');
};

const renderAttackRow = (row: TrainingPerformanceAttackRow, maxAttempts: number, isTop: boolean) => {
  const attemptWidth = Math.min(row.attempts / maxAttempts, 1) * 100;
  const pointWidth = Math.min(row.points / maxAttempts, 1) * 100;
  const misses = [row.shotsDefended ? plural(row.shotsDefended, 'atajado', 'atajados') : '', row.ownPointsAgainst ? plural(row.ownPointsAgainst, 'errado', 'errados') : '']
    .filter(Boolean)
    .join(' · ');

  return `
    <article class="bar-row ${isTop ? 'top attack-top' : ''}">
      <div class="bar-head">
        <strong>${escapeHtml(row.playerName)}${isTop ? ' · Top' : ''}</strong>
        <span>${row.points}/${row.attempts} tiros · ${row.effectiveness === undefined ? 'Sin tiros' : formatPercent(row.effectiveness)}</span>
      </div>
      ${row.teamName ? `<p>${escapeHtml(row.teamName)}</p>` : ''}
      ${misses ? `<p>${escapeHtml(misses)}</p>` : ''}
      <div class="bar-track attack-track">
        <span class="attempt-bar" style="width:${attemptWidth}%"></span>
        <span class="point-bar" style="width:${pointWidth}%"></span>
      </div>
    </article>
  `;
};

const renderDefenseRows = (report: TrainingReportData) => {
  const rows = report.performance.defenseRows.filter((row) => row.defenses > 0);

  if (rows.length === 0) {
    return renderEmpty('Sin defensas registradas.');
  }

  return rows.map((row) => renderDefenseRow(row, report.performance.topDefensePlayerIds.has(row.playerId))).join('');
};

const renderDefenseRow = (row: TrainingPerformanceDefenseRow, isTop: boolean) => `
  <article class="bar-row ${isTop ? 'top defense-top' : ''}">
    <div class="bar-head">
      <strong>${escapeHtml(row.playerName)}${isTop ? ' · Top' : ''}</strong>
      <span>${plural(row.defenses, 'defensa', 'defensas')} · ${formatPercent(row.defenseShare)}</span>
    </div>
    ${row.teamName ? `<p>${escapeHtml(row.teamName)}</p>` : ''}
    <div class="bar-track defense-track">
      <span class="defense-bar" style="width:${Math.min(row.defenseShare, 1) * 100}%"></span>
    </div>
  </article>
`;

const renderPerformance = (report: TrainingReportData) => `
  <section class="section">
    <h2>Rendimiento jugadores</h2>
    <div class="performance-grid">
      <div class="performance-card attack-card">
        <h3>Ataque</h3>
        ${renderAttackRows(report)}
      </div>
      <div class="performance-card defense-card">
        <h3>Defensa</h3>
        ${renderDefenseRows(report)}
      </div>
    </div>
  </section>
`;

const renderAlerts = (report: TrainingReportData) => {
  const errorRows = report.errors.map((row) => `<li>${escapeHtml(row.playerName)} · ${plural(row.value, 'error', 'errores')}</li>`).join('');
  const ownPointRows = report.ownPointsAgainst.map((row) => `<li>${escapeHtml(row.playerName)} · ${plural(row.value, 'punto en contra', 'puntos en contra')}</li>`).join('');

  return `
    <section class="section">
      <h2>Alertas</h2>
      ${!errorRows && !ownPointRows ? renderEmpty('Sin errores ni puntos en contra registrados.') : `
        <div class="alert-grid">
          <article>
            <h3>Errores</h3>
            ${errorRows ? `<ul>${errorRows}</ul>` : renderEmpty('Sin errores registrados.')}
          </article>
          <article>
            <h3>Puntos en contra</h3>
            ${ownPointRows ? `<ul>${ownPointRows}</ul>` : renderEmpty('Sin puntos en contra registrados.')}
          </article>
        </div>
      `}
    </section>
  `;
};

const renderMiniMatches = (report: TrainingReportData) => `
  <section class="section">
    <h2>Mini partidos</h2>
    ${report.miniMatches.length === 0 ? renderEmpty('Sin mini partidos registrados.') : `
      <div class="mini-list">
        ${report.miniMatches.map((miniMatch) => `
          <article class="mini-card">
            <strong>${escapeHtml(miniMatch.scoreLabel)}</strong>
            <span>${miniMatch.winnerLabel ? `Ganador: ${escapeHtml(miniMatch.winnerLabel)}` : escapeHtml(miniMatch.statusLabel)} · ${plural(miniMatch.eventCount, 'acción', 'acciones')}</span>
          </article>
        `).join('')}
      </div>
    `}
  </section>
`;

const getMarkerClass = (row: TrainingReportLocation) => {
  switch (row.markerKind) {
    case 'shot_defended':
      return 'map-dot-defended-shot';
    case 'defense':
      return 'map-dot-defense';
    case 'point':
    default:
      return 'map-dot-point';
  }
};

const renderMapMarkers = (locations: TrainingReportLocation[]) =>
  locations.map((row, index) => {
    const location = clampLocation(row.location);
    const rawLeft = location.x * 100;
    const rawTop = location.y * 100;
    const left = Math.min(Math.max(rawLeft, 4), 96);
    const top = Math.min(Math.max(rawTop, 4), 96);

    return `<span class="map-dot ${getMarkerClass(row)}" data-x="${location.x.toFixed(3)}" data-y="${location.y.toFixed(3)}" style="left:${left}%; top:${top}%;" title="${escapeHtml(row.label)}">${index + 1}</span>`;
  }).join('');

const renderLocationList = (locations: TrainingReportLocation[]) => {
  if (locations.length === 0) {
    return '';
  }

  return `
    <ol class="location-list">
      ${locations.map((row) => `
        <li>
          ${escapeHtml(row.label)}
          ${row.sectorLabel ? `<small>${escapeHtml(row.sectorLabel)}</small>` : ''}
        </li>
      `).join('')}
    </ol>
  `;
};

const renderMapLegend = (locations: TrainingReportLocation[]) => {
  const kinds = new Set(locations.map((row) => row.markerKind ?? 'point'));

  if (kinds.size <= 1) {
    return '';
  }

  return `
    <div class="map-legend">
      ${kinds.has('point') ? '<span><i class="legend-dot legend-point"></i>Convertidos</span>' : ''}
      ${kinds.has('shot_defended') ? '<span><i class="legend-dot legend-defended-shot"></i>Atajados</span>' : ''}
      ${kinds.has('defense') ? '<span><i class="legend-dot legend-defense"></i>Defensas</span>' : ''}
    </div>
  `;
};

const renderGoalMap = (
  title: string,
  locations: TrainingReportLocation[],
  emptyText = 'Sin ubicaciones registradas.',
) => `
  <article class="map-card">
    <h3>${escapeHtml(title)}</h3>
    <p class="map-count">${locations.length} ubicaciones</p>
    <div class="training-goal-map" aria-label="${escapeHtml(title)}">
      <span class="frame"></span>
      <span class="forbidden-semicircle"></span>
      <span class="band-guide band-guide-thirty"></span>
      <span class="band-guide band-guide-sixty"></span>
      <span class="center-guide"></span>
      ${locations.length > 0 ? renderMapMarkers(locations) : `<span class="empty-map">${escapeHtml(emptyText)}</span>`}
    </div>
    <p class="degree-guide">Guía: ${escapeHtml(TRAINING_REPORT_GOAL_MAP_GEOMETRY.zeroLabel)} · ${escapeHtml(TRAINING_REPORT_GOAL_MAP_GEOMETRY.middleLabel)} · ${escapeHtml(TRAINING_REPORT_GOAL_MAP_GEOMETRY.topLabel)}</p>
    ${renderMapLegend(locations)}
    ${locations.length > 0 ? renderLocationList(locations) : renderEmpty(emptyText)}
  </article>
`;

const renderSectorTable = (title: string, sectors: TrainingReportSectorStat[]) => `
  <article class="sector-card">
    <h3>${escapeHtml(title)}</h3>
    ${sectors.length === 0 ? renderEmpty('Sin ubicaciones registradas.') : `
      <table>
        <tbody>
          ${sectors.map((sector) => `
            <tr>
              <td>${escapeHtml(sector.label)}</td>
              <td>${sector.total}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `}
  </article>
`;

const renderMaps = (report: TrainingReportData) => `
  <section class="section">
    <h2>Mapas one-frame</h2>
    <div class="map-grid">
      ${renderGoalMap('Dónde convertimos', report.pointLocations)}
      ${renderGoalMap('Dónde nos defendieron', report.shotDefendedLocations)}
    </div>
    <div class="sector-grid">
      ${renderSectorTable('Zonas donde más convertimos', report.scoringSectors)}
      ${renderSectorTable('Zonas donde más nos defendieron', report.defendedSectors)}
    </div>
  </section>
`;

const renderPlayerMetricCards = (player: TrainingReportPlayerDetail) => `
  <div class="player-metric-grid">
    <article><span>Equipo</span><strong>${escapeHtml(player.teamName ?? 'Sin equipo')}</strong></article>
    <article><span>Mini partidos</span><strong>${player.miniMatchesPlayed}</strong></article>
    <article><span>Puntos</span><strong>${player.points}</strong></article>
    <article><span>Tiros</span><strong>${player.points}/${player.attempts}</strong></article>
    <article><span>Efectividad</span><strong>${formatPercent(player.effectiveness)}</strong></article>
    <article><span>Defensas</span><strong>${player.defenses}</strong></article>
    <article><span>Errores</span><strong>${player.errors}</strong></article>
    <article><span>Win rate</span><strong>${formatPercent(player.winRate)}</strong></article>
  </div>
`;

const renderPlayerPerformance = (player: TrainingReportPlayerDetail) => {
  const attackWidth = player.attempts > 0 ? Math.min(player.points / player.attempts, 1) * 100 : 0;
  const defenseWidth = Math.min(player.defenseShare, 1) * 100;
  const breakdown = [
    player.shotsDefended ? plural(player.shotsDefended, 'atajado', 'atajados') : '',
    player.ownPointsAgainst ? plural(player.ownPointsAgainst, 'errado', 'errados') : '',
  ].filter(Boolean).join(' · ');

  return `
    <div class="player-performance-grid">
      <article class="player-performance-card attack-card">
        <h4>Ataque</h4>
        <div class="bar-head">
          <strong>${player.points}/${player.attempts} tiros</strong>
          <span>${formatPercent(player.effectiveness)}</span>
        </div>
        ${breakdown ? `<p>${escapeHtml(breakdown)}</p>` : '<p>Sin atajados ni errados.</p>'}
        <div class="bar-track attack-track">
          <span class="attempt-bar" style="width:${player.attempts > 0 ? 100 : 0}%"></span>
          <span class="point-bar" style="width:${attackWidth}%"></span>
        </div>
      </article>
      <article class="player-performance-card defense-card">
        <h4>Defensa</h4>
        <div class="bar-head">
          <strong>${plural(player.defenses, 'defensa', 'defensas')}</strong>
          <span>${formatPercent(player.defenseShare)}</span>
        </div>
        <p>Participación defensiva en la práctica.</p>
        <div class="bar-track defense-track">
          <span class="defense-bar" style="width:${defenseWidth}%"></span>
        </div>
      </article>
    </div>
  `;
};

const renderPlayerDetail = (player: TrainingReportPlayerDetail) => `
  <article class="player-detail-page">
    <header class="player-detail-header">
      <div>
        <span>Detalle individual</span>
        <h3>${escapeHtml(player.playerName)}</h3>
      </div>
      <strong>${escapeHtml(player.teamName ?? 'Sin equipo')}</strong>
    </header>
    ${renderPlayerMetricCards(player)}
    ${renderPlayerPerformance(player)}
    <div class="player-map-grid">
      ${renderGoalMap('Mapa de tiros', player.shotLocations, 'Sin tiros registrados.')}
      ${renderGoalMap('Mapa de defensas', player.defenseLocations, 'Sin defensas registradas.')}
    </div>
  </article>
`;

const renderPlayerDetails = (report: TrainingReportData) => `
  <section class="section player-details-section">
    <h2>Detalle por jugador</h2>
    ${report.playerDetails.length === 0 ? renderEmpty('Sin jugadores registrados.') : report.playerDetails.map(renderPlayerDetail).join('')}
  </section>
`;

export function buildTrainingReportHtml(report: TrainingReportData) {
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
    .cover {
      border-radius: 18px;
      background: linear-gradient(135deg, #0b1f33, #0b6bcb);
      color: #fff;
      padding: 24px;
      margin-bottom: 16px;
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 30px; }
    h2 { font-size: 18px; margin-bottom: 10px; }
    h3 { font-size: 14px; margin-bottom: 8px; }
    .meta { color: #d7e5f2; font-weight: 700; margin-top: 8px; }
    .summary-grid, .team-grid, .performance-grid, .alert-grid, .map-grid, .sector-grid, .player-map-grid, .player-performance-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 16px; }
    .summary-card, .section, .team-card, .performance-card, .alert-grid article, .mini-card, .map-card, .sector-card, .player-detail-page, .player-metric-grid article, .player-performance-card {
      background: #fff;
      border: 1px solid #dbe4ef;
      border-radius: 14px;
      padding: 12px;
    }
    .summary-card span {
      color: #5d6b7a;
      display: block;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .summary-card strong { display: block; font-size: 17px; margin-top: 3px; }
    .section { margin-bottom: 14px; page-break-inside: avoid; }
    ul, ol { margin: 0; padding-left: 18px; }
    li { margin: 3px 0; }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border-bottom: 1px solid #e6eef7;
      padding: 6px 4px;
      text-align: left;
    }
    th {
      color: #5d6b7a;
      font-size: 10px;
      text-transform: uppercase;
    }
    .positive { color: #188038; font-weight: 900; }
    .negative { color: #b42318; font-weight: 900; }
    .empty {
      color: #5d6b7a;
      font-weight: 700;
      margin-top: 4px;
    }
    .performance-card { break-inside: avoid; }
    .attack-card { background: #f0f7ff; border-color: #d9ebff; }
    .defense-card { background: #f0fdfa; border-color: #ccfbf1; }
    .bar-row {
      background: rgba(255,255,255,0.76);
      border: 1px solid transparent;
      border-radius: 10px;
      margin-top: 8px;
      padding: 8px;
    }
    .bar-row p { color: #5d6b7a; font-size: 10px; font-weight: 800; margin-top: 2px; }
    .top { background: #fff; }
    .attack-top { border-color: #0b6bcb; }
    .defense-top { border-color: #0f766e; }
    .bar-head {
      align-items: center;
      display: flex;
      gap: 8px;
      justify-content: space-between;
    }
    .bar-head span { color: #5d6b7a; font-size: 10px; font-weight: 900; }
    .bar-track {
      border-radius: 999px;
      height: 9px;
      margin-top: 6px;
      overflow: hidden;
      position: relative;
    }
    .attack-track { background: #d9ebff; }
    .defense-track { background: #ccfbf1; }
    .attempt-bar, .point-bar, .defense-bar {
      border-radius: 999px;
      bottom: 0;
      display: block;
      left: 0;
      position: absolute;
      top: 0;
    }
    .attempt-bar { background: #8bd3ff; }
    .point-bar { background: #0b6bcb; min-width: 6px; }
    .defense-bar { background: #0f766e; min-width: 6px; }
    .mini-list { display: grid; gap: 8px; }
    .mini-card { display: flex; justify-content: space-between; gap: 8px; }
    .mini-card span { color: #5d6b7a; font-weight: 800; }
    .map-card, .sector-card { break-inside: avoid; }
    .map-count { color: #5d6b7a; font-size: 10px; font-weight: 900; margin-bottom: 8px; text-transform: uppercase; }
    .training-goal-map {
      background:
        linear-gradient(180deg, rgba(24,128,56,0.07), rgba(24,128,56,0.11)),
        #e9f7ee;
      border: 2px solid #188038;
      border-radius: 10px;
      height: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.mapHeight};
      overflow: hidden;
      position: relative;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .frame {
      background: #d7e5f2;
      border: 3px solid #0b1f33;
      border-bottom: 0;
      border-top-left-radius: 8px;
      border-top-right-radius: 8px;
      bottom: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.frameBottom};
      height: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.frameHeight};
      left: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.frameLeft};
      position: absolute;
      width: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.frameWidth};
      z-index: 2;
    }
    .forbidden-semicircle {
      background: rgba(180,35,24,0.07);
      border: 3px solid rgba(180,35,24,0.58);
      border-radius: 999px;
      bottom: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.semicircleBottom};
      height: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.semicircleHeight};
      left: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.semicircleLeft};
      position: absolute;
      width: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.semicircleWidth};
    }
    .band-guide {
      background: rgba(24,128,56,0.28);
      height: 1px;
      left: 8%;
      position: absolute;
      right: 8%;
    }
    .band-guide-thirty { top: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.lowerBandTop}; }
    .band-guide-sixty { top: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.upperBandTop}; }
    .center-guide {
      background: rgba(24,128,56,0.22);
      bottom: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.frameHeight};
      left: ${TRAINING_REPORT_GOAL_MAP_GEOMETRY.centerGuideLeft};
      position: absolute;
      top: 0;
      width: 1px;
    }
    .degree-guide {
      background: #f7fafc;
      border: 1px solid #dbe4ef;
      border-radius: 999px;
      color: #36546f;
      display: inline-block;
      font-size: 10px;
      font-weight: 900;
      margin-top: 8px;
      padding: 4px 8px;
    }
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
    }
    .map-dot-point { background: #0b6bcb; }
    .map-dot-defended-shot { background: #f97316; }
    .map-dot-defense { background: #0f766e; }
    .map-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .map-legend span {
      align-items: center;
      color: #36546f;
      display: flex;
      font-size: 10px;
      font-weight: 900;
      gap: 4px;
    }
    .legend-dot {
      border-radius: 999px;
      display: inline-block;
      height: 9px;
      width: 9px;
    }
    .legend-point { background: #0b6bcb; }
    .legend-defended-shot { background: #f97316; }
    .legend-defense { background: #0f766e; }
    .empty-map {
      color: #5d6b7a;
      font-weight: 900;
      left: 50%;
      position: absolute;
      top: 52%;
      transform: translate(-50%, -50%);
    }
    .location-list { color: #36546f; font-size: 10px; margin-top: 8px; }
    .location-list small {
      color: #5d6b7a;
      display: block;
      font-weight: 800;
    }
    .player-details-section { page-break-before: always; }
    .player-detail-page {
      break-inside: avoid;
      margin-top: 12px;
      page-break-inside: avoid;
    }
    .player-detail-page + .player-detail-page { page-break-before: always; }
    .player-detail-header {
      align-items: flex-start;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .player-detail-header span {
      color: #0b6bcb;
      display: block;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .player-detail-header strong {
      background: #f0f7ff;
      border: 1px solid #d9ebff;
      border-radius: 999px;
      color: #0b6bcb;
      padding: 4px 8px;
    }
    .player-metric-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-bottom: 10px;
    }
    .player-metric-grid span {
      color: #5d6b7a;
      display: block;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
    }
    .player-metric-grid strong {
      display: block;
      font-size: 14px;
      margin-top: 2px;
    }
    .player-performance-card h4 {
      font-size: 12px;
      margin: 0 0 8px;
    }
    .player-performance-card p {
      color: #5d6b7a;
      font-size: 10px;
      font-weight: 800;
      margin-top: 3px;
    }
    .player-map-grid { margin-top: 10px; }
    @page { margin: 14mm; }
  </style>
</head>
<body>
  <main>
    <header class="cover">
      <h1>${escapeHtml(report.title)}</h1>
      <p class="meta">${escapeHtml(report.dateLabel)} · Estado: ${escapeHtml(report.statusLabel)} · Ganador queda: ${escapeHtml(report.winnerStaysLabel)}</p>
    </header>
    ${renderSummaryCards(report)}
    ${renderTeams(report)}
    ${renderStandings(report)}
    ${renderPerformance(report)}
    ${renderAlerts(report)}
    ${renderMiniMatches(report)}
    ${renderMaps(report)}
    ${renderPlayerDetails(report)}
  </main>
</body>
</html>`;
}
