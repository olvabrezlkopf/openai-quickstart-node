<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class WM2026_Scoring {

    /**
     * Berechnet Punkte fuer einen einzelnen Tipp.
     *
     * 4 = Exaktes Ergebnis
     * 3 = Richtige Tordifferenz
     * 2 = Richtige Tendenz (Sieg/Unentschieden/Niederlage)
     * 0 = Falsch
     */
    public static function calculate_points( $tip_home, $tip_away, $score_home, $score_away ) {
        // Exakt
        if ( (int) $tip_home === (int) $score_home && (int) $tip_away === (int) $score_away ) {
            return 4;
        }

        $tip_diff   = (int) $tip_home - (int) $tip_away;
        $score_diff = (int) $score_home - (int) $score_away;

        // Richtige Tordifferenz (und gleiche Tendenz)
        if ( $tip_diff === $score_diff ) {
            return 3;
        }

        // Richtige Tendenz
        $tip_sign   = ( $tip_diff > 0 ) ? 1 : ( ( $tip_diff < 0 ) ? -1 : 0 );
        $score_sign = ( $score_diff > 0 ) ? 1 : ( ( $score_diff < 0 ) ? -1 : 0 );

        if ( $tip_sign === $score_sign ) {
            return 2;
        }

        return 0;
    }

    /**
     * Berechnet Punkte fuer alle Tipps eines Spiels neu.
     * Wird aufgerufen, wenn der Admin ein Ergebnis eintraegt.
     */
    public static function recalculate_match( $match_id ) {
        global $wpdb;
        $prefix = $wpdb->prefix . 'wm2026_';

        $match = WM2026_DB::get_match( $match_id );
        if ( ! $match || ! $match->is_finished ) {
            return;
        }

        $tips = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM {$prefix}tips WHERE match_id = %d",
            $match_id
        ) );

        foreach ( $tips as $tip ) {
            $points = self::calculate_points(
                $tip->tip_home, $tip->tip_away,
                $match->score_home, $match->score_away
            );

            $wpdb->update(
                $prefix . 'tips',
                array( 'points' => $points ),
                array( 'id' => $tip->id ),
                array( '%d' ),
                array( '%d' )
            );
        }

        self::rebuild_rankings();
    }

    /**
     * Baut die Rangliste komplett neu auf.
     */
    public static function rebuild_rankings() {
        global $wpdb;
        $prefix = $wpdb->prefix . 'wm2026_';
        $now    = current_time( 'mysql' );

        // Get all users who have tips
        $users = $wpdb->get_col( "SELECT DISTINCT user_id FROM {$prefix}tips" );

        // Clear rankings
        $wpdb->query( "DELETE FROM {$prefix}rankings" );

        foreach ( $users as $user_id ) {
            $stats = $wpdb->get_row( $wpdb->prepare(
                "SELECT
                    COALESCE(SUM(points), 0) AS total_points,
                    SUM(CASE WHEN points = 4 THEN 1 ELSE 0 END) AS exact_count,
                    SUM(CASE WHEN points = 3 THEN 1 ELSE 0 END) AS diff_count,
                    SUM(CASE WHEN points = 2 THEN 1 ELSE 0 END) AS trend_count
                 FROM {$prefix}tips
                 WHERE user_id = %d AND points IS NOT NULL",
                $user_id
            ) );

            // Bonus points
            $bonus = (int) $wpdb->get_var( $wpdb->prepare(
                "SELECT COALESCE(SUM(points), 0) FROM {$prefix}bonus_tips
                 WHERE user_id = %d AND points IS NOT NULL",
                $user_id
            ) );

            $total = (int) $stats->total_points + $bonus;

            $wpdb->replace( $prefix . 'rankings', array(
                'user_id'      => $user_id,
                'total_points' => $total,
                'exact_count'  => (int) $stats->exact_count,
                'diff_count'   => (int) $stats->diff_count,
                'trend_count'  => (int) $stats->trend_count,
                'bonus_points' => $bonus,
                'rank_pos'     => 0,
                'updated_at'   => $now,
            ) );
        }

        // Update rank positions
        $ranked = $wpdb->get_results(
            "SELECT user_id, total_points, exact_count
             FROM {$prefix}rankings
             ORDER BY total_points DESC, exact_count DESC, diff_count DESC"
        );

        $pos = 1;
        $prev_points = null;
        $prev_exact  = null;
        $skip = 0;

        foreach ( $ranked as $i => $row ) {
            if ( $row->total_points === $prev_points && $row->exact_count === $prev_exact ) {
                $skip++;
            } else {
                $pos = $i + 1;
                $skip = 0;
            }

            $wpdb->update(
                $prefix . 'rankings',
                array( 'rank_pos' => $pos ),
                array( 'user_id' => $row->user_id ),
                array( '%d' ),
                array( '%d' )
            );

            $prev_points = $row->total_points;
            $prev_exact  = $row->exact_count;
        }
    }

    /**
     * Wertet Bonus-Tipps aus.
     * Admin setzt die richtigen Antworten via Options.
     */
    public static function evaluate_bonus_tips() {
        global $wpdb;
        $prefix = $wpdb->prefix . 'wm2026_';

        $champion  = get_option( 'wm2026_bonus_champion', '' );
        $topscorer = get_option( 'wm2026_bonus_topscorer', '' );

        if ( $champion ) {
            $wpdb->query( $wpdb->prepare(
                "UPDATE {$prefix}bonus_tips SET points = 0 WHERE type = 'champion' AND points IS NULL"
            ) );
            $wpdb->query( $wpdb->prepare(
                "UPDATE {$prefix}bonus_tips SET points = 10
                 WHERE type = 'champion' AND LOWER(TRIM(value)) = LOWER(TRIM(%s))",
                $champion
            ) );
        }

        if ( $topscorer ) {
            $wpdb->query( $wpdb->prepare(
                "UPDATE {$prefix}bonus_tips SET points = 0 WHERE type = 'top_scorer' AND points IS NULL"
            ) );
            $wpdb->query( $wpdb->prepare(
                "UPDATE {$prefix}bonus_tips SET points = 10
                 WHERE type = 'top_scorer' AND LOWER(TRIM(value)) = LOWER(TRIM(%s))",
                $topscorer
            ) );
        }

        self::rebuild_rankings();
    }
}
