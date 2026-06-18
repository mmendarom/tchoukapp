import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LiveRecommendation, LiveRecommendationType } from '../domain/liveRecommendations';
import { fontSize, spacing } from '../utils/responsive';

type LiveRecommendationsPanelProps = {
  recommendations: LiveRecommendation[];
};

const typeLabel: Record<LiveRecommendationType, string> = {
  warning: 'Atención',
  adjustment: 'Ajuste',
  info: 'Dato',
};

const typeStyles: Record<LiveRecommendationType, { badge: object; text: object; row: object }> = {
  warning: {
    badge: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
    row: { borderLeftColor: '#b42318' },
    text: { color: '#991b1b' },
  },
  adjustment: {
    badge: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
    row: { borderLeftColor: '#0b6bcb' },
    text: { color: '#075985' },
  },
  info: {
    badge: { backgroundColor: '#dcfce7', borderColor: '#86efac' },
    row: { borderLeftColor: '#188038' },
    text: { color: '#166534' },
  },
};

export const LiveRecommendationsPanel = memo(function LiveRecommendationsPanel({
  recommendations,
}: LiveRecommendationsPanelProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Lectura en vivo</Text>
      {recommendations.length === 0 ? (
        <Text style={styles.emptyText}>Sin alertas importantes por ahora.</Text>
      ) : (
        <View style={styles.list}>
          {recommendations.map((recommendation) => (
            <View
              key={recommendation.id}
              style={[styles.row, typeStyles[recommendation.type].row]}
            >
              <View style={[styles.badge, typeStyles[recommendation.type].badge]}>
                <Text style={[styles.badgeText, typeStyles[recommendation.type].text]}>
                  {typeLabel[recommendation.type]}
                </Text>
              </View>
              <View style={styles.content}>
                <Text numberOfLines={1} style={styles.recommendationTitle}>{recommendation.title}</Text>
                {recommendation.detail && (
                  <Text numberOfLines={2} style={styles.detail}>{recommendation.detail}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  emptyText: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3ebf4',
    borderLeftWidth: 4,
    backgroundColor: '#f7fafc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  recommendationTitle: {
    color: '#0b1f33',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  detail: {
    color: '#5d6b7a',
    fontSize: fontSize.tiny,
    fontWeight: '800',
  },
});
