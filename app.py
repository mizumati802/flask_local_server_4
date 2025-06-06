# app.py
from flask import Flask
from routes import register_routes  # ← インポート
import os

app = Flask(__name__, template_folder='templates')  # templatesフォルダ明示的指定

register_routes(app)  # ← ルート登録

if __name__ == "__main__":
    app.run(port=11765, debug=True)
