import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, FlatList, Platform } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { addDays, toYmd, type AiEstimateItem } from '@calorie-tracker/core';
import { addExpenditureItem, listExpenditureItemsByDate, deleteRecord, TABLES } from '@calorie-tracker/db';
import { useAuth } from '../../state/auth/AuthProvider';
import { useSync } from '../../state/sync/SyncProvider';
import { estimateFromPhoto, estimateFromText } from '../../state/ai/aiApi';
import { devLog, devWarn } from '../../state/log';
import { colors } from '../theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { SectionCard } from '../components/SectionCard';
import { Row } from '../components/Row';

type DateChoice = 'today' | 'yesterday' | 'custom';
type InputType = 'manual' | 'ai_text' | 'ai_photo';

function Segmented({
  items,
  value,
  onChange,
}: {
  items: Array<{ key: string; label: string }>;
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.segment}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function InputsScreen() {
  const database = useDatabase();
  const { profile, getIdToken } = useAuth();
  const userId = profile?.userId ?? profile?.authUid ?? '';
  const { requestSync } = useSync();

  const today = useMemo(() => new Date(), []);
  const [dateChoice, setDateChoice] = useState<DateChoice>('today');
  const [customDateYmd, setCustomDateYmd] = useState(toYmd(today));
  const dateYmd =
    dateChoice === 'today'
      ? toYmd(today)
      : dateChoice === 'yesterday'
        ? toYmd(addDays(today, -1))
        : customDateYmd;

  const [inputType, setInputType] = useState<InputType>('manual');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [addAttempted, setAddAttempted] = useState(false);

  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const [aiText, setAiText] = useState('');
  const [aiItems, setAiItems] = useState<AiEstimateItem[]>([]);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const refresh = async () => {
    if (!userId) return;
    setLoadingItems(true);
    try {
      devLog('[inputs] refresh start', { userId, dateYmd });
      const rows = await listExpenditureItemsByDate({ database, userId, dateYmd });
      setItems(rows);
      devLog('[inputs] refresh done', { count: rows.length });
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    // Auto-refresh when user/date changes so you don't need to click Refresh.
    refresh().catch((e) => devWarn('[inputs] refresh failed', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, dateYmd]);

  const caloriesValidation = useMemo<
    | { valid: false; message: string }
    | { valid: true; calories: number }
  >(() => {
    const raw = calories.trim();
    if (!raw) return { valid: false, message: 'Calories is required.' };
    const n = Number(raw);
    if (!Number.isFinite(n)) return { valid: false, message: 'Calories must be a number.' };
    if (!Number.isInteger(n)) return { valid: false, message: 'Calories must be a whole number.' };
    return { valid: true, calories: n };
  }, [calories]);

  const canAddManual = !!userId && !!name.trim() && caloriesValidation.valid;

  const onChangeCalories = (v: string) => {
    setCalories(v);
    if (!addAttempted) return;
    const raw = v.trim();
    const n = Number(raw);
    const isValid = !!raw && Number.isFinite(n) && Number.isInteger(n);
    if (isValid) setAddAttempted(false);
  };

  const addManual = async () => {
    if (!userId) return;
    if (!name.trim() || !caloriesValidation.valid) {
      setAddAttempted(true);
      return;
    }
    devLog('[inputs] addManual', { dateYmd, name: name.trim(), calories: caloriesValidation.calories });
    await addExpenditureItem({
      database,
      userId,
      dateYmd,
      item: {
        name: name.trim(),
        description: description.trim() || undefined,
        calories: caloriesValidation.calories,
      },
      lastUpdated: Date.now(),
    });
    setName('');
    setDescription('');
    setCalories('');
    setAddAttempted(false);
    await refresh();
    // Debounced sync (1 minute) so many inputs don't spam the network.
    requestSync('inputs:addManual');
  };

  const removeItem = async (id: string) => {
    await deleteRecord({ database, table: TABLES.calorie_expenditure_items, id });
    await refresh();
    requestSync('inputs:deleteItem');
  };

  const runAiText = async () => {
    if (!userId) return;
    setAiError(null);
    try {
      const idToken = await getIdToken();
      const res = await estimateFromText({ idToken, userId, text: aiText });
      setAiItems(res.items ?? []);
      setAiModalOpen(true);
    } catch (e: any) {
      setAiError(e?.message ?? String(e));
    }
  };

  const pickPhotoWeb = async (): Promise<{ mimeType: string; imageBase64: string }> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return reject(new Error('No file selected'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = () => {
          const result = String(reader.result ?? '');
          const match = result.match(/^data:(.+);base64,(.*)$/);
          if (!match) return reject(new Error('Unexpected file encoding'));
          resolve({ mimeType: match[1]!, imageBase64: match[2]! });
        };
        reader.readAsDataURL(file);
      };
      input.click();
    });
  };

  const runAiPhoto = async () => {
    if (!userId) return;
    setAiError(null);
    try {
      if (Platform.OS !== 'web') {
        throw new Error('AI Photo picker is not enabled on native yet. Use AI Text, or add a native image picker.');
      }
      const idToken = await getIdToken();
      const { mimeType, imageBase64 } = await pickPhotoWeb();
      const res = await estimateFromPhoto({ idToken, userId, mimeType, imageBase64 });
      setAiItems(res.items ?? []);
      setAiModalOpen(true);
    } catch (e: any) {
      setAiError(e?.message ?? String(e));
    }
  };

  const saveAiItems = async () => {
    for (const it of aiItems) {
      await addExpenditureItem({
        database,
        userId,
        dateYmd,
        item: { name: it.name, description: it.description, calories: it.calories },
        lastUpdated: Date.now(),
      });
    }
    setAiModalOpen(false);
    setAiText('');
    setAiItems([]);
    await refresh();
    requestSync('inputs:saveAiItems');
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <SectionCard title="Date">
        <Segmented
          items={[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'custom', label: 'Custom' },
          ]}
          value={dateChoice}
          onChange={(k) => setDateChoice(k as DateChoice)}
        />
        {dateChoice === 'custom' ? (
          <TextField
            label="Custom date (YYYY-MM-DD)"
            value={customDateYmd}
            onChangeText={setCustomDateYmd}
            placeholder="2025-12-27"
          />
        ) : null}
      </SectionCard>

      <SectionCard title="Input type">
        <Segmented
          items={[
            { key: 'manual', label: 'Manual' },
            { key: 'ai_text', label: 'AI Text' },
            { key: 'ai_photo', label: 'AI Photo' },
          ]}
          value={inputType}
          onChange={(k) => setInputType(k as InputType)}
        />
      </SectionCard>

      {inputType === 'manual' ? (
        <SectionCard title="Add item">
          <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Chicken burrito" />
          <TextField
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Large, with rice + beans"
            multiline
          />
          <TextField label="Calories" value={calories} onChangeText={onChangeCalories} keyboardType="numeric" />
          <PrimaryButton title="Add" onPress={() => addManual()} disabled={!canAddManual} />
          {addAttempted && !caloriesValidation.valid ? (
            <Text style={styles.validationText}>{caloriesValidation.message}</Text>
          ) : null}
        </SectionCard>
      ) : null}

      {inputType === 'ai_text' ? (
        <SectionCard title="Describe what you ate">
          <TextField
            label="Text"
            value={aiText}
            onChangeText={setAiText}
            placeholder="Example: 2 slices of pepperoni pizza and a can of soda"
            multiline
          />
          {aiError ? <Text style={styles.error}>{aiError}</Text> : null}
          <PrimaryButton title="Estimate with AI" onPress={() => runAiText()} />
        </SectionCard>
      ) : null}

      {inputType === 'ai_photo' ? (
        <SectionCard title="AI Photo">
          {aiError ? <Text style={styles.error}>{aiError}</Text> : null}
          <PrimaryButton title={Platform.OS === 'web' ? 'Choose photo and estimate' : 'Estimate from photo'} onPress={() => runAiPhoto()} />
          <Text style={styles.muted}>
            Web works with a file picker. Native requires adding an image picker + permissions; see README.
          </Text>
        </SectionCard>
      ) : null}

      <SectionCard title={`Items for ${dateYmd}`}>
        <PrimaryButton title={loadingItems ? 'Refreshing…' : 'Refresh'} onPress={() => refresh()} />
        {items.length === 0 ? <Text style={styles.muted}>No items yet.</Text> : null}
        {items.map((it: any) => (
          <Pressable key={it.id} onLongPress={() => removeItem(it.id)}>
            <Row label={it.name} value={it.calories} hint={it.description || 'Long-press to delete'} />
          </Pressable>
        ))}
      </SectionCard>

      <Modal visible={aiModalOpen} transparent animationType="slide" onRequestClose={() => setAiModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Review AI items</Text>
            <Text style={styles.modalSubtitle}>Edit by re-typing in Manual, or re-prompt AI.</Text>
            <FlatList
              data={aiItems}
              keyExtractor={(_, idx) => String(idx)}
              renderItem={({ item }) => (
                <View style={styles.aiRow}>
                  <Text style={styles.aiName}>{item.name}</Text>
                  <Text style={styles.aiMeta}>{item.calories} cal</Text>
                  {item.description ? <Text style={styles.aiDesc}>{item.description}</Text> : null}
                </View>
              )}
            />
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setAiModalOpen(false)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setAiModalOpen(false);
                  setAiItems([]);
                  runAiText();
                }}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Re-prompt</Text>
              </Pressable>
              <PrimaryButton title="Save" onPress={() => saveAiItems()} />
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
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  segmentBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#0E1016', alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#182033' },
  segmentText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  segmentTextActive: { color: colors.text },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  validationText: { color: colors.warning, fontSize: 13, fontWeight: '800', marginTop: 8 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '75%',
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  modalSubtitle: { color: colors.muted, fontSize: 13, marginTop: 6, marginBottom: 12 },
  aiRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 10 },
  aiName: { color: colors.text, fontWeight: '800', fontSize: 14 },
  aiMeta: { color: colors.accent, fontWeight: '800', marginTop: 2 },
  aiDesc: { color: colors.muted, marginTop: 6 },
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


