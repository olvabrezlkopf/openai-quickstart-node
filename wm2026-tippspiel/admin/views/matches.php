<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$round_filter = isset( $_GET['round'] ) ? sanitize_text_field( $_GET['round'] ) : '';
$group_filter = isset( $_GET['group'] ) ? sanitize_text_field( $_GET['group'] ) : '';
$matches = WM2026_DB::get_matches( $round_filter ?: null, $group_filter ?: null );
$all_teams = WM2026_DB::get_teams();

$edit_id = isset( $_GET['edit'] ) ? absint( $_GET['edit'] ) : 0;
$result_id = isset( $_GET['result'] ) ? absint( $_GET['result'] ) : 0;

if ( isset( $_GET['msg'] ) ) {
    $msgs = array(
        'result_saved' => 'Ergebnis gespeichert und Punkte berechnet.',
        'match_updated' => 'Spiel aktualisiert.',
    );
    $msg_key = sanitize_text_field( $_GET['msg'] );
    if ( isset( $msgs[ $msg_key ] ) ) {
        echo '<div class="notice notice-success is-dismissible"><p>' . esc_html( $msgs[ $msg_key ] ) . '</p></div>';
    }
}

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
<div class="wrap wm2026-admin">
    <h1>Spielplan verwalten</h1>

    <!-- Filter -->
    <div class="wm2026-filter-bar">
        <form method="get">
            <input type="hidden" name="page" value="wm2026-matches">
            <label>Runde:
                <select name="round">
                    <option value="">Alle</option>
                    <?php foreach ( $round_labels as $key => $label ) : ?>
                        <option value="<?php echo esc_attr( $key ); ?>" <?php selected( $round_filter, $key ); ?>><?php echo esc_html( $label ); ?></option>
                    <?php endforeach; ?>
                </select>
            </label>
            <label>Gruppe:
                <select name="group">
                    <option value="">Alle</option>
                    <?php foreach ( range( 'A', 'L' ) as $g ) : ?>
                        <option value="<?php echo esc_attr( $g ); ?>" <?php selected( $group_filter, $g ); ?>>Gruppe <?php echo esc_html( $g ); ?></option>
                    <?php endforeach; ?>
                </select>
            </label>
            <button type="submit" class="button">Filtern</button>
            <a href="<?php echo esc_url( admin_url( 'admin.php?page=wm2026-matches' ) ); ?>" class="button">Zur&uuml;cksetzen</a>
        </form>
    </div>

    <?php if ( $result_id ) :
        $result_match = WM2026_DB::get_match( $result_id );
        if ( $result_match ) :
    ?>
    <div class="wm2026-result-form">
        <h2>Ergebnis eintragen: <?php echo esc_html( ( $result_match->home_name ?: 'TBD' ) . ' vs ' . ( $result_match->away_name ?: 'TBD' ) ); ?></h2>
        <form method="post">
            <?php wp_nonce_field( 'wm2026_save_result' ); ?>
            <input type="hidden" name="match_id" value="<?php echo esc_attr( $result_match->id ); ?>">
            <div class="wm2026-result-inputs">
                <span><?php echo esc_html( $result_match->home_flag . ' ' . $result_match->home_name ); ?></span>
                <input type="number" name="score_home" min="0" max="20" value="<?php echo esc_attr( $result_match->score_home ?? '' ); ?>" required class="small-text">
                <span>:</span>
                <input type="number" name="score_away" min="0" max="20" value="<?php echo esc_attr( $result_match->score_away ?? '' ); ?>" required class="small-text">
                <span><?php echo esc_html( $result_match->away_name . ' ' . $result_match->away_flag ); ?></span>
            </div>
            <p class="submit">
                <button type="submit" name="wm2026_save_result" class="button button-primary">Ergebnis speichern</button>
                <a href="<?php echo esc_url( admin_url( 'admin.php?page=wm2026-matches' ) ); ?>" class="button">Abbrechen</a>
            </p>
        </form>
    </div>
    <hr>
    <?php endif; endif; ?>

    <?php if ( $edit_id ) :
        $edit_match = WM2026_DB::get_match( $edit_id );
        if ( $edit_match ) :
    ?>
    <div class="wm2026-edit-form">
        <h2>Spiel #<?php echo esc_html( $edit_match->match_number ); ?> bearbeiten</h2>
        <form method="post">
            <?php wp_nonce_field( 'wm2026_update_match' ); ?>
            <input type="hidden" name="match_id" value="<?php echo esc_attr( $edit_match->id ); ?>">
            <table class="form-table">
                <tr>
                    <th>Heimteam</th>
                    <td>
                        <select name="team_home_id">
                            <option value="0">-- TBD --</option>
                            <?php foreach ( $all_teams as $t ) : ?>
                                <option value="<?php echo esc_attr( $t->id ); ?>" <?php selected( $edit_match->team_home_id, $t->id ); ?>><?php echo esc_html( $t->flag . ' ' . $t->name ); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Gastteam</th>
                    <td>
                        <select name="team_away_id">
                            <option value="0">-- TBD --</option>
                            <?php foreach ( $all_teams as $t ) : ?>
                                <option value="<?php echo esc_attr( $t->id ); ?>" <?php selected( $edit_match->team_away_id, $t->id ); ?>><?php echo esc_html( $t->flag . ' ' . $t->name ); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th>Anstosszeit</th>
                    <td><input type="datetime-local" name="kickoff" value="<?php echo esc_attr( date( 'Y-m-d\TH:i', strtotime( $edit_match->kickoff ) ) ); ?>" required></td>
                </tr>
                <tr>
                    <th>Stadion</th>
                    <td><input type="text" name="venue" value="<?php echo esc_attr( $edit_match->venue ); ?>" class="regular-text"></td>
                </tr>
            </table>
            <p class="submit">
                <button type="submit" name="wm2026_update_match" class="button button-primary">Speichern</button>
                <a href="<?php echo esc_url( admin_url( 'admin.php?page=wm2026-matches' ) ); ?>" class="button">Abbrechen</a>
            </p>
        </form>
    </div>
    <hr>
    <?php endif; endif; ?>

    <table class="widefat striped">
        <thead>
            <tr>
                <th>#</th>
                <th>Anstoss</th>
                <th>Runde</th>
                <th>Heim</th>
                <th>Ergebnis</th>
                <th>Gast</th>
                <th>Stadion</th>
                <th>Aktionen</th>
            </tr>
        </thead>
        <tbody>
            <?php foreach ( $matches as $m ) : ?>
            <tr class="<?php echo $m->is_finished ? 'wm2026-finished' : ''; ?>">
                <td><?php echo esc_html( $m->match_number ); ?></td>
                <td><?php echo esc_html( date( 'd.m.Y H:i', strtotime( $m->kickoff ) ) ); ?></td>
                <td>
                    <?php
                    echo esc_html( isset( $round_labels[ $m->round ] ) ? $round_labels[ $m->round ] : $m->round );
                    if ( $m->group_name ) echo ' ' . esc_html( $m->group_name );
                    ?>
                </td>
                <td><?php echo esc_html( $m->home_name ? $m->home_flag . ' ' . $m->home_name : 'TBD' ); ?></td>
                <td class="wm2026-score">
                    <?php if ( $m->is_finished ) : ?>
                        <strong><?php echo esc_html( $m->score_home . ' : ' . $m->score_away ); ?></strong>
                    <?php else : ?>
                        <span class="wm2026-pending">- : -</span>
                    <?php endif; ?>
                </td>
                <td><?php echo esc_html( $m->away_name ? $m->away_name . ' ' . $m->away_flag : 'TBD' ); ?></td>
                <td><?php echo esc_html( $m->venue ); ?></td>
                <td>
                    <a href="<?php echo esc_url( admin_url( 'admin.php?page=wm2026-matches&edit=' . $m->id ) ); ?>" class="button button-small" title="Bearbeiten">&#9998;</a>
                    <?php if ( $m->team_home_id && $m->team_away_id ) : ?>
                        <a href="<?php echo esc_url( admin_url( 'admin.php?page=wm2026-matches&result=' . $m->id ) ); ?>" class="button button-small button-primary" title="Ergebnis eintragen">&#9917;</a>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>
