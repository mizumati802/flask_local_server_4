#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# カテゴリ変換マップ定義
CATEGORY1_MAP = {
    '日常': 'n',
    '仕事': 'j'
}

CATEGORY2_MAP = {
    'ログ': 'l',
    '書評': 'r',
    '自己分析': 'a',
    '成長記録': 'g',
    '精神鑑定': 'e',
    '鑑定': 'k',
    '個人情報': 'p',
    '資産管理': 'm',
    '技術スキル': 's',
    '環境整備': 'v',
    'ツール管理': 't',
    '機材管理': 'q',
    '健康管理': 'h',
    '事業概要': 'b',
    '所有物': 'o',
    '日記': 'n'
}

CATEGORY3_MAP = {
    '食': 'f',
    'アニメ': 'a',
    '酒': 'k',
    '本': 'h',
    'スキル': 's'
}

def compress_db_to_json():
    """
    SQLiteデータベースからuser_recordsテーブルのデータを読み込み、
    超圧縮形式のJSONとして出力する
    """
    # データベースパス
    db_path = '/Users/mizumachitakahiro/git_apps/flask_apps/local/flask_local_server_4/user_records.db'
    
    # 出力先のディレクトリ（同じディレクトリ）
    output_dir = os.path.dirname(db_path)
    
    # 出力ファイル名
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_file = os.path.join(output_dir, f'compressed_records_{timestamp}.json')
    
    # データベースに接続
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # テーブル構造を確認
        cursor.execute("PRAGMA table_info(user_records)")
        columns = cursor.fetchall()
        
        # カラム名のリスト
        column_names = [col[1] for col in columns]
        
        # データ取得
        cursor.execute("SELECT * FROM user_records")
        records = cursor.fetchall()
        
        # 圧縮データ作成
        compressed_data = []
        for record in records:
            # レコードを辞書に変換
            record_dict = {column_names[i]: record[i] for i in range(len(column_names))}
            
            # 短縮形式に変換
            compressed_record = []
            
            # 各フィールドを短縮形式に変換
            if 'id' in record_dict:
                compressed_record.append(f"i={record_dict['id']}")
            
            if 'title' in record_dict:
                compressed_record.append(f"t={record_dict['title']}")
            
            if 'description' in record_dict:
                compressed_record.append(f"d={record_dict['description']}")
            
            if 'category1' in record_dict:
                # カテゴリ1の変換
                cat1_value = record_dict['category1']
                cat1_code = CATEGORY1_MAP.get(cat1_value, cat1_value)
                compressed_record.append(f"c1={cat1_code}")
            
            if 'category2' in record_dict:
                # カテゴリ2の変換
                cat2_value = record_dict['category2']
                cat2_code = CATEGORY2_MAP.get(cat2_value, cat2_value)
                compressed_record.append(f"c2={cat2_code}")
            
            if 'category3' in record_dict:
                # カテゴリ3の変換
                cat3_value = record_dict['category3']
                cat3_code = CATEGORY3_MAP.get(cat3_value, cat3_value)
                compressed_record.append(f"c3={cat3_code}")
            
            if 'created_at' in record_dict:
                compressed_record.append(f"ca={record_dict['created_at']}")
            
            if 'updated_at' in record_dict:
                compressed_record.append(f"ua={record_dict['updated_at']}")
            
            if 'version' in record_dict:
                compressed_record.append(f"v={record_dict['version']}")
            
            # パイプで区切って一つの文字列に
            compressed_data.append('|'.join(compressed_record))
        
        # すべてのレコードをパイプで連結
        all_compressed = '|'.join(compressed_data)
        
        # 短縮キー定義も含めたJSONデータ作成
        json_data = {
            "definition": {
                "i": "id",
                "t": "title",
                "d": "description",
                "c1": "category1 (n=日常, j=仕事)",
                "c2": "category2 (l=ログ, r=書評, a=自己分析, g=成長記録, e=精神鑑定, k=鑑定, p=個人情報, m=資産管理, s=技術スキル, v=環境整備, t=ツール管理, q=機材管理, h=健康管理, b=事業概要, o=所有物)",
                "c3": "category3 (f=食, a=アニメ, k=酒, h=本, s=スキル)",
                "ca": "created_at",
                "ua": "updated_at",
                "v": "version"
            },
            "records_count": len(records),
            "compressed_data": all_compressed
        }
        
        # JSONファイルとして出力
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=None)
        
        print(f"圧縮完了！{len(records)}件のレコードを圧縮しました。")
        print(f"出力ファイル: {output_file}")
        print(f"圧縮データサイズ: {len(all_compressed)}文字")
        
    except sqlite3.Error as e:
        print(f"SQLiteエラー: {e}")
        return False
    except Exception as e:
        print(f"エラー: {e}")
        return False
    finally:
        if conn:
            conn.close()
    
    return True

def decompress_json_to_records(json_file_path):
    """
    圧縮されたJSONファイルからデータを読み込み、元のレコード形式に戻す
    """
    # 逆変換用のマップを作成
    REVERSE_CATEGORY1_MAP = {v: k for k, v in CATEGORY1_MAP.items()}
    REVERSE_CATEGORY2_MAP = {v: k for k, v in CATEGORY2_MAP.items()}
    REVERSE_CATEGORY3_MAP = {v: k for k, v in CATEGORY3_MAP.items()}
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        
        compressed_data = json_data['compressed_data']
        records = []
        
        # パイプで分割して各レコードを取得
        compressed_records = compressed_data.split('|')
        
        # レコードを辞書に変換
        i = 0
        current_record = {}
        
        for item in compressed_records:
            if not item:
                continue
                
            parts = item.split('=', 1)
            if len(parts) != 2:
                continue
                
            key, value = parts
            
            # キーに応じてフィールド名を復元
            if key == 'i':
                # 新しいレコードの開始
                if current_record and i > 0:
                    records.append(current_record)
                current_record = {'id': value}
            elif key == 't':
                current_record['title'] = value
            elif key == 'd':
                current_record['description'] = value
            elif key == 'c1':
                # カテゴリ1を元の値に戻す
                current_record['category1'] = REVERSE_CATEGORY1_MAP.get(value, value)
            elif key == 'c2':
                # カテゴリ2を元の値に戻す
                current_record['category2'] = REVERSE_CATEGORY2_MAP.get(value, value)
            elif key == 'c3':
                # カテゴリ3を元の値に戻す
                current_record['category3'] = REVERSE_CATEGORY3_MAP.get(value, value)
            elif key == 'ca':
                current_record['created_at'] = value
            elif key == 'ua':
                current_record['updated_at'] = value
            elif key == 'v':
                current_record['version'] = value
                
            # 最後のフィールドでレコードを追加
            if key == 'v':
                records.append(current_record)
                current_record = {}
                i += 1
        
        # 最後のレコードを追加
        if current_record:
            records.append(current_record)
        
        return records
        
    except Exception as e:
        print(f"解凍エラー: {e}")
        return []

def main():
    print("SQLiteデータベース超圧縮ツール")
    print("=" * 40)
    print("カテゴリ変換マップ:")
    print(f"カテゴリ1: {CATEGORY1_MAP}")
    print(f"カテゴリ2: {CATEGORY2_MAP}")
    print(f"カテゴリ3: {CATEGORY3_MAP}")
    print("=" * 40)
    
    # データベース圧縮処理実行
    success = compress_db_to_json()
    
    if success:
        print("処理が正常に完了しました。")
    else:
        print("処理中にエラーが発生しました。")

if __name__ == "__main__":
    main()
