"""German tax calculator for crypto derivatives trading (§23 EStG).

Key rules for Germany:
- Crypto derivatives (perpetuals) = private Veräußerungsgeschäfte §23 EStG
- Freigrenze: €1,000/year — no tax if total gains <= €1,000
- Tax rate: 26.375% (Abgeltungssteuer 25% + Soli 5.5%)
- Losses can offset gains within the same year
- No Haltefrist (holding period) for derivatives
"""
import os
import sys
import csv
import json
from datetime import datetime, timezone, date
from dataclasses import dataclass, field, asdict
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# German tax constants — HARDCODED, do not change via config
FREIGRENZE_EUR = 1000.0          # §23 EStG Freigrenze
TAX_RATE = 0.25                  # Abgeltungssteuer
SOLI_RATE = 0.055                # Solidaritätszuschlag on tax
EFFECTIVE_TAX_RATE = TAX_RATE * (1 + SOLI_RATE)  # 26.375%
EXPORT_PATH = os.getenv("TAX_EXPORT_PATH", "./exports/")


@dataclass
class TaxableTrade:
    trade_id: str
    asset: str
    side: str
    open_date: str
    close_date: str
    holding_hours: float
    entry_price: float
    exit_price: float
    size: float
    leverage: int
    gross_pnl_eur: float
    fees_eur: float
    net_pnl_eur: float
    tax_paragraph: str = "§23 EStG"
    is_gain: bool = field(init=False)

    def __post_init__(self):
        self.is_gain = self.net_pnl_eur > 0


@dataclass
class TaxSummary:
    tax_year: int
    total_gains_eur: float
    total_losses_eur: float
    net_profit_eur: float
    total_fees_eur: float
    taxable_amount_eur: float
    tax_due_eur: float
    freigrenze_used: bool
    effective_rate: float
    trade_count: int
    winning_trades: int
    losing_trades: int


def compute_tax_summary(trades: list[dict], tax_year: int) -> TaxSummary:
    """
    Compute German tax liability for a given year.

    Args:
        trades: List of closed trade dicts from DB
        tax_year: Calendar year to compute for

    Returns:
        TaxSummary with tax due and breakdown
    """
    year_trades = [
        t for t in trades
        if t.get("timestamp_close") and
        datetime.fromisoformat(t["timestamp_close"]).year == tax_year and
        t.get("status") in ("closed", "liquidated")
    ]

    total_gains = 0.0
    total_losses = 0.0
    total_fees = 0.0

    for t in year_trades:
        net_pnl = (t.get("pnl_eur") or 0) - (t.get("fees_eur") or 0)
        total_fees += t.get("fees_eur") or 0
        if net_pnl > 0:
            total_gains += net_pnl
        else:
            total_losses += abs(net_pnl)

    net_profit = total_gains - total_losses

    # Apply Freigrenze: if net_profit <= €1,000, no tax
    if net_profit <= FREIGRENZE_EUR:
        taxable_amount = 0.0
        tax_due = 0.0
        freigrenze_used = True
    else:
        taxable_amount = net_profit
        tax_due = taxable_amount * EFFECTIVE_TAX_RATE
        freigrenze_used = False

    wins = [t for t in year_trades if (t.get("pnl_eur") or 0) > 0]
    losses_list = [t for t in year_trades if (t.get("pnl_eur") or 0) <= 0]

    return TaxSummary(
        tax_year=tax_year,
        total_gains_eur=round(total_gains, 2),
        total_losses_eur=round(total_losses, 2),
        net_profit_eur=round(net_profit, 2),
        total_fees_eur=round(total_fees, 2),
        taxable_amount_eur=round(taxable_amount, 2),
        tax_due_eur=round(tax_due, 2),
        freigrenze_used=freigrenze_used,
        effective_rate=EFFECTIVE_TAX_RATE,
        trade_count=len(year_trades),
        winning_trades=len(wins),
        losing_trades=len(losses_list),
    )


