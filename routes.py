import os
import sqlite3
import threading
import webbrowser
import base64
import subprocess  # 追加：subprocessモジュールをインポート
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, g, send_from_directory, jsonify, current_app
from werkzeug.utils import secure_filename  # 追加：ファイル名の安全化用

# データベースファイルのパス
DATABASE = '/Users/mizumachitakahiro/git_apps/flask_apps/local/flask_local_server_4/user_records.db'

# データベース接続を取得
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

# アプリケーション終了時にデータベース接続を閉じる
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

# データベースの初期化（既存のテーブルはそのまま使用）
def init_db():
    # データベースディレクトリの存在確認
    db_dir = os.path.dirname(DATABASE)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
    
    # データベースファイルが存在しない場合のみテーブルを作成
    if not os.path.exists(DATABASE):
        with current_app.app_context():
            db = get_db()
            # user_recordsテーブルを作成（制約は最小限に）
            db.execute('''
                CREATE TABLE IF NOT EXISTS user_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT,
                    description TEXT,
                    category1 TEXT,
                    category2 TEXT,
                    category3 TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    version INTEGER,
                    img_path TEXT
                )
            ''')
            db.commit()
    else:
        # 既存のテーブルに img_path カラムが存在するか確認し、なければ追加
        with current_app.app_context():
            db = get_db()
            # カラムが存在するか確認
            columns = db.execute("PRAGMA table_info(user_records)").fetchall()
            column_names = [column['name'] for column in columns]
            
            # img_path カラムが存在しない場合は追加
            if 'img_path' not in column_names:
                db.execute('ALTER TABLE user_records ADD COLUMN img_path TEXT')
                db.commit()

# 基本的なテンプレートファイルを作成
def create_template_file(file_name, content):
    # 現在のディレクトリを取得
    current_dir = os.path.dirname(os.path.abspath(__file__))
    template_dir = os.path.join(current_dir, 'templates')
    os.makedirs(template_dir, exist_ok=True)
    
    file_path = os.path.join(template_dir, file_name)
    if not os.path.exists(file_path):
        with open(file_path, 'w') as f:
            f.write(content)

# テンプレートファイルを作成
def create_templates():
    # personal_record.htmlテンプレート
    create_template_file('personal_record.html', '''<!DOCTYPE html>
<html>
<!-- personal_record.htmlの内容 -->
</html>''')
    
    # icon_generator.htmlテンプレート
    create_template_file('icon_generator.html', '''<!DOCTYPE html>
<html>
<!-- icon_generator.htmlの内容 -->
</html>''')

# 現在の日時を取得
def get_timestamp():
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')

