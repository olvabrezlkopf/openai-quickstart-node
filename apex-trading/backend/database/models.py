"""SQLite table definitions for APEX Trading System."""

TRADES_TABLE = """
CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    timestamp_open TEXT NOT NULL,
    timestamp_close TEXT,
    asset TEXT NOT NULL,
    type TEXT DEFAULT 'Perpetual',
    side TEXT NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    size REAL NOT NULL,
    leverage INTEGER NOT NULL,
    pnl_eur REAL,
    fees_eur REAL,
    holding_hours REAL,
    status TEXT DEFAULT 'open',
    close_reason TEXT,
    taxable INTEGER DEFAULT 1,
    tax_paragraph TEXT DEFAULT '§23 EStG',
    signal_confidence REAL,
    debate_result TEXT,
    kelly_fraction REAL,
    position_size_eur REAL
)
"""

AGENT_LOGS_TABLE = """
CREATE TABLE IF NOT EXISTS agent_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    agent TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT
)
"""

SNAPSHOTS_TABLE = """
CREATE TABLE IF NOT EXISTS snapshots (
    date TEXT PRIMARY KEY,
    equity_eur REAL NOT NULL,
    daily_pnl REAL,
    daily_trades INTEGER,
    win_rate_rolling REAL,
    kelly_fraction REAL,
    fees_total REAL,
    token_costs_eur REAL
)
"""

CONFIG_HISTORY_TABLE = """
CREATE TABLE IF NOT EXISTS config_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    changed_by TEXT DEFAULT 'optimizer',
    parameter TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT
)
"""

SIGNALS_TABLE = """
CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    asset TEXT NOT NULL,
    side TEXT NOT NULL,
    confidence REAL NOT NULL,
    technical_data TEXT,
    sentiment_score REAL,
    status TEXT DEFAULT 'pending',
    rejection_reason TEXT
)
"""

SYSTEM_STATE_TABLE = """
CREATE TABLE IF NOT EXISTS system_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
"""

ALL_TABLES = [
    TRADES_TABLE,
    AGENT_LOGS_TABLE,
    SNAPSHOTS_TABLE,
    CONFIG_HISTORY_TABLE,
    SIGNALS_TABLE,
    SYSTEM_STATE_TABLE,
]
