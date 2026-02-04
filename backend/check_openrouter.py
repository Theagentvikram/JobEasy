import os
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

API_KEY = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=API_KEY,
)

print("Fetching available free models...")
try:
    models = client.models.list()
    free_models = [m.id for m in models.data if ":free" in m.id]
    
    print(f"Found {len(free_models)} free models:")
    for m in free_models:
        print(f" - {m}")
        
except Exception as e:
    print(f"Error: {e}")
