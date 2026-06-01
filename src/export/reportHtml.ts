import { MatchReportData, PeriodReportData, ReportStat, ReportSubstitution, reportEmptyLabel } from '../domain/reportData';

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const scoreText = (uruguay: number, opponent: number, opponentName = 'Rival') =>
  `Uruguay ${uruguay} - ${opponent} ${opponentName}`;

const statListHtml = (items: ReportStat[], emptyText = reportEmptyLabel) =>
  items.length === 0
    ? `<p class="muted">${escapeHtml(emptyText)}</p>`
    : `<ul>${items.map((item) => `<li>${escapeHtml(item.label)}: <strong>${item.total}</strong></li>`).join('')}</ul>`;

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
            ? `<li>${escapeHtml(item.periodLabel)} ${escapeHtml(item.clockLabel)} - intercambio en cancha: ${escapeHtml(item.playerA ?? item.playerOut)} ↔ ${escapeHtml(item.playerB ?? item.playerIn)}</li>`
            : `<li>${escapeHtml(item.periodLabel)} ${escapeHtml(item.clockLabel)} - entra ${escapeHtml(item.playerIn)}, sale ${escapeHtml(item.playerOut)}</li>`,
        )
        .join('')}</ul>`;

const insightsHtml = (items: Array<{ title: string; description: string; suggestedAction: string }>) =>
  items.length === 0
    ? '<p class="muted">Sin alertas tacticas.</p>'
    : `<ul>${items
        .map((item) => `<li><strong>${escapeHtml(item.title)}:</strong> ${escapeHtml(item.description)} <em>${escapeHtml(item.suggestedAction)}</em></li>`)
        .join('')}</ul>`;

const periodHtml = (period: PeriodReportData, opponentName: string) => `
  <section>
    <h2>${escapeHtml(period.periodLabel)}</h2>
    <p class="score">${escapeHtml(scoreText(period.score.uruguay, period.score.opponent, opponentName))}</p>
    <div class="grid">
      <div><strong>Puntos Uruguay</strong><span>${period.uruguayPoints}</span></div>
      <div><strong>Puntos rival</strong><span>${period.opponentPoints}</span></div>
      <div><strong>Puntos en contra</strong><span>${period.ownPoints}</span></div>
      <div><strong>Puntos en contra del rival</strong><span>${period.opponentOwnPoints}</span></div>
    </div>
    <h3>Goleadores</h3>
    ${statListHtml(period.topScorers, 'Sin puntos de Uruguay.')}
    <h3>Defensas</h3>
    ${statListHtml(period.defenses, 'Sin defensas registradas.')}
    <h3>Faltas</h3>
    ${statListHtml(period.faltas, 'Sin faltas registradas.')}
    <h3>Puntos en contra</h3>
    ${statListHtml(period.ownPointsByPlayer, 'Sin puntos en contra.')}
    <h3>Errores totales</h3>
    ${statListHtml(period.totalErrors, 'Sin errores registrados.')}
    <h3>Cambios</h3>
    ${substitutionsHtml(period.substitutions)}
    <h3>Alertas tacticas</h3>
    ${insightsHtml(period.insights)}
  </section>
