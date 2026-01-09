import streamlit as st
import pandas as pd
import numpy as np
import pickle

# -----------------------------
# Load model
# -----------------------------
@st.cache_resource
def load_model():
    with open("house.pkl", "rb") as f:
        model = pickle.load(f)
    return model

model = load_model()

st.set_page_config(page_title="House Price Predictor", layout="centered")

st.title("🏠 House Price Prediction App")
st.write("Enter house features and get a predicted sale price.")

# -----------------------------
# User input form
# -----------------------------
st.header("House Features")

# NUMERIC FEATURES (examples – adjust if needed)
overall_qual = st.slider("Overall Quality (1–10)", 1, 10, 5)
gr_liv_area = st.number_input("Above Ground Living Area (sq ft)", 300, 6000, 1500)
garage_cars = st.slider("Garage Cars", 0, 4, 2)
total_bsmt_sf = st.number_input("Total Basement SF", 0, 5000, 800)

# CATEGORICAL FEATURES
neighborhood = st.selectbox(
    "Neighborhood",
    [
        "Names", "CollgCr", "OldTown", "Edwards", "Somerst",
        "NridgHt", "Gilbert", "Sawyer", "NWAmes", "SawyerW"
    ]
)

ms_zoning = st.selectbox(
    "MS Zoning",
    ["RL", "RM", "FV", "RH", "C (all)"]
)

# -----------------------------
# Predict button
# -----------------------------
if st.button("Predict Price 💰"):

    # Create input dataframe (MUST MATCH TRAINING FEATURES)
    input_data = pd.DataFrame([{
        "OverallQual": overall_qual,
        "GrLivArea": gr_liv_area,
        "GarageCars": garage_cars,
        "TotalBsmtSF": total_bsmt_sf,
        "Neighborhood": neighborhood,
        "MSZoning": ms_zoning
    }])

    # Add missing columns with default values
    model_features = model.named_steps["preprocessor"].feature_names_in_

    for col in model_features:
        if col not in input_data.columns:
            input_data[col] = 0

    input_data = input_data[model_features]

    prediction = model.predict(input_data)[0]

    st.success(f"🏷️ Estimated House Price: ${prediction:,.0f}")
