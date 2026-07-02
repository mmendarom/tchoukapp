import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchEntitlement, signOutAccount } from '../backend/accountService';
import { AccessEvaluation } from '../domain/session';
import { useSessionStore } from '../store/useSessionStore';
import { fontSize, spacing } from '../utils/responsive';
import { APP_NAME, colors } from '../utils/theme';

type Props = {
  access: AccessEvaluation;
};

const MESSAGES: Record<string, { title: string; copy: string }> = {
  pending: {
    title: 'Acceso pendiente',
    copy: 'Tu cuenta está creada pero el acceso todavía no fue activado. Avisale a Mauro y volvé a intentar.',
  },
  revoked: {
    title: 'Acceso revocado',
    copy: 'Tu acceso a la app fue desactivado. Si creés que es un error, contactá a Mauro.',
  },
  expired: {
    title: 'Verificación vencida',
    copy: 'Pasaron más de 14 días sin verificar tu licencia. Conectate a internet y reintentá para seguir usando la app.',
  },
};

export function AccessBlockedScreen({ access }: Props) {
  const profile = useSessionStore((state) => state.profile);
  const updateEntitlement = useSessionStore((state) => state.updateEntitlement);
  const logout = useSessionStore((state) => state.logout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const message = MESSAGES[access] ?? MESSAGES.pending;

  const handleRetry = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    setError('');

    const result = await fetchEntitlement();

    setBusy(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    updateEntitlement(result.entitlement);

    if (result.entitlement.status !== 'active') {
      setError('Tu acceso todavía no está activo.');
    }
  };

  const handleLogout = () => {
    void signOutAccount();
    logout();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.brand}>{APP_NAME}</Text>
      <View style={styles.card}>
        <Text style={styles.title}>{message.title}</Text>
        <Text style={styles.copy}>{message.copy}</Text>
        {profile?.email ? <Text style={styles.account}>Cuenta: {profile.email}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={handleRetry}
          style={({ pressed }) => [styles.retry, busy && styles.disabled, pressed && styles.retryPressed]}
        >
          <Text style={styles.retryLabel}>{busy ? 'Verificando...' : 'Reintentar verificación'}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={handleLogout} style={styles.logout}>
          <Text style={styles.logoutLabel}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  brand: {
    color: colors.sky,
    fontSize: fontSize.title,
    fontWeight: '900',
    letterSpacing: 3,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  copy: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    fontWeight: '600',
    lineHeight: 20,
  },
  account: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  retry: {
    marginTop: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.blue,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  retryPressed: {
    backgroundColor: colors.blueDark,
  },
  disabled: {
    opacity: 0.62,
  },
  retryLabel: {
    color: colors.white,
    fontSize: fontSize.button,
    fontWeight: '900',
  },
  logout: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  logoutLabel: {
    color: colors.blue,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
});
