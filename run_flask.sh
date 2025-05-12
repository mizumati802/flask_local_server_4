APP_DIR="/Users/mizumachitakahiro/git_apps/flask_apps/local/flask_local_server_4"
PYTHON_PATH="/Library/Frameworks/Python.framework/Versions/3.10/bin/python3"

cd "$APP_DIR"
exec "$PYTHON_PATH" app.py --port 11765
