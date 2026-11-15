import React from 'react';
import { AppText, Button, Card } from './ui';
import { useWellbeing } from '../state/WellbeingProvider';

export default function UsageReportCard({ days = 1 }) {
  const { device, busy, control } = useWellbeing();
  return <Card><AppText variant="heading">Tempo de Uso do iPhone</AppText>
    <AppText muted>Veja o uso automático dos aplicativos associados. Os dados são exibidos pelo iOS e não são copiados para o histórico manual do Larp-In.</AppText>
    <Button title={days === 7 ? 'Ver relatório dos últimos 7 dias' : 'Ver uso automático de hoje'} disabled={busy || !device.usageAuthorized || !device.selected.length} onPress={() => control('showReport', days)} />
    {(!device.usageAuthorized || !device.selected.length) && <AppText variant="caption" muted>Autorize o Tempo de Uso e associe os aplicativos em Ajustes.</AppText>}
  </Card>;
}
