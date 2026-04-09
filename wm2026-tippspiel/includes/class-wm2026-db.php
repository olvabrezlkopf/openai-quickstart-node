<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WM2026_DB {

    private static function prefix() {
        global $wpdb;
        return $wpdb->prefix . 'wm2026_';
    }

    // ---- Teams ----

    public static function get_teams( $group = null ) {
        global $wpdb;
        $table = self::prefix() . 'teams';
        if ( $group ) {
            return $wpdb->get_results( $wpdb->prepare(
                "SELECT * FROM {$table} WHERE group_name = %s ORDER BY name",
                $group
            ) );
        }
        return $wpdb->get_results( "SELECT * FROM {$table} ORDER BY group_name, name" );
    }

    public static function get_team( $id ) {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM " . self::prefix() . "teams WHERE id = %d",
            $id
        ) );
    }

    public static function update_team( $id, $data ) {
        global $wpdb;
        return $wpdb->update( self::prefix() . 'teams', $data, array( 'id' => $id ) );
    }

    // ---- Matches ----

    public static function get_matches( $round = null, $group = null ) {
        global $wpdb;
        $table = self::prefix() . 'matches';
        $teams = self::prefix() . 'teams';

        $where = '1=1';
        $params = array();

        if ( $round ) {
            $where .= ' AND m.round = %s';
            $params[] = $round;
        }
        if ( $group ) {
            $where .= ' AND m.group_name = %s';
            $params[] = $group;
        }

        $sql = "SELECT m.*,
                    th.name AS home_name, th.code AS home_code, th.flag AS home_flag,
                    ta.name AS away_name, ta.code AS away_code, ta.flag AS away_flag
                FROM {$table} m
                LEFT JOIN {$teams} th ON m.team_home_id = th.id
                LEFT JOIN {$teams} ta ON m.team_away_id = ta.id
                WHERE {$where}
                ORDER BY m.kickoff ASC, m.match_number ASC";

        if ( ! empty( $params ) ) {
            $sql = $wpdb->prepare( $sql, $params );
        }

        return $wpdb->get_results( $sql );
    }

    public static function get_match( $id ) {
        global $wpdb;
        $table = self::prefix() . 'matches';
        $teams = self::prefix() . 'teams';

        return $wpdb->get_row( $wpdb->prepare(
            "SELECT m.*,
                th.name AS home_name, th.code AS home_code, th.flag AS home_flag,
                ta.name AS away_name, ta.code AS away_code, ta.flag AS away_flag
            FROM {$table} m
            LEFT JOIN {$teams} th ON m.team_home_id = th.id
            LEFT JOIN {$teams} ta ON m.team_away_id = ta.id
            WHERE m.id = %d",
            $id
        ) );
    }

    public static function get_upcoming_matches( $limit = 10 ) {
        global $wpdb;
        $table = self::prefix() . 'matches';
        $teams = self::prefix() . 'teams';

        return $wpdb->get_results( $wpdb->prepare(
            "SELECT m.*,
                th.name AS home_name, th.code AS home_code, th.flag AS home_flag,
                ta.name AS away_name, ta.code AS away_code, ta.flag AS away_flag
            FROM {$table} m
            LEFT JOIN {$teams} th ON m.team_home_id = th.id
            LEFT JOIN {$teams} ta ON m.team_away_id = ta.id
            WHERE m.is_finished = 0 AND m.team_home_id IS NOT NULL
            ORDER BY m.kickoff ASC
            LIMIT %d",
            $limit
        ) );
    }

    public static function save_result( $match_id, $score_home, $score_away ) {
        global $wpdb;
        return $wpdb->update(
            self::prefix() . 'matches',
            array(
                'score_home'  => $score_home,
                'score_away'  => $score_away,
                'is_finished' => 1,
            ),
            array( 'id' => $match_id ),
            array( '%d', '%d', '%d' ),
            array( '%d' )
        );
    }

    public static function update_match( $id, $data ) {
        global $wpdb;
        return $wpdb->update( self::prefix() . 'matches', $data, array( 'id' => $id ) );
    }

    // ---- Tips ----

    public static function get_user_tips( $user_id, $round = null ) {
        global $wpdb;
        $tips    = self::prefix() . 'tips';
        $matches = self::prefix() . 'matches';
        $teams   = self::prefix() . 'teams';

        $where  = 't.user_id = %d';
        $params = array( $user_id );

        if ( $round ) {
            $where .= ' AND m.round = %s';
            $params[] = $round;
        }

        return $wpdb->get_results( $wpdb->prepare(
            "SELECT t.*, m.kickoff, m.round, m.score_home, m.score_away, m.is_finished,
                    m.match_number, m.group_name,
                    th.name AS home_name, th.flag AS home_flag,
                    ta.name AS away_name, ta.flag AS away_flag
             FROM {$tips} t
             JOIN {$matches} m ON t.match_id = m.id
             LEFT JOIN {$teams} th ON m.team_home_id = th.id
             LEFT JOIN {$teams} ta ON m.team_away_id = ta.id
             WHERE {$where}
             ORDER BY m.kickoff ASC",
            $params
        ) );
    }

    public static function get_tip( $user_id, $match_id ) {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM " . self::prefix() . "tips WHERE user_id = %d AND match_id = %d",
            $user_id,
            $match_id
        ) );
    }

    public static function save_tip( $user_id, $match_id, $tip_home, $tip_away ) {
        global $wpdb;
        $table = self::prefix() . 'tips';
        $now   = current_time( 'mysql' );

        $existing = self::get_tip( $user_id, $match_id );

        if ( $existing ) {
            return $wpdb->update(
                $table,
                array(
                    'tip_home'   => $tip_home,
                    'tip_away'   => $tip_away,
                    'updated_at' => $now,
                ),
                array( 'id' => $existing->id ),
                array( '%d', '%d', '%s' ),
                array( '%d' )
            );
        }

        return $wpdb->insert( $table, array(
            'user_id'    => $user_id,
            'match_id'   => $match_id,
            'tip_home'   => $tip_home,
            'tip_away'   => $tip_away,
            'created_at' => $now,
            'updated_at' => $now,
        ) );
    }

    public static function get_tips_for_match( $match_id ) {
        global $wpdb;
        return $wpdb->get_results( $wpdb->prepare(
            "SELECT t.*, u.display_name
             FROM " . self::prefix() . "tips t
             JOIN {$wpdb->users} u ON t.user_id = u.ID
             WHERE t.match_id = %d
             ORDER BY u.display_name",
            $match_id
        ) );
    }

    // ---- Bonus Tips ----

    public static function get_bonus_tips( $user_id ) {
        global $wpdb;
        return $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM " . self::prefix() . "bonus_tips WHERE user_id = %d",
            $user_id
        ) );
    }

    public static function save_bonus_tip( $user_id, $type, $value ) {
        global $wpdb;
        $table = self::prefix() . 'bonus_tips';
        $now   = current_time( 'mysql' );

        $existing = $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$table} WHERE user_id = %d AND type = %s",
            $user_id,
            $type
        ) );

        if ( $existing ) {
            if ( $existing->points !== null ) {
                return false; // Already evaluated, can't change
            }
            return $wpdb->update(
                $table,
                array( 'value' => $value, 'created_at' => $now ),
                array( 'id' => $existing->id ),
                array( '%s', '%s' ),
                array( '%d' )
            );
        }

        return $wpdb->insert( $table, array(
            'user_id'    => $user_id,
            'type'       => $type,
            'value'      => $value,
            'created_at' => $now,
        ) );
    }

    // ---- Rankings ----

    public static function get_rankings() {
        global $wpdb;
        $table = self::prefix() . 'rankings';
        return $wpdb->get_results(
            "SELECT r.*, u.display_name
             FROM {$table} r
             JOIN {$wpdb->users} u ON r.user_id = u.ID
             ORDER BY r.total_points DESC, r.exact_count DESC, r.diff_count DESC"
        );
    }

    public static function get_user_rank( $user_id ) {
        global $wpdb;
        return $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM " . self::prefix() . "rankings WHERE user_id = %d",
            $user_id
        ) );
    }

    // ---- Stats ----

    public static function get_participant_count() {
        global $wpdb;
        return (int) $wpdb->get_var(
            "SELECT COUNT(DISTINCT user_id) FROM " . self::prefix() . "tips"
        );
    }

    public static function get_finished_match_count() {
        global $wpdb;
        return (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM " . self::prefix() . "matches WHERE is_finished = 1"
        );
    }

    public static function get_total_match_count() {
        global $wpdb;
        return (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM " . self::prefix() . "matches"
        );
    }

    public static function get_total_tips_count() {
        global $wpdb;
        return (int) $wpdb->get_var(
            "SELECT COUNT(*) FROM " . self::prefix() . "tips"
        );
    }
}
