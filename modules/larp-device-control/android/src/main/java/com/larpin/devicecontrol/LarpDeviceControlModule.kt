package com.larpin.devicecontrol

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class LarpDeviceControlModule : Module() {
  private val context: Context get() = requireNotNull(appContext.reactContext)
  override fun definition() = ModuleDefinition {
    Name("LarpDeviceControl")
    AsyncFunction("getStatus") {
      val expected = ComponentName(context, LarpAccessibilityService::class.java)
      val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
      mapOf("available" to true, "platform" to "android", "usageAuthorized" to DeviceUsage.permitted(context),
        "blockingAuthorized" to enabled.split(':').any { ComponentName.unflattenFromString(it) == expected },
        "reportOnly" to false, "selected" to listOf("instagram", "youtube", "tiktok"))
    }
    AsyncFunction("hasUsagePermission") {
      DeviceUsage.hasUsagePermission(context)
    }
    AsyncFunction("requestUsageAccess") {
      context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("requestBlockingAccess") {
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("getInstalledApps") {
      val pm = context.packageManager
      val launcherIntent = Intent(Intent.ACTION_MAIN, null).apply {
        addCategory(Intent.CATEGORY_LAUNCHER)
      }
      val activities = pm.queryIntentActivities(launcherIntent, 0)
      activities.mapNotNull { resolveInfo ->
        val pkg = resolveInfo.activityInfo.packageName
        if (pkg == context.packageName) null
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
    AsyncFunction("getDailyUsage") { packagesArg: List<String>? ->
      val capturedAt = System.currentTimeMillis()
      mapOf("capturedAt" to capturedAt, "seconds" to DeviceUsage.secondsToday(context, capturedAt, packagesArg))
    }
    AsyncFunction("configure") { json: String ->
      val config = JSONObject(json)
      if (config.optBoolean("enabled")) {
        check(DeviceUsage.permitted(context)) { "Autorize o acesso ao uso antes de ativar a proteção." }
        val limits = config.getJSONObject("limits")
        DeviceUsage.packages.keys.forEach { id -> require(limits.getInt(id) in 1..1440) }
      }
      check(context.getSharedPreferences("larp-control", Context.MODE_PRIVATE).edit().putString("rules", json).commit()) {
        "Não foi possível salvar a proteção no aparelho."
      }
    }
    AsyncFunction("stop") {
      check(context.getSharedPreferences("larp-control", Context.MODE_PRIVATE).edit().remove("rules").commit())
    }
  }
}
