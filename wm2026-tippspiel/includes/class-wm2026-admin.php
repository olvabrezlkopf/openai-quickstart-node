<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WM2026_Admin {

    public function __construct() {
        add_action( 'admin_menu', array( $this, 'add_menu' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
        add_action( 'admin_init', array( $this, 'handle_actions' ) );
    }

    public function add_menu() {
        add_menu_page(
            'WM 2026 Tippspiel',
            'WM 2026 Tippspiel',
            'manage_options',
            'wm2026-dashboard',
            array( $this, 'page_dashboard' ),
            'dashicons-flag',
            30
        );

        add_submenu_page(
            'wm2026-dashboard',
            'Dashboard',
            'Dashboard',
            'manage_options',
            'wm2026-dashboard',
            array( $this, 'page_dashboard' )
        );

        add_submenu_page(
            'wm2026-dashboard',
            'Teams',
            'Teams',
            'manage_options',
            'wm2026-teams',
            array( $this, 'page_teams' )
        );

        add_submenu_page(
            'wm2026-dashboard',
            'Spielplan',
            'Spielplan',
            'manage_options',
            'wm2026-matches',
            array( $this, 'page_matches' )
        );

        add_submenu_page(
            'wm2026-dashboard',
            'Rangliste',
            'Rangliste',
            'manage_options',
            'wm2026-results',
            array( $this, 'page_results' )
        );

        add_submenu_page(
            'wm2026-dashboard',
            'Einstellungen',
            'Einstellungen',
            'manage_options',
            'wm2026-settings',
            array( $this, 'page_settings' )
        );
    }

    public function enqueue_assets( $hook ) {
        if ( strpos( $hook, 'wm2026' ) === false ) {
            return;
        }
        wp_enqueue_style( 'wm2026-admin', WM2026_PLUGIN_URL . 'admin/css/admin.css', array(), WM2026_VERSION );
        wp_enqueue_script( 'wm2026-admin', WM2026_PLUGIN_URL . 'admin/js/admin.js', array( 'jquery' ), WM2026_VERSION, true );
    }

    public function handle_actions() {
        if ( ! current_user_can( 'manage_options' ) ) {
            return;
        }

        // Save match result
        if ( isset( $_POST['wm2026_save_result'] ) && check_admin_referer( 'wm2026_save_result' ) ) {
            $match_id   = absint( $_POST['match_id'] );
            $score_home = absint( $_POST['score_home'] );
            $score_away = absint( $_POST['score_away'] );

            WM2026_DB::save_result( $match_id, $score_home, $score_away );
            WM2026_Scoring::recalculate_match( $match_id );

            wp_redirect( admin_url( 'admin.php?page=wm2026-matches&msg=result_saved' ) );
            exit;
        }

        // Update match details (teams, kickoff, venue)
        if ( isset( $_POST['wm2026_update_match'] ) && check_admin_referer( 'wm2026_update_match' ) ) {
            $match_id = absint( $_POST['match_id'] );
            $data = array(
                'team_home_id' => absint( $_POST['team_home_id'] ) ?: null,
                'team_away_id' => absint( $_POST['team_away_id'] ) ?: null,
                'kickoff'      => sanitize_text_field( $_POST['kickoff'] ),
                'venue'        => sanitize_text_field( $_POST['venue'] ),
            );
            WM2026_DB::update_match( $match_id, $data );

            wp_redirect( admin_url( 'admin.php?page=wm2026-matches&msg=match_updated' ) );
            exit;
        }

        // Update team
        if ( isset( $_POST['wm2026_update_team'] ) && check_admin_referer( 'wm2026_update_team' ) ) {
            $team_id = absint( $_POST['team_id'] );
            $data = array(
                'name'       => sanitize_text_field( $_POST['team_name'] ),
                'code'       => strtoupper( sanitize_text_field( $_POST['team_code'] ) ),
                'flag'       => sanitize_text_field( $_POST['team_flag'] ),
                'group_name' => strtoupper( sanitize_text_field( $_POST['group_name'] ) ),
            );
            WM2026_DB::update_team( $team_id, $data );

            wp_redirect( admin_url( 'admin.php?page=wm2026-teams&msg=team_updated' ) );
            exit;
        }

        // Save settings (bonus tips evaluation)
        if ( isset( $_POST['wm2026_save_settings'] ) && check_admin_referer( 'wm2026_save_settings' ) ) {
            update_option( 'wm2026_bonus_champion', sanitize_text_field( $_POST['bonus_champion'] ) );
            update_option( 'wm2026_bonus_topscorer', sanitize_text_field( $_POST['bonus_topscorer'] ) );

            if ( ! empty( $_POST['evaluate_bonus'] ) ) {
                WM2026_Scoring::evaluate_bonus_tips();
            }

            wp_redirect( admin_url( 'admin.php?page=wm2026-settings&msg=settings_saved' ) );
            exit;
        }
    }

    public function page_dashboard() {
        include WM2026_PLUGIN_DIR . 'admin/views/dashboard.php';
    }

    public function page_teams() {
        include WM2026_PLUGIN_DIR . 'admin/views/teams.php';
    }

    public function page_matches() {
        include WM2026_PLUGIN_DIR . 'admin/views/matches.php';
    }

    public function page_results() {
        include WM2026_PLUGIN_DIR . 'admin/views/results.php';
    }

    public function page_settings() {
        include WM2026_PLUGIN_DIR . 'admin/views/settings.php';
    }
}
