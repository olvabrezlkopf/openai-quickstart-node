<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$user_id = get_current_user_id();
$matches = WM2026_DB::get_upcoming_matches( 50 );
$now     = current_time( 'timestamp' );

$round_labels = array(
    'group' => 'Gruppe', 'ro32' => 'Runde der 32', 'ro16' => 'Achtelfinale',
    'qf' => 'Viertelfinale', 'sf' => 'Halbfinale', 'third' => 'Platz 3', 'final' => 'Finale',
);
?>
<div class="wm2026-wrap">
    <h2>Tipps abgeben</h2>

    <?php if ( empty( $matches ) ) : ?>
        <p class="wm2026-notice">Aktuell keine offenen Spiele zum Tippen.</p>
    <?php else : ?>
        <p>Tippe dein Ergebnis f&uuml;r die kommenden Spiele. Dein Tipp kann bis zum Anpfiff ge&auml;ndert werden.</p>

        <div class="wm2026-tipp-list">
            <?php foreach ( $matches as $m ) :
                $kickoff_ts = strtotime( $m->kickoff );
                $locked = ( $kickoff_ts <= $now );
                $existing_tip = WM2026_DB::get_tip( $user_id, $m->id );
            ?>
            <div class="wm2026-tipp-row <?php echo $locked ? 'wm2026-locked' : ''; ?>" data-match-id="<?php echo esc_attr( $m->id ); ?>">
                <div class="wm2026-tipp-meta">
                    <span class="wm2026-tipp-date"><?php echo esc_html( date( 'd.m. H:i', $kickoff_ts ) ); ?></span>
                    <span class="wm2026-tipp-round">
                        <?php echo esc_html( isset( $round_labels[ $m->round ] ) ? $round_labels[ $m->round ] : $m->round ); ?>
                        <?php if ( $m->group_name ) echo esc_html( $m->group_name ); ?>
                    </span>
                    <?php if ( ! $locked ) : ?>
                        <span class="wm2026-countdown" data-kickoff="<?php echo esc_attr( $m->kickoff ); ?>"></span>
                    <?php endif; ?>
                </div>
                <div class="wm2026-tipp-match">
                    <span class="wm2026-team-name"><?php echo esc_html( $m->home_flag . ' ' . $m->home_name ); ?></span>
                    <div class="wm2026-tipp-inputs">
                        <input type="number" class="wm2026-tip-input wm2026-tip-home" min="0" max="20"
                               value="<?php echo $existing_tip ? esc_attr( $existing_tip->tip_home ) : ''; ?>"
                               <?php echo $locked ? 'disabled' : ''; ?>
                               placeholder="-">
                        <span class="wm2026-colon">:</span>
                        <input type="number" class="wm2026-tip-input wm2026-tip-away" min="0" max="20"
                               value="<?php echo $existing_tip ? esc_attr( $existing_tip->tip_away ) : ''; ?>"
                               <?php echo $locked ? 'disabled' : ''; ?>
                               placeholder="-">
                    </div>
                    <span class="wm2026-team-name"><?php echo esc_html( $m->away_name . ' ' . $m->away_flag ); ?></span>
                </div>
                <div class="wm2026-tipp-status">
                    <?php if ( $locked ) : ?>
                        <span class="wm2026-badge wm2026-badge-locked">Gesperrt</span>
                    <?php elseif ( $existing_tip ) : ?>
                        <span class="wm2026-badge wm2026-badge-saved">Gespeichert</span>
                    <?php else : ?>
                        <span class="wm2026-badge wm2026-badge-open">Offen</span>
                    <?php endif; ?>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
