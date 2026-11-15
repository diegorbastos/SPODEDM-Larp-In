import React, { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, Field, Header, Message, NetworkIcon, ProgressBar, Screen, layout } from '../components/ui';
import { useWellbeing } from '../state/WellbeingProvider';
import { dayKey, usageOn } from '../../domain/wellbeing';

export default function NetworkScreen({ route, navigation }) {
  const { state, busy, execute, error, clearError, clock } = useWellbeing();
  const network = state.preferences.find(p => p.id === route.params.networkId);
  const [limit, setLimit] = useState(String(network.limit));
  const [intention, setIntention] = useState(network.intention);
  const [minutes, setMinutes] = useState('');
  const [message, setMessage] = useState('');
  const used = usageOn(state, dayKey(new Date(clock)), network.id);
  async function save(method, ...args) {
    setMessage('');
    if (await execute(method, ...args)) {
      setMessage(method === 'recordUsage' ? 'Uso de hoje atualizado.' : 'Meta e intenção salvas.');
      if (method === 'recordUsage') setMinutes('');
    }
  }
  return <Screen>
    <Header title={network.name} subtitle="Escolha como quer se conectar." back={() => { clearError(); navigation.goBack(); }} />
    <View style={layout.centered}><NetworkIcon id={network.id} large /><AppText variant="title">{used} min informados hoje</AppText></View>
    <Card><AppText variant="heading">Uma meta possível</AppText><AppText muted>Um lembrete da sua intenção, sem bloquear o aplicativo.</AppText>
      <ProgressBar value={used / network.limit} label="Uso desta rede em relação à meta" />
      <AppText variant="caption" muted>{used > network.limit ? `${used - network.limit} min acima da meta. Amanhã é um novo começo.` : `${network.limit - used} min até a meta de hoje.`}</AppText>
      <Field label="Meta diária em minutos" value={limit} onChangeText={setLimit} keyboardType="number-pad" maxLength={4} />
      <Field label="Quero usar esta rede para…" value={intention} onChangeText={setIntention} maxLength={100} />
      <Button title="Salvar minha meta" onPress={() => save('updatePreference', network.id, limit, intention)} disabled={busy} />
    </Card>
    <Card><AppText variant="heading">Como foi seu tempo hoje?</AppText><AppText muted>Consulte o tempo de uso no seu aparelho e informe o total desta rede. Um novo registro substitui o anterior de hoje.</AppText>
      <Field label="Total usado hoje em minutos" value={minutes} onChangeText={setMinutes} placeholder="Ex.: 20" keyboardType="number-pad" maxLength={4} />
      <Button title="Registrar uso de hoje" secondary onPress={() => save('recordUsage', network.id, minutes)} disabled={busy} />
    </Card>
    <Message error>{error}</Message><Message>{message}</Message>
    <AppText variant="caption" muted>O Larp-In não acessa sua conta nem altera o conteúdo de {network.name}.</AppText>
  </Screen>;
}
