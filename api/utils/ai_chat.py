import os
import requests
from dotenv import load_dotenv
from typing import List, Dict, Any

# Load environment variables
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def get_ai_response(messages: List[Dict[str, str]]) -> str:
    """
    Get a response from the OpenRouter API using the mixtral-8x7b-32768 model.

    Args:
        messages: List of message dictionaries with 'role' and 'content' keys

    Returns:
        The assistant's response text
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("APP_REFERER", "https://ioio-app.com"),  # Optional
        "X-Title": "IOIO Property Management Assistant",  # Optional
    }

    data = {
        "model": "mistralai/mixtral-8x7b-32768",
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 1024,
    }

    try:
        response = requests.post(OPENROUTER_URL, headers=headers, json=data)
        print(f"Status code: {response.status_code}")
        print(f"Response content: {response.text}")
        response.raise_for_status()

        result = response.json()
        return result["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Error calling OpenRouter API: {str(e)}")
        return "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later."
