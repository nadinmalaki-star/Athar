import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SalonsStackParamList } from '../../navigation/types';
import { supabase } from '../../lib/supabase';
import type { Organization } from '../../lib/database.types';
import { colors, spacing, radii, fontSizes } from '../../theme';

type Props = NativeStackScreenProps<SalonsStackParamList, 'SalonList'>;

export function SalonListScreen({ navigation }: Props) {
  const [salons, setSalons] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('organizations')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setSalons(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <View style={styles.screen}>
      <FlatList
        data={salons}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>ما في صالونات مسجّلة بعد.</Text> : null}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('Services', { organizationId: item.id, organizationName: item.name })}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.chevron}>←</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.md },
  empty: { textAlign: 'center', color: colors.textFaint, marginTop: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  name: { fontSize: fontSizes.md, fontWeight: '700', color: colors.text },
  chevron: { color: colors.textFaint },
});
