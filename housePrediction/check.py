import pickle
import sklearn

print("scikit-learn version:", sklearn.__version__)

with open("house.pkl", "rb") as f:
    model = pickle.load(f)

print("Model loaded successfully ✅")
print("Model type:", type(model))

# Check pipeline structure
if hasattr(model, "named_steps"):
    print("Pipeline steps:", model.named_steps.keys())
else:
    print("❌ Not a Pipeline")

# Check preprocessor
preprocessor = model.named_steps.get("preprocessor", None)
print("Has preprocessor:", preprocessor is not None)

# Check feature names
try:
    features = preprocessor.feature_names_in_
    print("Number of input features:", len(features))
    print("Sample features:", features[:10])
except Exception as e:
    print("❌ Feature name issue:", e)
