import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Card, Icon, PermissionToggleButton, layout } from './ui';
import { colors as c, radius as r, spacing as s } from '../theme/tokens';
import { useWellbeing } from '../state/WellbeingProvider';
import { normalizeShortVideoBlocks, shortVideoTargets } from '../../domain/wellbeing';

export default function ShortVideoBlockerCard({ compact = false, onOpenSettings }) {
  const { state, device, busy, execute, control } = useWellbeing();
  const blocks = useMemo(() => normalizeShortVideoBlocks(state.shortVideoBlocks), [state.shortVideoBlocks]);
  const activeCount = useMemo(() => Object.values(blocks).filter(Boolean).length, [blocks]);
  const allOn = activeCount === shortVideoTargets.length;
  const blockedToday = device.blockedToday || 0;
  const blockedByTarget = device.blockedByTarget || {};

  return (
    <Card style={styles.card}>
      <View style={layout.between}>
        <View style={layout.flex}>
          <AppText variant="eyebrow" style={styles.eyebrow}>BLOQUEADOR DE VÍDEOS CURTOS</AppText>
          <AppText variant="heading">Reels, Shorts, TikTok e Afins</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={allOn ? 'Desligar todos os filtros de vídeos curtos' : 'Ativar todos os filtros de vídeos curtos'}
          onPress={() => execute('setAllShortVideoBlocks', !allOn)}
          style={({ pressed }) => [
            styles.allPill,
            allOn ? styles.allPillLit : styles.allPillDim,
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.dot, allOn ? styles.dotLit : styles.dotDim]} />
          <AppText variant="caption" style={allOn ? styles.allTextLit : styles.allTextDim}>
            {allOn ? 'TODOS ON' : `${activeCount}/${shortVideoTargets.length}`}
          </AppText>
        </Pressable>
      </View>

      {blockedToday > 0 && (
        <View style={styles.counterBanner}>
          <Icon name="shield-checkmark" size={16} color={c.primary} />
          <AppText variant="caption" style={styles.counterText}>
            {blockedToday} {blockedToday === 1 ? 'vídeo curto bloqueado hoje' : 'vídeos curtos bloqueados hoje'}
          </AppText>
        </View>
      )}

      {compact ? (
        <View style={styles.grid}>
          {shortVideoTargets.map(target => {
            const on = Boolean(blocks[target.id]);
            const hits = blockedByTarget[target.id] || 0;
            return (
              <Pressable
                key={target.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => execute('setShortVideoBlock', target.id, !on)}
                style={({ pressed }) => [
                  styles.tile,
                  on ? styles.tileLit : styles.tileDim,
                  pressed && styles.pressed,
                ]}
              >
                <View style={layout.between}>
                  <Icon name={target.icon} size={18} color={on ? c.primary : '#646C67'} />
                  <View style={[styles.dot, on ? styles.dotLit : styles.dotDim]} />
                </View>
                <AppText variant="label" style={on ? styles.titleLit : styles.titleDim}>
                  {target.shortName}
                </AppText>
                <AppText variant="caption" style={on ? styles.subLit : styles.subDim} numberOfLines={1}>
                  {on ? (hits > 0 ? `${hits} bloq. hoje` : 'Bloqueando') : 'Apagado'}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={styles.list}>
          {shortVideoTargets.map(target => {
            const on = Boolean(blocks[target.id]);
            const hits = blockedByTarget[target.id] || 0;
            return (
              <PermissionToggleButton
                key={target.id}
                title={target.name}
                subtitle={hits > 0 ? `${target.description} · ${hits} bloq. hoje` : target.description}
                icon={target.icon}
                active={on}
                activeLabel="Ativo"
                inactiveLabel="Apagado"
                onPress={() => execute('setShortVideoBlock', target.id, !on)}
              />
            );
          })}
        </View>
      )}

      {/* Ação direta no Android caso o serviço em fundo ou escudo ainda esteja apagado */}
      {device.available && !device.blockingAuthorized && (
        <PermissionToggleButton
          title="Ativar bloqueio em segundo plano"
          subtitle="Toque para liberar no Android (sem botão flutuante)"
          icon="shield-outline"
          active={false}
          activeLabel="Ativo"
          inactiveLabel="Apagado"
          disabled={busy}
          onPress={() => control('requestBlockingAccess')}
        />
      )}

      {device.available && device.blockingAuthorized && !state.protectionEnabled && (
        <PermissionToggleButton
          title="Ligar Escudo Larp-In"
          subtitle="Serviço pronto · Toque para começar a bloquear Reels, Shorts e TikTok"
          icon="lock-open-outline"
          active={false}
          activeLabel="Ativo"
          inactiveLabel="Apagado"
          disabled={busy}
          onPress={() => control('enable')}
        />
      )}

      {!device.available && compact && onOpenSettings && (
        <Pressable onPress={onOpenSettings} style={({ pressed }) => [styles.hintRow, pressed && styles.pressed]}>
          <Icon name="information-circle-outline" size={15} color={c.muted} />
          <AppText variant="caption" muted style={layout.flex}>
            Filtros salvos. Instale o APK Android para ativar o bloqueio automático em segundo plano.
          </AppText>
        </Pressable>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#101410',
    borderColor: '#253220',
  },
  eyebrow: {
    color: c.primary,
    fontSize: 10,
  },
  allPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: r.pill,
    borderWidth: 1,
  },
  allPillLit: {
    backgroundColor: '#1E3117',
    borderColor: c.primary,
  },
  allPillDim: {
    backgroundColor: '#141716',
    borderColor: '#2A2F2C',
  },
  allTextLit: {
    color: c.primary,
    fontWeight: '700',
    fontSize: 10,
  },
  allTextDim: {
    color: c.muted,
    fontWeight: '700',
    fontSize: 10,
  },
  counterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#162412',
    borderWidth: 1,
    borderColor: '#2F4626',
    borderRadius: r.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  counterText: {
    color: c.primary,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s.sm,
  },
  tile: {
    width: '48.5%',
    flexGrow: 1,
    borderRadius: r.sm,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  tileLit: {
    backgroundColor: '#162511',
    borderColor: c.primary,
  },
  tileDim: {
    backgroundColor: '#0E1010',
    borderColor: '#222624',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotLit: {
    backgroundColor: c.primary,
  },
  dotDim: {
    backgroundColor: '#4E5551',
  },
  titleLit: {
    color: c.text,
    marginTop: 2,
  },
  titleDim: {
    color: '#8D9590',
    marginTop: 2,
  },
  subLit: {
    color: '#B6C9AA',
    fontSize: 11,
  },
  subDim: {
    color: '#676F6A',
    fontSize: 11,
  },
  list: {
    gap: s.sm,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pressed: {
    opacity: 0.76,
  },
});
