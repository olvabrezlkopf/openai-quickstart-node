/**
 * WM 2026 Tippspiel - Frontend JS
 */
(function($) {
    'use strict';

    $(document).ready(function() {

        // --- Tipp speichern (auto-save on blur) ---
        var saveTimeout = {};

        $('.wm2026-tipp-row').on('change', '.wm2026-tip-input', function() {
            var $row    = $(this).closest('.wm2026-tipp-row');
            var matchId = $row.data('match-id');
            var tipHome = $row.find('.wm2026-tip-home').val();
            var tipAway = $row.find('.wm2026-tip-away').val();

            if (tipHome === '' || tipAway === '') {
                return; // Wait until both fields are filled
            }

            // Debounce save
            clearTimeout(saveTimeout[matchId]);
            saveTimeout[matchId] = setTimeout(function() {
                saveTip(matchId, tipHome, tipAway, $row);
            }, 300);
        });

        function saveTip(matchId, tipHome, tipAway, $row) {
            var $status = $row.find('.wm2026-tipp-status');
            $status.html('<span class="wm2026-badge" style="background:#e3f2fd;color:#1565c0;">Speichert...</span>');

            $.ajax({
                url: wm2026Ajax.url,
                type: 'POST',
                data: {
                    action: 'wm2026_save_tip',
                    nonce: wm2026Ajax.nonce,
                    match_id: matchId,
                    tip_home: tipHome,
                    tip_away: tipAway
                },
                success: function(response) {
                    if (response.success) {
                        $status.html('<span class="wm2026-badge wm2026-badge-saved">Gespeichert</span>');
                    } else {
                        $status.html('<span class="wm2026-badge" style="background:#ffcdd2;color:#c62828;">' + (response.data || 'Fehler') + '</span>');
                    }
                },
                error: function() {
                    $status.html('<span class="wm2026-badge" style="background:#ffcdd2;color:#c62828;">Netzwerkfehler</span>');
                }
            });
        }

        // --- Bonus-Tipp speichern ---
        $('.wm2026-bonus-save').on('click', function() {
            var $form = $(this).closest('.wm2026-bonus-form');
            var type  = $form.data('type');
            var value = $form.find('.wm2026-bonus-select, .wm2026-bonus-input').val();
            var $btn  = $(this);

            if (!value || !value.trim()) {
                alert('Bitte einen Wert eingeben/auswaehlen.');
                return;
            }

            $btn.prop('disabled', true).text('Speichert...');

            $.ajax({
                url: wm2026Ajax.url,
                type: 'POST',
                data: {
                    action: 'wm2026_save_bonus_tip',
                    nonce: wm2026Ajax.nonce,
                    type: type,
                    value: value.trim()
                },
                success: function(response) {
                    $btn.prop('disabled', false).text('Speichern');
                    if (response.success) {
                        // Show saved badge
                        $form.find('.wm2026-badge').remove();
                        $form.append('<span class="wm2026-badge wm2026-badge-saved">Gespeichert: ' + $('<span>').text(value).html() + '</span>');
                    } else {
                        alert(response.data || 'Fehler beim Speichern.');
                    }
                },
                error: function() {
                    $btn.prop('disabled', false).text('Speichern');
                    alert('Netzwerkfehler. Bitte erneut versuchen.');
                }
            });
        });

        // --- Countdown Timer ---
        function updateCountdowns() {
            $('.wm2026-countdown').each(function() {
                var $el = $(this);
                var kickoff = new Date($el.data('kickoff')).getTime();
                var now = Date.now();
                var diff = kickoff - now;

                if (diff <= 0) {
                    $el.text('Gesperrt');
                    $el.closest('.wm2026-tipp-row').addClass('wm2026-locked');
                    $el.closest('.wm2026-tipp-row').find('.wm2026-tip-input').prop('disabled', true);
                    return;
                }

                var days  = Math.floor(diff / 86400000);
                var hours = Math.floor((diff % 86400000) / 3600000);
                var mins  = Math.floor((diff % 3600000) / 60000);

                var parts = [];
                if (days > 0)  parts.push(days + 'T');
                if (hours > 0) parts.push(hours + 'h');
                parts.push(mins + 'min');

                $el.text('Noch ' + parts.join(' '));
            });
        }

        updateCountdowns();
        setInterval(updateCountdowns, 60000); // Update every minute
    });

})(jQuery);
