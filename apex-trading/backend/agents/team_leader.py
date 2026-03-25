"""Team Leader Agent — Multi-LLM debate + final trade decision."""
import os
import sys
import json
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.db import (
    get_db, log_agent, is_system_paused,
    get_recent_trades, get_open_trades,
)
from agents.risk_manager import RiskManager
from connectors.hyperliquid import HyperliquidConnector
from agents.execution_agent import ExecutionAgent

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","agent":"team_leader","level":"%(levelname)s","msg":"%(message)s"}'
)
logger = logging.getLogger(__name__)

AGENT_NAME = "team_leader"
POLL_INTERVAL_SEC = 10  # How often to check for pending signals

# LLM debate configuration — models vote BUY / SELL / PASS
DEBATE_MODELS = [
    {"provider": "anthropic",  "model": "claude-haiku-4-5-20251001"},
    {"provider": "openai",     "model": "gpt-4o-mini"},
    {"provider": "openrouter", "model": "mistralai/mistral-7b-instruct"},
    {"provider": "google",     "model": "gemini-2.0-flash"},
]

TEAM_LEADER_MODEL = os.getenv("TEAM_LEADER_MODEL", "claude-haiku-4-5-20251001")
MAX_TOKENS = 500

DEBATE_PROMPT = """You are a crypto trading analyst reviewing a potential trade signal.

Signal:
- Asset: {asset}
- Direction: {side}
- Confidence: {confidence:.1%}
- Current Price: ${price:,.4f}

Technical Indicators:
- RSI: {rsi:.1f}
- MACD: {macd:.4f} (signal: {macd_signal:.4f})
- BB Upper: {bb_upper:.4f} | Mid: {bb_mid:.4f} | Lower: {bb_lower:.4f}
- ATR: {atr:.4f}

Recent Performance (last 20 trades):
- Win Rate: {win_rate:.1%}
- Total Trades: {total_trades}

Sentiment Score: {sentiment:.2f} (-1 bearish to +1 bullish)

Account:
- Equity: €{equity:,.2f}
- Open Positions: {open_positions}

Respond with exactly one line: BUY, SELL, or PASS
Then one sentence of reasoning (max 20 words).
Format: VERDICT|reasoning"""

TEAM_LEADER_PROMPT = """You are the APEX Trading System Team Leader.

Trade Signal: {side} {asset} @ ${price:,.4f}

Debate results from {n_models} analysts:
{debate_summary}

Votes: {buy_votes} BUY | {sell_votes} SELL | {pass_votes} PASS

Risk Manager: {risk_status}

Your job: Make the FINAL decision. Consider analyst consensus and risk assessment.
Respond with exactly: EXECUTE or REJECT
Then one sentence of reasoning (max 25 words).
Format: DECISION|reasoning"""


