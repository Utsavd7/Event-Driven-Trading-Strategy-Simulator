import os
from dotenv import load_dotenv

load_dotenv()

# Live Data API Keys
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")
ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY", "")
POLYGON_API_KEY = os.getenv("POLYGON_API_KEY", "")
IEX_CLOUD_KEY = os.getenv("IEX_CLOUD_KEY", "")

# News & Sentiment APIs
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
REDDIT_CLIENT_ID = os.getenv("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET = os.getenv("REDDIT_CLIENT_SECRET", "")

# AI Intelligence Layer (free tier at console.groq.com)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Cache settings
CACHE_DIR = "cache"
CACHE_EXPIRY = 300

# API settings
API_HOST = "0.0.0.0"
API_PORT = 8000

# Data endpoints
FINNHUB_BASE = "https://finnhub.io/api/v1"
ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query"
POLYGON_BASE = "https://api.polygon.io"
IEX_BASE = "https://cloud.iexapis.com/stable"
