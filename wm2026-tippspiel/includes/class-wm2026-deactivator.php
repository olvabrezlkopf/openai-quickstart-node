<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WM2026_Deactivator {
    public static function deactivate() {
        // Nothing to do on deactivation (tables stay intact).
        // Full cleanup happens in uninstall.php.
    }
}
