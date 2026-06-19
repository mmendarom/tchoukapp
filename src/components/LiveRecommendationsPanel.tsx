import { memo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

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

const typeStyles: Record<LiveRecommendationType, { badge: object; text: object; row: object; title: object }> = {
  warning: {
    badge: { backgroundColor: '#fff1f2', borderColor: '#f97316' },
    row: { borderLeftColor: '#b42318', backgroundColor: '#fff7ed' },
    text: { color: '#991b1b' },
    title: { color: '#7f1d1d' },
  },
  adjustment: {
    badge: { backgroundColor: '#e0f2fe', borderColor: '#7dd3fc' },
    row: { borderLeftColor: '#0b6bcb', backgroundColor: '#f0f7ff' },
    text: { color: '#075985' },
    title: { color: '#0b1f33' },
  },
  info: {
    badge: { backgroundColor: '#ecfeff', borderColor: '#67e8f9' },
    row: { borderLeftColor: '#0f766e', backgroundColor: '#f6fffb' },
    text: { color: '#0f766e' },
    title: { color: '#0b1f33' },
  },
};

export const LiveRecommendationsPanel = memo(function LiveRecommendationsPanel({
  recommendations,
}: LiveRecommendationsPanelProps) {
  const { width } = useWindowDimensions();
  const useTwoColumns = width >= 820;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Lectura en vivo</Text>
        {recommendations.length > 0 ? (
          <Text style={styles.count}>{recommendations.length}</Text>
        ) : null}
      </View>
      {recommendations.length === 0 ? (
        <Text style={styles.emptyText}>Sin alertas importantes por ahora.</Text>
      ) : (
        <View style={[styles.list, useTwoColumns && styles.listWide]}>
          {recommendations.map((recommendation) => (
            <View
              key={recommendation.id}
              style={[
                styles.row,
                typeStyles[recommendation.type].row,
                useTwoColumns && styles.rowWide,
              ]}
            >
              <View style={[styles.badge, typeStyles[recommendation.type].badge]}>
                <Text style={[styles.badgeText, typeStyles[recommendation.type].text]}>
                  {typeLabel[recommendation.type]}
                </Text>
              </View>
              <View style={styles.content}>
                <Text numberOfLines={1} style={[styles.recommendationTitle, typeStyles[recommendation.type].title]}>{recommendation.title}</Text>
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
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  count: {
    minWidth: 26,
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    color: '#ffffff',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    textAlign: 'center',
  },
  emptyText: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  list: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  listWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  row: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3ebf4',
    borderLeftWidth: 4,
    backgroundColor: '#f7fafc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  rowWide: {
    flexBasis: '49%',
    flexGrow: 1,
  },
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 52,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textAlign: 'center',
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
