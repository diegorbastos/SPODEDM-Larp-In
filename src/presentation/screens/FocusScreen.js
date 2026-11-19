import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Field, Header, Icon, Message, Screen, layout } from '../components/ui';
import { colors as c } from '../theme/tokens';
import { useClock, useWellbeing } from '../state/WellbeingProvider';

export default function FocusScreen() {
  const { state, busy, error, execute, device, clearError } = useWellbeing();
  const liveClock = useClock();
  const [duration, setDuration] = useState('25');
  const [confirm, setConfirm] = useState(false);
  const [localError, setLocalError] = useState('');
  const ringScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!state.focus) setConfirm(false);
  }, [state.focus]);

  useEffect(() => {
    if (!state.focus) {
      ringScale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, { toValue: 1.025, duration: 1800, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state.focus?.id, ringScale]);

  const parsedDuration = Number(duration || 0);
  const remaining = state.focus
    ? Math.max(0, Math.ceil((state.focus.endsAt - liveClock) / 1000))
    : parsedDuration * 60;
  const timer = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;

  async function handleStart() {
    setLocalError('');
    if (!duration.trim() || parsedDuration < 1 || parsedDuration > 120) {
      setLocalError('Escolha uma duração entre 1 e 120 minutos.');
      return;
    }
    if (await execute('startFocus', duration)) setConfirm(false);
  }

  return (
    <Screen>
      <Header title="Um tempo para você" subtitle="Estar presente também é progresso." />
      <View style={styles.center}>
        <Animated.View style={[styles.timer, state.focus && styles.timerActive, { transform: [{ scale: ringScale }] }]}>
          <Icon name={state.focus ? 'moon' : 'moon-outline'} size={32} color={c.primary} />
          <AppText variant="metric" style={styles.time}>{timer}</AppText>
          <AppText variant="eyebrow" muted>{state.focus ? 'FOCO EM ANDAMENTO' : 'PRONTO PARA UMA PAUSA?'}</AppText>
        </Animated.View>
      </View>

      {state.focus ? (
        <>
          <AppText style={styles.centerText} muted>
            {device.active ? 'Escudo Android ativo. ' : 'Sem bloqueio ativo. '}
            Deixe o celular de lado. Seu tempo continua contando mesmo com o Larp-In fechado.
          </AppText>
          {confirm ? (
            <Card>
              <AppText variant="heading">Encerrar antes do tempo?</AppText>
              <AppText muted>Esta sessão ficará no histórico como interrompida.</AppText>
              <Button title="Continuar meu foco" onPress={() => setConfirm(false)} />
              <Button
                title="Sim, encerrar sessão"
                danger
                loading={busy}
                onPress={async () => {
                  if (await execute('cancelFocus')) setConfirm(false);
                }}
              />
            </Card>
          ) : (
            <Button title="Encerrar sessão" secondary disabled={busy} onPress={() => setConfirm(true)} />
          )}
        </>
      ) : (
        <>
          {state.sessions.at(-1)?.status === 'completed' && (
            <Message>Sua última pausa foi concluída. Que tal levar essa calma com você?</Message>
          )}
          <View style={styles.presets}>
            {[15, 25, 45].map(value => {
              const selected = duration === String(value);
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    clearError();
                    setLocalError('');
                    setDuration(String(value));
                  }}
                  style={({ pressed }) => [styles.preset, selected && styles.selected, pressed && styles.pressed]}
                >
                  <AppText variant="label" style={{ color: selected ? c.onPrimary : c.text }}>
                    {value} min
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <Field
            label="Ou escolha de 1 a 120 minutos"
            keyboardType="number-pad"
            value={duration}
            maxLength={3}
            onChangeText={text => {
              clearError();
              setLocalError('');
              setDuration(text.replace(/[^0-9]/g, ''));
            }}
          />
          <Button
            title="Iniciar meu foco"
            icon="play-outline"
            loading={busy}
            onPress={handleStart}
          />
        </>
      )}

      <Message error>{localError || error}</Message>

      <Card>
        <AppText variant="heading">Troque o scroll por um momento.</AppText>
        <View style={layout.row}><Icon name="walk-outline" color={c.primary} /><AppText muted>Uma caminhada sem pressa.</AppText></View>
        <View style={layout.row}><Icon name="book-outline" color={c.primary} /><AppText muted>Algumas páginas de um livro.</AppText></View>
        <View style={layout.row}><Icon name="cafe-outline" color={c.primary} /><AppText muted>Um café e uma boa conversa.</AppText></View>
      </Card>
      <AppText variant="caption" muted>
        Com o Escudo Android ligado, a sessão de foco bloqueia os aplicativos monitorados em segundo plano. Não há alarme sonoro.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 16 },
  centerText: { textAlign: 'center' },
  timer: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: 1,
    borderRadius: 140,
    borderWidth: 2,
    borderColor: '#36422C',
    backgroundColor: '#10160D',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timerActive: {
    borderColor: c.primary,
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    elevation: 4,
  },
  time: { fontVariant: ['tabular-nums'], fontSize: 56 },
  presets: { flexDirection: 'row', gap: 12 },
  preset: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 30,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  selected: { backgroundColor: c.primary, borderColor: c.primary },
  pressed: { opacity: 0.78 },
});
