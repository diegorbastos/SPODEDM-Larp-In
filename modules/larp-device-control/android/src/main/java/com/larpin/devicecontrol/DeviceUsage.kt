package com.larpin.devicecontrol

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.Build
import android.os.Process
import java.util.Calendar

object DeviceUsage {
  val packages = mapOf(
    "instagram" to setOf("com.instagram.android", "com.instagram.lite"),
    "youtube" to setOf("com.google.android.youtube", "app.revanced.android.youtube"),
    "tiktok" to setOf("com.zhiliaoapp.musically", "com.ss.android.ugc.trill", "com.zhiliaoapp.musically.go")
  )

  val instagramPackages = setOf("com.instagram.android", "com.instagram.lite")
  val youtubePackages = setOf("com.google.android.youtube", "app.revanced.android.youtube")
  val tiktokPackages = setOf("com.zhiliaoapp.musically", "com.ss.android.ugc.trill", "com.zhiliaoapp.musically.go")
  val kwaiPackages = setOf("com.kwai.video", "com.kwai.bulldog", "com.smile.gifmaker")
  val facebookPackages = setOf("com.facebook.katana", "com.facebook.lite")
  val snapchatPackages = setOf("com.snapchat.android")

  private val cacheLock = Any()
  private var cachedAt: Long = 0L
  private var cachedDayStart: Long = 0L
  private var cachedResult: Map<String, Long>? = null
  private const val CACHE_TTL_MS = 3000L

  fun permitted(context: Context): Boolean {
    val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    } else {
      @Suppress("DEPRECATION")
      ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  fun invalidateCache() {
    synchronized(cacheLock) {
      cachedResult = null
      cachedAt = 0L
    }
  }

  fun dayStart(): Long = Calendar.getInstance().apply {
    set(Calendar.HOUR_OF_DAY, 0)
    set(Calendar.MINUTE, 0)
    set(Calendar.SECOND, 0)
    set(Calendar.MILLISECOND, 0)
  }.timeInMillis

  fun todayKey(): String {
    val cal = Calendar.getInstance()
    return "%04d-%02d-%02d".format(cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH))
  }

  // Reconstrói intervalos do app em primeiro plano, recortados na meia-noite local.
  // Usa cache curto em memória (3s) para evitar varreduras repetidas de eventos do sistema.
  fun secondsToday(context: Context, now: Long = System.currentTimeMillis()): Map<String, Long> {
    check(permitted(context)) { "Autorize o acesso ao uso nas configurações do Android." }
    val start = dayStart()
    synchronized(cacheLock) {
      val hit = cachedResult
      if (hit != null && cachedDayStart == start && now - cachedAt in 0..CACHE_TTL_MS) {
        return hit
      }
    }
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

    val result = packages.mapValues { (_, names) -> names.sumOf { totals[it] ?: 0L } / 1000L }
    synchronized(cacheLock) {
      cachedResult = result
      cachedDayStart = start
      cachedAt = now
    }
    return result
  }
}
