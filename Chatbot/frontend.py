# frontend.py
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

import streamlit as st
from backend import generate_sql_query, execute_sql, frame_answer

# ----------------------------- Page Config & Styling -----------------------------
st.set_page_config(
    page_title="Bihar Environment Chatbot",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.markdown("""
<style>
    .stApp { background-color: black; }
    .header {
        background: linear-gradient(90deg, #228b22, #32cd32);
        padding: 1.5rem;
        border-radius: 12px;
        color: white;
        text-align: center;
        margin-bottom: 2rem;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    .stChatMessage {
        border-radius: 12px;
        padding: 12px;
        margin: 10px 0;
    }
    /* User message */
    div[data-testid="stChatMessage"] {
        background-color: black !important;
        border: 1px solid #20b2aa;
    }
    /* Assistant message */
    div[data-testid="stChatMessage"]:nth-child(even) {
        background-color: black !important;
        border: 1px solid #228b22;
    }
    .stButton > button {
        background-color: #32cd32;
        color: white;
        border-radius: 8px;
        height: 3em;
        width: 100%;
    }
    # .stButton > button:hover {
    #     background-color: #228b22;
    # }
    .sidebar .sidebar-content {
        background-color: #98fb98;
    }
</style>
""", unsafe_allow_html=True)

# ----------------------------- Header -----------------------------
st.markdown("""
<div class="header">
    <h1>🌳 Bihar Government Chatbot</h1>
    <h3>Department of Environment, Forest & Climate Change</h3>
    <p>Ask about forest cover, wildlife, pollution, climate projects, and more.</p>
</div>
""", unsafe_allow_html=True)

# ----------------------------- Sidebar -----------------------------
with st.sidebar:
    st.image("https://via.placeholder.com/250x120/228b22/ffffff?text=Bihar+EFCC+Logo", use_column_width=True)
    st.markdown("### ℹ️ About")
    st.info("This AI assistant queries official databases to provide accurate environmental data for Bihar.")
    st.markdown("### ⚙️ Powered By")
    st.markdown("- Local Ollama (qwen3:4b)")
    st.markdown("- MySQL Database")
    st.markdown("- Streamlit")
    st.markdown("### 💡 Tips")
    st.markdown("- Ask specific questions")
    st.markdown("- Example: 'Forest cover in Patna district 2024?'")

# ----------------------------- Chat Logic -----------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

# User input
if prompt := st.chat_input("Ask a question about environment, forest or climate change in Bihar..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Processing your question..."):
            sql, err = generate_sql_query(prompt)
            if err:
                response = f"❌ {err}"
            else:
                with st.expander("🔍 Generated SQL (click to view)", expanded=False):
                    st.code(sql, language="sql")

                results, columns, db_err = execute_sql(sql)
                if db_err:
                    response = f"❌ Database Error: {db_err}"
                else:
                    answer = frame_answer(prompt, results, columns)
                    response = answer

        st.markdown(response)
        st.session_state.messages.append({"role": "assistant", "content": response})