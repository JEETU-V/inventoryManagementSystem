from app import app, initialize_fresh_database


initialize_fresh_database(app)
print("Fresh database initialized and stamped at the current migration head.")
