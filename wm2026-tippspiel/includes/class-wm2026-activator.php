<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WM2026_Activator {

    public static function activate() {
        self::create_tables();
        self::seed_data();
        update_option( 'wm2026_db_version', WM2026_VERSION );
    }

    private static function create_tables() {
        global $wpdb;
        $charset = $wpdb->get_charset_collate();
        $prefix  = $wpdb->prefix . 'wm2026_';

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        // Teams
        dbDelta( "CREATE TABLE {$prefix}teams (
            id INT NOT NULL AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL,
            code VARCHAR(3) NOT NULL,
            flag VARCHAR(10) DEFAULT '',
            group_name CHAR(1) NOT NULL,
            PRIMARY KEY (id)
        ) {$charset};" );

        // Matches
        dbDelta( "CREATE TABLE {$prefix}matches (
            id INT NOT NULL AUTO_INCREMENT,
            team_home_id INT DEFAULT NULL,
            team_away_id INT DEFAULT NULL,
            group_name CHAR(1) DEFAULT NULL,
            round VARCHAR(20) NOT NULL,
            match_number INT NOT NULL,
            kickoff DATETIME NOT NULL,
            venue VARCHAR(100) DEFAULT '',
            score_home TINYINT DEFAULT NULL,
            score_away TINYINT DEFAULT NULL,
            is_finished TINYINT NOT NULL DEFAULT 0,
            PRIMARY KEY (id),
            KEY round_idx (round),
            KEY kickoff_idx (kickoff)
        ) {$charset};" );

        // Tips
        dbDelta( "CREATE TABLE {$prefix}tips (
            id INT NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            match_id INT NOT NULL,
            tip_home TINYINT NOT NULL,
            tip_away TINYINT NOT NULL,
            points TINYINT DEFAULT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY user_match (user_id, match_id),
            KEY match_idx (match_id)
        ) {$charset};" );

        // Bonus tips
        dbDelta( "CREATE TABLE {$prefix}bonus_tips (
            id INT NOT NULL AUTO_INCREMENT,
            user_id BIGINT UNSIGNED NOT NULL,
            type VARCHAR(20) NOT NULL,
            value VARCHAR(100) NOT NULL,
            points TINYINT DEFAULT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY user_type (user_id, type)
        ) {$charset};" );

        // Rankings
        dbDelta( "CREATE TABLE {$prefix}rankings (
            user_id BIGINT UNSIGNED NOT NULL,
            total_points INT NOT NULL DEFAULT 0,
            exact_count INT NOT NULL DEFAULT 0,
            diff_count INT NOT NULL DEFAULT 0,
            trend_count INT NOT NULL DEFAULT 0,
            bonus_points INT NOT NULL DEFAULT 0,
            rank_pos INT NOT NULL DEFAULT 0,
            updated_at DATETIME NOT NULL,
            PRIMARY KEY (user_id)
        ) {$charset};" );
    }

    private static function seed_data() {
        global $wpdb;
        $prefix = $wpdb->prefix . 'wm2026_';

        // Only seed if tables are empty
        $count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$prefix}teams" );
        if ( $count > 0 ) {
            return;
        }

        $teams = include WM2026_PLUGIN_DIR . 'includes/data/teams-and-groups.php';
        $team_ids = array();

        foreach ( $teams as $team ) {
            $wpdb->insert( $prefix . 'teams', array(
                'name'       => $team['name'],
                'code'       => $team['code'],
                'flag'       => $team['flag'],
                'group_name' => $team['group'],
            ) );
            $team_ids[ $team['code'] ] = $wpdb->insert_id;
        }

        $matches = include WM2026_PLUGIN_DIR . 'includes/data/match-schedule.php';

        foreach ( $matches as $match ) {
            $home_id = isset( $match['home'] ) && isset( $team_ids[ $match['home'] ] )
                ? $team_ids[ $match['home'] ] : null;
            $away_id = isset( $match['away'] ) && isset( $team_ids[ $match['away'] ] )
                ? $team_ids[ $match['away'] ] : null;

            $wpdb->insert( $prefix . 'matches', array(
                'team_home_id' => $home_id,
                'team_away_id' => $away_id,
                'group_name'   => isset( $match['group'] ) ? $match['group'] : null,
                'round'        => $match['round'],
                'match_number' => $match['match_number'],
                'kickoff'      => $match['kickoff'],
                'venue'        => isset( $match['venue'] ) ? $match['venue'] : '',
            ) );
        }
    }
}
