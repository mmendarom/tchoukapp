import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '../utils/responsive';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen({ children, scroll = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const contentStyle = [
    styles.content,
    {
      paddingBottom: spacing.md + Math.max(insets.bottom, spacing.md),
      paddingTop: spacing.md,
    },
  ];

  if (!scroll) {
    return (
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={contentStyle} keyboardShouldPersistTaps="handled" style={styles.container}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
});