def build_taxable_trades(trades: list[dict], tax_year: int) -> list[TaxableTrade]:
    """Convert DB trade records to TaxableTrade objects for export."""
    result = []
    for t in trades:
        if not t.get("timestamp_close"):
            continue
        close_dt = datetime.fromisoformat(t["timestamp_close"])
        if close_dt.year != tax_year:
            continue
        if t.get("status") not in ("closed", "liquidated"):
            continue

        gross_pnl = t.get("pnl_eur") or 0
        fees = t.get("fees_eur") or 0
        net_pnl = gross_pnl - fees

        result.append(TaxableTrade(
            trade_id=t["id"],
            asset=t["asset"],
            side=t["side"],
            open_date=t.get("timestamp_open", ""),
            close_date=t["timestamp_close"],
            holding_hours=t.get("holding_hours") or 0,
            entry_price=t.get("entry_price") or 0,
            exit_price=t.get("exit_price") or 0,
            size=t.get("size") or 0,
            leverage=t.get("leverage") or 1,
            gross_pnl_eur=round(gross_pnl, 4),
            fees_eur=round(fees, 4),
            net_pnl_eur=round(net_pnl, 4),
            tax_paragraph=t.get("tax_paragraph", "§23 EStG"),
        ))
    return result


def export_to_csv(taxable_trades: list[TaxableTrade], summary: TaxSummary) -> str:
    """
    Export trades and summary to CSV files for tax filing.
    Returns the path to the trades CSV.
    """
    os.makedirs(EXPORT_PATH, exist_ok=True)
    year = summary.tax_year

    # Trades CSV
    trades_path = os.path.join(EXPORT_PATH, f"apex_trades_{year}.csv")
    with open(trades_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "trade_id", "asset", "side", "open_date", "close_date",
            "holding_hours", "entry_price", "exit_price", "size", "leverage",
            "gross_pnl_eur", "fees_eur", "net_pnl_eur", "tax_paragraph",
        ])
        writer.writeheader()
        for trade in taxable_trades:
            writer.writerow(asdict(trade))

    # Summary CSV
    summary_path = os.path.join(EXPORT_PATH, f"apex_tax_summary_{year}.csv")
    with open(summary_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["APEX Trading System — Tax Summary"])
        writer.writerow([f"Tax Year: {year}"])
        writer.writerow([f"Generated: {datetime.now(timezone.utc).isoformat()}"])
        writer.writerow([])
        writer.writerow(["Metric", "Value (EUR)"])
        writer.writerow(["Total Gains", f"{summary.total_gains_eur:,.2f}"])
        writer.writerow(["Total Losses", f"{summary.total_losses_eur:,.2f}"])
        writer.writerow(["Net Profit", f"{summary.net_profit_eur:,.2f}"])
        writer.writerow(["Total Fees", f"{summary.total_fees_eur:,.2f}"])
        writer.writerow([])
        writer.writerow(["Freigrenze applied", "YES" if summary.freigrenze_used else "NO"])
        writer.writerow(["Taxable Amount", f"{summary.taxable_amount_eur:,.2f}"])
        writer.writerow(["Tax Rate (§32d EStG)", f"{summary.effective_rate:.4%}"])
        writer.writerow(["Tax Due", f"{summary.tax_due_eur:,.2f}"])
        writer.writerow([])
        writer.writerow(["Trade Count", summary.trade_count])
        writer.writerow(["Winning Trades", summary.winning_trades])
        writer.writerow(["Losing Trades", summary.losing_trades])

    return trades_path


async def generate_tax_report(tax_year: Optional[int] = None) -> dict:
    """
    Full async tax report generation.
    Fetches trades from DB and produces CSV exports.
    """
    from database.db import get_db

    if tax_year is None:
        tax_year = date.today().year

    async with await get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT * FROM trades WHERE status IN ('closed', 'liquidated')"
        )
    trades = [dict(r) for r in rows]

    summary = compute_tax_summary(trades, tax_year)
    taxable = build_taxable_trades(trades, tax_year)
    csv_path = export_to_csv(taxable, summary)

    return {
        "tax_year": tax_year,
        "summary": asdict(summary),
        "trade_count": len(taxable),
        "csv_path": csv_path,
    }


if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv
    load_dotenv()

    async def main():
        from database.db import init_db
        await init_db()
        result = await generate_tax_report()
        print(json.dumps(result, indent=2, default=str))

    asyncio.run(main())
