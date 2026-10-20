import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { adminListEntitlements, adminSetEntitlementStatus, fetchEntitlement, signOutAccount } from '../backend/accountService';
import { isBackendConfigured } from '../backend/config';
import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import {
  AdminEntitlementRow,
  EntitlementStatus,
  getGraceDaysLeft,
  getUnreachableDaysLeft,
  isAdminProfile,
} from '../domain/session';
import { useMatchStore } from '../store/useMatchStore';
import { useSessionStore } from '../store/useSessionStore';
import { fontSize, spacing } from '../utils/responsive';
import { colors } from '../utils/theme';

const APP_VERSION: string = require('../../app.json').expo.version;

export function ProfileScreen() {
  const profile = useSessionStore((state) => state.profile);
  const updateProfileName = useSessionStore((state) => state.updateProfileName);
  const updateEntitlement = useSessionStore((state) => state.updateEntitlement);
  const recordVerificationFailure = useSessionStore((state) => state.recordVerificationFailure);
  const lastFailure = useSessionStore((state) => state.lastVerificationFailure);
  const logout = useSessionStore((state) => state.logout);
  const resetDemoData = useMatchStore((state) => state.resetDemoData);
  const [nameInput, setNameInput] = useState(profile?.name ?? '');
  const [nameStatus, setNameStatus] = useState('');
  const [nameError, setNameError] = useState('');
  const [licenseBusy, setLicenseBusy] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState('');
  const [resetStatus, setResetStatus] = useState('');
  const [adminRows, setAdminRows] = useState<AdminEntitlementRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);

  const entitlement = profile?.accountId ? profile.entitlement : undefined;
  const hasAccount = Boolean(profile?.accountId);
  const graceDaysLeft = getGraceDaysLeft(profile);
  // hasAccount evita mostrar el panel a un perfil local viejo que tenga el
  // email admin sin sesion de Supabase; la autorizacion real vive en el server.
  const isAdmin = hasAccount && isAdminProfile(profile) && isBackendConfigured();

  const loadAdminList = async () => {
    setAdminLoading(true);
    setAdminError('');

    const result = await adminListEntitlements();

    setAdminLoading(false);

    if (!result.success) {
      setAdminError(result.error);
      return;
    }

    setAdminRows(result.entitlements);
  };

  useEffect(() => {
    if (isAdmin) {
      void loadAdminList();
    }
  }, [isAdmin]);

  const handleSetStatus = async (email: string, status: EntitlementStatus) => {
    if (adminBusy || adminLoading) {
      return;
    }

    setAdminBusy(true);
    setAdminError('');

    const result = await adminSetEntitlementStatus(email, status);

    if (!result.success) {
      setAdminBusy(false);
      setAdminError(result.error);
      return;
    }

    await loadAdminList();
    setAdminBusy(false);
  };

  const planLabel = !hasAccount
    ? 'Modo local'
    : entitlement?.plan === 'suscripcion'
      ? 'Suscripción'
      : 'Cortesía';
  const statusLabel = entitlement ? ENTITLEMENT_STATUS_LABEL[entitlement.status] : 'sin verificar';
  const verifiedMs = entitlement ? Date.parse(entitlement.verifiedAt) : Number.NaN;
  const verifiedDaysAgo = Number.isFinite(verifiedMs)
    ? Math.max(0, Math.floor((Date.now() - verifiedMs) / 86400000))
    : undefined;
  const expiryMs = entitlement?.expiresAt ? Date.parse(entitlement.expiresAt) : Number.NaN;
  const expiryLabel = Number.isFinite(expiryMs)
    ? new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(expiryMs))
    : '';
  // Diagnóstico del servidor de licencias (spec 021). Es la información que no
  // existía durante el incidente del 2026-10-18: con el proyecto pausado, la
  // app no mostraba en ningún lado que el problema era del backend.
  const unreachableSince = entitlement?.unreachableSince;
  const unreachableDaysLeft = getUnreachableDaysLeft(profile);
  const shortDate = (iso: string) => {
    const ms = Date.parse(iso);

    return Number.isFinite(ms)
      ? new Intl.DateTimeFormat('es-UY', { day: '2-digit', month: '2-digit' }).format(new Date(ms))
      : '';
  };
  const serverLabel = unreachableSince
    ? `sin contacto desde el ${shortDate(unreachableSince)}${
        unreachableDaysLeft !== undefined
          ? unreachableDaysLeft === 1
            ? ' (queda 1 día)'
            : ` (quedan ${unreachableDaysLeft} días)`
          : ''
      }`
    : lastFailure?.kind === 'auth' || lastFailure?.kind === 'no-session'
      ? 'sesión vencida: volvé a iniciar sesión'
      : lastFailure?.kind === 'unreachable'
        ? 'sin respuesta en el último intento'
        : lastFailure
          ? 'error en el último intento'
          : 'responde con normalidad';
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
      // Registrar el motivo mantiene el diagnóstico de la fila "Servidor" al
      // día y arranca el techo del fail-open si el servidor no responde.
      recordVerificationFailure(result.kind);
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
          {expiryLabel ? <ProfileRow label="Válida hasta" value={expiryLabel} /> : null}
          <ProfileRow label="Servidor" value={serverLabel} />
          {licenseStatus ? <Text style={styles.muted}>{licenseStatus}</Text> : null}
          <ActionButton
            disabled={licenseBusy}
            label={licenseBusy ? 'Verificando...' : 'Verificar licencia ahora'}
            onPress={handleRefreshLicense}
            variant="secondary"
          />
        </ProfileSection>
      ) : null}

      {isAdmin ? (
        <ProfileSection title="Administración">
          <Text style={styles.muted}>
            Activá o revocá las licencias de cortesía de los demás usuarios. Reemplaza el SQL editor de Supabase.
          </Text>
          {adminError ? <Text style={styles.error}>{adminError}</Text> : null}
          {adminLoading && adminRows.length === 0 ? <Text style={styles.muted}>Cargando usuarios...</Text> : null}
          {!adminLoading && adminRows.length === 0 && !adminError ? (
            <Text style={styles.muted}>Todavía no hay usuarios registrados.</Text>
          ) : null}
          {adminRows.map((row) => (
            <AdminUserRow
              busy={adminBusy || adminLoading}
              key={row.email}
              onSetStatus={(status) => handleSetStatus(row.email, status)}
              row={row}
            />
          ))}
          <ActionButton
            disabled={adminLoading || adminBusy}
            label={adminLoading ? 'Actualizando...' : 'Actualizar lista'}
            onPress={loadAdminList}
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

const ENTITLEMENT_STATUS_LABEL: Record<EntitlementStatus, string> = {
  pending: 'pendiente',
  active: 'activa',
  revoked: 'revocada',
};

function AdminUserRow({
  row,
  busy,
  onSetStatus,
}: {
  row: AdminEntitlementRow;
  busy: boolean;
  onSetStatus: (status: EntitlementStatus) => void;
}) {
  const expiryMs = row.expiresAt ? Date.parse(row.expiresAt) : Number.NaN;
  const expiryLabel = Number.isFinite(expiryMs)
    ? `${expiryMs <= Date.now() ? 'Vencida el' : 'Vence el'} ${new Date(expiryMs).toLocaleDateString('es-UY')}`
    : '';

  return (
    <View style={styles.adminRow}>
      <View style={styles.adminRowHeader}>
        <Text numberOfLines={1} style={styles.adminEmail}>
          {row.email}
        </Text>
        <Text style={styles.adminStatus}>{ENTITLEMENT_STATUS_LABEL[row.status]}</Text>
      </View>
      {expiryLabel ? <Text style={styles.adminExpiry}>{expiryLabel}</Text> : null}
      <View style={styles.adminActions}>
        <ActionButton
          disabled={busy || row.status === 'active'}
          label="Activar"
          onPress={() => onSetStatus('active')}
        />
        <ActionButton
          disabled={busy || row.status === 'revoked'}
          label="Revocar"
          onPress={() => onSetStatus('revoked')}
          variant="danger"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  adminRow: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  adminRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  adminEmail: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  adminStatus: {
    color: colors.textSecondary,
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  adminExpiry: {
    color: colors.textSecondary,
    fontSize: fontSize.tiny,
    fontWeight: '700',
  },
  adminActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
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
