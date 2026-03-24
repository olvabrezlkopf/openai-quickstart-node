"""Sentiment Analyst Agent — Reddit + news sentiment scoring."""
import os
import sys
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.db import get_db, log_agent

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","agent":"sentiment_analyst","level":"%(levelname)s","msg":"%(message)s"}'
)
logger = logging.getLogger(__name__)

AGENT_NAME = "sentiment_analyst"
INTERVAL_SEC = int(os.getenv("SENTIMENT_INTERVAL_SEC", "300"))  # 5 minutes

# Subreddits to monitor
SUBREDDITS = ["CryptoCurrency", "Bitcoin", "ethereum", "CryptoMarkets"]

# Asset keywords for targeted scoring
ASSET_KEYWORDS: dict[str, list[str]] = {
    "BTC":  ["bitcoin", "btc", "#bitcoin"],
    "ETH":  ["ethereum", "eth", "#ethereum"],
    "SOL":  ["solana", "sol", "#solana"],
    "AVAX": ["avalanche", "avax"],
    "ARB":  ["arbitrum", "arb"],
    "OP":   ["optimism", "op"],
}

# Simple word lists for scoring (no external NLP dependencies)
BULLISH_WORDS = {
    "moon", "pump", "bull", "bullish", "buy", "long", "hodl", "hold",
    "breakout", "ath", "rally", "surge", "soar", "green", "up", "rise",
    "accumulate", "undervalued", "support", "bounce", "recover",
}
BEARISH_WORDS = {
    "crash", "dump", "bear", "bearish", "sell", "short", "rekt",
    "collapse", "plunge", "tank", "red", "down", "fall", "drop",
    "overvalued", "resistance", "rug", "scam", "fear", "panic",
}


def score_text(text: str) -> float:
    """
    Score text sentiment from -1 (bearish) to +1 (bullish).
    Simple keyword counting — no external NLP required.
    """
    words = text.lower().split()
    bull_count = sum(1 for w in words if w.strip(".,!?#@") in BULLISH_WORDS)
    bear_count = sum(1 for w in words if w.strip(".,!?#@") in BEARISH_WORDS)
    total = bull_count + bear_count
    if total == 0:
        return 0.0
    return (bull_count - bear_count) / total


def detect_assets(text: str) -> list[str]:
    """Find which assets are mentioned in a text."""
    text_lower = text.lower()
    found = []
    for asset, keywords in ASSET_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            found.append(asset)
    return found or ["CRYPTO"]  # fallback to generic crypto sentiment


async def fetch_reddit_sentiment() -> dict[str, list[float]]:
    """
    Fetch recent Reddit posts and score sentiment per asset.
    Returns {asset: [scores]} mapping.
    """
    reddit_id = os.getenv("REDDIT_CLIENT_ID", "")
    reddit_secret = os.getenv("REDDIT_CLIENT_SECRET", "")
    reddit_ua = os.getenv("REDDIT_USER_AGENT", "apex-trading-bot/1.0")

    if not reddit_id or not reddit_secret:
        logger.warning("[Sentiment] Reddit credentials not configured — skipping")
        return {}

    try:
        import praw
        reddit = praw.Reddit(
            client_id=reddit_id,
            client_secret=reddit_secret,
            user_agent=reddit_ua,
        )

        asset_scores: dict[str, list[float]] = {}

        for subreddit_name in SUBREDDITS:
            subreddit = reddit.subreddit(subreddit_name)
            posts = list(subreddit.hot(limit=25))

            for post in posts:
                text = f"{post.title} {getattr(post, 'selftext', '')}"
                score = score_text(text)
                assets = detect_assets(text)

                for asset in assets:
                    asset_scores.setdefault(asset, []).append(score)

        return asset_scores

    except Exception as e:
        logger.error(f"[Sentiment] Reddit fetch error: {e}")
        return {}


async def fetch_cryptopanic_sentiment() -> dict[str, list[float]]:
    """
    Fetch CryptoPanic news headlines and score sentiment.
    Returns {asset: [scores]} mapping.
    """
    api_key = os.getenv("CRYPTOPANIC_API_KEY", "")
    if not api_key:
        return {}

    try:
        import httpx
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                "https://cryptopanic.com/api/v1/posts/",
                params={
                    "auth_token": api_key,
                    "public": "true",
                    "kind": "news",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        asset_scores: dict[str, list[float]] = {}
        for post in data.get("results", []):
            title = post.get("title", "")
            score = score_text(title)

            # Use CryptoPanic's built-in currency tags
            currencies = [c["code"] for c in post.get("currencies", [])]
            if not currencies:
                currencies = ["CRYPTO"]

            for asset in currencies:
                asset_scores.setdefault(asset, []).append(score)

        return asset_scores

    except Exception as e:
        logger.error(f"[Sentiment] CryptoPanic fetch error: {e}")
        return {}


def aggregate_scores(
    reddit_scores: dict[str, list[float]],
    news_scores: dict[str, list[float]],
) -> dict[str, float]:
    """Merge sources and compute weighted average per asset."""
    all_assets = set(reddit_scores) | set(news_scores)
    result = {}
    for asset in all_assets:
        reddit = reddit_scores.get(asset, [])
        news = news_scores.get(asset, [])

        # Weight: news 60%, reddit 40%
        reddit_avg = sum(reddit) / len(reddit) if reddit else 0.0
        news_avg = sum(news) / len(news) if news else 0.0

        if reddit and news:
            combined = 0.4 * reddit_avg + 0.6 * news_avg
        elif news:
            combined = news_avg
        else:
            combined = reddit_avg

        result[asset] = round(combined, 4)

    return result


async def write_scores(scores: dict[str, float]) -> None:
    """Persist sentiment scores to the database."""
    if not scores:
        return
    ts = datetime.now(timezone.utc).isoformat()
    async with await get_db() as db:
        for asset, score in scores.items():
            await db.execute(
                """INSERT INTO sentiment_scores (timestamp, asset, score, source)
                   VALUES (?, ?, ?, 'combined')""",
                (ts, asset, score),
            )
        await db.commit()
    logger.info(f"[Sentiment] Wrote {len(scores)} asset scores to DB")


async def run_cycle() -> None:
    """Single sentiment collection cycle."""
    logger.info("[Sentiment] Starting collection cycle")

    reddit_scores, news_scores = await asyncio.gather(
        fetch_reddit_sentiment(),
        fetch_cryptopanic_sentiment(),
    )

    scores = aggregate_scores(reddit_scores, news_scores)
    await write_scores(scores)

    if scores:
        top = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:3]
        logger.info(f"[Sentiment] Top bullish: {top}")
        await log_agent(AGENT_NAME, "INFO", "Sentiment cycle complete", {"scores": scores})


async def run() -> None:
    """Main loop: collect sentiment every INTERVAL_SEC seconds."""
    logger.info(f"[Sentiment] Analyst starting (interval={INTERVAL_SEC}s)")
    while True:
        try:
            await run_cycle()
        except Exception as e:
            logger.error(f"[Sentiment] Cycle error: {e}")
        await asyncio.sleep(INTERVAL_SEC)


async def main():
    from dotenv import load_dotenv
    load_dotenv()
    from database.db import init_db
    await init_db()
    await run()


if __name__ == "__main__":
    asyncio.run(main())
