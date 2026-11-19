package com.larpin.devicecontrol

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import java.util.concurrent.Executors

class LarpAccessibilityService : AccessibilityService(), SharedPreferences.OnSharedPreferenceChangeListener {
  private val handler = Handler(Looper.getMainLooper())
  private var currentPackage: String? = null
  private var foregroundNetworkId: String? = null
  private var overlay: LinearLayout? = null
  private var overlayReason: String? = null
  private lateinit var prefs: SharedPreferences
  private val usageWorker = Executors.newSingleThreadExecutor()
  private var usageCheckRunning = false
  private var destroyed = false

  // Regras cacheadas em memória para evitar parse JSON repetido em eventos rápidos.
  private var rulesEnabled = false
  private var focusEndsAt = 0L
  private var limits = mapOf<String, Int>()
  private var blockReels = true
  private var blockShorts = true
  private var blockTikTok = true
  private var blockOthers = true
  private var rulesRaw = "{}"

  private var lastContentCheckAt = 0L
  private var lastBackActionAt = 0L
  private var lastBlockCountTarget: String? = null
  private var lastBlockCountAt = 0L

  companion object {
    private const val CONTENT_CHECK_THROTTLE_MS = 250L
    private const val BACK_ACTION_COOLDOWN_MS = 950L
    private const val BLOCK_COUNT_DEBOUNCE_MS = 2500L

    private val IG_REELS_IDS = listOf(
      "clips_viewer_view_pager",
      "clips_video_container",
      "clips_swipe_refresh_container",
      "clips_ufi_component",
      "clips_author_info_component"
    )
    private val YT_SHORTS_IDS = listOf(
      "reel_recycler",
      "reel_watch_fragment_root",
      "reel_player_page_container",
      "reel_vod_player_view",
      "reel_progress_bar",
      "reel_dyn_share",
      "reel_dyn_remix"
    )
    private val FB_REELS_IDS = listOf(
      "fb_shorts_viewer",
      "reels_viewer_container",
      "short_form_video_container"
    )
    private val SNAP_SPOTLIGHT_IDS = listOf(
      "spotlight_view",
      "spotlight_feed_container"
    )
    private val MONITORED_PACKAGES =
      DeviceUsage.instagramPackages +
      DeviceUsage.youtubePackages +
      DeviceUsage.tiktokPackages +
      DeviceUsage.kwaiPackages +
      DeviceUsage.facebookPackages +
      DeviceUsage.snapchatPackages
  }

  private val tick = object : Runnable {
    override fun run() {
      enforceLimitsAndFocus()
      if (foregroundNetworkId != null && rulesEnabled) {
        handler.postDelayed(this, 2500)
      }
    }
  }

  override fun onServiceConnected() {
    prefs = getSharedPreferences("larp-control", Context.MODE_PRIVATE)
    prefs.registerOnSharedPreferenceChangeListener(this)
    reloadRules()
    handler.post { enforceLimitsAndFocus() }
  }

  override fun onSharedPreferenceChanged(p: SharedPreferences?, key: String?) {
    if (key == "rules" || key == null) {
      handler.post {
        reloadRules()
        if (!rulesEnabled) {
          dismiss()
        } else {
          enforceAll(null)
        }
      }
    }
  }

  private fun reloadRules() {
    if (!::prefs.isInitialized) return
    val raw = prefs.getString("rules", "{}") ?: "{}"
    rulesRaw = raw
    runCatching {
      val json = JSONObject(raw)
      rulesEnabled = json.optBoolean("enabled", false)
      focusEndsAt = json.optLong("focusEndsAt", 0L)
      val limitsObj = json.optJSONObject("limits")
      val parsedLimits = mutableMapOf<String, Int>()
      if (limitsObj != null) {
        DeviceUsage.packages.keys.forEach { id ->
          parsedLimits[id] = limitsObj.optInt(id, 1440)
        }
      }
      limits = parsedLimits
      val shortBlocks = json.optJSONObject("shortVideoBlocks")
      blockReels = shortBlocks?.optBoolean("reels", true) ?: true
      blockShorts = shortBlocks?.optBoolean("shorts", true) ?: true
      blockTikTok = shortBlocks?.optBoolean("tiktok", true) ?: true
      blockOthers = shortBlocks?.optBoolean("others", true) ?: true
    }.onFailure {
      rulesEnabled = false
    }
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || !rulesEnabled) return
    val type = event.eventType
    if (type != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && type != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) return
    val pkg = event.packageName?.toString() ?: return
    if ((pkg == packageName || pkg == "com.android.systemui") && overlay != null) return

