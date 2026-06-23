import { getTrainingSessionStats, recalculateTrainingMiniMatch, TrainingSession } from '../domain/training';
import { deriveTrainingGoalSector } from '../domain/trainingGoalMap';
import { getTrainingPlayerLabel, getTrainingTeamName } from '../domain/trainingLive';
import { Player } from '../domain/types';

const MAX_TEAM_ROWS = 5;
const MAX_PLAYER_ROWS = 5;
const MAX_ALERT_ROWS = 3;
const MAX_MINI_MATCH_ROWS = 10;

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatDiff = (value: number) => value >= 0 ? `+${value}` : `${value}`;

const countLabel = (value: number, singular: string, plural: string) => `${value} ${value === 1 ? singular : plural}`;

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return new Intl.DateTimeFormat('es-UY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const section = (title: string, rows: string[]) => [title, ...rows].join('\n');

const increment = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const sortSectorRows = (totals: Map<string, number>) =>
  Array.from(totals, ([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));

const buildTrainingLocationRows = (session: TrainingSession, eventType: 'point' | 'shot_defended') => {
  const totals = new Map<string, number>();

  session.miniMatches
    .filter((miniMatch) => miniMatch.status === 'live' || miniMatch.status === 'finished')
    .flatMap((miniMatch) => miniMatch.events)
    .filter((event) => event.type === eventType)
    .forEach((event) => {
      const sector = deriveTrainingGoalSector(event.location);

      if (sector) {
        increment(totals, sector.shortLabel);
      }
    });

  return sortSectorRows(totals).slice(0, 3).map((sector) => `${sector.label} (${sector.total})`);
};

export function buildTrainingShareText(session: TrainingSession, players: Player[]) {
  const stats = getTrainingSessionStats(session);
  const shareableMiniMatches = session.miniMatches.filter(
    (miniMatch) => miniMatch.status === 'live' || miniMatch.status === 'finished',
  );
  const title = session.teamPoolName?.trim()
    ? `Práctica 3v3 · ${session.teamPoolName.trim()}`
    : 'Práctica 3v3';
  const teamRows = stats.teamStats.slice(0, MAX_TEAM_ROWS).map((team, index) =>
    `${index + 1}. ${getTrainingTeamName(session, team.teamId)} — ${team.wins}G / ${team.losses}P · ${formatDiff(team.pointDiff)}`,
  );
  const attackRows = stats.topAttackers.slice(0, MAX_PLAYER_ROWS).map((player) =>
    `${getTrainingPlayerLabel(players, player.playerId)} · ${player.points}/${player.attempts} tiros · ${formatPercent(player.effectiveness)}`,
  );
  const defenseRows = stats.topDefenders.slice(0, MAX_PLAYER_ROWS).map((player) =>
    `${getTrainingPlayerLabel(players, player.playerId)} · ${countLabel(player.defenses, 'defensa', 'defensas')}`,
  );
  const errorRows = stats.mostErrors.slice(0, MAX_ALERT_ROWS).map((player) =>
    `${getTrainingPlayerLabel(players, player.playerId)} · ${countLabel(player.errors, 'error', 'errores')}`,
  );
  const ownPointRows = stats.mostOwnPointsAgainst.slice(0, MAX_ALERT_ROWS).map((player) =>
    `${getTrainingPlayerLabel(players, player.playerId)} · ${countLabel(player.ownPointsAgainst, 'punto en contra', 'puntos en contra')}`,
  );
  const alerts = [...errorRows, ...ownPointRows];
  const scoringZoneRows = buildTrainingLocationRows(session, 'point');
  const defendedZoneRows = buildTrainingLocationRows(session, 'shot_defended');
  const visibleMiniMatches = shareableMiniMatches.slice(-MAX_MINI_MATCH_ROWS);
  const hiddenMiniMatchCount = shareableMiniMatches.length - visibleMiniMatches.length;
  const miniMatchRows = visibleMiniMatches.map((miniMatch) => {
    const normalized = recalculateTrainingMiniMatch(miniMatch);
    const score = `${getTrainingTeamName(session, normalized.teamAId)} ${normalized.scoreA} - ${normalized.scoreB} ${getTrainingTeamName(session, normalized.teamBId)}`;

    return normalized.status === 'live' ? `${score} · En vivo` : score;
  });

  if (hiddenMiniMatchCount > 0) {
    miniMatchRows.push(`+${hiddenMiniMatchCount} mini partidos más`);
  }

  return [
    title,
    `Fecha: ${formatDate(session.createdAt)}`,
    `Mini partidos: ${shareableMiniMatches.length} · A ${session.settings.targetScore} puntos`,
    section('Equipos', teamRows.length > 0 ? teamRows : ['Sin equipos registrados.']),
    section('Top ataque', attackRows.length > 0 ? attackRows : ['Sin tiros registrados.']),
    section('Top defensa', defenseRows.length > 0 ? defenseRows : ['Sin defensas registradas.']),
    ...(alerts.length > 0 ? [section('Alertas', alerts)] : []),
    ...(scoringZoneRows.length > 0 ? [section('Zonas donde más convertimos', scoringZoneRows)] : []),
    ...(defendedZoneRows.length > 0 ? [section('Zonas donde más nos defendieron', defendedZoneRows)] : []),
    section('Mini partidos', miniMatchRows.length > 0 ? miniMatchRows : ['Sin mini partidos registrados.']),
  ].join('\n\n');
}
