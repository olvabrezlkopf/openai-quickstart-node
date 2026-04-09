<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$teams = WM2026_DB::get_teams();
$edit_id = isset( $_GET['edit'] ) ? absint( $_GET['edit'] ) : 0;
$edit_team = $edit_id ? WM2026_DB::get_team( $edit_id ) : null;

if ( isset( $_GET['msg'] ) && $_GET['msg'] === 'team_updated' ) {
    echo '<div class="notice notice-success is-dismissible"><p>Team aktualisiert.</p></div>';
}
?>
<div class="wrap wm2026-admin">
    <h1>Teams verwalten</h1>

    <?php if ( $edit_team ) : ?>
    <h2>Team bearbeiten: <?php echo esc_html( $edit_team->name ); ?></h2>
    <form method="post" action="">
        <?php wp_nonce_field( 'wm2026_update_team' ); ?>
        <input type="hidden" name="team_id" value="<?php echo esc_attr( $edit_team->id ); ?>">
        <table class="form-table">
            <tr>
                <th>Name</th>
                <td><input type="text" name="team_name" value="<?php echo esc_attr( $edit_team->name ); ?>" class="regular-text" required></td>
            </tr>
            <tr>
                <th>FIFA-Code</th>
                <td><input type="text" name="team_code" value="<?php echo esc_attr( $edit_team->code ); ?>" maxlength="3" class="small-text" required></td>
            </tr>
            <tr>
                <th>Flagge (Emoji)</th>
                <td><input type="text" name="team_flag" value="<?php echo esc_attr( $edit_team->flag ); ?>" class="small-text"></td>
            </tr>
            <tr>
                <th>Gruppe</th>
                <td><input type="text" name="group_name" value="<?php echo esc_attr( $edit_team->group_name ); ?>" maxlength="1" class="small-text" required></td>
            </tr>
        </table>
        <p class="submit">
            <button type="submit" name="wm2026_update_team" class="button button-primary">Speichern</button>
            <a href="<?php echo esc_url( admin_url( 'admin.php?page=wm2026-teams' ) ); ?>" class="button">Abbrechen</a>
        </p>
    </form>
    <hr>
    <?php endif; ?>

    <table class="widefat striped">
        <thead>
            <tr>
                <th>Gruppe</th>
                <th>Flagge</th>
                <th>Name</th>
                <th>Code</th>
                <th>Aktion</th>
            </tr>
        </thead>
        <tbody>
            <?php
            $current_group = '';
            foreach ( $teams as $team ) :
                if ( $team->group_name !== $current_group ) {
                    $current_group = $team->group_name;
                }
            ?>
            <tr>
                <td><strong>Gruppe <?php echo esc_html( $team->group_name ); ?></strong></td>
                <td><?php echo esc_html( $team->flag ); ?></td>
                <td><?php echo esc_html( $team->name ); ?></td>
                <td><?php echo esc_html( $team->code ); ?></td>
                <td>
                    <a href="<?php echo esc_url( admin_url( 'admin.php?page=wm2026-teams&edit=' . $team->id ) ); ?>" class="button button-small">Bearbeiten</a>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>
