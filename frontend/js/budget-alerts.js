/**
 * FinverseAI - Smart Budget Alert & Overspending Warning System
 * budget-alerts.js | Enhanced Version with 30-Second Alarm & Real-Time Monitoring
 *
 * Features:
 *  - Real-time per-category monitoring:
 *      * 70% - 79%: Warning alert toast
 *      * 80% - 99%: Critical alert toast + 30-SECOND RINGING ALARM
 *      * 100%+: Over-budget alert toast + 30-SECOND RINGING ALARM
 *  - 30-Second Web Audio Alarm Siren with floating banner & "Stop Alarm" button
 *  - Real-time re-alerting when adding transactions to already-exceeded categories
 *  - Duplicate prevention on passive page reloads (records lastSpent & tier)
 *  - Audio context unlocker to guarantee browser autoplay compliance
 *  - AI overspending velocity prediction
 *  - User-scoped localStorage state and settings
 */

(function () {
  'use strict';

  var THRESHOLD_WARNING  = 70;
  var THRESHOLD_CRITICAL = 80; // Enhanced to 80% as requested
  var THRESHOLD_DANGER   = 100;
  var ALERT_HISTORY_MAX  = 50;
  var ALARM_DURATION_SEC = 30; // 30 seconds alarm ringing

  // --- User-scoped localStorage helpers ---
  function _userId() {
    try {
      var u = JSON.parse(localStorage.getItem('finverse_user') || '{}');
      return u.id || u._id || 'anon';
    } catch (e) {
      return 'anon';
    }
  }

  function _alertStateKey()   { return 'finverse_budget_alert_state_'   + _userId(); }
  function _alertHistoryKey() { return 'finverse_budget_alert_history_' + _userId(); }
  function _settingsKey()     { return 'finverse_budget_alert_settings_'+ _userId(); }

  function _getAlertState() {
    try { return JSON.parse(localStorage.getItem(_alertStateKey()) || '{}'); }
    catch (e) { return {}; }
  }

  function _saveAlertState(state) {
    try { localStorage.setItem(_alertStateKey(), JSON.stringify(state)); }
    catch (e) {}
  }

  function _shouldSuppress(category, currentTier, currentSpent, force) {
    if (force) return false; // Explicit transaction action always fires
    var state = _getAlertState();
    var catState = state[category];
    if (!catState) return false;

    var lastTier = typeof catState === 'object' ? catState.tier : catState;
    var lastSpent = typeof catState === 'object' ? Number(catState.spent || 0) : 0;

    // Alert if tier increased or spending in this category grew
    if (currentTier > lastTier) return false;
    if (currentSpent > lastSpent) return false;

    return true;
  }

  function _markAlerted(category, tier, spent) {
    var state = _getAlertState();
    state[category] = { tier: tier, spent: spent, timestamp: Date.now() };
    _saveAlertState(state);
  }

  function _resetTierIfDropped(category, currentTier, currentSpent) {
    var state = _getAlertState();
    var catState = state[category];
    if (!catState) return;
    var lastTier = typeof catState === 'object' ? catState.tier : catState;
    if (lastTier > currentTier) {
      state[category] = { tier: currentTier, spent: currentSpent, timestamp: Date.now() };
      _saveAlertState(state);
    }
  }

  function _getAlertHistory() {
    try { return JSON.parse(localStorage.getItem(_alertHistoryKey()) || '[]'); }
    catch (e) { return []; }
  }

  function _addAlertHistory(entry) {
    var history = _getAlertHistory();
    history.unshift({ ...entry, timestamp: new Date().toISOString() });
    if (history.length > ALERT_HISTORY_MAX) history.pop();
    try { localStorage.setItem(_alertHistoryKey(), JSON.stringify(history)); } catch (e) {}
  }

  function _getSettings() {
    var defaults = { budgetAlerts: true, soundAlerts: true, aiPrediction: true };
    try {
      var stored = JSON.parse(localStorage.getItem(_settingsKey()) || '{}');
      return { ...defaults, ...stored };
    } catch (e) {
      return defaults;
    }
  }

  function saveSettings(settings) {
    try { localStorage.setItem(_settingsKey(), JSON.stringify(settings)); }
    catch (e) {}
  }

  function _fmt(n) {
    var num = Number(n) || 0;
    return '\u20B9' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  // --- Web Audio Context & Autoplay Unlock ---
  var _audioCtx = null;
  function _getAudioContext() {
    if (!_audioCtx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        _audioCtx = new AudioCtx();
      }
    }
    if (_audioCtx && _audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(function(){});
    }
    return _audioCtx;
  }

  function _unlockAudio() {
    var ctx = _getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(function(){});
    }
  }
  document.addEventListener('click', _unlockAudio, { passive: true });
  document.addEventListener('keydown', _unlockAudio, { passive: true });

  // --- 30-Second Alarm Engine ---
  var _activeAlarm = {
    audioInterval: null,
    countdownTimer: null,
    bannerEl: null,
    secondsLeft: 0,
    category: null,
  };

  function stopAlarm() {
    if (_activeAlarm.audioInterval) {
      clearInterval(_activeAlarm.audioInterval);
      _activeAlarm.audioInterval = null;
    }
    if (_activeAlarm.countdownTimer) {
      clearInterval(_activeAlarm.countdownTimer);
      _activeAlarm.countdownTimer = null;
    }
    if (_activeAlarm.bannerEl) {
      _activeAlarm.bannerEl.classList.remove('show');
      setTimeout(function() {
        if (_activeAlarm.bannerEl && _activeAlarm.bannerEl.parentNode) {
          _activeAlarm.bannerEl.remove();
        }
        _activeAlarm.bannerEl = null;
      }, 350);
    }
    _activeAlarm.secondsLeft = 0;
    _activeAlarm.category = null;
  }

  function _triggerAlarm(category, type, title, subtitle) {
    var settings = _getSettings();
    if (!settings.soundAlerts) return;

    // Stop previous alarm if one is currently ringing
    stopAlarm();

    _activeAlarm.secondsLeft = ALARM_DURATION_SEC;
    _activeAlarm.category = category;

    // 1. Create floating top-center Alarm Banner
    var banner = document.createElement('div');
    banner.className = 'budget-alarm-banner ' + (type === 'critical' ? 'alarm-critical' : 'alarm-danger');
    banner.innerHTML =
      '<div class="alarm-pulse-dot"></div>' +
      '<div class="budget-alarm-text">' +
        '<div class="budget-alarm-title"><i class="fa-solid fa-triangle-exclamation"></i> ' + title + '</div>' +
        '<div class="budget-alarm-subtitle">' + subtitle + '</div>' +
      '</div>' +
      '<div class="budget-alarm-countdown" id="alarmCountdownBadge">Ringing: ' + ALARM_DURATION_SEC + 's</div>' +
      '<button class="btn-stop-alarm" id="btnStopAlarmNow">' +
        '<i class="fa-solid fa-volume-xmark"></i> Stop Alarm' +
      '</button>';

    document.body.appendChild(banner);
    _activeAlarm.bannerEl = banner;

    // Animate banner in
    setTimeout(function() {
      if (_activeAlarm.bannerEl) _activeAlarm.bannerEl.classList.add('show');
    }, 20);

    // Stop button event listener
    var stopBtn = banner.querySelector('#btnStopAlarmNow');
    if (stopBtn) {
      stopBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        stopAlarm();
      });
    }

    // 2. Play continuous professional financial alert chime (warm acoustic bell / chime)
    function playChimePulse() {
      try {
        var ctx = _getAudioContext();
        if (!ctx) return;
        var now = ctx.currentTime;
        var isDanger = (type === 'danger');

        // Helper to synthesize a smooth acoustic bell note with gentle envelope
        function playBell(freq, startTime, duration, peakVol, waveType) {
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          osc.type = waveType || 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          // Soft exponential attack & decay to prevent clicking
          gain.gain.setValueAtTime(0.0001, startTime);
          gain.gain.exponentialRampToValueAtTime(peakVol, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration + 0.05);
        }

        if (isDanger) {
          // --- Danger / Exceeded (100%+): Rich, authoritative 2-tone financial chime ---
          // Note 1: E5 (659.25 Hz) with warm fundamental body at E4 (329.63 Hz)
          playBell(659.25, now, 0.60, 0.22, 'sine');
          playBell(329.63, now, 0.70, 0.10, 'triangle');
          playBell(1318.51, now, 0.35, 0.04, 'sine'); // Soft crystalline overtone

          // Note 2: C5 (523.25 Hz) descending tone with C4 body struck 180ms later
          playBell(523.25, now + 0.18, 0.80, 0.24, 'sine');
          playBell(261.63, now + 0.18, 0.90, 0.12, 'triangle');
          playBell(1046.50, now + 0.18, 0.45, 0.04, 'sine');
        } else {
          // --- Critical (80%+): Smooth, clear alert chime ---
          // Note 1: G5 (783.99 Hz)
          playBell(783.99, now, 0.55, 0.18, 'sine');
          playBell(392.00, now, 0.65, 0.08, 'triangle');

          // Note 2: B5 (987.77 Hz) ascending chime struck 160ms later
          playBell(987.77, now + 0.16, 0.75, 0.20, 'sine');
          playBell(493.88, now + 0.16, 0.85, 0.09, 'triangle');
        }
      } catch (err) {
        console.warn('[BudgetAlerts] Audio chime error:', err);
      }
    }

    // Play first chime immediately
    playChimePulse();

    // Repeat smooth chime every 1.8 seconds (calm, professional cadence)
    _activeAlarm.audioInterval = setInterval(playChimePulse, 1800);

    // 3. Countdown timer updating badge and auto-stopping after 30 seconds
    _activeAlarm.countdownTimer = setInterval(function() {
      _activeAlarm.secondsLeft--;
      var badge = document.getElementById('alarmCountdownBadge');
      if (badge) {
        badge.textContent = 'Ringing: ' + _activeAlarm.secondsLeft + 's';
      }
      if (_activeAlarm.secondsLeft <= 0) {
        stopAlarm();
      }
    }, 1000);
  }

  // --- Toast Notification Display ---
  function _showBudgetToast(opts) {
    var icon = opts.icon || '';
    var title = opts.title || '';
    var lines = opts.lines || [];
    var type = opts.type || 'warning';
    var duration = opts.duration || 9000;

    var container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    var colorMap = {
      warning:  'var(--warning, #ffc107)',
      critical: '#E8730A',
      danger:   'var(--danger, #dc3545)',
      success:  'var(--success, #198754)',
      info:     'var(--primary, #0d6efd)',
    };
    var borderColor = colorMap[type] || 'var(--primary)';

    var toast = document.createElement('div');
    toast.className = 'toast budget-alert-toast toast-' + type;

    toast.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:0.75rem;width:100%;">' +
        '<div style="flex:1;border-left:4px solid ' + borderColor + ';padding-left:0.85rem;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem;">' +
            '<span style="font-weight:700;font-size:0.92rem;color:var(--text-primary);">' + icon + ' ' + title + '</span>' +
            '<button class="budget-toast-close" title="Dismiss" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.1rem;padding:0;line-height:1;margin-left:0.5rem;">' +
              '<i class="fa-solid fa-xmark"></i>' +
            '</button>' +
          '</div>' +
          '<div style="font-size:0.82rem;color:var(--text-secondary);line-height:1.55;">' +
            lines.map(function(l){ return '<div>' + l + '</div>'; }).join('') +
          '</div>' +
        '</div>' +
      '</div>';

    var closeBtn = toast.querySelector('.budget-toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        toast.classList.remove('show');
        setTimeout(function(){ toast.remove(); }, 350);
      });
    }

    container.appendChild(toast);
    setTimeout(function(){ toast.classList.add('show'); }, 15);
    setTimeout(function(){
      if (toast && toast.parentNode) {
        toast.classList.remove('show');
        setTimeout(function(){ toast.remove(); }, 350);
      }
    }, duration);
  }

  // --- Browser Desktop Notifications ---
  var _notifPermissionRequested = false;
  function _requestNotificationPermission() {
    if (_notifPermissionRequested) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(function(){});
    }
    _notifPermissionRequested = true;
  }

  function _sendBrowserNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification('FinverseAI — ' + title, { body: body, icon: '/favicon.ico' });
    } catch(e) {}
  }

  // --- AI Spending Velocity Prediction ---
  function _aiPredict(budget, transactions) {
    var settings = _getSettings();
    if (!settings.aiPrediction) return null;
    if (!budget || budget.limit <= 0) return null;

    var catTxs = transactions.filter(function(t) {
      return t.type === 'expense' &&
             t.category &&
             t.category.toLowerCase().trim() === budget.category.toLowerCase().trim();
    });

    if (catTxs.length < 2) return null;

    var now = new Date();
    var thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    var recentTxs = catTxs.filter(function(t){ return new Date(t.date) >= thirtyDaysAgo; });
    if (recentTxs.length < 2) return null;

    var totalRecent = recentTxs.reduce(function(s,t){ return s + Number(t.amount || 0); }, 0);
    var dates = recentTxs.map(function(t){ return new Date(t.date).getTime(); });
    var firstDate = new Date(Math.min.apply(null, dates));
    var daysCovered = Math.max(1, Math.round((now - firstDate) / (24 * 60 * 60 * 1000)));
    var dailyAvg = totalRecent / daysCovered;

    if (dailyAvg <= 0) return null;

    var remaining = budget.limit - budget.spent;
    if (remaining <= 0) {
      return {
        willExceed: true,
        daysRemaining: 0,
        dailyAvg: dailyAvg,
        message: 'You have already exceeded your ' + budget.category + ' budget.',
      };
    }

    var daysRemaining = Math.floor(remaining / dailyAvg);
    if (daysRemaining <= 7) {
      var msg = daysRemaining <= 0
        ? 'At your current rate of ' + _fmt(dailyAvg) + '/day, your ' + budget.category + ' budget will be exhausted immediately.'
        : 'At your current spending rate (' + _fmt(dailyAvg) + '/day), your ' + budget.category + ' budget may be exhausted in ~' + daysRemaining + ' day' + (daysRemaining !== 1 ? 's' : '') + '.';
      return { willExceed: true, daysRemaining: daysRemaining, dailyAvg: dailyAvg, message: msg };
    }

    return { willExceed: false, daysRemaining: daysRemaining, dailyAvg: dailyAvg, message: null };
  }

  // --- Main Evaluation Function ---
  async function check(affectedCategory, options) {
    options = options || {};
    var force = Boolean(options.force);
    var addedAmount = options.addedAmount ? Number(options.addedAmount) : null;

    var settings = _getSettings();
    if (!settings.budgetAlerts) return;
    if (!window.finverseAPI) return;

    var budgets = [];
    var transactions = [];
    try {
      var results = await Promise.all([
        window.finverseAPI.getBudgets(),
        window.finverseAPI.getTransactions(),
      ]);
      budgets = Array.isArray(results[0]) ? results[0] : (results[0].data || []);
      transactions = Array.isArray(results[1]) ? results[1] : (results[1].data || []);
    } catch (err) {
      console.warn('[BudgetAlerts] Failed to fetch budgets/transactions:', err);
      return;
    }

    _requestNotificationPermission();

    var toCheck = affectedCategory
      ? budgets.filter(function(b){
          return b.category && b.category.toLowerCase().trim() === affectedCategory.toLowerCase().trim();
        })
      : budgets;

    toCheck.forEach(function(budget) {
      _evaluateBudget(budget, transactions, settings, force, addedAmount);
    });
  }

  function _evaluateBudget(budget, transactions, settings, force, addedAmount) {
    var category   = budget.category;
    var limit      = Number(budget.limit || 0);
    var spent      = Number(budget.spent || 0);
    var remaining  = Number(budget.remaining != null ? budget.remaining : Math.max(0, limit - spent));
    var exceeded   = Number(budget.exceeded != null ? budget.exceeded : Math.max(0, spent - limit));
    var percentage = Number(budget.percentage != null ? budget.percentage : (limit > 0 ? Math.round((spent / limit) * 100) : 0));

    if (!limit || limit <= 0) return;

    var currentTier = 0;
    if (percentage >= THRESHOLD_DANGER) {
      currentTier = 3; // Exceeded / 100%+
    } else if (percentage >= THRESHOLD_CRITICAL) {
      currentTier = 2; // Critical / 80%+
    } else if (percentage >= THRESHOLD_WARNING) {
      currentTier = 1; // Warning / 70%+
    }

    _resetTierIfDropped(category, currentTier, spent);

    // --- TIER 3: BUDGET EXCEEDED (100%+) ---
    if (currentTier === 3) {
      if (_shouldSuppress(category, 3, spent, force)) return;

      _markAlerted(category, 3, spent);
      _addAlertHistory({
        category: category,
        type: 'danger',
        label: 'Budget Exceeded',
        limit: limit,
        spent: spent,
        remaining: 0,
        exceeded: exceeded,
        percentage: percentage,
      });

      var dangerLines = [
        'Budget: <strong>' + _fmt(limit) + '</strong> | Spent: <strong style="color:var(--danger)">' + _fmt(spent) + '</strong> (' + percentage + '%)',
        'Over budget by: <strong style="color:var(--danger)">' + _fmt(exceeded) + '</strong>',
      ];
      if (addedAmount) {
        dangerLines.unshift('Transaction recorded: <strong style="color:var(--danger)">+' + _fmt(addedAmount) + '</strong>');
      }

      _showBudgetToast({
        icon: '🚨',
        title: category + ' — Budget Exceeded!',
        type: 'danger',
        duration: 10000,
        lines: dangerLines,
      });

      _sendBrowserNotification(category + ' — Over Budget!', 'Spent ' + _fmt(spent) + ' of ' + _fmt(limit) + '. Exceeded by ' + _fmt(exceeded) + '.');

      // Trigger 30-Second Alarm!
      _triggerAlarm(
        category,
        'danger',
        category + ' Budget Exceeded (' + percentage + '%)',
        'Spent ' + _fmt(spent) + ' / ' + _fmt(limit) + ' — Over by ' + _fmt(exceeded)
      );
      return;
    }

    // --- TIER 2: 80% CRITICAL WARNING ---
    if (currentTier === 2) {
      if (_shouldSuppress(category, 2, spent, force)) return;

      _markAlerted(category, 2, spent);
      _addAlertHistory({
        category: category,
        type: 'critical',
        label: '80% Critical Warning',
        limit: limit,
        spent: spent,
        remaining: remaining,
        percentage: percentage,
      });

      var critLines = [
        'Used: <strong style="color:#E8730A">' + percentage + '%</strong> of ' + _fmt(limit) + ' budget.',
        'Remaining: <strong style="color:#E8730A">' + _fmt(remaining) + '</strong>',
        'High spending alert: 80% threshold exceeded.',
      ];
      if (addedAmount) {
        critLines.unshift('Transaction recorded: <strong>+' + _fmt(addedAmount) + '</strong>');
      }

      _showBudgetToast({
        icon: '⚠️',
        title: category + ' — 80% Budget Reached!',
        type: 'critical',
        duration: 10000,
        lines: critLines,
      });

      _sendBrowserNotification(category + ' — 80% Budget Reached', 'Only ' + _fmt(remaining) + ' remaining from ' + _fmt(limit) + '.');

      // Trigger 30-Second Alarm!
      _triggerAlarm(
        category,
        'critical',
        category + ' Reached ' + percentage + '% of Budget',
        'Only ' + _fmt(remaining) + ' remaining from ' + _fmt(limit) + ' limit'
      );

      if (settings.aiPrediction) {
        var prediction = _aiPredict(budget, transactions);
        if (prediction && prediction.willExceed && prediction.message) {
          setTimeout(function(){
            _showBudgetToast({
              icon: '🤖',
              title: 'AI Prediction — ' + category,
              type: 'critical',
              duration: 8000,
              lines: [prediction.message],
            });
          }, 1200);
        }
      }
      return;
    }

    // --- TIER 1: 70% WARNING ---
    if (currentTier === 1) {
      if (_shouldSuppress(category, 1, spent, force)) return;

      _markAlerted(category, 1, spent);
      _addAlertHistory({
        category: category,
        type: 'warning',
        label: '70% Warning',
        limit: limit,
        spent: spent,
        remaining: remaining,
        percentage: percentage,
      });

      var warnLines = [
        'Spent: <strong>' + _fmt(spent) + '</strong> of <strong>' + _fmt(limit) + '</strong> (' + percentage + '% used).',
        'Remaining: <strong style="color:var(--warning)">' + _fmt(remaining) + '</strong>',
      ];
      if (addedAmount) {
        warnLines.unshift('Transaction recorded: <strong>+' + _fmt(addedAmount) + '</strong>');
      }

      _showBudgetToast({
        icon: '🔔',
        title: category + ' — Budget Warning',
        type: 'warning',
        duration: 7000,
        lines: warnLines,
      });
    }
  }

  function getAlertHistory() { return _getAlertHistory(); }
  function clearAlertHistory() {
    try { localStorage.removeItem(_alertHistoryKey()); } catch (e) {}
  }
  function getSettings() { return _getSettings(); }

  function resetCategoryState(category) {
    var state = _getAlertState();
    delete state[category];
    _saveAlertState(state);
    if (_activeAlarm.category === category) {
      stopAlarm();
    }
  }

  async function getPredictionForBudget(budget) {
    var settings = _getSettings();
    if (!settings.aiPrediction || !budget || budget.limit <= 0) return null;
    try {
      var res = await window.finverseAPI.getTransactions();
      var transactions = Array.isArray(res) ? res : (res.data || []);
      return _aiPredict(budget, transactions);
    } catch (e) {
      return null;
    }
  }

  function testAlarmChime(type) {
    _triggerAlarm('Test Preview', type || 'danger', 'Professional Alert Chime Preview', 'Previewing smooth banking alert audio');
  }

  window.BudgetAlertEngine = {
    check: check,
    stopAlarm: stopAlarm,
    testAlarmChime: testAlarmChime,
    getAlertHistory: getAlertHistory,
    clearAlertHistory: clearAlertHistory,
    getSettings: getSettings,
    saveSettings: saveSettings,
    resetCategoryState: resetCategoryState,
    getPredictionForBudget: getPredictionForBudget,
    THRESHOLD_WARNING:  THRESHOLD_WARNING,
    THRESHOLD_CRITICAL: THRESHOLD_CRITICAL,
    THRESHOLD_DANGER:   THRESHOLD_DANGER,
  };

})();
