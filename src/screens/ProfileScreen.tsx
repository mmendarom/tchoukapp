import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { fetchEntitlement, signOutAccount } from '../backend/accountService';
import { isBackendConfigured } from '../backend/config';
import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { getGraceDaysLeft } from '../domain/session';
import { useMatchStore } from '../store/useMatchStore';
import { useSessionStore } from '../store/useSessionStore';
import { fontSize, spacing } from '../utils/responsive';
import { colors } from '../utils/theme';

const APP_VERSION: string = require('../../app.json').expo.version;

export function ProfileScreen() {
  const profile = useSessionStore((state) => state.profile);
  const updateProfileName = useSessionStore((state) => state.updateProfileName);
  const updateEntitlement = useSessionStore((state) => state.updateEntitlement);
  const logout = useSessionStore((state) => state.logout);
  const resetDemoData = useMatchStore((state) => state.resetDemoData);
  const [nameInput, setNameInput] = useState(profile?.name ?? '');
  const [nameStatus, setNameStatus] = useState('');
  const [nameError, setNameError] = useState('');
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState('');
  const [resetStatus, setResetStatus] = useState('');

  const entitlement = profile?.accountId ? profile.entitlement : undefined;
  const hasAccount = Boolean(profile?.accountId);
  const graceDaysLeft = getGraceDaysLeft(profile);

  const planLabel = !hasAccount
    ? 'Modo local'
    : entitlement?.plan === 'suscripcion'
      ? 'Suscripción'
      : 'Cortesía';
  const statusLabel = !entitlement
    ? 'sin verificar'
    : entitlement.status === 'active'
      ? 'activa'
      : entitlement.status === 'revoked'
        ? 'revocada'
        : 'pendiente';
  const verifiedMs = entitlement ? Date.parse(entitlement.verifiedAt) : Number.NaN;
  const verifiedDaysAgo = Number.isFinite(verifiedMs)
    ? Math.max(0, Math.floor((Date.now() - verifiedMs) / 86400000))
    : undefined;
  const initial = profile?.name?.trim().charAt(0).toUpperCase() || '?';
  const nameDirty = nameInput.trim() !== (profile?.name ?? '') && nameInput.trim().length > 0;

  const handleSaveName = () => {
    const result = updateProfileName(nameInput);

    if (result.success) {
      setNameError('');
      setNameStatus('Nombre actualizado.');
    } else {
      setNameStatus('');
      setNameError(result.error);
    }
  };

  const handleRefreshLicense = async () => {
    if (licenseBusy) {
      return;
    }

    setLicenseBusy(true);
    setLicenseStatus('');

    const result = await fetchEntitlement();

    setLicenseBusy(false);

    if (!result.success) {
      setLicenseStatus(result.error);
      return;
    }

    updateEntitlement(result.entitlement);
    setLicenseStatus('Licencia verificada.');
  };

  const handleResetDemo = () => {
    Alert.alert(
      'Reiniciar datos demo',
      'Se reemplazarán tus jugadores, planteles y partidos actuales por los datos de ejemplo. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reiniciar',
          style: 'destructive',
          onPress: () => {
            resetDemoData();
            setResetStatus('Datos demo restaurados.');
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    void signOutAccount();
    logout();
  };

  return (
    <Screen>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerName}>{profile?.name ?? 'Sin perfil'}</Text>
          {profile?.email ? <Text style={styles.headerEmail}>{profile.email}</Text> : null}
          <View style={styles.planChip}>
            <Text style={styles.planChipText}>{planLabel}</Text>
          </View>
        </View>
      </View>

      <ProfileSection title="Cuenta">
        <Text style={styles.fieldLabel}>Nombre</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={(value) => {
            setNameInput(value);
            setNameStatus('');
            setNameError('');
          }}
          placeholder="Tu nombre"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={nameInput}
        />
        {nameError ? <Text style={styles.error}>{nameError}</Text> : null}
        {nameStatus ? <Text style={styles.success}>{nameStatus}</Text> : null}
        <ActionButton disabled={!nameDirty} label="Guardar nombre" onPress={handleSaveName} />
      </ProfileSection>

      {hasAccount && isBackendConfigured() ? (
        <ProfileSection title="Licencia">
          <ProfileRow label="Plan" value={planLabel} />
          <ProfileRow label="Estado" value={statusLabel} />
          {verifiedDaysAgo !== undefined ? (
            <ProfileRow
              label="Última verificación"
              value={verifiedDaysAgo === 0 ? 'hoy' : verifiedDaysAgo === 1 ? 'hace 1 día' : `hace ${verifiedDaysAgo} días`}
            />
          ) : null}
          {graceDaysLeft !== undefined ? (
            <ProfileRow
              label="Uso sin conexión"
              value={graceDaysLeft === 1 ? 'queda 1 día' : `quedan ${graceDaysLeft} días`}
            />
          ) : null}
          {licenseStatus ? <Text style={styles.muted}>{licenseStatus}</Text> : null}
          <ActionButton
            disabled={licenseBusy}
            label={licenseBusy ? 'Verificando...' : 'Verificar licencia ahora'}
            onPress={handleRefreshLicense}
            variant="secondary"
          />
        </ProfileSection>
      ) : null}

      <ProfileSection title="Datos">
        <Text style={styles.muted}>
          Restaura los jugadores, planteles y partidos de ejemplo. Útil para probar la app; borra tus datos actuales.
        </Text>
        {resetStatus ? <Text style={styles.success}>{resetStatus}</Text> : null}
        <ActionButton label="Reiniciar datos demo" onPress={handleResetDemo} variant="secondary" />
      </ProfileSection>

      <ProfileSection title="Sesión">
        <Text style={styles.muted}>
          Cerrar sesión vuelve a la portada. Tus partidos, jugadores y entrenamientos quedan guardados en este dispositivo.
        </Text>
        <ActionButton label="Cerrar sesión" onPress={handleLogout} variant="danger" />
      </ProfileSection>

      <Text style={styles.version}>TchoukApp v{APP_VERSION}</Text>
    </Screen>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: 8,
    backgroundColor: colors.navy,
    borderWidth: 1,
    borderColor: colors.navyBorder,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: '900',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  headerName: {
    color: colors.white,
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  headerEmail: {
    color: colors.textOnDarkSoft,
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  planChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.skySoft,
    borderWidth: 1,
    borderColor: colors.sky,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  planChipText: {
    color: colors.blueDark,
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  sectionCard: {
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.body,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  muted: {
    color: colors.textSecondary,
    fontSize: fontSize.small,
    fontWeight: '600',
    lineHeight: 18,
  },
  error: {
    color: colors.danger,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  success: {
    color: '#188038',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  version: {
    color: colors.textSecondary,
    fontSize: fontSize.small,
    fontWeight: '700',
    textAlign: 'center',
  },
});
