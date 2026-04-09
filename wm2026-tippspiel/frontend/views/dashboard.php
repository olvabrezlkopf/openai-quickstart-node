<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$rankings = WM2026_DB::get_rankings();
$upcoming = WM2026_DB::get_upcoming_matches( 6 );
$finished = WM2026_DB::get_finished_match_count();
$total    = WM2026_DB::get_total_match_count();

$round_labels = array(
    'group' => 'Gruppe', 'ro32' => 'Runde der 32', 'ro16' => 'Achtelfinale',
    'qf' => 'Viertelfinale', 'sf' => 'Halbfinale', 'third' => 'Platz 3', 'final' => 'Finale',
);
?>
<div class="wm2026-wrap">
    <h2>WM 2026 Tippspiel</h2>

    <div class="wm2026-progress">
        <div class="wm2026-progress-bar" style="width: <?php echo $total > 0 ? round( $finished / $total * 100 ) : 0; ?>%"></div>
        <span><?php echo esc_html( $finished ); ?> / <?php echo esc_html( $total ); ?> Spiele gespielt</span>
    </div>

    <?php if ( ! empty( $upcoming ) ) : ?>
    <h3>N&auml;chste Spiele</h3>
    <div class="wm2026-match-cards">
        <?php foreach ( $upcoming as $m ) : ?>
        <div class="wm2026-match-card">
            <div class="wm2026-match-meta">
                <?php echo esc_html( date( 'd.m. H:i', strtotime( $m->kickoff ) ) ); ?>
                &middot; <?php echo esc_html( isset( $round_labels[ $m->round ] ) ? $round_labels[ $m->round ] : $m->round ); ?>
                <?php if ( $m->group_name ) echo esc_html( ' ' . $m->group_name ); ?>
            </div>
            <div class="wm2026-match-teams">
                <span class="wm2026-team"><?php echo esc_html( $m->home_flag . ' ' . $m->home_name ); ?></span>
                <span class="wm2026-vs">vs</span>
                <span class="wm2026-team"><?php echo esc_html( $m->away_name . ' ' . $m->away_flag ); ?></span>
            </div>
            <div class="wm2026-match-venue"><?php echo esc_html( $m->venue ); ?></div>
        </div>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <?php if ( ! empty( $rankings ) ) : ?>
    <h3>Rangliste</h3>
    <table class="wm2026-table">
        <thead>
            <tr>
                <th>#</th>
                <th>Spieler</th>
                <th>Punkte</th>
                <th class="wm2026-hide-mobile">Exakt</th>
                <th class="wm2026-hide-mobile">Diff.</th>
                <th class="wm2026-hide-mobile">Tend.</th>
            </tr>
        </thead>
        <tbody>
            <?php
            $current_user_id = get_current_user_id();
            foreach ( array_slice( $rankings, 0, 20 ) as $r ) :
                $is_me = ( (int) $r->user_id === $current_user_id );
            ?>
            <tr class="<?php echo $is_me ? 'wm2026-highlight' : ''; ?>">
                <td><strong><?php echo esc_html( $r->rank_pos ); ?></strong></td>
                <td><?php echo esc_html( $r->display_name ); ?><?php if ( $is_me ) echo ' <em>(Du)</em>'; ?></td>
                <td><strong><?php echo esc_html( $r->total_points ); ?></strong></td>
                <td class="wm2026-hide-mobile"><?php echo esc_html( $r->exact_count ); ?></td>
                <td class="wm2026-hide-mobile"><?php echo esc_html( $r->diff_count ); ?></td>
                <td class="wm2026-hide-mobile"><?php echo esc_html( $r->trend_count ); ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>
