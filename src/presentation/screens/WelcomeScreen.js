import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText, Button, Card, Icon, Message, Screen, layout } from '../components/ui';
import { colors as c } from '../theme/tokens';
import { useWellbeing } from '../state/WellbeingProvider';

export default function WelcomeScreen() {
  const { busy, error, execute } = useWellbeing();
  return <Screen>
    <View style={layout.row}><Icon name="leaf-outline" color={c.primary} /><AppText variant="heading">Larp-In</AppText></View>
    <View style={styles.art} accessible accessibilityLabel="Uma pausa para viver fora da tela">
      <View style={styles.orbit}><View style={styles.orbitInner}><Icon name="leaf-outline" size={76} color={c.primary} /></View></View>
      <View style={styles.badge}><Icon name="sparkles-outline" size={16} color={c.primary} /><AppText variant="caption">Seu tempo, de volta para você.</AppText></View>
    </View>
    <View style={layout.gap}>
      <AppText variant="eyebrow" style={{ color: c.primary }}>MENOS SCROLL. MAIS VIDA.</AppText>
      <AppText variant="hero">Entre na vida.{ '\n' }Saia do automático.</AppText>
      <AppText muted>Suas redes com mais intenção. Crie metas possíveis e reserve espaço para o que acontece fora da tela.</AppText>
    </View>
    <Card><View style={layout.row}><Icon name="compass-outline" color={c.primary} /><AppText>Defina o seu ritmo, uma rede por vez.</AppText></View>
      <View style={layout.row}><Icon name="moon-outline" color={c.primary} /><AppText>Faça uma pausa com uma sessão de foco.</AppText></View>
      <View style={layout.row}><Icon name="lock-closed-outline" color={c.primary} /><AppText>Seu histórico fica neste aparelho.</AppText></View></Card>
    <Message error>{error}</Message>
    <Button title={busy ? 'Preparando…' : 'Começar meu Larp-In'} icon="arrow-forward" disabled={busy} onPress={() => execute('completeOnboarding')} />
    <AppText variant="caption" muted style={styles.center}>Sem cadastro. Sem feed infinito.{ '\n' }Autorize uso automático e bloqueio em Ajustes no build nativo.</AppText>
  </Screen>;
}
const styles = StyleSheet.create({
  art: { alignItems: 'center', paddingVertical: 16, gap: 16 },
  orbit: { width: 212, height: 212, borderRadius: 106, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  orbitInner: { width: 156, height: 156, borderRadius: 78, borderWidth: 1, borderColor: '#424D36', backgroundColor: '#141C10', alignItems: 'center', justifyContent: 'center' },
  badge: { backgroundColor: c.surface, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 30, flexDirection: 'row', gap: 8, alignItems: 'center' },
  center: { textAlign: 'center' },
});
