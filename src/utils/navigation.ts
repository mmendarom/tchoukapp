export type RootStackParamList = {
  Welcome: undefined;
  Home: undefined;
  Profile: undefined;
  Players: undefined;
  Matches: { openCreate?: boolean } | undefined;
  LiveMatch: { matchId?: string } | undefined;
  MatchDashboard: { matchId?: string } | undefined;
  PeriodSummary: { matchId: string; periodNumber: 1 | 2 | 3 };
  FinalSummary: { matchId: string };
  Fixtures: undefined;
  PracticeSessions: undefined;
  TrainingSessions: undefined;
  LiveTrainingMiniMatch: { sessionId: string; miniMatchId: string };
  StatsMatches: { openCreate?: boolean } | undefined;
  LiveStatsMatch: { matchId: string };
  StatsMatchSummary: { matchId: string; periodNumber?: number };
};
