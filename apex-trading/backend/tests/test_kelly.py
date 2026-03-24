"""Unit tests for Kelly Criterion calculator."""
import pytest
from risk.kelly import calculate_kelly, calculate_kelly_from_stats, MIN_SAMPLE_SIZE


def make_trades(wins: list[float], losses: list[float]) -> list[dict]:
    trades = []
    for w in wins:
        trades.append({"pnl_eur": w})
    for l in losses:
        trades.append({"pnl_eur": -abs(l)})
    return trades


class TestCalculateKelly:
    def test_empty_trades_returns_minimal_fraction(self):
        result = calculate_kelly([])
        assert result.fraction == 0.01
        assert result.sample_size == 0

    def test_all_wins_returns_capped_fraction(self):
        trades = make_trades([100.0] * 20, [])
        result = calculate_kelly(trades)
        # All wins: Kelly = 1.0, half-Kelly = 0.5, capped at MAX_KELLY = 0.25
        assert result.fraction == 0.25
        assert result.capped is True
        assert result.win_rate == 1.0

    def test_all_losses_returns_zero(self):
        trades = make_trades([], [50.0] * 20)
        result = calculate_kelly(trades)
        assert result.fraction == 0.0
        assert result.win_rate == 0.0

    def test_fifty_fifty_equal_rr_returns_zero(self):
        # p=0.5, q=0.5, b=1 → Kelly = (1*0.5 - 0.5)/1 = 0
        trades = make_trades([100.0] * 25, [100.0] * 25)
        result = calculate_kelly(trades)
        assert result.fraction == 0.0

    def test_sixty_percent_winrate_2to1_rr(self):
        # p=0.6, q=0.4, b=2 → Kelly = (2*0.6 - 0.4)/2 = 0.7; half-Kelly = 0.35; capped at 0.25
        trades = make_trades([200.0] * 30, [100.0] * 20)
        result = calculate_kelly(trades)
        assert result.fraction == 0.25
        assert result.capped is True
        assert result.win_rate == pytest.approx(0.6, abs=0.01)

    def test_small_sample_reduces_fraction(self):
        # Less than MIN_SAMPLE_SIZE → capped at 2%
        trades = make_trades([200.0] * 5, [100.0] * 3)
        result = calculate_kelly(trades)
        assert result.sample_size < MIN_SAMPLE_SIZE
        assert result.fraction <= 0.02

    def test_negative_edge_returns_zero(self):
        # p=0.3, b=1 → Kelly = (0.3 - 0.7)/1 = -0.4 → clamped to 0
        trades = make_trades([100.0] * 3, [100.0] * 7)
        result = calculate_kelly(trades * 3)  # 9 wins, 21 losses
        assert result.fraction == 0.0

    def test_fraction_never_exceeds_cap(self):
        # Even with extreme edge, fraction should never exceed 0.25
        trades = make_trades([1000.0] * 50, [10.0] * 2)
        result = calculate_kelly(trades)
        assert result.fraction <= 0.25

    def test_result_fields_are_valid(self):
        trades = make_trades([150.0] * 30, [75.0] * 20)
        result = calculate_kelly(trades)
        assert 0.0 <= result.fraction <= 0.25
        assert 0.0 <= result.win_rate <= 1.0
        assert result.rr_ratio > 0
        assert result.sample_size == 50


class TestCalculateKellyFromStats:
    def test_basic_calculation(self):
        result = calculate_kelly_from_stats(win_rate=0.6, rr_ratio=2.0, sample_size=50)
        assert result.fraction == pytest.approx(0.25, abs=0.01)

    def test_small_sample_caps_fraction(self):
        result = calculate_kelly_from_stats(win_rate=0.7, rr_ratio=3.0, sample_size=5)
        assert result.fraction <= 0.02

    def test_zero_win_rate(self):
        result = calculate_kelly_from_stats(win_rate=0.0, rr_ratio=2.0, sample_size=50)
        assert result.fraction == 0.0

    def test_win_rate_clamped(self):
        result = calculate_kelly_from_stats(win_rate=1.5, rr_ratio=1.0, sample_size=50)
        assert result.fraction <= 0.25
