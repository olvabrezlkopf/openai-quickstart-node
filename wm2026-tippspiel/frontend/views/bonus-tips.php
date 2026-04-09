<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$user_id    = get_current_user_id();
$bonus_tips = WM2026_DB::get_bonus_tips( $user_id );
$teams      = WM2026_DB::get_teams();

$champion_tip  = null;
$topscorer_tip = null;

foreach ( $bonus_tips as $bt ) {
    if ( $bt->type === 'champion' )   $champion_tip  = $bt;
    if ( $bt->type === 'top_scorer' ) $topscorer_tip = $bt;
}

// Check if first match has started (bonus tips locked after tournament start)
$first_match = WM2026_DB::get_upcoming_matches( 1 );
$tournament_started = empty( $first_match );
?>
<div class="wm2026-wrap">
    <h2>Bonus-Tipps</h2>

    <p>Tippe den Weltmeister und den Torsch&uuml;tzenk&ouml;nig. Jeder richtige Bonus-Tipp bringt <strong>10 Punkte</strong>!</p>
    <p class="wm2026-notice-info">Bonus-Tipps k&ouml;nnen nur vor dem ersten Spiel ge&auml;ndert werden.</p>

    <div class="wm2026-bonus-cards">
        <!-- Weltmeister -->
        <div class="wm2026-bonus-card">
            <h3>&#127942; Weltmeister</h3>
            <?php if ( $champion_tip && $champion_tip->points !== null ) : ?>
                <div class="wm2026-bonus-result">
                    <p>Dein Tipp: <strong><?php echo esc_html( $champion_tip->value ); ?></strong></p>
                    <span class="wm2026-points-badge wm2026-pts-<?php echo $champion_tip->points > 0 ? '4' : '0'; ?>">
                        <?php echo esc_html( $champion_tip->points ); ?> Punkte
                    </span>
                </div>
            <?php elseif ( $tournament_started && $champion_tip ) : ?>
                <p>Dein Tipp: <strong><?php echo esc_html( $champion_tip->value ); ?></strong></p>
                <p class="wm2026-notice">Gesperrt &ndash; Turnier hat begonnen.</p>
            <?php else : ?>
                <div class="wm2026-bonus-form" data-type="champion">
                    <select class="wm2026-bonus-select">
                        <option value="">-- Team w&auml;hlen --</option>
                        <?php foreach ( $teams as $t ) : ?>
                            <option value="<?php echo esc_attr( $t->name ); ?>" <?php echo ( $champion_tip && $champion_tip->value === $t->name ) ? 'selected' : ''; ?>>
                                <?php echo esc_html( $t->flag . ' ' . $t->name ); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <button class="wm2026-btn wm2026-bonus-save" <?php echo $tournament_started ? 'disabled' : ''; ?>>Speichern</button>
                    <?php if ( $champion_tip ) : ?>
                        <span class="wm2026-badge wm2026-badge-saved">Gespeichert: <?php echo esc_html( $champion_tip->value ); ?></span>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>

        <!-- Torschuetzenkoenig -->
        <div class="wm2026-bonus-card">
            <h3>&#9917; Torsch&uuml;tzenk&ouml;nig</h3>
            <?php if ( $topscorer_tip && $topscorer_tip->points !== null ) : ?>
                <div class="wm2026-bonus-result">
                    <p>Dein Tipp: <strong><?php echo esc_html( $topscorer_tip->value ); ?></strong></p>
                    <span class="wm2026-points-badge wm2026-pts-<?php echo $topscorer_tip->points > 0 ? '4' : '0'; ?>">
                        <?php echo esc_html( $topscorer_tip->points ); ?> Punkte
                    </span>
                </div>
            <?php elseif ( $tournament_started && $topscorer_tip ) : ?>
                <p>Dein Tipp: <strong><?php echo esc_html( $topscorer_tip->value ); ?></strong></p>
                <p class="wm2026-notice">Gesperrt &ndash; Turnier hat begonnen.</p>
            <?php else : ?>
                <div class="wm2026-bonus-form" data-type="top_scorer">
                    <input type="text" class="wm2026-bonus-input" placeholder="Spieler-Name eingeben"
                           value="<?php echo $topscorer_tip ? esc_attr( $topscorer_tip->value ) : ''; ?>">
                    <button class="wm2026-btn wm2026-bonus-save" <?php echo $tournament_started ? 'disabled' : ''; ?>>Speichern</button>
                    <?php if ( $topscorer_tip ) : ?>
                        <span class="wm2026-badge wm2026-badge-saved">Gespeichert: <?php echo esc_html( $topscorer_tip->value ); ?></span>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>
