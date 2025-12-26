import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, Pressable } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { toYmd, type GoalType, goalTotalCalories } from '@calorie-tracker/core';
import { deleteRecord, listGoals, upsertGoal, TABLES } from '@calorie-tracker/db';
import { useAuth } from '../../state/auth/AuthProvider';
import { colors } from '../theme';
import { SectionCard } from '../components/SectionCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { Row } from '../components/Row';

export function GoalsScreen() {
  const database = useDatabase();
  const { profile } = useAuth();
  const userId = profile?.userId ?? profile?.authUid ?? '';

  const [goals, setGoals] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [dateYmd, setDateYmd] = useState(toYmd(new Date()));
  const [goalType, setGoalType] = useState<GoalType>('daily');
  const [target, setTarget] = useState('2000');
  const [bonus, setBonus] = useState('0');

  const refresh = async () => {
    if (!userId) return;
    const rows = await listGoals({ database, userId });
    setGoals(rows);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const openCreate = () => {
    setEditingId(undefined);
    setName('');
    setDateYmd(toYmd(new Date()));
    setGoalType('daily');
    setTarget('2000');
    setBonus('0');
    setOpen(true);
  };

  const openEdit = (g: any) => {
    setEditingId(g.id);
    setName(g.name);
    setDateYmd(g.dateYmd);
    setGoalType(g.goalType as GoalType);
    setTarget(String(g.target ?? 0));
    setBonus(String(g.bonusAllowance ?? 0));
    setOpen(true);
  };

  const save = async () => {
    const t = Number(target);
    const b = Number(bonus);
    if (!userId || !name.trim() || !Number.isFinite(t)) return;
    await upsertGoal({
      database,
      userId,
      id: editingId,
      dateYmd,
      name: name.trim(),
      goalType,
      target: t,
      bonusAllowance: Number.isFinite(b) ? b : 0,
      lastUpdated: Date.now(),
    });
    setOpen(false);
    await refresh();
  };

  const remove = async (id: string) => {
    await deleteRecord({ database, table: TABLES.goals, id });
    await refresh();
  };

  const goalTypeOptions = useMemo(() => ['daily', 'weekly', 'monthly', 'custom'] as GoalType[], []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SectionCard title="Goals">
        <PrimaryButton title="Create goal" onPress={() => openCreate()} />
        {goals.length === 0 ? <Text style={styles.muted}>No goals yet.</Text> : null}
        {goals.map((g: any) => {
          const total = goalTotalCalories(g.target ?? 0, g.bonusAllowance ?? 0);
          return (
            <Pressable
              key={g.id}
              onPress={() => openEdit(g)}
              onLongPress={() => remove(g.id)}
              style={{ marginBottom: 10 }}
            >
              <Row
                label={`${g.name} (${g.goalType})`}
                value={total}
                hint={`Start: ${g.dateYmd} • target=${g.target} • bonus=${g.bonusAllowance ?? 0} • Long-press to delete`}
              />
            </Pressable>
          );
        })}
      </SectionCard>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingId ? 'Edit goal' : 'Create goal'}</Text>
            <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Lean bulk" />
            <TextField label="Start date (YYYY-MM-DD)" value={dateYmd} onChangeText={setDateYmd} />

            <View style={styles.pills}>
              {goalTypeOptions.map((t) => {
                const active = t === goalType;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setGoalType(t)}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            <TextField label="Target calories" value={target} onChangeText={setTarget} keyboardType="numeric" />
            <TextField label="Bonus allowance (optional)" value={bonus} onChangeText={setBonus} keyboardType="numeric" />

            <View style={styles.modalButtons}>
              <Pressable onPress={() => setOpen(false)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <PrimaryButton title="Save" onPress={() => save()} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  muted: { color: colors.muted, fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginBottom: 6 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#0E1016', borderRadius: 999, padding: 10 },
  pillActive: { backgroundColor: '#182033' },
  pillText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  pillTextActive: { color: colors.text },
  modalButtons: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'flex-end' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#0E1016',
  },
  secondaryBtnText: { color: colors.text, fontWeight: '800' },
});


