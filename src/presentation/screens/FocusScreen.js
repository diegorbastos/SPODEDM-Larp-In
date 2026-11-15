import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText, Button, Card, Field, Header, Icon, Message, Screen, layout } from '../components/ui';
import { colors as c } from '../theme/tokens';
import { useWellbeing } from '../state/WellbeingProvider';

export default function FocusScreen() {
  const { state, busy, error, clock, execute } = useWellbeing();
  const [duration, setDuration] = useState('25');
  const [confirm, setConfirm] = useState(false);
  const remaining = state.focus ? Math.max(0, Math.ceil((state.focus.endsAt - clock) / 1000)) : Number(duration || 0) * 60;
  const timer = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return <Screen>
    <Header title="Um tempo para você" subtitle="Estar presente também é progresso." />
    <View style={styles.center}><View style={styles.timer}>
      <Icon name="moon-outline" size={32} color={c.primary} />
      <AppText variant="metric" style={styles.time}>{timer}</AppText>
      <AppText variant="eyebrow" muted>{state.focus ? 'FOCO EM ANDAMENTO' : 'PRONTO PARA UMA PAUSA?'}</AppText>
    </View></View>
    {state.focus ? <>
      <AppText style={styles.centerText} muted>Deixe o celular de lado. Seu tempo continua contando mesmo quando você fecha o Larp-In.</AppText>
      {confirm ? <Card><AppText variant="heading">Encerrar antes do tempo?</AppText><AppText muted>Esta sessão ficará no histórico como interrompida.</AppText><Button title="Continuar meu foco" onPress={() => setConfirm(false)} /><Button title="Sim, encerrar sessão" danger disabled={busy} onPress={async () => { if (await execute('cancelFocus')) setConfirm(false); }} /></Card>
        : <Button title="Encerrar sessão" secondary disabled={busy} onPress={() => setConfirm(true)} />}
    </> : <>
      {state.sessions.at(-1)?.status === 'completed' && <Message>Sua última pausa foi concluída. Que tal levar essa calma com você?</Message>}
      <View style={styles.presets}>{[15, 25, 45].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: duration === String(value) }} onPress={() => setDuration(String(value))} style={[styles.preset, duration === String(value) && styles.selected]}><AppText variant="label" style={{ color: duration === String(value) ? c.onPrimary : c.text }}>{value} min</AppText></Pressable>)}</View>
      <Field label="Ou escolha de 1 a 120 minutos" keyboardType="number-pad" value={duration} maxLength={3} onChangeText={text => setDuration(text.replace(/[^0-9]/g, ''))} />
      <Button title="Iniciar meu foco" icon="play-outline" disabled={busy} onPress={async () => { if (await execute('startFocus', duration)) setConfirm(false); }} />
    </>}
    <Message error>{error}</Message>
    <Card><AppText variant="heading">Troque o scroll por um momento.</AppText><View style={layout.row}><Icon name="walk-outline" color={c.primary} /><AppText muted>Uma caminhada sem pressa.</AppText></View><View style={layout.row}><Icon name="book-outline" color={c.primary} /><AppText muted>Algumas páginas de um livro.</AppText></View><View style={layout.row}><Icon name="cafe-outline" color={c.primary} /><AppText muted>Um café e uma boa conversa.</AppText></View></Card>
    <AppText variant="caption" muted>Foco voluntário: não bloqueia aplicativos nem envia alarme. Ao voltar, a sessão é atualizada pelo horário salvo.</AppText>
  </Screen>;
}
const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 16 }, centerText: { textAlign: 'center' },
  timer: { width: '100%', maxWidth: 300, aspectRatio: 1, borderRadius: 150, borderWidth: 2, borderColor: '#465536', backgroundColor: '#10160D', alignItems: 'center', justifyContent: 'center', gap: 12 },
  time: { fontVariant: ['tabular-nums'], fontSize: 56 },
  presets: { flexDirection: 'row', gap: 12 },
  preset: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 30, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  selected: { backgroundColor: c.primary, borderColor: c.primary },
});