# メイン関数：routes.pyをappに登録する
def register_routes(app):
    # 各種ディレクトリをセットアップ
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # プロジェクトディレクトリ内に保存先フォルダを作成
    img_data_dir = os.path.join(current_dir, 'img_data')
    os.makedirs(img_data_dir, exist_ok=True)
    
    # 追加：画像保存用ディレクトリの作成
    img_dir = os.path.join(current_dir, 'img')
    os.makedirs(img_dir, exist_ok=True)
    
    # データベースディレクトリの作成
    db_dir = os.path.dirname(DATABASE)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
    
    # テンプレートファイルが存在するか確認し、なければ作成
    create_templates()
    
    # アプリケーションコンテキストの設定
    app.teardown_appcontext(close_connection)
    
    # ホームページ - メインメニュー
    @app.route('/')
    def index():
        """メインページ"""
        return '''
        <html>
            <head>
                <title>Flask アプリケーション</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h1 { color: #3c7de6; }
                    .menu { display: flex; gap: 20px; margin-top: 30px; }
                    .menu a { 
                        text-decoration: none; 
                        padding: 15px 25px; 
                        background-color: #4CAF50; 
                        color: white; 
                        border-radius: 5px;
                        font-weight: bold;
                    }
                    .menu a:hover { background-color: #45a049; }
                </style>
            </head>
            <body>
                <h1>Flask アプリケーション</h1>
                <p>以下のメニューから選択してください：</p>
                <div class="menu">
                    <a href="/personal_record">ユーザーレコード管理</a>
                    <a href="/icon_generator">アイコンジェネレーター</a>
                </div>
            </body>
        </html>
        '''

    # ユーザーレコード管理へのルーティング
    @app.route('/personal_record')
    def personal_record():
        try:
            db = get_db()
            records = db.execute('SELECT * FROM user_records ORDER BY id DESC').fetchall()
            return render_template('personal_record.html', records=records)
        except Exception as e:
            current_app.logger.error(f"Error in personal_record: {str(e)}")
            return f"エラーが発生しました: {str(e)}", 500

    # アイコンジェネレーターへのルーティング
    @app.route('/icon_generator')
    def icon_generator():
        return render_template('icon_generator.html')

    # API - レコード詳細取得
    @app.route('/api/record/<int:id>')
    def api_record(id):
        try:
            db = get_db()
            record = db.execute('SELECT * FROM user_records WHERE id = ?', (id,)).fetchone()
            if record is None:
                return jsonify({'error': 'Record not found'}), 404
            
            record_dict = dict(record)
            return jsonify(record_dict)
        except Exception as e:
            current_app.logger.error(f"Error in api_record: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # API - 全レコード取得
    @app.route('/api/records/all')
    def api_records_all():
        try:
            db = get_db()
            records = db.execute('SELECT * FROM user_records ORDER BY id DESC').fetchall()
            records_list = [dict(record) for record in records]
            return jsonify(records_list)
        except Exception as e:
            current_app.logger.error(f"Error in api_records_all: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # 追加：API - category2一覧取得
    @app.route('/api/categories/category2')
    def api_category2_list():
        try:
            db = get_db()
            categories = db.execute('SELECT DISTINCT category2 FROM user_records WHERE category2 IS NOT NULL AND category2 != "" ORDER BY category2').fetchall()
            category_list = [row['category2'] for row in categories]
            return jsonify(category_list)
        except Exception as e:
            current_app.logger.error(f"Error in api_category2_list: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # 追加：API - category2でフィルタしたレコード取得
    @app.route('/api/records/filter/category2/<category2>')
    def api_records_by_category2(category2):
        try:
            db = get_db()
            records = db.execute('SELECT * FROM user_records WHERE category2 = ? ORDER BY id DESC', (category2,)).fetchall()
            records_list = [dict(record) for record in records]
            return jsonify(records_list)
        except Exception as e:
            current_app.logger.error(f"Error in api_records_by_category2: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # 新規レコードの保存
    @app.route('/create', methods=['POST'])
    def create_record():
        try:
            # フォームからデータを取得
            title = request.form.get('title', '')
            description = request.form.get('description', '')
            category1 = request.form.get('category1', '')
            category2 = request.form.get('category2', '')
            category3 = request.form.get('category3', '')
            img_path = request.form.get('img_path', '')  # 追加：img_pathを取得
            
            # 現在のタイムスタンプを取得
            timestamp = get_timestamp()
            
            db = get_db()
            db.execute(
                '''INSERT INTO user_records 
                (title, description, category1, category2, category3, created_at, updated_at, version, img_path) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (title, description, category1, category2, category3, timestamp, timestamp, 1, img_path)
            )
            db.commit()
            
            return jsonify({'success': True})
        except Exception as e:
            current_app.logger.error(f"Error in create_record: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # レコードの更新
    @app.route('/edit/<int:id>', methods=['POST'])
    def update_record(id):
        try:
            # フォームからデータを取得
            title = request.form.get('title', '')
            description = request.form.get('description', '')
            category1 = request.form.get('category1', '')
            category2 = request.form.get('category2', '')
            category3 = request.form.get('category3', '')
            img_path = request.form.get('img_path', '')  # 追加：img_pathを取得
            
            # まず現在のレコードを取得
            db = get_db()
            record = db.execute('SELECT * FROM user_records WHERE id = ?', (id,)).fetchone()
            
            if record is None:
                return jsonify({'error': 'Record not found'}), 404
            
            # 現在のバージョンからインクリメント
            version = record['version'] if record['version'] is not None else 0
            new_version = version + 1
            
            # 現在のタイムスタンプを取得
            timestamp = get_timestamp()
            
            # レコードを更新
            db.execute(
                '''UPDATE user_records 
                SET title = ?, description = ?, category1 = ?, category2 = ?, category3 = ?, 
                updated_at = ?, version = ?, img_path = ? 
                WHERE id = ?''',
                (title, description, category1, category2, category3, timestamp, new_version, img_path, id)
            )
            db.commit()
            
            return jsonify({'success': True})
        except Exception as e:
            current_app.logger.error(f"Error in update_record: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # レコードの削除
    @app.route('/delete/<int:id>', methods=['POST'])
    def delete_record(id):
        try:
            db = get_db()
            
            # 削除前にレコードの情報を取得
            record = db.execute('SELECT * FROM user_records WHERE id = ?', (id,)).fetchone()
            
            if record and record['img_path']:
                # 画像パスがある場合、関連画像を削除
                img_paths = record['img_path'].split(',')
                for path in img_paths:
                    if path and path.strip():
                        # パスから不要な部分を取り除いて、ファイルパスを取得
                        # パスの形式は 'img/filename.jpg' のような形
                        file_path = os.path.join(current_dir, path.strip())
                        if os.path.exists(file_path):
                            try:
                                os.remove(file_path)
                                current_app.logger.info(f"画像ファイルを削除しました: {file_path}")
                            except Exception as e:
                                current_app.logger.warning(f"画像ファイルの削除中にエラー: {str(e)}")
            
            # レコードを削除
            db.execute('DELETE FROM user_records WHERE id = ?', (id,))
            db.commit()
            
            return jsonify({'success': True})
        except Exception as e:
            current_app.logger.error(f"Error in delete_record: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # 静的ファイル用のルート
    @app.route('/static/<path:path>')
    def send_static(path):
        """静的ファイルを提供するルート"""
        return send_from_directory('static', path)

    # 画像データディレクトリへのアクセスルート
    @app.route('/img_data/<path:filename>')
    def download_file(filename):
        """画像ファイルをダウンロードできるようにするルート"""
        return send_from_directory(img_data_dir, filename)

    # 追加：画像ディレクトリへのアクセスルート
    @app.route('/img/<path:filename>')
    def serve_img(filename):
        """画像ファイルを提供するルート"""
        return send_from_directory(img_dir, filename)

    # アイコン保存用APIエンドポイント
    @app.route('/save_icon', methods=['POST'])
    def save_icon():
        """クライアントから送信された画像データを保存する"""
        try:
            data = request.json
            image_data = data['imageData']
            filename = data['filename']
            
            # Base64データからプレフィックスを除去
            if 'data:image/' in image_data:
                image_data = image_data.split(',')[1]
            
            # 画像データをデコードしてファイルに保存
            img_data = base64.b64decode(image_data)
            file_path = os.path.join(img_data_dir, filename)
            
            with open(file_path, 'wb') as f:
                f.write(img_data)
            
            return jsonify({'success': True, 'file_path': file_path})
        except Exception as e:
            current_app.logger.error(f"Error in save_icon: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # 追加：画像アップロード用APIエンドポイント
    @app.route('/upload_image', methods=['POST'])
    def upload_image():
        """クライアントから送信された画像ファイルを保存する"""
        try:
            if 'file' not in request.files:
                return jsonify({'error': 'No file part'}), 400
            
            file = request.files['file']
            
            if file.filename == '':
                return jsonify({'error': 'No selected file'}), 400
            
            # ファイル名の安全性を確保
            filename = secure_filename(file.filename)
            
            # タイムスタンプをファイル名に追加して一意性を確保
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            name, ext = os.path.splitext(filename)
            unique_filename = f"{name}_{timestamp}{ext}"
            
            # ファイルを保存
            file_path = os.path.join(img_dir, unique_filename)
            file.save(file_path)
            
            # 相対パスを返す
            relative_path = f"img/{unique_filename}"
            
            return jsonify({'success': True, 'path': relative_path})
        except Exception as e:
            current_app.logger.error(f"Error in upload_image: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # データベース診断
    @app.route('/db_check')
    def db_check():
        """データベースの状態を確認するエンドポイント"""
        try:
            db = get_db()
            # テーブル構造を確認
            table_info = db.execute("PRAGMA table_info(user_records)").fetchall()
            table_info_list = [dict(col) for col in table_info]
            
            # レコード数を確認
            record_count = db.execute("SELECT COUNT(*) as count FROM user_records").fetchone()['count']
            
            # 最新のレコードを取得
            latest_records = db.execute("SELECT * FROM user_records ORDER BY id DESC LIMIT 5").fetchall()
            latest_records_list = [dict(record) for record in latest_records]
            
            return jsonify({
                'table_structure': table_info_list,
                'record_count': record_count,
                'latest_records': latest_records_list
            })
        except Exception as e:
            current_app.logger.error(f"Error in db_check: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # 追加：row_json.pyを実行するためのエンドポイント
    @app.route('/execute_row_json', methods=['POST'])
    def execute_row_json():
        """row_json.pyスクリプトを実行するエンドポイント"""
        try:
            # row_json.pyのパスを構築
            script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'row_json.py')
            
            # Pythonスクリプトを実行（システムのPythonパスを使用）
            import sys
            result = subprocess.run([sys.executable, script_path], capture_output=True, text=True)
            
            # 実行結果を取得
            stdout = result.stdout
            stderr = result.stderr
            return_code = result.returncode
            
            if return_code == 0:
                return jsonify({
                    'success': True,
                    'output': stdout
                })
            else:
                return jsonify({
                    'success': False,
                    'error': stderr
                }), 500
                
        except Exception as e:
            current_app.logger.error(f"Error executing row_json.py: {str(e)}")
            return jsonify({'error': str(e)}), 500

    # データベースの初期化を実行（appが渡された後）
    with app.app_context():
        init_db()   