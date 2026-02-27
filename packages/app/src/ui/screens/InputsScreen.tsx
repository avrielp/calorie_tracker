import React, { useEffect, useMemo, useState } from 'react';
import { Alert, View, Text, StyleSheet, ScrollView, Pressable, Modal, FlatList, Platform } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import { addDays, fromYmd, toYmd, type AiEstimateItem } from '@calorie-tracker/core';
import {
  addExpenditureItem,
  deleteRecord,
  listExpenditureItemsByDate,
  listExpenditureItemsByDateRange,
  TABLES,
} from '@calorie-tracker/db';
import { useAuth } from '../../state/auth/AuthProvider';
import { useSync } from '../../state/sync/SyncProvider';
import { estimateFromPhoto, estimateFromText } from '../../state/ai/aiApi';
import { devLog, devWarn } from '../../state/log';
import { colors } from '../theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextField } from '../components/TextField';
import { SectionCard } from '../components/SectionCard';

type DateChoice = 'today' | 'yesterday' | 'custom';
type InputType = 'manual' | 'ai_text' | 'ai_photo';
type ItemsRangeChoice = 'today' | '7d' | 'custom';

function isYmd(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

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
  const { requestSync, syncNow } = useSync();

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
  const [itemsRange, setItemsRange] = useState<ItemsRangeChoice>('today');
  const [itemsStartYmd, setItemsStartYmd] = useState(toYmd(today));
  const [itemsEndYmd, setItemsEndYmd] = useState(toYmd(today));
  const [itemsError, setItemsError] = useState<string | null>(null);

  const [aiText, setAiText] = useState('');
  const [aiItems, setAiItems] = useState<AiEstimateItem[]>([]);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const refresh = async () => {
    if (!userId) return;
    setLoadingItems(true);
    setItemsError(null);
    try {
      const start = itemsStartYmd;
      const end = itemsEndYmd;
      if (!isYmd(start) || !isYmd(end)) {
        setItemsError('Invalid date range (use YYYY-MM-DD).');
        setItems([]);
        return;
      }
      if (start > end) {
        setItemsError('Range start must be <= end.');
        setItems([]);
        return;
      }

      devLog('[inputs] refresh start', { userId, itemsRange, start, end });
      const rows =
        start === end
          ? await listExpenditureItemsByDate({ database, userId, dateYmd: end })
          : await listExpenditureItemsByDateRange({ database, userId, startYmd: start, endYmd: end });
      setItems(rows);
      devLog('[inputs] refresh done', { count: rows.length });
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    // Items list range is independent from the "add date" control.
    const todayYmd = toYmd(today);
    if (itemsRange === 'today') {
      setItemsStartYmd(todayYmd);
      setItemsEndYmd(todayYmd);
    } else if (itemsRange === '7d') {
      setItemsStartYmd(toYmd(addDays(fromYmd(todayYmd), -6)));
      setItemsEndYmd(todayYmd);
    } else if (itemsRange === 'custom') {
      // Keep whatever user typed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsRange]);

  useEffect(() => {
    // Auto-refresh when user/range changes (including custom edits).
    refresh().catch((e) => devWarn('[inputs] refresh failed', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, itemsRange, itemsStartYmd, itemsEndYmd]);

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

  const confirmDelete = async (itemName: string) => {
    const message = `Delete "${itemName}"?`;
    if (Platform.OS === 'web') {
      const ok = Boolean((globalThis as any).confirm?.(message));
      return ok;
    }
    return await new Promise<boolean>((resolve) => {
      Alert.alert('Delete item', message, [
        { text: 'No', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Yes, delete', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
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

  const itemsTitle = useMemo(() => {
    if (itemsRange === 'today') return 'Items for today';
    if (itemsRange === '7d') return 'Items for 7 days';
    return `Items for ${itemsStartYmd} → ${itemsEndYmd}`;
  }, [itemsEndYmd, itemsRange, itemsStartYmd]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
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
          <Text style={styles.muted}>Add inputs for date</Text>
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
          <Text style={styles.muted}>Add inputs for date</Text>
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

          <TextField
            label="Text"
            value={aiText}
            onChangeText={setAiText}
            placeholder="Example: 2 slices of pepperoni pizza and a can of soda"
            multiline
          />
          {aiError ? (
            <View style={styles.aiErrorBox}>
              <Text style={styles.aiErrorText}>{aiError}</Text>
            </View>
          ) : null}
          <PrimaryButton title="Estimate with AI" onPress={() => runAiText()} />
        </SectionCard>
      ) : null}

      {inputType === 'ai_photo' ? (
        <SectionCard title="AI Photo">
          <Text style={styles.muted}>Add inputs for date</Text>
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

          {aiError ? (
            <View style={styles.aiErrorBox}>
              <Text style={styles.aiErrorText}>{aiError}</Text>
            </View>
          ) : null}
          <PrimaryButton title={Platform.OS === 'web' ? 'Choose photo and estimate' : 'Estimate from photo'} onPress={() => runAiPhoto()} />
          <Text style={styles.muted}>
            Web works with a file picker. Native requires adding an image picker + permissions; see README.
          </Text>
        </SectionCard>
      ) : null}

      <SectionCard title={itemsTitle}>
        <Segmented
          items={[
            { key: 'today', label: 'Today' },
            { key: '7d', label: '7 days' },
            { key: 'custom', label: 'Custom range' },
          ]}
          value={itemsRange}
          onChange={(k) => {
            setItemsError(null);
            setItemsRange(k as ItemsRangeChoice);
          }}
        />
        {itemsRange === 'custom' ? (
          <View style={{ gap: 10, marginTop: 10 }}>
            <TextField label="Start (YYYY-MM-DD)" value={itemsStartYmd} onChangeText={setItemsStartYmd} />
            <TextField label="End (YYYY-MM-DD)" value={itemsEndYmd} onChangeText={setItemsEndYmd} />
          </View>
        ) : null}
        <PrimaryButton
          title={loadingItems ? 'Refreshing…' : 'Refresh'}
          onPress={async () => {
            devLog('[inputs] refresh pressed -> syncNow + refresh');
            await syncNow('inputs:refresh');
            await refresh();
          }}
        />
        {itemsError ? <Text style={styles.error}>{itemsError}</Text> : null}
        {items.length === 0 ? <Text style={styles.muted}>No items yet.</Text> : null}
        {items.map((it: any) => (
          <View key={it.id} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              {itemsRange === 'today' ? null : <Text style={styles.itemDate}>{it.dateYmd}</Text>}
              <Text style={styles.itemLabel}>{it.name}</Text>
              {it.description ? <Text style={styles.itemHint}>{it.description}</Text> : null}
            </View>
            <View style={styles.itemRight}>
              <Text style={styles.itemCalories}>{it.calories}</Text>
              <Pressable
                onPress={async () => {
                  const ok = await confirmDelete(it.name);
                  if (ok) await removeItem(it.id);
                }}
                style={styles.deleteBtn}
                hitSlop={10}
              >
                <Text style={styles.deleteBtnText}>X</Text>
              </Pressable>
            </View>
          </View>
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
  aiErrorBox: {
    borderWidth: 1,
    borderColor: '#4A1B1B',
    backgroundColor: '#1A0D0D',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 10,
  },
  aiErrorText: { color: colors.danger, fontSize: 15, fontWeight: '900', lineHeight: 20 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    backgroundColor: '#0E1016',
  },
  itemLeft: { flexShrink: 1, flexGrow: 1 },
  itemLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  itemDate: { color: colors.muted, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  itemHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemCalories: { color: colors.text, fontSize: 16, fontWeight: '900' },
  deleteBtn: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteBtnText: { color: '#0B0C10', fontWeight: '900', fontSize: 14 },
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


