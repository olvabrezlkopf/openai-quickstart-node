/**
 * WM 2026 Tippspiel - Admin JS
 */
(function($) {
    'use strict';

    $(document).ready(function() {
        // Confirm before saving a result (irreversible point calculation)
        $('button[name="wm2026_save_result"]').on('click', function(e) {
            var home = $('input[name="score_home"]').val();
            var away = $('input[name="score_away"]').val();
            if (!confirm('Ergebnis ' + home + ' : ' + away + ' speichern?\n\nDie Punkte aller Tipps werden neu berechnet.')) {
                e.preventDefault();
            }
        });

        // Confirm bonus evaluation
        $('input[name="evaluate_bonus"]').on('change', function() {
            if (this.checked) {
                if (!confirm('Bonus-Tipps wirklich auswerten? Dies ueberschreibt vorherige Auswertungen.')) {
                    this.checked = false;
                }
            }
        });
    });
})(jQuery);
