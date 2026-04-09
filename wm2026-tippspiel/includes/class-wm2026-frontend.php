<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WM2026_Frontend {

    public function __construct() {
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
        add_shortcode( 'wm2026_dashboard', array( $this, 'shortcode_dashboard' ) );
        add_shortcode( 'wm2026_tipps', array( $this, 'shortcode_tipps' ) );
        add_shortcode( 'wm2026_meine_tipps', array( $this, 'shortcode_meine_tipps' ) );
        add_shortcode( 'wm2026_rangliste', array( $this, 'shortcode_rangliste' ) );
        add_shortcode( 'wm2026_spielplan', array( $this, 'shortcode_spielplan' ) );
        add_shortcode( 'wm2026_bonus', array( $this, 'shortcode_bonus' ) );
    }

    public function enqueue_assets() {
        wp_enqueue_style( 'wm2026-frontend', WM2026_PLUGIN_URL . 'frontend/css/frontend.css', array(), WM2026_VERSION );
        wp_enqueue_script( 'wm2026-frontend', WM2026_PLUGIN_URL . 'frontend/js/frontend.js', array( 'jquery' ), WM2026_VERSION, true );
        wp_localize_script( 'wm2026-frontend', 'wm2026Ajax', array(
            'url'   => admin_url( 'admin-ajax.php' ),
            'nonce' => wp_create_nonce( 'wm2026_frontend' ),
        ) );
    }

    private function login_notice() {
        return '<div class="wm2026-notice">Bitte <a href="' . esc_url( wp_login_url( get_permalink() ) ) . '">einloggen</a>, um am Tippspiel teilzunehmen.</div>';
    }

    public function shortcode_dashboard() {
        ob_start();
        include WM2026_PLUGIN_DIR . 'frontend/views/dashboard.php';
        return ob_get_clean();
    }

    public function shortcode_tipps() {
        if ( ! is_user_logged_in() ) {
            return $this->login_notice();
        }
        ob_start();
        include WM2026_PLUGIN_DIR . 'frontend/views/tipp-form.php';
        return ob_get_clean();
    }

    public function shortcode_meine_tipps() {
        if ( ! is_user_logged_in() ) {
            return $this->login_notice();
        }
        ob_start();
        include WM2026_PLUGIN_DIR . 'frontend/views/my-tips.php';
        return ob_get_clean();
    }

    public function shortcode_rangliste() {
        ob_start();
        include WM2026_PLUGIN_DIR . 'frontend/views/leaderboard.php';
        return ob_get_clean();
    }

    public function shortcode_spielplan() {
        ob_start();
        include WM2026_PLUGIN_DIR . 'frontend/views/schedule.php';
        return ob_get_clean();
    }

    public function shortcode_bonus() {
        if ( ! is_user_logged_in() ) {
            return $this->login_notice();
        }
        ob_start();
        include WM2026_PLUGIN_DIR . 'frontend/views/bonus-tips.php';
        return ob_get_clean();
    }
}
