<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$round_filter = isset( $_GET['wm2026_round'] ) ? sanitize_text_field( $_GET['wm2026_round'] ) : 'group';
$group_filter = isset( $_GET['wm2026_group'] ) ? sanitize_text_field( $_GET['wm2026_group'] ) : '';

$matches = WM2026_DB::get_matches( $round_filter ?: null, $group_filter ?: null );

$round_labels = array(
    'group' => 'Gruppenphase',
    'ro32'  => 'Runde der 32',
    'ro16'  => 'Achtelfinale',
    'qf'    => 'Viertelfinale',
    'sf'    => 'Halbfinale',
    'third' => 'Spiel um Platz 3',
    'final' => 'Finale',
);
?>
<div class="wm2026-wrap">
    <h2>Spielplan</h2>

    <div class="wm2026-tabs">
        <?php foreach ( $round_labels as $key => $label ) : ?>
            <a href="?wm2026_round=<?php echo esc_attr( $key ); ?>"
               class="wm2026-tab <?php echo ( $round_filter === $key ) ? 'wm2026-tab-active' : ''; ?>">
                <?php echo esc_html( $label ); ?>
            </a>
        <?php endforeach; ?>
    </div>

    <?php if ( $round_filter === 'group' ) : ?>
    <div class="wm2026-group-filter">
        <a href="?wm2026_round=group" class="wm2026-tab-small <?php echo empty( $group_filter ) ? 'wm2026-tab-active' : ''; ?>">Alle</a>
        <?php foreach ( range( 'A', 'L' ) as $g ) : ?>
            <a href="?wm2026_round=group&wm2026_group=<?php echo esc_attr( $g ); ?>"
               class="wm2026-tab-small <?php echo ( $group_filter === $g ) ? 'wm2026-tab-active' : ''; ?>">
                <?php echo esc_html( $g ); ?>
            </a>
        <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <?php if ( empty( $matches ) ) : ?>
        <p class="wm2026-notice">Keine Spiele f&uuml;r diesen Filter gefunden.</p>
    <?php else : ?>
    <table class="wm2026-table">
        <thead>
            <tr>
                <th>#</th>
                <th>Datum</th>
                <th>Heim</th>
                <th>Ergebnis</th>
                <th>Gast</th>
                <th class="wm2026-hide-mobile">Stadion</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ( $matches as $m ) : ?>
            <tr class="<?php echo $m->is_finished ? 'wm2026-row-finished' : ''; ?>">
                <td><?php echo esc_html( $m->match_number ); ?></td>
                <td><?php echo esc_html( date( 'd.m. H:i', strtotime( $m->kickoff ) ) ); ?></td>
                <td><?php echo esc_html( $m->home_name ? $m->home_flag . ' ' . $m->home_name : 'TBD' ); ?></td>
                <td class="wm2026-score-cell">
                    <?php if ( $m->is_finished ) : ?>
                        <strong><?php echo esc_html( $m->score_home . ' : ' . $m->score_away ); ?></strong>
                    <?php else : ?>
                        <span class="wm2026-pending">- : -</span>
                    <?php endif; ?>
                </td>
                <td><?php echo esc_html( $m->away_name ? $m->away_name . ' ' . $m->away_flag : 'TBD' ); ?></td>
                <td class="wm2026-hide-mobile"><?php echo esc_html( $m->venue ); ?></td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <?php endif; ?>
</div>
