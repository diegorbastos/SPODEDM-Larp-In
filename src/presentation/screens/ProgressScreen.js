import React, { memo, useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { AppText, Card, Header, Icon, NetworkIcon, ProgressBar, Screen, layout } from '../components/ui';
import { colors as c } from '../theme/tokens';
import { useWellbeing } from '../state/WellbeingProvider';
import { summary, usageOn } from '../../domain/wellbeing';

const SessionRow = memo(function SessionRow({ item }) {
  const completed = item.status === 'completed';
  const formattedDate = useMemo(
    () => new Date(item.finishedAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    [item.finishedAt]
  );

  return (
    <View style={styles.session}>
      <Icon
        name={completed ? 'checkmark-circle-outline' : 'close-circle-outline'}
        color={completed ? c.primary : c.muted}
      />
      <View style={layout.flex}>
        <AppText variant="label">{item.minutes} min · {completed ? 'Concluída' : 'Interrompida'}</AppText>
        <AppText variant="caption" muted>{formattedDate}</AppText>
      </View>
    </View>
  );
});

export default function ProgressScreen() {
  const { state, clock, device } = useWellbeing();

  const stats = useMemo(() => summary(state, new Date(clock)), [state, clock]);
  const maximum = useMemo(() => Math.max(...stats.week.map(d => d.minutes), 1), [stats.week]);
  const weekTotal = useMemo(() => stats.week.reduce((sum, d) => sum + d.minutes, 0), [stats.week]);
  const completed = useMemo(() => state.sessions.filter(s => s.status === 'completed'), [state.sessions]);
  const completedMinutes = useMemo(() => completed.reduce((sum, s) => sum + s.minutes, 0), [completed]);
  const sessions = useMemo(() => [...state.sessions].reverse(), [state.sessions]);

  const blockedToday = device.blockedToday || 0;
  const blockedByTarget = device.blockedByTarget || {};

  const renderItem = useCallback(({ item }) => <SessionRow item={item} />, []);

  const header = useMemo(() => (
    <View style={layout.gap}>
      <Header title="Seu progresso" subtitle="Pequenas escolhas. Novos hábitos." />

      <Card>
        <AppText variant="eyebrow" muted>ÚLTIMOS 7 DIAS</AppText>
        <AppText variant="title">{weekTotal} min registrados</AppText>
        <View style={styles.chart}>
          {stats.week.map((d, i) => (
            <View
              key={d.day}
              style={styles.column}
              accessible
              accessibilityLabel={`${d.day}: ${d.recorded ? d.minutes + ' minutos' : 'sem registro'}`}
            >
              <AppText variant="caption" muted>{d.recorded ? d.minutes : '—'}</AppText>
              <View style={styles.barSpace}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: d.recorded ? Math.max(4, (d.minutes / maximum) * 100) : 3,
                      backgroundColor: i === 6 ? c.primary : c.track,
                    },
                  ]}
                />
              </View>
              <AppText variant="caption" style={{ color: i === 6 ? c.primary : c.muted }}>{d.label}</AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" muted>
          Registros automáticos e manuais no Android. “—” indica um dia sem registro; não significa zero uso.
        </AppText>
      </Card>

      <Card>
        <View style={layout.row}>
          <Icon name="shield-checkmark-outline" color={c.primary} size={30} />
          <View style={layout.flex}>
            <AppText variant="heading">
              {blockedToday} {blockedToday === 1 ? 'vídeo curto bloqueado hoje' : 'vídeos curtos bloqueados hoje'}
            </AppText>
            <AppText variant="caption" muted>
              Reels: {blockedByTarget.reels || 0} · Shorts: {blockedByTarget.shorts || 0} · TikTok: {blockedByTarget.tiktok || 0} · Afins: {blockedByTarget.others || 0}
            </AppText>
          </View>
        </View>
      </Card>

      <AppText variant="heading" style={layout.section}>Hoje, rede por rede</AppText>
      {state.preferences.map(p => {
        const used = usageOn(state, stats.today, p.id);
        const recorded = state.usage.some(e => e.day === stats.today && e.networkId === p.id);
        return (
          <Card key={p.id}>
            <View style={layout.row}>
              <NetworkIcon id={p.id} />
              <View style={layout.flex}>
                <AppText variant="label">{p.name}</AppText>
                <AppText variant="caption" muted>{recorded ? `${used} de ${p.limit} min` : 'Sem registro hoje'}</AppText>
              </View>
            </View>
            <ProgressBar value={used / p.limit} label={`Meta de ${p.name}`} />
          </Card>
        );
      })}

      <Card>
        <View style={layout.row}>
          <Icon name="leaf-outline" color={c.primary} size={30} />
          <View style={layout.flex}>
            <AppText variant="heading">{completedMinutes} min em sessões concluídas</AppText>
            <AppText variant="caption" muted>
              {completed.length} {completed.length === 1 ? 'sessão concluída' : 'sessões concluídas'} no histórico local
            </AppText>
          </View>
        </View>
      </Card>
      <AppText variant="heading" style={layout.section}>Suas pausas</AppText>
    </View>
  ), [weekTotal, stats, maximum, blockedToday, blockedByTarget, state, completedMinutes, completed.length]);

  return (
    <Screen scroll={false} style={{ paddingBottom: 0 }}>
      <FlatList
        data={sessions}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Card>
            <AppText muted>Sua primeira pausa começa na aba Foco. O histórico aparece aqui quando uma sessão terminar.</AppText>
          </Card>
        }
        renderItem={renderItem}
        ListFooterComponent={
          <AppText variant="caption" muted>
            Até 90 dias de registros e 200 sessões salvos localmente no Android.
          </AppText>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 16, paddingBottom: 40 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  column: { flex: 1, alignItems: 'center', gap: 8 },
  barSpace: { height: 100, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '75%', maxWidth: 40, borderRadius: 6 },
  session: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: c.border },
});
