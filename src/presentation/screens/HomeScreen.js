import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText, Button, Card, Header, Icon, NetworkIcon, ProgressBar, Screen, layout } from '../components/ui';
import { colors as c } from '../theme/tokens';
import { useWellbeing } from '../state/WellbeingProvider';
import ProtectionPanel from '../components/ProtectionPanel';
import UsageReportCard from '../components/UsageReportCard';
import { summary, usageOn } from '../../domain/wellbeing';

export default function HomeScreen({ navigation }) {
  const { state, clock, device } = useWellbeing();
  const [selected, setSelected] = useState('instagram');
  const stats = summary(state, new Date(clock));
  const automaticToday = state.usage.some(e => e.day === stats.today && e.source === 'device');
  const network = state.preferences.find(p => p.id === selected);
  const minutes = usageOn(state, stats.today, selected);
  const recorded = state.usage.some(e => e.day === stats.today && e.networkId === selected);
  return <Screen>
    <Header title="Larp-In" subtitle="Um pouco menos de tela, todos os dias." trailing={<Icon name="leaf-outline" color={c.primary} size={28} />} />
    <View style={styles.hero}>
      <View style={styles.pill}><View style={styles.dot} /><AppText variant="caption">SEU TEMPO IMPORTA</AppText></View>
      <AppText variant="hero">Conecte-se{ '\n' }com intenção.</AppText>
      <AppText muted>O próximo momento pode ser fora da tela.</AppText>
    </View>
    <ProtectionPanel compact />
    {device.reportOnly ? <UsageReportCard /> : <Card>
      <View style={layout.between}><AppText variant="eyebrow" muted>SEU DIA ATÉ AGORA</AppText><Icon name="sunny-outline" color={c.primary} /></View>
      <View style={layout.row}><AppText variant="metric">{stats.recorded ? stats.total : '—'}</AppText><View><AppText variant="heading">minutos</AppText><AppText variant="caption" muted>{automaticToday ? 'de uso automático hoje' : 'de uso registrado hoje'}</AppText></View></View>
      <ProgressBar value={stats.total / stats.goal} label="Uso total em relação à meta" />
      <View style={layout.between}><AppText variant="caption" muted>Meta total: {stats.goal} min/dia</AppText><AppText variant="caption" style={{ color: c.primary }}>{stats.focusMinutes} min de foco</AppText></View>
    </Card>}
    <View style={layout.between}><AppText variant="heading">Suas redes, seu ritmo</AppText><AppText variant="caption" muted>03 redes</AppText></View>
    <View style={styles.selector}>{state.preferences.map(p => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Selecionar ${p.name}`} accessibilityState={{ selected: p.id === selected }} onPress={() => setSelected(p.id)} style={[styles.option, p.id === selected && styles.selected]}>
      <NetworkIcon id={p.id} /><AppText variant="caption" muted={p.id !== selected}>{p.name}</AppText>
    </Pressable>)}</View>
    <View style={styles.networkSummary}>
      <AppText variant="caption" muted>{network.name} hoje</AppText>
      <AppText variant="title">{device.reportOnly ? 'Consulte o relatório iOS' : recorded ? `${minutes} min` : 'Ainda sem registro'}</AppText>
      <AppText variant="caption" muted>{network.intention}</AppText>
    </View>
    <Button title={`Cuidar do meu ${network.name}`} secondary icon="options-outline" onPress={() => navigation.navigate('Network', { networkId: selected })} />
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir sessão de foco" onPress={() => navigation.navigate('Foco')}>
      <Card style={styles.focusCard}><View style={layout.between}><View style={layout.flex}><AppText variant="heading">{state.focus ? 'Sua pausa está em andamento' : 'Dê uma pausa no automático'}</AppText><AppText muted variant="caption">{state.focus ? 'Voltar para a sessão de foco' : 'Respire. Desconecte. Viva o agora.'}</AppText></View><Icon name="arrow-forward" color={c.primary} size={28} /></View></Card>
    </Pressable>
    <AppText variant="caption" muted>O bloqueio depende da proteção ativa e das permissões do aparelho. Você pode desativá-lo em Ajustes.</AppText>
  </Screen>;
}
const styles = StyleSheet.create({
  hero: { gap: 16, paddingVertical: 8 },
  pill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 30, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: c.surface },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary },
  selector: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, alignItems: 'center', gap: 10, paddingVertical: 14, borderRadius: 20, borderWidth: 1, borderColor: c.background },
  selected: { backgroundColor: c.surface, borderColor: c.border },
  networkSummary: { alignItems: 'center', gap: 4 },
  focusCard: { backgroundColor: '#171E12', borderColor: '#35402A' },
});
