import { getOpponentDefenseEventsWithLocation, getPointEventsWithLocation } from './court';
import { getEventsByPeriod } from './periodStats';
import { CourtLocation, MatchEvent, MatchPeriod } from './types';

export type LiveMapTab = 'ourPoints' | 'rivalPoints' | 'rivalDefenses' | 'combined';
export type LiveMapMarkerKind = 'ourPoint' | 'rivalPoint' | 'rivalDefense';

export type LiveMapLocationData = {
  events: MatchEvent[];
  locations: CourtLocation[];
};

export type LiveMapMarkerData = {
  kind: LiveMapMarkerKind;
  location: CourtLocation;
};

export function getLiveMapLocationData(events: MatchEvent[], periodNumber: MatchPeriod, tab: LiveMapTab): LiveMapLocationData {
  const periodEvents = getEventsByPeriod(events, periodNumber);

  if (tab === 'ourPoints') {
    const pointEvents = getPointEventsWithLocation(periodEvents, 'uruguay');

    return {
      events: pointEvents,
      locations: pointEvents.map((event) => event.landingLocation),
    };
  }

  if (tab === 'rivalPoints') {
    const pointEvents = getPointEventsWithLocation(periodEvents, 'opponent');

    return {
      events: pointEvents,
      locations: pointEvents.map((event) => event.landingLocation),
    };
  }

  if (tab === 'combined') {
    const markers = getCombinedLiveMapMarkers(events, periodNumber);

    return {
      events: markers.map((marker) => marker.event),
      locations: markers.map((marker) => marker.location),
    };
  }

  const defenseEvents = getOpponentDefenseEventsWithLocation(periodEvents);

  return {
    events: defenseEvents,
    locations: defenseEvents.map((event) => event.defenseLocation),
  };
}

export function getLiveMapLocationCount(events: MatchEvent[], periodNumber: MatchPeriod, tab: LiveMapTab): number {
  return getLiveMapLocationData(events, periodNumber, tab).locations.length;
}

export function getCombinedLiveMapMarkers(events: MatchEvent[], periodNumber: MatchPeriod) {
  const periodEvents = getEventsByPeriod(events, periodNumber);
  const ourPointMarkers = getPointEventsWithLocation(periodEvents, 'uruguay').map((event) => ({
    event,
    kind: 'ourPoint' as const,
    location: event.landingLocation,
  }));
  const rivalPointMarkers = getPointEventsWithLocation(periodEvents, 'opponent').map((event) => ({
    event,
    kind: 'rivalPoint' as const,
    location: event.landingLocation,
  }));
  const rivalDefenseMarkers = getOpponentDefenseEventsWithLocation(periodEvents).map((event) => ({
    event,
    kind: 'rivalDefense' as const,
    location: event.defenseLocation,
  }));

  return [...ourPointMarkers, ...rivalPointMarkers, ...rivalDefenseMarkers];
}
