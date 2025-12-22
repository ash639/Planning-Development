# from dotenv import load_dotenv
# import os

# load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# import os
# import json
# import mysql.connector
# from mysql.connector import Error
# from dotenv import load_dotenv
# import logging
# import ollama

# # ----------------------------- Logging Setup -----------------------------
# logging.basicConfig(
#     level=logging.INFO,
#     format="%(asctime)s - %(levelname)s - %(message)s",
#     handlers=[
#         logging.FileHandler("chatbot.log", encoding="utf-8"),
#         logging.StreamHandler()
#     ]
# )
# logger = logging.getLogger(__name__)
# logger.info("=== Bihar Gov Chatbot Backend Started (Ollama qwen3:4b) ===")

# # ----------------------------- Environment & Config -----------------------------
# load_dotenv()

# DB_HOST =  os.getenv("MYSQL_HOST")   # 🔥 FORCE TCP/IP (DO NOT use localhost)
# DB_PORT = int(os.getenv("MYSQL_PORT", "3306"))
# DB_DATABASE = os.getenv("MYSQL_DATABASE")
# DB_USERNAME = os.getenv("MYSQL_USER")
# DB_PASSWORD = os.getenv("MYSQL_PASSWORD")

# OLLAMA_MODEL = "qwen3:4b"

# # ----------------------------- DB Connection Helper -----------------------------
# import os
# import mysql.connector

# def get_db_connection():
#     return mysql.connector.connect(
#         host=os.getenv("DB_HOST", "localhost"),
#         port=int(os.getenv("DB_PORT", 3306)),
#         database=os.getenv("dataset"),
#         user=os.getenv("root"),
#         password=os.getenv("1234"),
#         use_pure=True,
#         autocommit=True
#     )

# # ----------------------------- Load Table Metadata -----------------------------
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# METADATA_PATH = os.path.join(BASE_DIR, "table_metadata.json")

# if not os.path.exists(METADATA_PATH):
#     raise FileNotFoundError(f"table_metadata.json not found at {METADATA_PATH}")

# with open(METADATA_PATH, "r", encoding="utf-8") as f:
#     TABLE_METADATA = json.load(f)

# logger.info(
#     f"Loaded metadata for "
#     f"{len(TABLE_METADATA) if isinstance(TABLE_METADATA, list) else 1} table(s)"
# )

# # ----------------------------- Helper Functions -----------------------------
# def fetch_table_columns(table_name):
#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()
#         cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
#         columns = cursor.fetchall()
#         cursor.close()
#         conn.close()

#         return [
#             {"name": col[0], "type": col[1], "description": "No description"}
#             for col in columns
#         ]

#     except Error as err:
#         logger.error(f"Schema error {table_name}: {err}")
#         raise ValueError(f"Schema error: {err}")

# def select_relevant_tables(query):
#     query_words = set(query.lower().split())
#     metadata_list = TABLE_METADATA if isinstance(TABLE_METADATA, list) else [TABLE_METADATA]

#     scored = []
#     for table in metadata_list:
#         keywords = set(
#             table.get("table_name", "").lower().split("_")
#             + table.get("description", "").lower().split()
#             + table.get("measurements", "").lower().split("_")
#         )
#         matches = len(query_words & keywords)
#         if matches > 0:
#             scored.append((matches, table))

#     if not scored:
#         return metadata_list[:3]

#     scored.sort(key=lambda x: x[0], reverse=True)
#     return [t for _, t in scored[:3]]

# # ----------------------------- Core Functions -----------------------------
# def generate_sql_query(user_query: str):
#     relevant_tables = select_relevant_tables(user_query)
#     if not relevant_tables:
#         return None, "No relevant tables found."

#     schema_str = "MySQL Database Schema:\n"
#     for table in relevant_tables:
#         table_name = table["table_name"]
#         columns = fetch_table_columns(table_name)

#         schema_str += f"Table: {table_name} - {table.get('description', '')}\n"
#         for col in columns:
#             schema_str += f"  • {col['name']} ({col['type']})\n"
#         schema_str += "\n"

#     prompt = f"""
# You are a precise SQL expert.
# Write ONLY a valid MySQL SELECT query strictly based on the schema.
# If impossible, respond exactly: INVALID_QUERY

# Schema:
# {schema_str}

# Question: {user_query}

# SQL:
# """

#     response = ollama.generate(model=OLLAMA_MODEL, prompt=prompt)
#     sql = response["response"].strip()

#     if "INVALID_QUERY" in sql.upper():
#         return None, "Cannot answer with available data."

#     if sql.startswith("```"):
#         sql = sql.split("\n", 1)[1].rsplit("```", 1)[0].strip()

#     return sql, None

# def execute_sql(sql_query: str):
#     try:
#         conn = get_db_connection()
#         cursor = conn.cursor()
#         cursor.execute(sql_query)
#         results = cursor.fetchall()
#         columns = [desc[0] for desc in cursor.description]
#         cursor.close()
#         conn.close()
#         return results, columns, None

#     except Error as err:
#         return None, None, str(err)

# def frame_answer(user_query: str, results, columns):
#     if not results:
#         return "No results found."

#     lines = []
#     for row in results[:20]:
#         lines.append(" | ".join(f"{c}: {v}" for c, v in zip(columns, row)))

#     prompt = f"""
# Answer clearly and concisely using the results.

# Question: {user_query}

