import os
from dotenv import load_dotenv

load_dotenv()

# Live Data API Keys
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")  # Real-time events & prices
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "")  # Backup price data
POLYGON_API_KEY = os.getenv("POLYGON_API_KEY", "")  # Real-time market data
IEX_CLOUD_KEY = os.getenv("IEX_CLOUD_KEY", "")  # Alternative real-time data

# News & Sentiment APIs
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")

# Cache settings (shorter for live data)
CACHE_DIR = "cache"
CACHE_EXPIRY = 300  # 5 minutes for live data

# API settings
API_HOST = "0.0.0.0"
API_PORT = 8000

# Live data endpoints
FINNHUB_BASE = "https://finnhub.io/api/v1"
ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query"
POLYGON_BASE = "https://api.polygon.io"
IEX_BASE = "https://cloud.iexapis.com/stable"