`;

export function buildMatchReportHtml(report: MatchReportData) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0b1f33; margin: 28px; line-height: 1.35; }
    h1 { font-size: 28px; margin: 0 0 6px; }
    h2 { font-size: 20px; margin: 22px 0 8px; border-bottom: 2px solid #dbe4ef; padding-bottom: 4px; }
    h3 { font-size: 15px; margin: 14px 0 4px; }
    p { margin: 4px 0; }
    ul, ol { margin: 4px 0 8px 20px; padding: 0; }
    li { margin: 2px 0; }
    .hero { background: #0b1f33; color: white; padding: 18px; border-radius: 8px; margin-bottom: 16px; }
    .hero p { color: #d7e5f2; }
    .score { font-size: 18px; font-weight: 800; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }
    .grid div { border: 1px solid #dbe4ef; border-radius: 8px; padding: 8px; background: #f7fafc; }
    .grid strong { display: block; font-size: 12px; color: #5d6b7a; }
    .grid span { display: block; font-size: 18px; font-weight: 900; margin-top: 3px; }
    .muted { color: #5d6b7a; }
    section { break-inside: avoid; margin-bottom: 12px; }
    .note { background: #f4f7fb; border-left: 4px solid #0b6bcb; padding: 8px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>${escapeHtml(report.title)}</h1>
    <p>${escapeHtml(report.matchLabel)}</p>
    <p>${escapeHtml(report.dateLabel)} · ${escapeHtml(report.venueLabel)}</p>
    <p>${escapeHtml(report.competitionLabel)}</p>
    <p class="score">${escapeHtml(scoreText(report.finalScore.uruguay, report.finalScore.opponent, report.opponent))}</p>
  </div>

  <section>
    <h2>Resultado por tiempos</h2>
    <ul>
      ${report.scoreByPeriod.map((item) => `<li>${escapeHtml(item.periodLabel)}: ${escapeHtml(scoreText(item.score.uruguay, item.score.opponent, report.opponent))}</li>`).join('')}
    </ul>
  </section>

  ${report.periods.map((period) => periodHtml(period, report.opponent)).join('')}

  <section>
    <h2>Estadisticas totales</h2>
    <h3>Goleadores</h3>
    ${statListHtml(report.totals.topScorers, 'Sin puntos de Uruguay.')}
    <h3>Defensas</h3>
    ${statListHtml(report.totals.defenses, 'Sin defensas registradas.')}
    <h3>Faltas</h3>
    ${statListHtml(report.totals.faltas, 'Sin faltas registradas.')}
    <h3>Puntos en contra</h3>
    ${statListHtml(report.totals.ownPointsByPlayer, 'Sin puntos en contra.')}
    <h3>Errores totales</h3>
    ${statListHtml(report.totals.totalErrors, 'Sin errores registrados.')}
    <p><strong>Puntos en contra del rival:</strong> ${report.totals.opponentOwnPoints}</p>
    <h3>Alertas tacticas</h3>
    ${insightsHtml(report.totals.insights)}
  </section>

  <section>
    <h2>Zonas de ataque</h2>
    ${report.zones.attack.length === 0 ? '<p class="muted">Sin ubicacion registrada.</p>' : `<ul>${report.zones.attack.map((stat) => `<li>${escapeHtml(stat.label)}: <strong>${stat.total}</strong></li>`).join('')}</ul>`}
    <h2>Zonas donde nos anotaron</h2>
    ${report.zones.against.length === 0 ? '<p class="muted">Sin ubicacion registrada.</p>' : `<ul>${report.zones.against.map((stat) => `<li>${escapeHtml(stat.label)}: <strong>${stat.total}</strong></li>`).join('')}</ul>`}
    <p class="note">Mapa visual exportable pendiente para una proxima iteracion.</p>
  </section>

  <section>
    <h2>Formaciones</h2>
    <h3>Formacion inicial</h3>
    ${stringListHtml(report.lineups.initial)}
    <h3>Formacion final</h3>
    ${stringListHtml(report.lineups.final)}
    <h3>Cambios realizados</h3>
    ${substitutionsHtml(report.totals.substitutions)}
  </section>

  <section>
    <h2>Notas</h2>
    <p>${escapeHtml(report.notes)}</p>
  </section>
</body>
</html>`;
}

const statLines = (title: string, items: ReportStat[], emptyText: string) => [
  title,
  ...(items.length === 0 ? [`- ${emptyText}`] : items.map((item) => `- ${item.label}: ${item.total}`)),
];

export function buildMatchReportText(report: MatchReportData) {
  const lines = [
    report.title,
    report.matchLabel,
    `${report.dateLabel} · ${report.venueLabel}`,
    scoreText(report.finalScore.uruguay, report.finalScore.opponent, report.opponent),
    '',
    'Resultado por tiempos',
    ...report.scoreByPeriod.map((item) => `- ${item.periodLabel}: ${scoreText(item.score.uruguay, item.score.opponent, report.opponent)}`),
    '',
    ...statLines('Goleadores', report.totals.topScorers, 'Sin puntos de Uruguay.'),
    '',
    ...statLines('Defensas', report.totals.defenses, 'Sin defensas registradas.'),
    '',
    ...statLines('Faltas', report.totals.faltas, 'Sin faltas registradas.'),
    '',
    ...statLines('Puntos en contra', report.totals.ownPointsByPlayer, 'Sin puntos en contra.'),
    '',
    `Puntos en contra del rival: ${report.totals.opponentOwnPoints}`,
    '',
    'Cambios',
    ...(report.totals.substitutions.length === 0
      ? ['- Sin cambios registrados.']
      : report.totals.substitutions.map((item) =>
          item.kind === 'lineup_swap'
            ? `- ${item.periodLabel} ${item.clockLabel}: intercambio en cancha ${item.playerA ?? item.playerOut} ↔ ${item.playerB ?? item.playerIn}`
            : `- ${item.periodLabel} ${item.clockLabel}: entra ${item.playerIn}, sale ${item.playerOut}`,
        )),
    '',
    'Formacion inicial',
    ...report.lineups.initial.map((item) => `- ${item}`),
    '',
    'Formacion final',
    ...report.lineups.final.map((item) => `- ${item}`),
    '',
    'Notas',
    report.notes,
  ];

  return lines.join('\n');
}
