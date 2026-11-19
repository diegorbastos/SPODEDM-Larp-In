package com.larpin.devicecontrol

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class LarpDeviceControlModule : Module() {
  private val context: Context get() = requireNotNull(appContext.reactContext)

  private fun isBlockingServiceEnabled(): Boolean {
    val expected = ComponentName(context, LarpAccessibilityService::class.java)
    val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
    val activeByManager = am?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
      ?.any { it.resolveInfo?.serviceInfo?.let { si -> si.packageName == expected.packageName && si.name == expected.className } == true }
      ?: false
    if (activeByManager) return true
    val accessibilityOn = Settings.Secure.getInt(context.contentResolver, Settings.Secure.ACCESSIBILITY_ENABLED, 0) == 1
    if (!accessibilityOn) return false
    val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
    return enabled.split(':').any { ComponentName.unflattenFromString(it) == expected }
  }

  private fun readBlockedStats(): Pair<Int, Map<String, Int>> {
    val prefs = context.getSharedPreferences("larp-control", Context.MODE_PRIVATE)
    val today = DeviceUsage.todayKey()
    if (prefs.getString("blocked_day", "") != today) {
      return 0 to mapOf("reels" to 0, "shorts" to 0, "tiktok" to 0, "others" to 0)
    }
    val total = prefs.getInt("blocked_today", 0)
    val byTarget = mapOf(
      "reels" to prefs.getInt("blocked_reels", 0),
      "shorts" to prefs.getInt("blocked_shorts", 0),
      "tiktok" to prefs.getInt("blocked_tiktok", 0),
      "others" to prefs.getInt("blocked_others", 0)
    )
    return total to byTarget
  }

  override fun definition() = ModuleDefinition {
    Name("LarpDeviceControl")
    AsyncFunction("getStatus") {
      val (blockedToday, blockedByTarget) = readBlockedStats()
      mapOf(
        "available" to true,
        "platform" to "android",
        "usageAuthorized" to DeviceUsage.permitted(context),
        "blockingAuthorized" to isBlockingServiceEnabled(),
        "selected" to listOf("instagram", "youtube", "tiktok"),
        "blockedToday" to blockedToday,
        "blockedByTarget" to blockedByTarget
      )
    }
    AsyncFunction("requestUsageAccess") {
      DeviceUsage.invalidateCache()
      val targeted = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(targeted)
      } catch (_: Exception) {
        context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
      true
    }
    AsyncFunction("requestBlockingAccess") {
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }
    AsyncFunction("getInstalledApps") {
      val pm = context.packageManager
      val launcherIntent = Intent(Intent.ACTION_MAIN, null).apply {
        addCategory(Intent.CATEGORY_LAUNCHER)
      }
      val seen = mutableSetOf<String>()
      val activities = pm.queryIntentActivities(launcherIntent, 0)
      activities.mapNotNull { resolveInfo ->
        val pkg = resolveInfo.activityInfo.packageName
        if (pkg == context.packageName || !seen.add(pkg)) null
        else {
          val label = resolveInfo.loadLabel(pm).toString()
          mapOf("packageName" to pkg, "label" to label)
        }
      }.sortedBy { it["label"]?.lowercase() }
    }
    AsyncFunction("getUsage") {
      val capturedAt = System.currentTimeMillis()
      mapOf("capturedAt" to capturedAt, "seconds" to DeviceUsage.secondsToday(context, capturedAt))
    }
    AsyncFunction("configure") { json: String ->
      val config = JSONObject(json)
      if (config.optBoolean("enabled")) {
        val limits = config.optJSONObject("limits")
        if (limits != null) {
          DeviceUsage.packages.keys.forEach { id ->
            if (limits.has(id)) require(limits.getInt(id) in 1..1440)
          }
        }
      }
      check(context.getSharedPreferences("larp-control", Context.MODE_PRIVATE).edit().putString("rules", json).commit()) {
        "Não foi possível salvar a proteção no aparelho."
      }
      true
    }
    AsyncFunction("stop") {
      check(context.getSharedPreferences("larp-control", Context.MODE_PRIVATE).edit().remove("rules").commit())
      true
    }
  }
}
