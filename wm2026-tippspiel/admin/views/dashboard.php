<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$participants   = WM2026_DB::get_participant_count();
$finished       = WM2026_DB::get_finished_match_count();
$total_matches  = WM2026_DB::get_total_match_count();
$total_tips     = WM2026_DB::get_total_tips_count();
$top_rankings   = WM2026_DB::get_rankings();
$upcoming       = WM2026_DB::get_upcoming_matches( 5 );
?>
<div class="wrap wm2026-admin">
    <h1>WM 2026 Tippspiel &mdash; Dashboard</h1>

    <div class="wm2026-stats-grid">
        <div class="wm2026-stat-card">
            <span class="wm2026-stat-number"><?php echo esc_html( $participants ); ?></span>
            <span class="wm2026-stat-label">Teilnehmer</span>
        </div>
        <div class="wm2026-stat-card">
            <span class="wm2026-stat-number"><?php echo esc_html( $finished ); ?> / <?php echo esc_html( $total_matches ); ?></span>
            <span class="wm2026-stat-label">Spiele gespielt</span>
        </div>
        <div class="wm2026-stat-card">
            <span class="wm2026-stat-number"><?php echo esc_html( $total_tips ); ?></span>
            <span class="wm2026-stat-label">Tipps abgegeben</span>
        </div>
    </div>

    <?php if ( ! empty( $top_rankings ) ) : ?>
    <h2>Top 10 Rangliste</h2>
    <table class="widefat striped">
        <thead>
            <tr>
                <th>#</th>
                <th>Spieler</th>
                <th>Punkte</th>
                <th>Exakt (4P)</th>
                <th>Differenz (3P)</th>
                <th>Tendenz (2P)</th>
                <th>Bonus</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ( array_slice( $top_rankings, 0, 10 ) as $r ) : ?>
            <tr>
                <td><strong><?php echo esc_html( $r->rank_pos ); ?></strong></td>
                <td><?php echo esc_html( $r->display_name ); ?></td>
                <td><strong><?php echo esc_html( $r->total_points ); ?></strong></td>
                <td><?php echo esc_html( $r->exact_count ); ?></td>
                <td><?php echo esc_html( $r->diff_count ); ?></td>
                <td><?php echo esc_html( $r->trend_count ); ?></td>
                <td><?php echo esc_html( $r->bonus_points ); ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>

    <?php if ( ! empty( $upcoming ) ) : ?>
    <h2>N&auml;chste Spiele</h2>
    <table class="widefat striped">
        <thead>
            <tr>
                <th>#</th>
                <th>Anstoss</th>
                <th>Heim</th>
                <th></th>
                <th>Gast</th>
                <th>Runde</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ( $upcoming as $m ) : ?>
            <tr>
                <td><?php echo esc_html( $m->match_number ); ?></td>
                <td><?php echo esc_html( date( 'd.m.Y H:i', strtotime( $m->kickoff ) ) ); ?></td>
                <td><?php echo esc_html( $m->home_flag . ' ' . $m->home_name ); ?></td>
                <td>vs</td>
                <td><?php echo esc_html( $m->away_flag . ' ' . $m->away_name ); ?></td>
                <td><?php echo esc_html( $m->round ); ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>
