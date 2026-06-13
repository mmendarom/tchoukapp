import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ActionButton } from '../components/ActionButton';
import { Screen } from '../components/Screen';
import { normalizeOpponentName } from '../domain/opponent';
import { calculateScore } from '../domain/stats';
import { useMatchStore } from '../store/useMatchStore';
import { formatMatchDate } from '../utils/date';
import { statusLabel } from '../utils/labels';
import { RootStackParamList } from '../utils/navigation';
import { fontSize, spacing } from '../utils/responsive';

type Props = NativeStackScreenProps<RootStackParamList, 'Matches'>;

export function MatchesScreen({ navigation }: Props) {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [opponentInput, setOpponentInput] = useState('');
  const matches = useMatchStore((state) => state.matches);
  const startMatch = useMatchStore((state) => state.startMatch);
  const createMatch = useMatchStore((state) => state.createMatch);
  const visibleMatches = matches.filter((match) => match.status !== 'cancelled');
  const closeCreateModal = () => {
    setCreateModalVisible(false);
    setOpponentInput('');
  };
  const confirmCreateMatch = () => {
    const matchId = createMatch({ opponent: opponentInput });
    closeCreateModal();
    navigation.navigate('LiveMatch', { matchId });
  };

  return (
    <Screen>
      <Text style={styles.title}>Partidos</Text>
      <ActionButton
        label="Crear partido"
        onPress={() => setCreateModalVisible(true)}
      />
      <Modal visible={createModalVisible} animationType="fade" transparent onRequestClose={closeCreateModal}>
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Crear partido</Text>
            <Text style={styles.inputLabel}>Rival</Text>
            <TextInput
              autoCapitalize="words"
              autoFocus
              onChangeText={setOpponentInput}
              placeholder="Ej: Argentina"
              placeholderTextColor="#8a98a8"
              returnKeyType="done"
              style={styles.input}
              value={opponentInput}
            />
            <Text style={styles.helperText}>Nombre del rival</Text>
            <View style={styles.modalActions}>
              <ActionButton label="Cancelar" onPress={closeCreateModal} variant="secondary" />
              <ActionButton label="Crear" onPress={confirmCreateMatch} />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      {visibleMatches.map((match) => {
        const score = calculateScore(match.events);
        const opponentName = normalizeOpponentName(match.opponent);

        return (
          <Pressable
            key={match.id}
            onPress={() => navigation.navigate('MatchDashboard', { matchId: match.id })}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.opponent}>Uruguay vs {opponentName}</Text>
              <Text style={[styles.status, styles.statusText]}>{statusLabel[match.status].toUpperCase()}</Text>
            </View>
            <Text style={styles.meta}>{formatMatchDate(match.startsAt)} - {match.venue}</Text>
            <Text style={styles.score}>{score.uruguay} - {score.opponent}</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  startMatch(match.id);
                  navigation.navigate('LiveMatch', { matchId: match.id });
                }}
                style={styles.startButton}
              >
                <Text style={styles.startLabel}>{match.status === 'live' || match.status === 'period_break' ? 'Retomar' : 'Iniciar partido'}</Text>
              </Pressable>
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  card: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.86,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  opponent: {
    flex: 1,
    color: '#0b1f33',
    fontSize: fontSize.section,
    fontWeight: '800',
  },
  status: {
    fontSize: fontSize.tiny,
    fontWeight: '900',
  },
  statusText: {
    color: '#0b6bcb',
  },
  meta: {
    color: '#5d6b7a',
  },
  score: {
    color: '#0b1f33',
    fontSize: 28,
    fontWeight: '900',
  },
  actions: {
    alignItems: 'flex-start',
  },
  startButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#0b6bcb',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  startLabel: {
    color: '#ffffff',
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 31, 51, 0.72)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    padding: spacing.md,
    gap: spacing.sm,
  },
  modalTitle: {
    color: '#0b1f33',
    fontSize: fontSize.title,
    fontWeight: '900',
  },
  inputLabel: {
    color: '#0b1f33',
    fontSize: fontSize.body,
    fontWeight: '900',
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d7e5',
    backgroundColor: '#f7fafc',
    color: '#0b1f33',
    fontSize: fontSize.body,
    paddingHorizontal: spacing.sm,
  },
  helperText: {
    color: '#5d6b7a',
    fontSize: fontSize.small,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
