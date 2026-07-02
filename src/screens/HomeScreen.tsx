import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { type ReactNode, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { PlayerManagerModal } from '../components/PlayerManagerModal';
import { Screen } from '../components/Screen';
import { TeamPoolManagerModal } from '../components/TeamPoolManagerModal';
import { AppBackupData, buildBackupData } from '../domain/backup';
import { GRACE_WARNING_DAYS, getGraceDaysLeft } from '../domain/session';
import { exportBackupJson } from '../export/exportBackup';
import { pickAndParseBackupJson } from '../export/importBackup';
import { STORE_DATA_VERSION, useMatchStore } from '../store/useMatchStore';
import { usePracticeStore } from '../store/usePracticeStore';
import { useStatsMatchStore } from '../store/useStatsMatchStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { useSessionStore } from '../store/useSessionStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';
import { APP_NAME, APP_TAGLINE } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const appLogo = require('../../assets/logo.png');

export function HomeScreen({ navigation }: Props) {
  const [poolManagerVisible, setPoolManagerVisible] = useState(false);
  const [playerManagerVisible, setPlayerManagerVisible] = useState(false);
  const [backupStatus, setBackupStatus] = useState<'idle' | 'loading' | 'success' | 'unavailable' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'valid' | 'restoring' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const [pendingBackup, setPendingBackup] = useState<AppBackupData | undefined>();
  const [pendingBackupWarnings, setPendingBackupWarnings] = useState<string[]>([]);
  const players = useMatchStore((state) => state.players);
  const matches = useMatchStore((state) => state.matches);
  const fixtures = useMatchStore((state) => state.fixtures);
  const teamPools = useMatchStore((state) => state.teamPools);
  const restoreBackupData = useMatchStore((state) => state.restoreBackupData);
  const practiceSessions = usePracticeStore((state) => state.practiceSessions);
  const restorePracticeSessions = usePracticeStore((state) => state.restorePracticeSessions);
  const trainingSessions = useTrainingStore((state) => state.trainingSessions);
  const restoreTrainingSessions = useTrainingStore((state) => state.restoreTrainingSessions);
  const statsMatches = useStatsMatchStore((state) => state.statsMatches);
  const restoreStatsMatches = useStatsMatchStore((state) => state.restoreStatsMatches);
  const profile = useSessionStore((state) => state.profile);

  const entitlement = profile?.accountId ? profile.entitlement : undefined;
  const verifiedMs = entitlement ? Date.parse(entitlement.verifiedAt) : Number.NaN;
  const verifiedDaysAgo = Number.isFinite(verifiedMs)
    ? Math.max(0, Math.floor((Date.now() - verifiedMs) / 86400000))
    : undefined;
  const licenseLabel = entitlement
    ? [
        `Licencia: ${entitlement.plan === 'suscripcion' ? 'Suscripción' : 'Cortesía'} ${
          entitlement.status === 'active' ? 'activa' : entitlement.status === 'revoked' ? 'revocada' : 'pendiente'
        }`,
        verifiedDaysAgo === undefined
          ? undefined
          : verifiedDaysAgo === 0
            ? 'verificada hoy'
            : verifiedDaysAgo === 1
              ? 'verificada hace 1 día'
              : `verificada hace ${verifiedDaysAgo} días`,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  const graceDaysLeft = getGraceDaysLeft(profile);
  const graceWarningLabel =
    graceDaysLeft === undefined || graceDaysLeft > GRACE_WARNING_DAYS
      ? ''
      : graceDaysLeft === 0
        ? 'La verificación de tu licencia vence hoy. Conectate a internet para renovar el acceso.'
        : graceDaysLeft === 1
          ? 'Queda 1 día de uso sin conexión. Conectate a internet para renovar el acceso.'
          : `Quedan ${graceDaysLeft} días de uso sin conexión. Conectate a internet para renovar el acceso.`;
  const activeMatch = matches.find((match) => match.status === 'live' || match.status === 'period_break');
  const visibleMatchCount = matches.filter((match) => match.status !== 'cancelled').length;
  const backupStatusLabel =
    backupStatus === 'loading'
      ? 'Generando backup...'
      : backupStatus === 'success'
        ? 'Backup generado'
        : backupStatus === 'unavailable'
          ? 'Backup generado, pero no se pudo compartir.'
          : backupStatus === 'error'
            ? 'No se pudo exportar el backup.'
            : '';

  const handleExportBackup = async () => {
    if (backupStatus === 'loading') {
      return;
    }

    setBackupStatus('loading');

    try {
      const backup = buildBackupData(
        {
          players,
          teamPools,
          matches,
          fixtures,
          practiceSessions,
          trainingSessions,
          statsMatches,
        },
        { dataVersion: STORE_DATA_VERSION },
      );

      const result = await exportBackupJson(backup);
      setBackupStatus(result.shared ? 'success' : 'unavailable');
    } catch {
      setBackupStatus('error');
    }
  };

  const handleImportBackup = async () => {
    if (importStatus === 'loading') {
      return;
    }

    setImportStatus('loading');
    setImportError('');
    setPendingBackup(undefined);
    setPendingBackupWarnings([]);

    try {
      const result = await pickAndParseBackupJson();

      if (result.canceled) {
        setImportStatus('idle');
        return;
      }

      if (!result.validation.valid) {
        setImportError(result.validation.error);
        setImportStatus('error');
        return;
      }

      if (!result.backup) {
        setImportError('No se pudo importar el backup.');
        setImportStatus('error');
        return;
      }

      setPendingBackup(result.backup);
      setPendingBackupWarnings(result.validation.warnings);
      setImportStatus('valid');
    } catch {
      setImportError('No se pudo importar el backup.');
      setImportStatus('error');
    }
  };

  const handleCancelRestore = () => {
    setPendingBackup(undefined);
    setPendingBackupWarnings([]);
    setImportStatus('idle');
  };

  const handleConfirmRestore = () => {
    if (!pendingBackup) {
      return;
    }

    setImportStatus('restoring');

    const practiceRestored = restorePracticeSessions(pendingBackup.data.practiceSessions);
    const trainingRestored = restoreTrainingSessions(pendingBackup.data.trainingSessions);
    restoreStatsMatches(pendingBackup.data.statsMatches ?? []);
    const restored = practiceRestored && trainingRestored && restoreBackupData(pendingBackup);

    if (!restored) {
      setImportError('No se pudo importar el backup.');
      setImportStatus('error');
      return;
    }

    setPendingBackup(undefined);
    setPendingBackupWarnings([]);
    setImportStatus('success');
  };

  const importStatusLabel =
    importStatus === 'loading'
      ? 'Seleccionando archivo...'
      : importStatus === 'restoring'
        ? 'Restaurando backup...'
      : importStatus === 'success'
        ? 'Backup restaurado correctamente.'
        : importStatus === 'error'
          ? importError || 'No se pudo importar el backup.'
          : '';

  return (
    <Screen>
      {graceWarningLabel ? (
        <View style={styles.graceBanner}>
          <Text style={styles.graceBannerText}>{graceWarningLabel}</Text>
        </View>
      ) : null}
      <View style={styles.hero}>
        <Image source={appLogo} resizeMode="contain" style={styles.logo} />
        <View style={styles.heroText}>
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.copy}>{APP_TAGLINE}</Text>
          {profile ? <Text style={styles.greeting}>Hola, {profile.name}</Text> : null}
          {licenseLabel ? <Text style={styles.licenseLabel}>{licenseLabel}</Text> : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <HomeStat label="Vs rivales" value={visibleMatchCount} />
        <HomeStat label="Cruces 7v7" value={statsMatches.length} />
        <HomeStat label="Planteles" value={teamPools.length} />
        <HomeStat label="Fixture" value={fixtures.length} />
      </View>

      <View style={styles.actionsPanel}>
        <HomeActionSection title="Partido vs rival">
          {activeMatch && (
            <HomeActionCard
              label="Retomar en vivo"
              description="Volver al partido activo"
              onPress={() => navigation.navigate('LiveMatch', { matchId: activeMatch.id })}
              tone="live"
            />
          )}
          <HomeActionCard
            label="Nuevo partido"
            description="Registrar a tu cuadro contra un rival · 3 tiempos oficiales"
            onPress={() => navigation.navigate('Matches', { openCreate: true })}
            tone="primary"
          />
          <View style={styles.actionRow}>
            <HomeActionCard
              label="Historial"
              description={`${visibleMatchCount} partidos vs rivales`}
              onPress={() => navigation.navigate('Matches')}
              tone="secondary"
            />
            <HomeActionCard
              label="Fixture"
              badge="En desarrollo"
              description={`${fixtures.length} partidos agendados`}
              onPress={() => navigation.navigate('Fixtures')}
              tone="quiet"
            />
          </View>
        </HomeActionSection>

        <HomeActionSection title="Estadística 7v7">
          <HomeActionCard
            label="Cruce entre dos cuadros"
            badge="En desarrollo"
            description={`Armar un 7v7 con dos cuadros propios y stats de ambos · ${statsMatches.length} guardados`}
            onPress={() => navigation.navigate('StatsMatches')}
            tone="management"
          />
        </HomeActionSection>

        <HomeActionSection title="Entrenamiento">
          <HomeActionCard
            label="Entrenamiento"
            badge="En desarrollo"
            description="Planificar sesion, asistencia y bloques"
            onPress={() => navigation.navigate('PracticeSessions')}
            tone="training"
          />
          <HomeActionCard
            label="Práctica 3v3"
            description="Mini partidos, score y rotación"
            onPress={() => navigation.navigate('TrainingSessions')}
            tone="training"
          />
        </HomeActionSection>

        <HomeActionSection title="Gestión">
          <View style={styles.actionRow}>
            <HomeActionCard
              label="Gestionar planteles"
              description="Mayores, +40 y planteles propios"
              onPress={() => setPoolManagerVisible(true)}
              tone="management"
            />
            <HomeActionCard
              label="Gestionar jugadores"
              description="Crear y editar roster local"
              onPress={() => setPlayerManagerVisible(true)}
              tone="management"
            />
            <HomeActionCard
              label="Jugadores"
              description={`${players.length} jugadores cargados`}
              onPress={() => navigation.navigate('Players')}
              tone="quiet"
            />
          </View>
        </HomeActionSection>

        <HomeActionSection title="Datos">
          <View style={styles.actionRow}>
            <HomeActionCard
              disabled={backupStatus === 'loading'}
              label={backupStatus === 'loading' ? 'Generando...' : 'Exportar backup'}
              description="Guardar jugadores, planteles, partidos y entrenamientos"
              onPress={handleExportBackup}
              tone="data"
            />
            <HomeActionCard
              disabled={importStatus === 'loading' || importStatus === 'restoring'}
              label={importStatus === 'loading' ? 'Seleccionando...' : importStatus === 'restoring' ? 'Restaurando...' : 'Importar backup'}
              description="Seleccionar archivo JSON"
              onPress={handleImportBackup}
              tone="caution"
            />
          </View>
        </HomeActionSection>
      </View>

      {backupStatusLabel || importStatusLabel ? (
        <View style={styles.utilityRow}>
          {backupStatusLabel ? <Text style={styles.backupStatus}>{backupStatusLabel}</Text> : null}
          {importStatusLabel ? <Text style={styles.backupStatus}>{importStatusLabel}</Text> : null}
        </View>
      ) : null}
      <Modal visible={Boolean(pendingBackup)} transparent animationType="fade" onRequestClose={handleCancelRestore}>
        <View style={styles.modalBackdrop}>
          <View style={styles.restoreModal}>
            <ScrollView contentContainerStyle={styles.restoreModalContent}>
              <Text style={styles.restoreTitle}>Backup válido</Text>
              <Text style={styles.restoreWarning}>Esta acción reemplazará tus datos actuales.</Text>
              <View style={styles.restoreSummary}>
                <Text style={styles.restoreSummaryItem}>Jugadores: {pendingBackup?.data.players.length ?? 0}</Text>
                <Text style={styles.restoreSummaryItem}>Planteles: {pendingBackup?.data.teamPools.length ?? 0}</Text>
                <Text style={styles.restoreSummaryItem}>Partidos: {pendingBackup?.data.matches.length ?? 0}</Text>
                <Text style={styles.restoreSummaryItem}>Fixtures: {pendingBackup?.data.fixtures.length ?? 0}</Text>
                <Text style={styles.restoreSummaryItem}>Entrenamientos: {pendingBackup?.data.practiceSessions.length ?? 0}</Text>
                <Text style={styles.restoreSummaryItem}>Prácticas 3v3: {pendingBackup?.data.trainingSessions.length ?? 0}</Text>
                <Text style={styles.restoreSummaryItem}>Estadística 7v7: {pendingBackup?.data.statsMatches?.length ?? 0}</Text>
                <Text style={styles.restoreSummaryItem}>Exportado: {pendingBackup?.exportedAt || 'Sin fecha'}</Text>
              </View>
              {pendingBackupWarnings.map((warning) => (
                <Text key={warning} style={styles.restoreWarningNote}>
                  {warning}
                </Text>
              ))}
              <View style={styles.restoreActions}>
                <ActionButton label="Cancelar" onPress={handleCancelRestore} variant="secondary" />
                <ActionButton
                  disabled={importStatus === 'restoring'}
                  label={importStatus === 'restoring' ? 'Restaurando...' : 'Restaurar backup'}
                  onPress={handleConfirmRestore}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <TeamPoolManagerModal visible={poolManagerVisible} onClose={() => setPoolManagerVisible(false)} />
      <PlayerManagerModal visible={playerManagerVisible} onClose={() => setPlayerManagerVisible(false)} />
    </Screen>
  );
}

type HomeActionCardProps = {
  label: string;
  description: string;
  disabled?: boolean;
  badge?: string;
  onPress: () => void;
  tone: 'primary' | 'secondary' | 'management' | 'quiet' | 'live' | 'training' | 'data' | 'caution';
};

function HomeActionCard({ label, description, disabled = false, badge, onPress, tone }: HomeActionCardProps) {
  const darkText = tone === 'quiet' || tone === 'management' || tone === 'training' || tone === 'data' || tone === 'caution';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionCard,
        styles[`${tone}Action`],
        disabled && styles.disabledAction,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.actionLabelRow}>
        <Text style={[styles.actionLabel, darkText && styles.actionLabelDark]}>{label}</Text>
        {badge ? (
          <View style={styles.actionBadge}>
            <Text style={styles.actionBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.actionDescription, darkText && styles.actionDescriptionDark]}>{description}</Text>
    </Pressable>
  );
}

function HomeActionSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.actionSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function HomeStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 8,
    backgroundColor: '#0b1f33',
    borderWidth: 1,
    borderColor: '#16456e',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    overflow: 'hidden',
  },
  logo: {
    width: 104,
    height: 104,
  },
  heroText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
  },
  copy: {
    maxWidth: 760,
    color: '#d7e5f2',
    fontSize: fontSize.body,
    lineHeight: 20,
  },
  greeting: {
    color: '#8bd3ff',
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  licenseLabel: {
    color: '#d7e5f2',
    fontSize: fontSize.small,
    fontWeight: '700',
  },
  graceBanner: {
    borderRadius: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#f5b46b',
    padding: spacing.sm,
  },
  graceBannerText: {
    color: '#b45309',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: 104,
    minHeight: 76,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  statValue: {
    color: '#0b6bcb',
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '900',
  },
  actionsPanel: {
    gap: spacing.md,
  },
  actionSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  sectionContent: {
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    flexGrow: 1,
    flexBasis: 156,
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  primaryAction: {
    flexBasis: '100%',
    minHeight: 112,
    backgroundColor: '#0b6bcb',
    borderColor: '#0b6bcb',
  },
  liveAction: {
    flexBasis: '100%',
    backgroundColor: '#188038',
    borderColor: '#188038',
  },
  secondaryAction: {
    backgroundColor: '#0b1f33',
    borderColor: '#0b1f33',
  },
  managementAction: {
    backgroundColor: '#e8f6ff',
    borderColor: '#8bd3ff',
  },
  trainingAction: {
    flexBasis: '100%',
    minHeight: 104,
    backgroundColor: '#eefcf7',
    borderColor: '#43b58b',
  },
  quietAction: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe4ef',
  },
  dataAction: {
    backgroundColor: '#f7fafc',
    borderColor: '#b7c5d3',
  },
  cautionAction: {
    backgroundColor: '#fff7ed',
    borderColor: '#f5b46b',
  },
  disabledAction: {
    opacity: 0.58,
  },
  actionLabelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: fontSize.section,
    fontWeight: '900',
  },
  actionBadge: {
    borderRadius: 999,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#f5b46b',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  actionBadgeText: {
    color: '#b45309',
    fontSize: fontSize.tiny,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionLabelDark: {
    color: '#0b1f33',
  },
  actionDescription: {
    marginTop: 4,
    color: '#d7e5f2',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  actionDescriptionDark: {
    color: '#5d6b7a',
  },
  utilityRow: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  backupStatus: {
    color: '#36546f',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 31, 51, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  restoreModal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '86%',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
  },
  restoreModalContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  restoreTitle: {
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '900',
    textAlign: 'center',
  },
  restoreWarning: {
    color: '#7a1f14',
    fontSize: fontSize.body,
    fontWeight: '900',
    textAlign: 'center',
  },
  restoreSummary: {
    borderRadius: 8,
    backgroundColor: '#f7fafc',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  restoreSummaryItem: {
    color: '#36546f',
    fontSize: fontSize.body,
    fontWeight: '800',
  },
  restoreWarningNote: {
    color: '#7a1f14',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  restoreActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  pressed: {
    opacity: 0.86,
  },
});
