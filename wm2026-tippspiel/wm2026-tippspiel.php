<?php
/**
 * Plugin Name: WM 2026 Tippspiel
 * Plugin URI:  https://github.com/olvabrezlkopf/openai-quickstart-node
 * Description: Internes FIFA WM 2026 Tippspiel fuer die Firma. Tippe alle 104 Spiele und werde Tippkoenig!
 * Version:     1.0.0
 * Author:      Firma Intern
 * Text Domain: wm2026-tippspiel
 * License:     GPL v2 or later
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'WM2026_VERSION', '1.0.0' );
define( 'WM2026_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WM2026_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'WM2026_PLUGIN_FILE', __FILE__ );

// Include classes
require_once WM2026_PLUGIN_DIR . 'includes/class-wm2026-activator.php';
require_once WM2026_PLUGIN_DIR . 'includes/class-wm2026-deactivator.php';
require_once WM2026_PLUGIN_DIR . 'includes/class-wm2026-db.php';
require_once WM2026_PLUGIN_DIR . 'includes/class-wm2026-scoring.php';
require_once WM2026_PLUGIN_DIR . 'includes/class-wm2026-admin.php';
require_once WM2026_PLUGIN_DIR . 'includes/class-wm2026-frontend.php';
require_once WM2026_PLUGIN_DIR . 'includes/class-wm2026-ajax.php';

// Activation & Deactivation
register_activation_hook( __FILE__, array( 'WM2026_Activator', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'WM2026_Deactivator', 'deactivate' ) );

// Initialize plugin
add_action( 'plugins_loaded', 'wm2026_init' );

function wm2026_init() {
    if ( is_admin() ) {
        new WM2026_Admin();
    }
    new WM2026_Frontend();
    new WM2026_Ajax();
}