# Results:
# {chr(10).join(lines)}

# Answer:
# """

#     response = ollama.generate(model=OLLAMA_MODEL, prompt=prompt)
#     return response["response"].strip()

# # ----------------------------- Health Check -----------------------------
# if __name__ == "__main__":
#     try:
#         ollama.list()
#         print("✅ Ollama is running and reachable.")
#         conn = get_db_connection()
#         print("✅ MySQL connection successful.")
#         conn.close()
#     except Exception as e:
#         print(f"❌ Health check failed: {e}")
# ==============================
# Bihar Gov Chatbot - Backend
# ==============================

import os
import json
import logging
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
import ollama

# -----------------------------
# Environment Loading
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("MYSQL_PORT", "3306"))
DB_DATABASE = os.getenv("MYSQL_DATABASE")
DB_USERNAME = os.getenv("MYSQL_USER")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD")

OLLAMA_MODEL = "qwen3:4b"

# -----------------------------
# Logging Setup
# -----------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("chatbot.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
logger.info("=== Chatbot Backend Started ===")

# -----------------------------
# Database Connection
# -----------------------------
def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        database=DB_DATABASE,
        user=DB_USERNAME,
        password=DB_PASSWORD,
        use_pure=True,     # 🔥 force TCP/IP (fixes Windows localhost bug)
        autocommit=True
    )

# -----------------------------
# Load Table Metadata
# -----------------------------
METADATA_PATH = os.path.join(BASE_DIR, "table_metadata.json")

if not os.path.exists(METADATA_PATH):
    raise FileNotFoundError(f"❌ table_metadata.json not found at {METADATA_PATH}")

with open(METADATA_PATH, "r", encoding="utf-8") as f:
    TABLE_METADATA = json.load(f)

if not isinstance(TABLE_METADATA, list):
    TABLE_METADATA = [TABLE_METADATA]

logger.info(f"Loaded metadata for {len(TABLE_METADATA)} table(s)")

# -----------------------------
# Schema Helper
# -----------------------------
def fetch_table_columns(table_name: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"SHOW COLUMNS FROM `{table_name}`")
        columns = cursor.fetchall()
        cursor.close()
        conn.close()

        return [
            {
                "name": col[0],
                "type": col[1],
                "description": "No description"
            }
            for col in columns
        ]

    except Error as err:
        logger.error(f"Schema error for table {table_name}: {err}")
        raise ValueError(f"Schema error: {err}")

# -----------------------------
# Table Selection Logic
# -----------------------------
def select_relevant_tables(query: str):
    query_words = set(query.lower().split())
    scored_tables = []

    for table in TABLE_METADATA:
        keywords = set(
            table.get("table_name", "").lower().split("_")
            + table.get("description", "").lower().split()
            + table.get("measurements", "").lower().split("_")
        )

        score = len(query_words & keywords)
        if score > 0:
            scored_tables.append((score, table))

    if not scored_tables:
        return TABLE_METADATA[:3]

    scored_tables.sort(key=lambda x: x[0], reverse=True)
    return [t for _, t in scored_tables[:3]]

# -----------------------------
# SQL Generation (Ollama)
# -----------------------------
def generate_sql_query(user_query: str):
    relevant_tables = select_relevant_tables(user_query)
    if not relevant_tables:
        return None, "No relevant tables found."

    schema_text = "MySQL Database Schema:\n\n"

    for table in relevant_tables:
        table_name = table["table_name"]
        columns = fetch_table_columns(table_name)

        schema_text += f"Table: {table_name}\n"
        for col in columns:
            schema_text += f"  - {col['name']} ({col['type']})\n"
        schema_text += "\n"

    prompt = f"""
You are a strict MySQL expert.
Write ONLY a valid MySQL SELECT query using the schema below.
Do NOT guess columns or tables.
If the question cannot be answered, reply exactly: INVALID_QUERY

Schema:
{schema_text}

Question: {user_query}

SQL:
"""

    response = ollama.generate(
        model=OLLAMA_MODEL,
        prompt=prompt
    )

    sql = response["response"].strip()

    if "INVALID_QUERY" in sql.upper():
        return None, "Cannot answer with available data."

    if sql.startswith("```"):
        sql = sql.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return sql, None

# -----------------------------
# SQL Execution
# -----------------------------
def execute_sql(sql_query: str):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(sql_query)

        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]

        cursor.close()
        conn.close()
        return rows, columns, None

    except Error as err:
        logger.error(f"SQL execution error: {err}")
        return None, None, str(err)

# -----------------------------
# Natural Language Answer
# -----------------------------
def frame_answer(user_query: str, results, columns):
    if not results:
        return "No results found."

    formatted = []
    for row in results[:20]:
        formatted.append(
            " | ".join(f"{c}: {v}" for c, v in zip(columns, row))
        )

    prompt = f"""
Answer clearly using the SQL results.

Question: {user_query}

Results:
{chr(10).join(formatted)}

Answer:
"""

    response = ollama.generate(
        model=OLLAMA_MODEL,
        prompt=prompt
    )

    return response["response"].strip()

# -----------------------------
# Health Check
# -----------------------------
if __name__ == "__main__":
    try:
        ollama.list()
        print("✅ Ollama is running")

        conn = get_db_connection()
        print("✅ MySQL connection successful")
        conn.close()

    except Exception as e:
        print(f"❌ Health check failed: {e}")