class TeamLeader:
    def __init__(self, hl_connector: HyperliquidConnector):
        self.hl = hl_connector
        self.risk_manager = RiskManager()
        self.execution_agent = ExecutionAgent(hl_connector)

    async def _call_anthropic(self, prompt: str) -> str:
        """Call Claude via Anthropic API."""
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        if not api_key:
            return "PASS|No Anthropic API key configured"
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=api_key)
            msg = await client.messages.create(
                model=TEAM_LEADER_MODEL,
                max_tokens=MAX_TOKENS,
                messages=[{"role": "user", "content": prompt}],
            )
            return msg.content[0].text.strip()
        except Exception as e:
            logger.error(f"[TL] Anthropic call failed: {e}")
            return "PASS|API error"

    async def _call_openai(self, prompt: str, model: str) -> str:
        """Call OpenAI API."""
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            return "PASS|No OpenAI API key configured"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": MAX_TOKENS,
                    },
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"[TL] OpenAI call failed: {e}")
            return "PASS|API error"

    async def _call_openrouter(self, prompt: str, model: str) -> str:
        """Call OpenRouter API (OpenAI-compatible, supports Mistral/Llama/etc)."""
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        if not api_key:
            return "PASS|No OpenRouter API key configured"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "HTTP-Referer": "https://apex-trading.local",
                        "X-Title": "APEX Trading System",
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": MAX_TOKENS,
                    },
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"[TL] OpenRouter call failed: {e}")
            return "PASS|API error"

    async def _call_gemini(self, prompt: str, model: str) -> str:
        """Call Google Gemini API."""
        api_key = os.getenv("GOOGLE_API_KEY", "")
        if not api_key:
            return "PASS|No Google API key configured"
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    url,
                    params={"key": api_key},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"maxOutputTokens": MAX_TOKENS},
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.error(f"[TL] Gemini call failed: {e}")
            return "PASS|API error"

    async def _call_model(self, provider: str, model: str, prompt: str) -> str:
        """Route to the correct API provider."""
        if provider == "anthropic":
            return await self._call_anthropic(prompt)
        elif provider == "openai":
            return await self._call_openai(prompt, model)
        elif provider == "openrouter":
            return await self._call_openrouter(prompt, model)
        elif provider == "google":
            return await self._call_gemini(prompt, model)
        return "PASS|Unknown provider"

    def _parse_verdict(self, response: str) -> tuple[str, str]:
        """Parse 'VERDICT|reasoning' format."""
        parts = response.split("|", 1)
        verdict = parts[0].strip().upper()
        reasoning = parts[1].strip() if len(parts) > 1 else ""
        if verdict not in ("BUY", "SELL", "PASS"):
            verdict = "PASS"
        return verdict, reasoning

    def _parse_decision(self, response: str) -> tuple[str, str]:
        """Parse 'DECISION|reasoning' format."""
        parts = response.split("|", 1)
        decision = parts[0].strip().upper()
        reasoning = parts[1].strip() if len(parts) > 1 else ""
        if decision not in ("EXECUTE", "REJECT"):
            decision = "REJECT"
        return decision, reasoning

    async def _get_sentiment(self, asset: str) -> float:
        """Fetch latest sentiment score from DB."""
        try:
            async with await get_db() as db:
                rows = await db.execute_fetchall(
                    """SELECT score FROM sentiment_scores
                       WHERE asset = ? OR asset = 'CRYPTO'
                       ORDER BY timestamp DESC LIMIT 1""",
                    (asset,),
                )
                return float(rows[0]["score"]) if rows else 0.0
        except Exception:
            return 0.0

    async def _run_debate(self, signal: dict, context: dict) -> dict:
        """Run parallel debate across all configured LLM models."""
        indicators = signal.get("indicators", {})
        prompt = DEBATE_PROMPT.format(
            asset=signal["asset"],
            side=signal["side"],
            confidence=signal["confidence"],
            price=signal["price"],
            rsi=indicators.get("rsi", 50),
            macd=indicators.get("macd", 0),
            macd_signal=indicators.get("macd_signal", 0),
            bb_upper=indicators.get("bb_upper", 0),
            bb_mid=indicators.get("bb_mid", 0),
            bb_lower=indicators.get("bb_lower", 0),
            atr=indicators.get("atr", 0),
            win_rate=context["win_rate"],
            total_trades=context["total_trades"],
            sentiment=context["sentiment"],
            equity=context["equity"],
            open_positions=context["open_positions"],
        )

        # Run all model calls in parallel
        tasks = [
            self._call_model(m["provider"], m["model"], prompt)
            for m in DEBATE_MODELS
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        results = []
        buy_votes = sell_votes = pass_votes = 0
        for i, (resp, model_cfg) in enumerate(zip(responses, DEBATE_MODELS)):
            if isinstance(resp, Exception):
                verdict, reasoning = "PASS", f"Error: {resp}"
            else:
                verdict, reasoning = self._parse_verdict(str(resp))

            if verdict == "BUY":
                buy_votes += 1
            elif verdict == "SELL":
                sell_votes += 1
            else:
                pass_votes += 1

            results.append({
                "provider": model_cfg["provider"],
                "model": model_cfg["model"],
                "verdict": verdict,
                "reasoning": reasoning,
            })

        return {
            "results": results,
            "buy_votes": buy_votes,
            "sell_votes": sell_votes,
            "pass_votes": pass_votes,
        }

    async def _make_final_decision(
        self,
        signal: dict,
        debate: dict,
        risk_status: str,
    ) -> tuple[str, str]:
        """Team Leader makes final call using debate results."""
        summary_lines = []
        for r in debate["results"]:
            summary_lines.append(f"  [{r['provider']}] {r['verdict']}: {r['reasoning']}")
        debate_summary = "\n".join(summary_lines)

        prompt = TEAM_LEADER_PROMPT.format(
            side=signal["side"],
            asset=signal["asset"],
            price=signal["price"],
            n_models=len(debate["results"]),
            debate_summary=debate_summary,
            buy_votes=debate["buy_votes"],
            sell_votes=debate["sell_votes"],
            pass_votes=debate["pass_votes"],
            risk_status=risk_status,
        )
        response = await self._call_anthropic(prompt)
        return self._parse_decision(response)

    async def process_signal(self, signal: dict) -> None:
        """Full pipeline: debate → risk check → execute."""
        asset = signal["asset"]
        side = signal["side"]
        signal_id = signal["id"]

        logger.info(f"[TL] Processing signal: {side} {asset} (id={signal_id})")

        # Mark signal as processing
        async with await get_db() as db:
            await db.execute(
                "UPDATE signals SET status='processing' WHERE id=?", (signal_id,)
            )
            await db.commit()

        try:
            # Gather context
            recent_trades = await get_recent_trades(50)
            open_trades = await get_open_trades()
            account_state = await self.hl.get_account_state()
            sentiment = await self._get_sentiment(asset)

            wins = [t for t in recent_trades if (t.get("pnl_eur") or 0) > 0]
            win_rate = len(wins) / len(recent_trades) if recent_trades else 0.5

            context = {
                "win_rate": win_rate,
                "total_trades": len(recent_trades),
                "sentiment": sentiment,
                "equity": account_state.get("equity", 0),
                "open_positions": len(open_trades),
            }

            # Run pre-debate risk check
            open_positions = account_state.get("positions", [])
            risk_decision = self.risk_manager.evaluate_trade(
                signal, account_state, recent_trades, open_positions
            )

            if not risk_decision.approved:
                logger.info(f"[TL] Risk rejected before debate: {risk_decision.rejection_reason}")
                await self._mark_signal(signal_id, "rejected", f"Risk: {risk_decision.rejection_reason}")
                return

            # Run LLM debate
            debate = await self._run_debate(signal, context)
            logger.info(
                f"[TL] Debate: BUY={debate['buy_votes']} SELL={debate['sell_votes']} PASS={debate['pass_votes']}"
            )

            # Quick consensus check — skip team leader call if overwhelming PASS
            total_votes = len(DEBATE_MODELS)
            if debate["pass_votes"] >= total_votes:
                logger.info("[TL] Unanimous PASS — rejecting without team leader call")
                await self._mark_signal(signal_id, "rejected", "Unanimous PASS in debate")
                return

            # Team leader final decision
            risk_status = f"APPROVED — size={risk_decision.position_size_eur:.2f} EUR"
            decision, reasoning = await self._make_final_decision(signal, debate, risk_status)
            logger.info(f"[TL] Final decision: {decision} — {reasoning}")

            debate_result = {
                "debate": debate,
                "decision": decision,
                "reasoning": reasoning,
            }

            if decision == "EXECUTE":
                trade_id = await self.execution_agent.execute_trade(
                    signal, risk_decision, debate_result
                )
                if trade_id:
                    await self._mark_signal(signal_id, "executed", reasoning, trade_id)
                    await log_agent(AGENT_NAME, "INFO", f"Trade executed: {side} {asset}", {
                        "trade_id": trade_id, "signal_id": signal_id, "debate": debate
                    })
                else:
                    await self._mark_signal(signal_id, "failed", "Execution failed")
            else:
                await self._mark_signal(signal_id, "rejected", reasoning)

        except Exception as e:
            logger.error(f"[TL] Error processing signal {signal_id}: {e}")
            await self._mark_signal(signal_id, "failed", str(e))

    async def _mark_signal(
        self,
        signal_id: str,
        status: str,
        reason: str,
        trade_id: Optional[str] = None,
    ) -> None:
        async with await get_db() as db:
            await db.execute(
                "UPDATE signals SET status=?, rejection_reason=?, trade_id=? WHERE id=?",
                (status, reason, trade_id, signal_id),
            )
            await db.commit()

    async def run(self) -> None:
        """Poll for pending signals and process them."""
        logger.info("[TL] Team Leader started — polling for signals")
        while True:
            try:
                if not await is_system_paused():
                    async with await get_db() as db:
                        rows = await db.execute_fetchall(
                            """SELECT * FROM signals
                               WHERE status = 'pending'
                               ORDER BY timestamp ASC
                               LIMIT 5"""
                        )

                    for row in rows:
                        signal = dict(row)
                        if signal.get("technical_data"):
                            signal["indicators"] = json.loads(signal["technical_data"])
                            # price is stored inside technical_data, not as its own column
                            if not signal.get("price"):
                                signal["price"] = signal["indicators"].get("price", 0.0)
                        await self.process_signal(signal)
            except Exception as e:
                logger.error(f"[TL] Poll error: {e}")

            await asyncio.sleep(POLL_INTERVAL_SEC)


async def main():
    from dotenv import load_dotenv
    load_dotenv()
    from database.db import init_db
    await init_db()
    hl = HyperliquidConnector()
    leader = TeamLeader(hl)
    await leader.run()


if __name__ == "__main__":
    asyncio.run(main())
