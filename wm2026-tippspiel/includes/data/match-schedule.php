<?php
/**
 * WM 2026 Spielplan (104 Spiele)
 *
 * Gruppenphase: 72 Spiele (6 pro Gruppe, 12 Gruppen)
 * Round of 32: 16 Spiele
 * Achtelfinale: 8 Spiele
 * Viertelfinale: 4 Spiele
 * Halbfinale: 2 Spiele
 * Spiel um Platz 3: 1 Spiel
 * Finale: 1 Spiel
 *
 * Kickoff-Zeiten sind Platzhalter und koennen vom Admin angepasst werden.
 * KO-Runden haben keine Teams zugewiesen (werden vom Admin nachgetragen).
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$matches = array();
$mn = 1; // match_number counter

// Helper: generate 6 group matches for a group of 4 teams
// Teams: [T1, T2, T3, T4]
// Matchday 1: T1-T2, T3-T4
// Matchday 2: T1-T3, T2-T4
// Matchday 3: T1-T4, T2-T3

$groups = array(
    'A' => array( 'USA', 'MAR', 'SCO', 'ARG' ),
    'B' => array( 'FRA', 'DEN', 'COL', 'BHR' ),
    'C' => array( 'BRA', 'AUS', 'TUN', 'NGA' ),
    'D' => array( 'JPN', 'IDN', 'CRO', 'PAR' ),
    'E' => array( 'ENG', 'ESP', 'ECU', 'CHI' ),
    'F' => array( 'MEX', 'URU', 'BOL', 'ITA' ),
    'G' => array( 'GER', 'CMR', 'KOR', 'SRB' ),
    'H' => array( 'POR', 'IRN', 'CIV', 'PAN' ),
    'I' => array( 'NED', 'SEN', 'QAT', 'CAN' ),
    'J' => array( 'BEL', 'SUI', 'VEN', 'EGY' ),
    'K' => array( 'AUT', 'CRC', 'WAL', 'PER' ),
    'L' => array( 'GHA', 'UKR', 'NZL', 'KSA' ),
);

// Group stage dates: June 11 - June 28, 2026
// Spread matches across the days
$group_start = '2026-06-11';
$matchday_pairings = array(
    array( array( 0, 1 ), array( 2, 3 ) ), // MD1: T1-T2, T3-T4
    array( array( 0, 2 ), array( 1, 3 ) ), // MD2: T1-T3, T2-T4
    array( array( 0, 3 ), array( 1, 2 ) ), // MD3: T1-T4, T2-T3
);

// Venues by group
$venues = array(
    'A' => 'MetLife Stadium, New York/New Jersey',
    'B' => 'SoFi Stadium, Los Angeles',
    'C' => 'AT&T Stadium, Dallas',
    'D' => 'NRG Stadium, Houston',
    'E' => 'Lincoln Financial Field, Philadelphia',
    'F' => 'Estadio Azteca, Mexico City',
    'G' => 'Hard Rock Stadium, Miami',
    'H' => 'Lumen Field, Seattle',
    'I' => 'BMO Field, Toronto',
    'J' => 'Mercedes-Benz Stadium, Atlanta',
    'K' => 'Arrowhead Stadium, Kansas City',
    'L' => 'BC Place, Vancouver',
);

$day_offset = 0;
$group_index = 0;

foreach ( $groups as $group_name => $teams ) {
    foreach ( $matchday_pairings as $md_index => $pairings ) {
        // Each matchday is spaced ~6 days apart for each group
        $date = date( 'Y-m-d', strtotime( $group_start . ' +' . ( $group_index + $md_index * 6 ) . ' days' ) );
        $times = array( '18:00:00', '21:00:00' );

        foreach ( $pairings as $p_index => $pair ) {
            $matches[] = array(
                'home'         => $teams[ $pair[0] ],
                'away'         => $teams[ $pair[1] ],
                'group'        => $group_name,
                'round'        => 'group',
                'match_number' => $mn++,
                'kickoff'      => $date . ' ' . $times[ $p_index ],
                'venue'        => $venues[ $group_name ],
            );
        }
    }
    $group_index++;
}

// --- KO-Phase ---
// Round of 32: July 1-4, 2026 (16 Spiele)
$ko_dates = array(
    'ro32' => array(
        'start' => '2026-07-01',
        'count' => 16,
        'per_day' => 4,
    ),
    'ro16' => array(
        'start' => '2026-07-05',
        'count' => 8,
        'per_day' => 4,
    ),
    'qf' => array(
        'start' => '2026-07-09',
        'count' => 4,
        'per_day' => 2,
    ),
    'sf' => array(
        'start' => '2026-07-13',
        'count' => 2,
        'per_day' => 2,
    ),
    'third' => array(
        'start' => '2026-07-18',
        'count' => 1,
        'per_day' => 1,
    ),
    'final' => array(
        'start' => '2026-07-19',
        'count' => 1,
        'per_day' => 1,
    ),
);

$ko_venues = array(
    'ro32'  => 'TBD',
    'ro16'  => 'TBD',
    'qf'    => 'TBD',
    'sf'    => 'TBD',
    'third' => 'MetLife Stadium, New York/New Jersey',
    'final' => 'MetLife Stadium, New York/New Jersey',
);

$round_labels = array(
    'ro32'  => 'Round of 32',
    'ro16'  => 'Achtelfinale',
    'qf'    => 'Viertelfinale',
    'sf'    => 'Halbfinale',
    'third' => 'Spiel um Platz 3',
    'final' => 'Finale',
);

foreach ( $ko_dates as $round => $config ) {
    $times = array( '16:00:00', '18:00:00', '20:00:00', '22:00:00' );
    $day = 0;
    $slot = 0;

    for ( $i = 0; $i < $config['count']; $i++ ) {
        $date = date( 'Y-m-d', strtotime( $config['start'] . ' +' . $day . ' days' ) );
        $matches[] = array(
            'round'        => $round,
            'match_number' => $mn++,
            'kickoff'      => $date . ' ' . $times[ $slot % count( $times ) ],
            'venue'        => $ko_venues[ $round ],
        );
        $slot++;
        if ( $slot >= $config['per_day'] ) {
            $slot = 0;
            $day++;
        }
    }
}

return $matches;
