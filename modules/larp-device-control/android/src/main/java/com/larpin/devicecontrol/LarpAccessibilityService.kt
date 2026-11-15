package com.larpin.devicecontrol

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import java.util.concurrent.Executors

class LarpAccessibilityService : AccessibilityService(), SharedPreferences.OnSharedPreferenceChangeListener {
  private val handler = Handler(Looper.getMainLooper())
  private var foreground: String? = null
  private var overlay: LinearLayout? = null
  private lateinit var prefs: SharedPreferences
  private val usageWorker = Executors.newSingleThreadExecutor()
  private var usageCheckRunning = false
  private var destroyed = false
  private val tick = object : Runnable {
    override fun run() {
      enforce()
      if (foreground != null) handler.postDelayed(this, 2000)
    }
  }
  override fun onServiceConnected() {
    prefs = getSharedPreferences("larp-control", Context.MODE_PRIVATE)
    prefs.registerOnSharedPreferenceChangeListener(this)
  }
  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    // Não examina nós de acessibilidade, conteúdo da janela ou mensagens.
    if (pkg == packageName && overlay != null) return
    foreground = DeviceUsage.packages.entries.firstOrNull { pkg in it.value }?.key
    handler.removeCallbacks(tick)
    tick.run()
  }
  override fun onSharedPreferenceChanged(p: SharedPreferences?, key: String?) {
    handler.post { enforce() }
  }
  private fun enforce() {
    if (!::prefs.isInitialized) return
    val id = foreground
    if (id == null || !DeviceUsage.permitted(this)) { dismiss(); return }
    try {
      val raw = prefs.getString("rules", "{}") ?: "{}"
      val rules = JSONObject(raw)
      if (!rules.optBoolean("enabled")) { dismiss(); return }
      val focus = rules.optLong("focusEndsAt") > System.currentTimeMillis()
      if (focus) { showShield("Sua sessão de foco está em andamento."); return }
      val limit = rules.optJSONObject("limits")?.optInt(id, 1440) ?: 1440
      if (usageCheckRunning) return
      usageCheckRunning = true
      usageWorker.execute {
        val reached = try { (DeviceUsage.secondsToday(this)[id] ?: 0) >= limit * 60L } catch (_: Exception) { false }
        handler.post {
          usageCheckRunning = false
          if (!destroyed && foreground == id && prefs.getString("rules", "{}") == raw) {
            if (reached) showShield("Você atingiu a meta diária deste aplicativo.") else dismiss()
          }
        }
      }
    } catch (_: Exception) {
      // Falha de autorização/dados nunca deixa uma tela de bloqueio presa.
      dismiss()
    }
  }
  private fun showShield(reason: String) {
    if (overlay != null) return
    val density = resources.displayMetrics.density
    fun dp(value: Int) = (value * density).toInt()
    val panel = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER
      setPadding(dp(28), dp(32), dp(28), dp(32)); setBackgroundColor(Color.rgb(8, 9, 9))
    }
    panel.addView(TextView(this).apply { text = "Larp-In\nVolte para o que importa."; textSize = 28f; setTextColor(Color.WHITE); gravity = Gravity.CENTER })
    panel.addView(TextView(this).apply { text = "$reason\nVocê pode ajustar ou desativar a proteção no Larp-In."; textSize = 17f; setTextColor(Color.LTGRAY); gravity = Gravity.CENTER; setPadding(0, dp(24), 0, dp(24)) })
    panel.addView(Button(this).apply { text = "Ir para a tela inicial"; setOnClickListener { performGlobalAction(GLOBAL_ACTION_HOME); foreground = null; dismiss() } })
    panel.addView(Button(this).apply { text = "Abrir Larp-In"; setOnClickListener {
      foreground = null; dismiss()
      packageManager.getLaunchIntentForPackage(packageName)?.let { startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
    } })
    val params = WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.OPAQUE)
    (getSystemService(WINDOW_SERVICE) as WindowManager).addView(panel, params)
    overlay = panel
  }
  private fun dismiss() { overlay?.let { (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(it) }; overlay = null }
  override fun onInterrupt() { handler.removeCallbacks(tick); foreground = null; dismiss() }
  override fun onDestroy() {
    destroyed = true
    usageWorker.shutdownNow()
    handler.removeCallbacksAndMessages(null)
    if (::prefs.isInitialized) prefs.unregisterOnSharedPreferenceChangeListener(this)
    dismiss(); super.onDestroy()
  }
}
