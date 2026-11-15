package com.larpin.devicecontrol

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Process
import java.util.Calendar

object DeviceUsage {
  val packages = mapOf(
    "instagram" to setOf("com.instagram.android"),
    "youtube" to setOf("com.google.android.youtube"),
    "tiktok" to setOf("com.zhiliaoapp.musically", "com.ss.android.ugc.trill")
  )
  fun permitted(context: Context): Boolean {
    val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    @Suppress("DEPRECATION")
    return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName) == AppOpsManager.MODE_ALLOWED
  }
  fun dayStart(): Long = Calendar.getInstance().apply {
    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
  }.timeInMillis

  // Reconstrói intervalos do app em primeiro plano, recortados na meia-noite local.
  // O lookback recupera um app aberto antes da virada do dia, sem somar o dia anterior.
  fun secondsToday(context: Context, now: Long = System.currentTimeMillis()): Map<String, Long> {
    check(permitted(context)) { "Autorize o acesso ao uso nas configurações do Android." }
    val start = dayStart()
    val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val events = manager.queryEvents(start - 86400000L, now)
      ?: throw IllegalStateException("O Android não disponibilizou os eventos de uso. Desbloqueie o aparelho e tente novamente.")
    val totals = mutableMapOf<String, Long>()
    var foreground: String? = null
    var began = start
    fun close(at: Long) {
      val pkg = foreground ?: return
      val duration = (at.coerceAtMost(now) - began.coerceAtLeast(start)).coerceAtLeast(0)
      totals[pkg] = (totals[pkg] ?: 0L) + duration
      foreground = null
    }
    val event = UsageEvents.Event()
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      when (event.eventType) {
        UsageEvents.Event.ACTIVITY_RESUMED -> {
          close(event.timeStamp)
          foreground = event.packageName
          began = event.timeStamp
        }
        UsageEvents.Event.ACTIVITY_PAUSED -> if (foreground == event.packageName) close(event.timeStamp)
        UsageEvents.Event.SCREEN_NON_INTERACTIVE, UsageEvents.Event.DEVICE_SHUTDOWN -> close(event.timeStamp)
      }
    }
    close(now)
    return packages.mapValues { (_, names) -> names.sumOf { totals[it] ?: 0L } / 1000L }
  }
}
