<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WM2026_Ajax {

    public function __construct() {
        add_action( 'wp_ajax_wm2026_save_tip', array( $this, 'save_tip' ) );
        add_action( 'wp_ajax_wm2026_save_bonus_tip', array( $this, 'save_bonus_tip' ) );
    }

    /**
     * AJAX: Tipp speichern
     */
    public function save_tip() {
        // Security checks
        if ( ! check_ajax_referer( 'wm2026_frontend', 'nonce', false ) ) {
            wp_send_json_error( 'Sicherheitspruefung fehlgeschlagen.' );
        }

        if ( ! is_user_logged_in() ) {
            wp_send_json_error( 'Nicht eingeloggt.' );
        }

        $user_id  = get_current_user_id();
        $match_id = isset( $_POST['match_id'] ) ? absint( $_POST['match_id'] ) : 0;
        $tip_home = isset( $_POST['tip_home'] ) ? absint( $_POST['tip_home'] ) : 0;
        $tip_away = isset( $_POST['tip_away'] ) ? absint( $_POST['tip_away'] ) : 0;

        if ( ! $match_id ) {
            wp_send_json_error( 'Ungueltige Spiel-ID.' );
        }

        // Validate score range
        if ( $tip_home > 20 || $tip_away > 20 ) {
            wp_send_json_error( 'Ungueltiger Tipp.' );
        }

        // Check if match exists and hasn't started yet
        $match = WM2026_DB::get_match( $match_id );
        if ( ! $match ) {
            wp_send_json_error( 'Spiel nicht gefunden.' );
        }

        // Deadline check: kickoff must be in the future
        $kickoff_ts = strtotime( $match->kickoff );
        if ( $kickoff_ts <= current_time( 'timestamp' ) ) {
            wp_send_json_error( 'Tipp-Deadline abgelaufen. Das Spiel hat bereits begonnen.' );
        }

        // Check that match has teams assigned
        if ( ! $match->team_home_id || ! $match->team_away_id ) {
            wp_send_json_error( 'Teams noch nicht zugeordnet.' );
        }

        // Save the tip
        $result = WM2026_DB::save_tip( $user_id, $match_id, $tip_home, $tip_away );

        if ( $result !== false ) {
            wp_send_json_success( 'Tipp gespeichert.' );
        } else {
            wp_send_json_error( 'Fehler beim Speichern.' );
        }
    }

    /**
     * AJAX: Bonus-Tipp speichern
     */
    public function save_bonus_tip() {
        if ( ! check_ajax_referer( 'wm2026_frontend', 'nonce', false ) ) {
            wp_send_json_error( 'Sicherheitspruefung fehlgeschlagen.' );
        }

        if ( ! is_user_logged_in() ) {
            wp_send_json_error( 'Nicht eingeloggt.' );
        }

        $user_id = get_current_user_id();
        $type    = isset( $_POST['type'] ) ? sanitize_text_field( $_POST['type'] ) : '';
        $value   = isset( $_POST['value'] ) ? sanitize_text_field( $_POST['value'] ) : '';

        // Validate type
        if ( ! in_array( $type, array( 'champion', 'top_scorer' ), true ) ) {
            wp_send_json_error( 'Ungueltiger Bonus-Typ.' );
        }

        if ( empty( $value ) ) {
            wp_send_json_error( 'Bitte einen Wert eingeben.' );
        }

        // Check if tournament has started (no bonus tips after first match)
        $upcoming = WM2026_DB::get_upcoming_matches( 1 );
        if ( empty( $upcoming ) ) {
            wp_send_json_error( 'Bonus-Tipps sind nach Turnierbeginn gesperrt.' );
        }

        $result = WM2026_DB::save_bonus_tip( $user_id, $type, $value );

        if ( $result !== false ) {
            wp_send_json_success( 'Bonus-Tipp gespeichert.' );
        } else {
            wp_send_json_error( 'Bonus-Tipp konnte nicht gespeichert werden (evtl. bereits ausgewertet).' );
        }
    }
}
