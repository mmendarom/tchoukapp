import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { type ReactNode, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { PlayerManagerModal } from '../components/PlayerManagerModal';
import { Screen } from '../components/Screen';
import { TeamPoolManagerModal } from '../components/TeamPoolManagerModal';
import { AppBackupData, buildBackupData } from '../domain/backup';
import { exportBackupJson } from '../export/exportBackup';
import { pickAndParseBackupJson } from '../export/importBackup';
import { STORE_DATA_VERSION, useMatchStore } from '../store/useMatchStore';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const associationLogo = require('../../assets/association-logo.png');

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
  const resetDemoData = useMatchStore((state) => state.resetDemoData);
  const restoreBackupData = useMatchStore((state) => state.restoreBackupData);
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

    const restored = restoreBackupData(pendingBackup);

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
      <View style={styles.hero}>
        <View style={styles.logoShell}>
          <Image source={associationLogo} resizeMode="contain" style={styles.logo} />
        </View>
        <View style={styles.heroText}>
          <Text style={styles.kicker}>Selección Uruguaya de Tchoukball</Text>
          <Text style={styles.title}>Tchoukball Uruguay</Text>
          <Text style={styles.copy}>Estadísticas, planteles y análisis en tiempo real</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <HomeStat label="Partidos" value={visibleMatchCount} />
        <HomeStat label="Planteles" value={teamPools.length} />
        <HomeStat label="Próximos" value={fixtures.length} />
      </View>

      <View style={styles.actionsPanel}>
        <HomeActionSection title="Partido">
          {activeMatch && (
            <HomeActionCard
              label="Retomar en vivo"
              description="Volver al partido activo"
              onPress={() => navigation.navigate('LiveMatch', { matchId: activeMatch.id })}
              tone="live"
            />
          )}
          <HomeActionCard
            label="Crear partido"
            description="Configurar rival, plantel y titulares"
            onPress={() => navigation.navigate('Matches', { openCreate: true })}
            tone="primary"
          />
          <View style={styles.actionRow}>
            <HomeActionCard
              label="Partidos"
              description="Ver historial y continuar"
              onPress={() => navigation.navigate('Matches')}
              tone="secondary"
            />
            <HomeActionCard
              label="Fixture"
              description={`${fixtures.length} próximos`}
              onPress={() => navigation.navigate('Fixtures')}
              tone="quiet"
            />
          </View>
        </HomeActionSection>

        <HomeActionSection title="Entrenamiento">
          <HomeActionCard
            label="Práctica 3v3"
            description="Crear equipos internos y preparar la sesión"
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
              description="Guardar jugadores, planteles y partidos"
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

      <View style={styles.utilityRow}>
        <ActionButton
          label="Reiniciar datos demo"
          onPress={resetDemoData}
          variant="secondary"
        />
        {backupStatusLabel ? <Text style={styles.backupStatus}>{backupStatusLabel}</Text> : null}
        {importStatusLabel ? <Text style={styles.backupStatus}>{importStatusLabel}</Text> : null}
      </View>
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
  onPress: () => void;
  tone: 'primary' | 'secondary' | 'management' | 'quiet' | 'live' | 'training' | 'data' | 'caution';
};

function HomeActionCard({ label, description, disabled = false, onPress, tone }: HomeActionCardProps) {
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
      <Text style={[styles.actionLabel, darkText && styles.actionLabelDark]}>{label}</Text>
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
  logoShell: {
    width: 104,
    height: 104,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#8bd3ff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xs,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  heroText: {
    flex: 1,
    gap: spacing.xs,
  },
  kicker: {
    color: '#8bd3ff',
    fontSize: fontSize.small,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  actionLabel: {
    color: '#ffffff',
    fontSize: fontSize.section,
    fontWeight: '900',
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
