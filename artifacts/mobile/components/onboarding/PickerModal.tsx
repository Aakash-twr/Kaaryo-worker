import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export interface PickerOption {
  label: string;
  value: string;
}

interface PickerModalProps {
  visible: boolean;
  title: string;
  options: PickerOption[];
  searchable?: boolean;
  onSearch?: (query: string) => Promise<PickerOption[]>;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Set false for chained pickers (e.g. Day -> Month -> Year) that should stay open after a selection. */
  closeOnSelect?: boolean;
}

export function PickerModal({
  visible,
  title,
  options,
  searchable,
  onSearch,
  onSelect,
  onClose,
  closeOnSelect = true,
}: PickerModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [dynamicOptions, setDynamicOptions] = useState<PickerOption[] | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setDynamicOptions(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !onSearch) return;
    let active = true;
    onSearch(query).then((res) => {
      if (active) setDynamicOptions(res);
    });
    return () => {
      active = false;
    };
  }, [visible, query, onSearch]);

  const list = onSearch
    ? dynamicOptions ?? []
    : query
      ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
      : options;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
        {searchable && (
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.search,
              { borderColor: colors.input, color: colors.text, backgroundColor: colors.background },
            ]}
          />
        )}
        <FlatList
          data={list}
          keyExtractor={(item) => item.value}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => {
                onSelect(item.value);
                if (closeOnSelect) onClose();
              }}
            >
              <Text style={[styles.rowText, { color: colors.text }]}>{item.label}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>No results</Text>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "70%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  closeBtn: { padding: 4 },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginBottom: 8,
  },
  list: { marginTop: 4 },
  row: { paddingVertical: 14, borderBottomWidth: 1 },
  rowText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  empty: { textAlign: "center", paddingVertical: 24, fontSize: 13, fontFamily: "Inter_400Regular" },
});