    // Saída imediata em O(1) para qualquer app fora da lista monitorada: nunca lê árvore de outros apps.
    if (pkg !in MONITORED_PACKAGES) {
      if (type == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && currentPackage != null) {
        currentPackage = null
        foregroundNetworkId = null
        handler.removeCallbacks(tick)
        dismiss()
      }
      return
    }

    val now = System.currentTimeMillis()
    if (type == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
      if (now - lastContentCheckAt < CONTENT_CHECK_THROTTLE_MS) return
      lastContentCheckAt = now
    }

    val packageChanged = pkg != currentPackage
    currentPackage = pkg
    foregroundNetworkId = DeviceUsage.packages.entries.firstOrNull { pkg in it.value }?.key

    if (packageChanged) {
      handler.removeCallbacks(tick)
      if (foregroundNetworkId != null) {
        handler.postDelayed(tick, 2500)
      }
    }

    enforceAll(event.className?.toString())
  }

  private fun enforceAll(eventClass: String?) {
    if (!rulesEnabled) {
      dismiss()
      return
    }
    val pkg = currentPackage ?: run {
      dismiss()
      return
    }

    // 1. Modo Foco tem prioridade máxima (funciona mesmo sem permissão de uso).
    if (focusEndsAt > System.currentTimeMillis() && foregroundNetworkId != null) {
      showShield(
        title = "Foco em andamento",
        reason = "Sua sessão de foco está ativa. Volte para o que importa.",
        allowBackToApp = false
      )
      return
    }

    // 2. Bloqueio de Reels, Shorts, TikTok, Kwai, Facebook Reels e Spotlight (funciona sem permissão de uso).
    val shortHit = detectShortVideo(pkg, eventClass)
    if (shortHit != null) {
      recordBlock(shortHit.targetId)
      if (shortHit.inAppFeed) {
        val now = System.currentTimeMillis()
        if (now - lastBackActionAt >= BACK_ACTION_COOLDOWN_MS) {
          lastBackActionAt = now
          performGlobalAction(GLOBAL_ACTION_BACK)
        }
        showShield(
          title = "${shortHit.label} bloqueado",
          reason = "O Larp-In pausou o feed de vídeos curtos. Você pode voltar ao app sem ${shortHit.label} ou ir para a tela inicial.",
          allowBackToApp = true
        )
      } else {
        showShield(
          title = "${shortHit.label} bloqueado",
          reason = "O bloqueio de vídeos curtos está ativo para ${shortHit.label}.",
          allowBackToApp = false
        )
      }
      return
    }

    // 3. Limite diário de minutos (ativo quando permissão de acesso ao uso também está concedida).
    enforceLimitsAndFocus()
  }

  private fun enforceLimitsAndFocus() {
    if (!::prefs.isInitialized || !rulesEnabled) {
      dismiss()
      return
    }
    val id = foregroundNetworkId
    if (id == null) {
      // Se estamos fora de apps monitorados (e não num app de vídeo curto bloqueado), fecha o escudo.
      val pkg = currentPackage
      val isShortApp = pkg != null && ((blockTikTok && pkg in DeviceUsage.tiktokPackages) || (blockOthers && pkg in DeviceUsage.kwaiPackages))
      if (!isShortApp) dismiss()
      return
    }

    if (focusEndsAt > System.currentTimeMillis()) {
      showShield(
        title = "Foco em andamento",
        reason = "Sua sessão de foco está ativa. Volte para o que importa.",
        allowBackToApp = false
      )
      return
    }

    if (!DeviceUsage.permitted(this)) return

    val limit = limits[id] ?: 1440
    if (usageCheckRunning) return
    val snapshotRaw = rulesRaw
    usageCheckRunning = true
    usageWorker.execute {
      val reached = runCatching { (DeviceUsage.secondsToday(this)[id] ?: 0L) >= limit * 60L }.getOrDefault(false)
      handler.post {
        usageCheckRunning = false
        if (!destroyed && foregroundNetworkId == id && rulesRaw == snapshotRaw && rulesEnabled) {
          if (reached) {
            showShield(
              title = "Meta diária atingida",
              reason = "Você alcançou seu limite de hoje para este aplicativo. Amanhã é um novo começo.",
              allowBackToApp = false
            )
          } else if (overlayReason?.startsWith("Você alcançou seu limite") == true) {
            dismiss()
          }
        }
      }
    }
  }

  private data class ShortVideoHit(val targetId: String, val label: String, val inAppFeed: Boolean)

  private fun detectShortVideo(pkg: String, eventClass: String?): ShortVideoHit? {
    // Apps dedicados de vídeo curto (bloqueio imediato)
    if (blockTikTok && pkg in DeviceUsage.tiktokPackages) {
      return ShortVideoHit("tiktok", "TikTok", inAppFeed = false)
    }
    if (blockOthers && pkg in DeviceUsage.kwaiPackages) {
      return ShortVideoHit("others", "Kwai", inAppFeed = false)
    }

    // Feeds curtos dentro de apps maiores (somente leitura de viewIdResourceName / aba selecionada, nunca texto ou mensagens)
    val root = runCatching { rootInActiveWindow }.getOrNull()

    if (blockReels && pkg in DeviceUsage.instagramPackages) {
      val classHit = eventClass?.contains("Clips", ignoreCase = true) == true
      val nodeHit = root != null && (
        hasAnyViewId(root, pkg, IG_REELS_IDS) ||
        hasAnyViewId(root, "com.instagram.android", IG_REELS_IDS) ||
        isViewSelected(root, pkg, "clips_tab") ||
        isViewSelected(root, "com.instagram.android", "clips_tab")
      )
      if (classHit || nodeHit) return ShortVideoHit("reels", "Instagram Reels", inAppFeed = true)
    }

    if (blockShorts && pkg in DeviceUsage.youtubePackages) {
      val nodeHit = root != null && (
        hasAnyViewId(root, pkg, YT_SHORTS_IDS) ||
        hasAnyViewId(root, "com.google.android.youtube", YT_SHORTS_IDS) ||
        hasSelectedTabByDescription(root, "shorts", 0)
      )
      if (nodeHit) return ShortVideoHit("shorts", "YouTube Shorts", inAppFeed = true)
    }

    if (blockOthers && pkg in DeviceUsage.facebookPackages) {
      val classHit = eventClass?.let { it.contains("FbShorts", ignoreCase = true) || it.contains("Reels", ignoreCase = true) } == true
      val nodeHit = root != null && (
        hasAnyViewId(root, pkg, FB_REELS_IDS) ||
        hasSelectedTabByDescription(root, "reels", 0)
      )
      if (classHit || nodeHit) return ShortVideoHit("others", "Facebook Reels", inAppFeed = true)
    }

    if (blockOthers && pkg in DeviceUsage.snapchatPackages) {
      val nodeHit = root != null && (
        hasAnyViewId(root, pkg, SNAP_SPOTLIGHT_IDS) ||
        hasSelectedTabByDescription(root, "spotlight", 0)
      )
      if (nodeHit) return ShortVideoHit("others", "Snapchat Spotlight", inAppFeed = true)
    }

    return null
  }

  private fun hasAnyViewId(root: AccessibilityNodeInfo, pkg: String, ids: List<String>): Boolean {
    for (id in ids) {
      val found = runCatching { root.findAccessibilityNodeInfosByViewId("$pkg:id/$id") }.getOrNull()
      if (!found.isNullOrEmpty() && found.any { it.isVisibleToUser }) return true
    }
    return false
  }

  private fun isViewSelected(root: AccessibilityNodeInfo, pkg: String, id: String): Boolean {
    val found = runCatching { root.findAccessibilityNodeInfosByViewId("$pkg:id/$id") }.getOrNull()
    return !found.isNullOrEmpty() && found.any { it.isSelected && it.isVisibleToUser }
  }

  // Varredura rasa (profundidade máxima 5) apenas de contentDescription em abas selecionadas; nunca lê EditText ou mensagens.
  private fun hasSelectedTabByDescription(node: AccessibilityNodeInfo?, keyword: String, depth: Int): Boolean {
    if (node == null || depth > 5) return false
    val cls = node.className?.toString() ?: ""
    if (cls.contains("EditText", ignoreCase = true)) return false
    if (node.isSelected && node.isVisibleToUser) {
      val desc = node.contentDescription?.toString()?.trim()?.lowercase()
      if (desc != null && (desc == keyword || desc.startsWith("$keyword,") || desc.contains(" $keyword"))) {
        return true
      }
    }
    val count = node.childCount.coerceAtMost(12)
    for (i in 0 until count) {
      if (hasSelectedTabByDescription(node.getChild(i), keyword, depth + 1)) return true
    }
    return false
  }

  private fun recordBlock(targetId: String) {
    if (!::prefs.isInitialized) return
    val now = System.currentTimeMillis()
    if (lastBlockCountTarget == targetId && now - lastBlockCountAt < BLOCK_COUNT_DEBOUNCE_MS) return
    lastBlockCountTarget = targetId
    lastBlockCountAt = now

    val today = DeviceUsage.todayKey()
    val savedDay = prefs.getString("blocked_day", "")
    val editor = prefs.edit()
    if (savedDay != today) {
      editor.putString("blocked_day", today)
      editor.putInt("blocked_today", 1)
      editor.putInt("blocked_reels", if (targetId == "reels") 1 else 0)
      editor.putInt("blocked_shorts", if (targetId == "shorts") 1 else 0)
      editor.putInt("blocked_tiktok", if (targetId == "tiktok") 1 else 0)
      editor.putInt("blocked_others", if (targetId == "others") 1 else 0)
    } else {
      editor.putInt("blocked_today", prefs.getInt("blocked_today", 0) + 1)
      editor.putInt("blocked_$targetId", prefs.getInt("blocked_$targetId", 0) + 1)
    }
    editor.apply()
  }

  private fun showShield(title: String, reason: String, allowBackToApp: Boolean) {
    if (overlay != null && overlayReason == reason) return
    if (overlay != null) dismiss()

    val density = resources.displayMetrics.density
    fun dp(value: Int) = (value * density).toInt()

    fun pillBackground(fillColor: Int, strokeColor: Int? = null) = GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = dp(999).toFloat()
      setColor(fillColor)
      if (strokeColor != null) setStroke(dp(1), strokeColor)
    }

    val panel = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(dp(28), dp(36), dp(28), dp(36))
      setBackgroundColor(Color.rgb(8, 9, 9))
    }

    panel.addView(TextView(this).apply {
      text = "LARP-IN"
      textSize = 12f
      letterSpacing = 0.2f
      setTextColor(Color.rgb(214, 244, 154))
      gravity = Gravity.CENTER
      setTypeface(null, Typeface.BOLD)
    })

    panel.addView(TextView(this).apply {
      text = title
      textSize = 28f
      setTextColor(Color.rgb(244, 245, 239))
      gravity = Gravity.CENTER
      setTypeface(null, Typeface.BOLD)
      setPadding(0, dp(12), 0, dp(12))
    })

    panel.addView(TextView(this).apply {
      text = reason
      textSize = 16f
      setTextColor(Color.rgb(162, 170, 165))
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(28))
    })

    if (allowBackToApp) {
      panel.addView(Button(this).apply {
        text = "Voltar sem vídeos curtos"
        isAllCaps = false
        textSize = 15f
        setTypeface(null, Typeface.BOLD)
        setTextColor(Color.rgb(24, 33, 16))
        background = pillBackground(Color.rgb(214, 244, 154))
        setPadding(dp(24), dp(14), dp(24), dp(14))
        layoutParams = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = dp(12) }
        setOnClickListener {
          dismiss()
        }
      })
    }

    panel.addView(Button(this).apply {
      text = "Ir para a tela inicial"
      isAllCaps = false
      textSize = 15f
      setTypeface(null, Typeface.BOLD)
      if (allowBackToApp) {
        setTextColor(Color.rgb(244, 245, 239))
        background = pillBackground(Color.rgb(29, 32, 32), Color.rgb(43, 47, 45))
      } else {
        setTextColor(Color.rgb(24, 33, 16))
        background = pillBackground(Color.rgb(214, 244, 154))
      }
      setPadding(dp(24), dp(14), dp(24), dp(14))
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
      ).apply { bottomMargin = dp(12) }
      setOnClickListener {
        performGlobalAction(GLOBAL_ACTION_HOME)
        foregroundNetworkId = null
        currentPackage = null
        dismiss()
      }
    })

    panel.addView(Button(this).apply {
      text = "Abrir Larp-In"
      isAllCaps = false
      textSize = 14f
      setTextColor(Color.rgb(162, 170, 165))
      background = pillBackground(Color.rgb(20, 22, 22), Color.rgb(43, 47, 45))
      setPadding(dp(24), dp(12), dp(24), dp(12))
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT
      )
      setOnClickListener {
        foregroundNetworkId = null
        currentPackage = null
        dismiss()
        packageManager.getLaunchIntentForPackage(packageName)?.let {
          startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
      }
    })

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.OPAQUE
    )
    runCatching {
      (getSystemService(WINDOW_SERVICE) as WindowManager).addView(panel, params)
      overlay = panel
      overlayReason = reason
    }
  }

  private fun dismiss() {
    overlay?.let { view ->
      runCatching { (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(view) }
    }
    overlay = null
    overlayReason = null
  }

  override fun onInterrupt() {
    handler.removeCallbacks(tick)
    foregroundNetworkId = null
    currentPackage = null
    dismiss()
  }

  override fun onDestroy() {
    destroyed = true
    usageWorker.shutdownNow()
    handler.removeCallbacksAndMessages(null)
    if (::prefs.isInitialized) prefs.unregisterOnSharedPreferenceChangeListener(this)
    dismiss()
    super.onDestroy()
  }
}
