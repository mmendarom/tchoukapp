export type RootStackParamList = {
  Home: undefined;
  Players: undefined;
  Matches: undefined;
  LiveMatch: { matchId?: string } | undefined;
  MatchDashboard: { matchId?: string } | undefined;
  PeriodSummary: { matchId: string; periodNumber: 1 | 2 | 3 };
  FinalSummary: { matchId: string };
  Fixtures: undefined;
};
