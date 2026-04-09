<?php
/**
 * Fired when the plugin is uninstalled.
 * Removes all database tables created by the plugin.
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
    exit;
}

global $wpdb;

$tables = array(
    $wpdb->prefix . 'wm2026_rankings',
    $wpdb->prefix . 'wm2026_bonus_tips',
    $wpdb->prefix . 'wm2026_tips',
    $wpdb->prefix . 'wm2026_matches',
    $wpdb->prefix . 'wm2026_teams',
);

foreach ( $tables as $table ) {
    $wpdb->query( "DROP TABLE IF EXISTS {$table}" );
}

delete_option( 'wm2026_db_version' );
delete_option( 'wm2026_bonus_champion' );
delete_option( 'wm2026_bonus_topscorer' );
