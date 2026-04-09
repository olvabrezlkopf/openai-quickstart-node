<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$user_id = get_current_user_id();
$tips    = WM2026_DB::get_user_tips( $user_id );
$rank    = WM2026_DB::get_user_rank( $user_id );

$round_labels = array(
    'group' => 'Gruppe', 'ro32' => 'Runde der 32', 'ro16' => 'Achtelfinale',
    'qf' => 'Viertelfinale', 'sf' => 'Halbfinale', 'third' => 'Platz 3', 'final' => 'Finale',
);
?>
<div class="wm2026-wrap">
    <h2>Meine Tipps</h2>

    <?php if ( $rank ) : ?>
    <div class="wm2026-my-stats">
        <div class="wm2026-my-stat">
            <strong><?php echo esc_html( $rank->rank_pos ); ?>.</strong> Platz
        </div>
        <div class="wm2026-my-stat">
            <strong><?php echo esc_html( $rank->total_points ); ?></strong> Punkte
        </div>
        <div class="wm2026-my-stat">
            <strong><?php echo esc_html( $rank->exact_count ); ?></strong> Exakt
        </div>
    </div>
    <?php endif; ?>

    <?php if ( empty( $tips ) ) : ?>
        <p class="wm2026-notice">Du hast noch keine Tipps abgegeben.</p>
    <?php else : ?>
    <table class="wm2026-table">
        <thead>
            <tr>
                <th>#</th>
                <th>Spiel</th>
                <th>Dein Tipp</th>
                <th>Ergebnis</th>
                <th>Punkte</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ( $tips as $tip ) : ?>
            <tr>
                <td><?php echo esc_html( $tip->match_number ); ?></td>
                <td>
                    <?php echo esc_html( $tip->home_flag . ' ' . $tip->home_name ); ?>
                    <span class="wm2026-vs-small">vs</span>
                    <?php echo esc_html( $tip->away_name . ' ' . $tip->away_flag ); ?>
                </td>
                <td><strong><?php echo esc_html( $tip->tip_home . ' : ' . $tip->tip_away ); ?></strong></td>
                <td>
                    <?php if ( $tip->is_finished ) : ?>
                        <?php echo esc_html( $tip->score_home . ' : ' . $tip->score_away ); ?>
                    <?php else : ?>
                        <em>offen</em>
                    <?php endif; ?>
                </td>
                <td>
                    <?php if ( $tip->points !== null ) : ?>
                        <span class="wm2026-points-badge wm2026-pts-<?php echo esc_attr( $tip->points ); ?>"><?php echo esc_html( $tip->points ); ?></span>
                    <?php else : ?>
                        &ndash;
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>
