<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$rankings = WM2026_DB::get_rankings();
$view_user = isset( $_GET['user'] ) ? absint( $_GET['user'] ) : 0;
?>
<div class="wrap wm2026-admin">
    <h1>Rangliste &amp; Tipps</h1>

    <?php if ( $view_user ) :
        $user_info = get_userdata( $view_user );
        $user_tips = WM2026_DB::get_user_tips( $view_user );
        if ( $user_info ) :
    ?>
    <h2>Tipps von <?php echo esc_html( $user_info->display_name ); ?></h2>
    <p><a href="<?php echo esc_url( admin_url( 'admin.php?page=wm2026-results' ) ); ?>" class="button">&larr; Zur&uuml;ck zur Rangliste</a></p>

    <table class="widefat striped">
        <thead>
            <tr>
                <th>#</th>
                <th>Spiel</th>
                <th>Tipp</th>
                <th>Ergebnis</th>
                <th>Punkte</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ( $user_tips as $tip ) : ?>
            <tr>
                <td><?php echo esc_html( $tip->match_number ); ?></td>
                <td><?php echo esc_html( $tip->home_flag . ' ' . $tip->home_name . ' vs ' . $tip->away_name . ' ' . $tip->away_flag ); ?></td>
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
                        <span class="wm2026-points wm2026-points-<?php echo esc_attr( $tip->points ); ?>"><?php echo esc_html( $tip->points ); ?></span>
                    <?php else : ?>
                        &ndash;
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>

    <?php else : ?>

    <?php if ( empty( $rankings ) ) : ?>
        <p>Noch keine Tipps abgegeben.</p>
    <?php else : ?>
    <table class="widefat striped">
        <thead>
            <tr>
                <th>Platz</th>
                <th>Spieler</th>
                <th>Punkte</th>
                <th>Exakt (4P)</th>
                <th>Differenz (3P)</th>
                <th>Tendenz (2P)</th>
                <th>Bonus</th>
                <th>Aktion</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ( $rankings as $r ) : ?>
            <tr>
                <td><strong><?php echo esc_html( $r->rank_pos ); ?></strong></td>
                <td><?php echo esc_html( $r->display_name ); ?></td>
                <td><strong><?php echo esc_html( $r->total_points ); ?></strong></td>
                <td><?php echo esc_html( $r->exact_count ); ?></td>
                <td><?php echo esc_html( $r->diff_count ); ?></td>
                <td><?php echo esc_html( $r->trend_count ); ?></td>
                <td><?php echo esc_html( $r->bonus_points ); ?></td>
                <td>
                    <a href="<?php echo esc_url( admin_url( 'admin.php?page=wm2026-results&user=' . $r->user_id ) ); ?>" class="button button-small">Tipps ansehen</a>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>

    <?php endif; ?>
</div>
