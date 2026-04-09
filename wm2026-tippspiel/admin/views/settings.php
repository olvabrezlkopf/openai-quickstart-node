<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$champion  = get_option( 'wm2026_bonus_champion', '' );
$topscorer = get_option( 'wm2026_bonus_topscorer', '' );

if ( isset( $_GET['msg'] ) && $_GET['msg'] === 'settings_saved' ) {
    echo '<div class="notice notice-success is-dismissible"><p>Einstellungen gespeichert.</p></div>';
}
?>
<div class="wrap wm2026-admin">
    <h1>Einstellungen</h1>

    <form method="post">
        <?php wp_nonce_field( 'wm2026_save_settings' ); ?>

        <h2>Bonus-Tipps auswerten</h2>
        <p>Trage hier die richtigen Antworten ein, um die Bonus-Tipps aller Teilnehmer auszuwerten (je 10 Punkte).</p>

        <table class="form-table">
            <tr>
                <th>Weltmeister</th>
                <td>
                    <input type="text" name="bonus_champion" value="<?php echo esc_attr( $champion ); ?>" class="regular-text" placeholder="z.B. Deutschland">
                    <p class="description">Name des Teams, das die WM gewonnen hat.</p>
                </td>
            </tr>
            <tr>
                <th>Torsch&uuml;tzenk&ouml;nig</th>
                <td>
                    <input type="text" name="bonus_topscorer" value="<?php echo esc_attr( $topscorer ); ?>" class="regular-text" placeholder="z.B. Kylian Mbappe">
                    <p class="description">Name des Torsch&uuml;tzenk&ouml;nigs.</p>
                </td>
            </tr>
            <tr>
                <th>Auswertung starten</th>
                <td>
                    <label>
                        <input type="checkbox" name="evaluate_bonus" value="1">
                        Bonus-Tipps jetzt auswerten (setzt Punkte f&uuml;r alle Teilnehmer)
                    </label>
                    <p class="description"><strong>Achtung:</strong> Dies &uuml;berschreibt vorherige Bonus-Auswertungen.</p>
                </td>
            </tr>
        </table>

        <h2>Punkteregeln</h2>
        <table class="widefat" style="max-width: 400px;">
            <tbody>
                <tr><td>Exaktes Ergebnis</td><td><strong>4 Punkte</strong></td></tr>
                <tr><td>Richtige Tordifferenz</td><td><strong>3 Punkte</strong></td></tr>
                <tr><td>Richtige Tendenz</td><td><strong>2 Punkte</strong></td></tr>
                <tr><td>Falsch</td><td><strong>0 Punkte</strong></td></tr>
                <tr><td>Bonus (Weltmeister / Torsch&uuml;tzenk&ouml;nig)</td><td><strong>10 Punkte</strong></td></tr>
            </tbody>
        </table>
        <p class="description">Die Punkteregeln sind fest im Plugin hinterlegt.</p>

        <p class="submit">
            <button type="submit" name="wm2026_save_settings" class="button button-primary">Einstellungen speichern</button>
        </p>
    </form>
</div>
