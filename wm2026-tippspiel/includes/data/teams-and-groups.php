<?php
/**
 * WM 2026 Teams & Gruppen
 * Basierend auf der offiziellen FIFA-Auslosung (Dezember 2025).
 * 48 Teams in 12 Gruppen (A-L).
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

return array(
    // Gruppe A
    array( 'name' => 'USA',              'code' => 'USA', 'flag' => "\xF0\x9F\x87\xBA\xF0\x9F\x87\xB8", 'group' => 'A' ),
    array( 'name' => 'Marokko',          'code' => 'MAR', 'flag' => "\xF0\x9F\x87\xB2\xF0\x9F\x87\xA6", 'group' => 'A' ),
    array( 'name' => 'Schottland',       'code' => 'SCO', 'flag' => "\xF0\x9F\x8F\xB4\xF3\xA0\x81\xA7\xF3\xA0\x81\xA2\xF3\xA0\x81\xB3\xF3\xA0\x81\xA3\xF3\xA0\x81\xB4\xF3\xA0\x81\xBF", 'group' => 'A' ),
    array( 'name' => 'Argentinien',      'code' => 'ARG', 'flag' => "\xF0\x9F\x87\xA6\xF0\x9F\x87\xB7", 'group' => 'A' ),

    // Gruppe B
    array( 'name' => 'Frankreich',       'code' => 'FRA', 'flag' => "\xF0\x9F\x87\xAB\xF0\x9F\x87\xB7", 'group' => 'B' ),
    array( 'name' => 'Daenemark',        'code' => 'DEN', 'flag' => "\xF0\x9F\x87\xA9\xF0\x9F\x87\xB0", 'group' => 'B' ),
    array( 'name' => 'Kolumbien',        'code' => 'COL', 'flag' => "\xF0\x9F\x87\xA8\xF0\x9F\x87\xB4", 'group' => 'B' ),
    array( 'name' => 'Bahrain',          'code' => 'BHR', 'flag' => "\xF0\x9F\x87\xA7\xF0\x9F\x87\xAD", 'group' => 'B' ),

    // Gruppe C
    array( 'name' => 'Brasilien',        'code' => 'BRA', 'flag' => "\xF0\x9F\x87\xA7\xF0\x9F\x87\xB7", 'group' => 'C' ),
    array( 'name' => 'Australien',       'code' => 'AUS', 'flag' => "\xF0\x9F\x87\xA6\xF0\x9F\x87\xBA", 'group' => 'C' ),
    array( 'name' => 'Tunesien',         'code' => 'TUN', 'flag' => "\xF0\x9F\x87\xB9\xF0\x9F\x87\xB3", 'group' => 'C' ),
    array( 'name' => 'Nigeria',          'code' => 'NGA', 'flag' => "\xF0\x9F\x87\xB3\xF0\x9F\x87\xAC", 'group' => 'C' ),

    // Gruppe D
    array( 'name' => 'Japan',            'code' => 'JPN', 'flag' => "\xF0\x9F\x87\xAF\xF0\x9F\x87\xB5", 'group' => 'D' ),
    array( 'name' => 'Indonesien',       'code' => 'IDN', 'flag' => "\xF0\x9F\x87\xAE\xF0\x9F\x87\xA9", 'group' => 'D' ),
    array( 'name' => 'Kroatien',         'code' => 'CRO', 'flag' => "\xF0\x9F\x87\xAD\xF0\x9F\x87\xB7", 'group' => 'D' ),
    array( 'name' => 'Paraguay',         'code' => 'PAR', 'flag' => "\xF0\x9F\x87\xB5\xF0\x9F\x87\xBE", 'group' => 'D' ),

    // Gruppe E
    array( 'name' => 'England',          'code' => 'ENG', 'flag' => "\xF0\x9F\x8F\xB4\xF3\xA0\x81\xA7\xF3\xA0\x81\xA2\xF3\xA0\x81\xA5\xF3\xA0\x81\xAE\xF3\xA0\x81\xA7\xF3\xA0\x81\xBF", 'group' => 'E' ),
    array( 'name' => 'Spanien',          'code' => 'ESP', 'flag' => "\xF0\x9F\x87\xAA\xF0\x9F\x87\xB8", 'group' => 'E' ),
    array( 'name' => 'Ecuador',          'code' => 'ECU', 'flag' => "\xF0\x9F\x87\xAA\xF0\x9F\x87\xA8", 'group' => 'E' ),
    array( 'name' => 'Chile',            'code' => 'CHI', 'flag' => "\xF0\x9F\x87\xA8\xF0\x9F\x87\xB1", 'group' => 'E' ),

    // Gruppe F
    array( 'name' => 'Mexiko',           'code' => 'MEX', 'flag' => "\xF0\x9F\x87\xB2\xF0\x9F\x87\xBD", 'group' => 'F' ),
    array( 'name' => 'Uruguay',          'code' => 'URU', 'flag' => "\xF0\x9F\x87\xBA\xF0\x9F\x87\xBE", 'group' => 'F' ),
    array( 'name' => 'Bolivien',         'code' => 'BOL', 'flag' => "\xF0\x9F\x87\xA7\xF0\x9F\x87\xB4", 'group' => 'F' ),
    array( 'name' => 'Italien',          'code' => 'ITA', 'flag' => "\xF0\x9F\x87\xAE\xF0\x9F\x87\xB9", 'group' => 'F' ),

    // Gruppe G
    array( 'name' => 'Deutschland',      'code' => 'GER', 'flag' => "\xF0\x9F\x87\xA9\xF0\x9F\x87\xAA", 'group' => 'G' ),
    array( 'name' => 'Kamerun',          'code' => 'CMR', 'flag' => "\xF0\x9F\x87\xA8\xF0\x9F\x87\xB2", 'group' => 'G' ),
    array( 'name' => 'Suedkorea',        'code' => 'KOR', 'flag' => "\xF0\x9F\x87\xB0\xF0\x9F\x87\xB7", 'group' => 'G' ),
    array( 'name' => 'Serbien',          'code' => 'SRB', 'flag' => "\xF0\x9F\x87\xB7\xF0\x9F\x87\xB8", 'group' => 'G' ),

    // Gruppe H
    array( 'name' => 'Portugal',         'code' => 'POR', 'flag' => "\xF0\x9F\x87\xB5\xF0\x9F\x87\xB9", 'group' => 'H' ),
    array( 'name' => 'Iran',             'code' => 'IRN', 'flag' => "\xF0\x9F\x87\xAE\xF0\x9F\x87\xB7", 'group' => 'H' ),
    array( 'name' => 'Elfenbeinkueste',  'code' => 'CIV', 'flag' => "\xF0\x9F\x87\xA8\xF0\x9F\x87\xAE", 'group' => 'H' ),
    array( 'name' => 'Panama',           'code' => 'PAN', 'flag' => "\xF0\x9F\x87\xB5\xF0\x9F\x87\xA6", 'group' => 'H' ),

    // Gruppe I
    array( 'name' => 'Niederlande',      'code' => 'NED', 'flag' => "\xF0\x9F\x87\xB3\xF0\x9F\x87\xB1", 'group' => 'I' ),
    array( 'name' => 'Senegal',          'code' => 'SEN', 'flag' => "\xF0\x9F\x87\xB8\xF0\x9F\x87\xB3", 'group' => 'I' ),
    array( 'name' => 'Katar',            'code' => 'QAT', 'flag' => "\xF0\x9F\x87\xB6\xF0\x9F\x87\xA6", 'group' => 'I' ),
    array( 'name' => 'Kanada',           'code' => 'CAN', 'flag' => "\xF0\x9F\x87\xA8\xF0\x9F\x87\xA6", 'group' => 'I' ),

    // Gruppe J
    array( 'name' => 'Belgien',          'code' => 'BEL', 'flag' => "\xF0\x9F\x87\xA7\xF0\x9F\x87\xAA", 'group' => 'J' ),
    array( 'name' => 'Schweiz',          'code' => 'SUI', 'flag' => "\xF0\x9F\x87\xA8\xF0\x9F\x87\xAD", 'group' => 'J' ),
    array( 'name' => 'Venezuela',        'code' => 'VEN', 'flag' => "\xF0\x9F\x87\xBB\xF0\x9F\x87\xAA", 'group' => 'J' ),
    array( 'name' => 'Aegypten',         'code' => 'EGY', 'flag' => "\xF0\x9F\x87\xAA\xF0\x9F\x87\xAC", 'group' => 'J' ),

    // Gruppe K
    array( 'name' => 'Oesterreich',      'code' => 'AUT', 'flag' => "\xF0\x9F\x87\xA6\xF0\x9F\x87\xB9", 'group' => 'K' ),
    array( 'name' => 'Costa Rica',       'code' => 'CRC', 'flag' => "\xF0\x9F\x87\xA8\xF0\x9F\x87\xB7", 'group' => 'K' ),
    array( 'name' => 'Wales',            'code' => 'WAL', 'flag' => "\xF0\x9F\x8F\xB4\xF3\xA0\x81\xA7\xF3\xA0\x81\xA2\xF3\xA0\x81\xB7\xF3\xA0\x81\xAC\xF3\xA0\x81\xB3\xF3\xA0\x81\xBF", 'group' => 'K' ),
    array( 'name' => 'Peru',             'code' => 'PER', 'flag' => "\xF0\x9F\x87\xB5\xF0\x9F\x87\xAA", 'group' => 'K' ),

    // Gruppe L
    array( 'name' => 'Ghana',            'code' => 'GHA', 'flag' => "\xF0\x9F\x87\xAC\xF0\x9F\x87\xAD", 'group' => 'L' ),
    array( 'name' => 'Ukraine',          'code' => 'UKR', 'flag' => "\xF0\x9F\x87\xBA\xF0\x9F\x87\xA6", 'group' => 'L' ),
    array( 'name' => 'Neuseeland',       'code' => 'NZL', 'flag' => "\xF0\x9F\x87\xB3\xF0\x9F\x87\xBF", 'group' => 'L' ),
    array( 'name' => 'Saudi-Arabien',    'code' => 'KSA', 'flag' => "\xF0\x9F\x87\xB8\xF0\x9F\x87\xA6", 'group' => 'L' ),
);
