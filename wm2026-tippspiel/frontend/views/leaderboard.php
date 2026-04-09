<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$rankings = WM2026_DB::get_rankings();
$current_user_id = get_current_user_id();
?>
<div class="wm2026-wrap">
    <h2>Rangliste</h2>

    <?php if ( empty( $rankings ) ) : ?>
        <p class="wm2026-notice">Noch keine Tipps abgegeben &ndash; die Rangliste ist leer.</p>
    <?php else : ?>
    <table class="wm2026-table wm2026-leaderboard">
        <thead>
            <tr>
                <th>Platz</th>
                <th>Spieler</th>
                <th>Punkte</th>
                <th>Exakt (4P)</th>
                <th>Differenz (3P)</th>
                <th>Tendenz (2P)</th>
                <th class="wm2026-hide-mobile">Bonus</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ( $rankings as $r ) :
                $is_me = ( (int) $r->user_id === $current_user_id );
            ?>
            <tr class="<?php echo $is_me ? 'wm2026-highlight' : ''; ?>">
                <td>
                    <?php if ( $r->rank_pos <= 3 ) : ?>
                        <span class="wm2026-medal wm2026-medal-<?php echo esc_attr( $r->rank_pos ); ?>">
                            <?php echo $r->rank_pos === '1' || $r->rank_pos === 1 ? '&#129351;' : ( $r->rank_pos == 2 ? '&#129352;' : '&#129353;' ); ?>
                        </span>
                    <?php else : ?>
                        <?php echo esc_html( $r->rank_pos ); ?>
                    <?php endif; ?>
                </td>
                <td><?php echo esc_html( $r->display_name ); ?><?php if ( $is_me ) echo ' <em>(Du)</em>'; ?></td>
                <td><strong><?php echo esc_html( $r->total_points ); ?></strong></td>
                <td><?php echo esc_html( $r->exact_count ); ?></td>
                <td><?php echo esc_html( $r->diff_count ); ?></td>
                <td><?php echo esc_html( $r->trend_count ); ?></td>
                <td class="wm2026-hide-mobile"><?php echo esc_html( $r->bonus_points ); ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>
