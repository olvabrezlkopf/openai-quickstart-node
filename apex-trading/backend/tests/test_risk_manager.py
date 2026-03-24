"""Unit tests for Risk Manager with hard limit enforcement."""
import pytest
from risk.drawdown import DailyDrawdownTracker, MAX_DAILY_LOSS_PCT
from agents.risk_manager import RiskManager, MAX_LEVERAGE, MAX_POSITIONS, MAX_POSITION_PCT, MIN_CASH_RESERVE_PCT


def make_signal(asset="BTC", side="LONG", confidence=0.75, price=50000.0):
    return {"asset": asset, "side": side, "confidence": confidence, "price": price}


def make_account(equity=10000.0, available=9000.0, positions=None):
    return {"equity": equity, "available_balance": available, "positions": positions or []}


def make_winning_trades(n=20):
    return [{"pnl_eur": 150.0} for _ in range(n)] + [{"pnl_eur": -75.0} for _ in range(n)]


class TestHardLimits:
    """Verify that hardcoded constants match specification."""

    def test_max_leverage_is_5(self):
        assert MAX_LEVERAGE == 5

    def test_max_positions_is_3(self):
        assert MAX_POSITIONS == 3

    def test_max_position_pct_is_10_percent(self):
        assert MAX_POSITION_PCT == 0.10

    def test_min_cash_reserve_is_20_percent(self):
        assert MIN_CASH_RESERVE_PCT == 0.20

    def test_max_daily_loss_is_8_percent(self):
        assert MAX_DAILY_LOSS_PCT == 0.08


class TestRiskManagerApproval:
    def test_clean_state_approves_trade(self):
        rm = RiskManager()
        signal = make_signal()
        account = make_account()
        decision = rm.evaluate_trade(signal, account, make_winning_trades(), [])
        assert decision.approved is True
        assert decision.leverage == MAX_LEVERAGE  # must be 5x

    def test_rejects_when_max_positions_reached(self):
        rm = RiskManager()
        open_positions = [
            {"asset": "ETH", "side": "LONG"},
            {"asset": "SOL", "side": "SHORT"},
            {"asset": "AVAX", "side": "LONG"},
        ]
        decision = rm.evaluate_trade(make_signal(), make_account(), [], open_positions)
        assert decision.approved is False
        assert "Max positions" in decision.rejection_reason

    def test_rejects_duplicate_asset(self):
        rm = RiskManager()
        open_positions = [{"asset": "BTC", "side": "LONG"}]
        decision = rm.evaluate_trade(make_signal(asset="BTC"), make_account(), [], open_positions)
        assert decision.approved is False
        assert "BTC" in decision.rejection_reason

    def test_rejects_when_cash_reserve_insufficient(self):
        rm = RiskManager()
        # Available is only 15% — below 20% reserve requirement
        account = make_account(equity=10000.0, available=1500.0)
        decision = rm.evaluate_trade(make_signal(), account, make_winning_trades(), [])
        assert decision.approved is False
        assert "reserve" in decision.rejection_reason.lower() or "balance" in decision.rejection_reason.lower()

    def test_position_size_never_exceeds_10_percent(self):
        rm = RiskManager()
        account = make_account(equity=100000.0, available=90000.0)
        decision = rm.evaluate_trade(make_signal(), account, make_winning_trades(), [])
        if decision.approved:
            assert decision.position_size_eur <= 100000.0 * MAX_POSITION_PCT

    def test_stop_loss_and_take_profit_calculated_correctly_long(self):
        rm = RiskManager()
        signal = make_signal(side="LONG", price=1000.0)
        decision = rm.evaluate_trade(signal, make_account(), make_winning_trades(), [], stop_loss_pct=0.03, take_profit_ratio=2.0)
        if decision.approved:
            assert decision.stop_loss_price == pytest.approx(970.0, rel=1e-3)  # 1000 * (1 - 0.03)
            assert decision.take_profit_price == pytest.approx(1060.0, rel=1e-3)  # 1000 * (1 + 0.06)

    def test_stop_loss_and_take_profit_calculated_correctly_short(self):
        rm = RiskManager()
        signal = make_signal(side="SHORT", price=1000.0)
        decision = rm.evaluate_trade(signal, make_account(), make_winning_trades(), [], stop_loss_pct=0.03, take_profit_ratio=2.0)
        if decision.approved:
            assert decision.stop_loss_price == pytest.approx(1030.0, rel=1e-3)
            assert decision.take_profit_price == pytest.approx(940.0, rel=1e-3)


class TestDrawdownTracker:
    def test_blocks_after_8_percent_loss(self):
        tracker = DailyDrawdownTracker()
        equity = 10000.0
        tracker.record_pnl(-800.0, equity)  # exactly 8%
        assert tracker.is_blocked(equity) is True

    def test_does_not_block_below_ceiling(self):
        tracker = DailyDrawdownTracker()
        equity = 10000.0
        tracker.record_pnl(-700.0, equity)  # 7% — below ceiling
        assert tracker.is_blocked(equity) is False

    def test_remaining_budget_decreases_with_losses(self):
        tracker = DailyDrawdownTracker()
        equity = 10000.0
        initial_budget = tracker.get_remaining_loss_budget(equity)
        tracker.record_pnl(-200.0, equity)
        assert tracker.get_remaining_loss_budget(equity) < initial_budget

    def test_loss_pct_constant_is_not_overridable(self):
        # Verify the ceiling uses the hardcoded constant, not the instance variable
        tracker = DailyDrawdownTracker(max_daily_loss_pct=0.01)  # try to set 1%
        equity = 10000.0
        tracker.record_pnl(-500.0, equity)  # 5% loss
        # Should NOT be blocked because hardcoded is 8% (the 0.01 arg is ignored for ceiling)
        assert tracker.is_blocked(equity) is False


class TestRiskManagerDrawdownIntegration:
    def test_blocks_new_trades_after_daily_ceiling(self):
        rm = RiskManager()
        rm.drawdown.record_pnl(-8000.0, 10000.0)  # 80% loss — well above 8% ceiling
        decision = rm.evaluate_trade(make_signal(), make_account(), make_winning_trades(), [])
        assert decision.approved is False
        assert "drawdown" in decision.rejection_reason.lower() or "ceiling" in decision.rejection_reason.lower()
