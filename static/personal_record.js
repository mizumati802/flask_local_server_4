// グローバル変数
let currentRecordId = null;
let existingCategories = {
    category1: new Set(),
    category2: new Set(),
    category3: new Set()
};
let allRecords = []; // すべてのレコードを保持する配列
let uploadedImagePaths = []; // 通常レコード用の画像パス配列
let diaryUploadedImagePaths = []; // 日記用の画像パス配列
let filteredRecords = []; // 追加：フィルタされたレコードを保持する配列

// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
});

// アプリ初期化
function initApp() {
    // フォームを表示
    document.getElementById('record-form').classList.remove('hidden');
    
    // カテゴリ抽出と取得
    extractExistingCategories();
    
    // レコード取得とツリー構築
    fetchAllRecordsAndBuildTree();
    
    // 画像関連の初期化
    setupImageUpload();
    setupDiaryImageUpload();
    setupImageModal();
    
    // 追加：カテゴリ2フィルタの初期化
    loadCategory2Options();
}

// イベントリスナーの設定
function setupEventListeners() {
    // ボタンイベント
    setupButtonListeners();
    
    // タブ切り替えイベント
    setupTabListeners();
    
    // キーボードショートカット（重複防止）
    setupKeyboardShortcuts();
}

// ボタンイベントの設定
function setupButtonListeners() {
    // テーブル内のボタン
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            viewRecord(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            editRecord(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteRecord(this.getAttribute('data-id'));
        });
    });
    
    // 詳細ビュー内のボタン
    document.getElementById('edit-btn-detail').addEventListener('click', function() {
        editRecord(currentRecordId);
    });
    
    document.getElementById('delete-btn-detail').addEventListener('click', function() {
        deleteRecord(currentRecordId);
    });
}

// タブ切り替えイベントの設定
function setupTabListeners() {
    // フォームタブ
    document.getElementById('diary-tab').addEventListener('shown.bs.tab', function() {
        console.log('日記フォームタブが選択されました');
    });
    
    document.getElementById('normal-tab').addEventListener('shown.bs.tab', function() {
        console.log('通常レコードフォームタブが選択されました');
    });
    
    // コンテンツタブ
    // 修正: click イベントでも buildDiaryList を呼び出す
    document.getElementById('diaries-tab').addEventListener('click', function() {
        // クリック時にも日記リストを構築
        setTimeout(function() {
            buildDiaryList();
        }, 100); // わずかな遅延を入れる
    });
    
    // 元のイベントも保持
    document.getElementById('diaries-tab').addEventListener('shown.bs.tab', function() {
        buildDiaryList();
    });
    
    // 追加：フィルタタブのイベント
    document.getElementById('filter-tab').addEventListener('shown.bs.tab', function() {
        loadCategory2Options();
    });
    
    // 修正: 初期表示時にも日記リストを事前構築しておく
    setTimeout(function() {
        // ページロード完了後に実行
        buildDiaryList();
    }, 500);
}

// キーボードショートカットの設定（重複防止）
function setupKeyboardShortcuts() {
    // グローバルショートカット
    document.addEventListener('keydown', function(event) {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            // アクティブ要素がフォーム内のものでなければ処理
            if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                if (!document.getElementById('record-form').classList.contains('hidden')) {
                    saveRecord();
                    event.preventDefault();
                }
            }
        }
    });
    
    // フォーム要素でのショートカット
    const formInputs = document.querySelectorAll('#data-form input, #data-form textarea, #diary-data-form input, #diary-data-form textarea');
    formInputs.forEach(input => {
        input.addEventListener('keydown', function(event) {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                saveRecord();
                event.preventDefault();
                event.stopPropagation(); // 親要素へのイベント伝播を停止
            }
        });
    });
}

// ユーティリティ関数
function showMessage(message, type = 'success') {
    const messageArea = document.getElementById('message-area');
    const messageText = document.getElementById('message-text');
    messageText.textContent = message;
    
    // アイコンクラスを設定
    const icon = messageArea.querySelector('i');
    icon.className = 'me-2 ';
    
    if (type === 'success') {
        icon.className += 'fas fa-check-circle';
    } else if (type === 'danger') {
        icon.className += 'fas fa-exclamation-circle';
    } else if (type === 'warning') {
        icon.className += 'fas fa-exclamation-triangle';
    }
    
    messageArea.className = `alert alert-${type} fade-in`;
    
    // 5秒後に非表示
    setTimeout(() => {
        messageArea.classList.add('hidden');
    }, 5000);
}

// セクション表示/非表示
function hideAllSections() {
    document.getElementById('view-record').classList.add('hidden');
    document.getElementById('record-form').classList.add('hidden');
}

function hideDetails() {
    document.getElementById('view-record').classList.add('hidden');
    currentRecordId = null;
}

function hideForm() {
    document.getElementById('record-form').classList.add('hidden');
    currentRecordId = null;
}

// API操作関数
function executeRowJson() {
    // ボタンを無効化
    const button = document.querySelector('.btn-purple');
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> 実行中...';
    
    // APIエンドポイントを呼び出し
    fetch('/execute_row_json', {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage('row_json.pyが正常に実行されました', 'success');
            console.log('実行結果:', data.output);
        } else {
            showMessage('実行中にエラーが発生しました: ' + data.error, 'danger');
            console.error('エラー:', data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('リクエスト中にエラーが発生しました', 'danger');
    })
    .finally(() => {
        // ボタンを再度有効化
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-play me-1"></i> row_json.py実行';
    });
}

// 追加：カテゴリ2のオプションを読み込む関数
function loadCategory2Options() {
    fetch('/api/categories/category2')
        .then(response => response.json())
        .then(categories => {
            const select = document.getElementById('category2-filter');
            
            // 既存のオプション（最初のもの以外）をクリア
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            // 新しいオプションを追加
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading category2 options:', error);
            showMessage('カテゴリ2の読み込み中にエラーが発生しました', 'danger');
        });
}

// 追加：カテゴリ2でフィルタする関数
function filterByCategory2() {
    const selectedCategory2 = document.getElementById('category2-filter').value;
    const container = document.getElementById('filtered-records-container');
    
    if (!selectedCategory2) {
        container.innerHTML = '<div class="alert alert-warning"><i class="fas fa-exclamation-triangle me-2"></i>カテゴリ2を選択してください。</div>';
        filteredRecords = [];
        return;
    }
    
    // APIでフィルタされたレコードを取得
    fetch(`/api/records/filter/category2/${encodeURIComponent(selectedCategory2)}`)
        .then(response => response.json())
        .then(records => {
            filteredRecords = records;
            displayFilteredRecords(records, selectedCategory2);
        })
        .catch(error => {
            console.error('Error filtering records:', error);
            showMessage('レコードのフィルタ中にエラーが発生しました', 'danger');
        });
}

// 追加：フィルタされたレコードを表示する関数
function displayFilteredRecords(records, category2) {
    const container = document.getElementById('filtered-records-container');
    
    if (records.length === 0) {
        container.innerHTML = `<div class="alert alert-info"><i class="fas fa-info-circle me-2"></i>カテゴリ2「${category2}」に該当するレコードが見つかりません。</div>`;
        return;
    }
    
    let html = `<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>カテゴリ2「${category2}」で${records.length}件のレコードが見つかりました。</div>`;
    
    html += '<div class="row">';
    
    records.forEach(record => {
        const date = new Date(record.created_at);
        const formattedDate = date.toLocaleDateString('ja-JP');
        
        // 説明文の省略表示（100文字まで）
        const description = record.description || '';
        const shortDescription = description.length > 100 
            ? description.substring(0, 100) + '...' 
            : description;
        
        html += `
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">${record.title}</h6>
                            <small class="text-muted">ID: ${record.id}</small>
                        </div>
                    </div>
                    <div class="card-body">
                        <p class="card-text small">${shortDescription}</p>
                        <div class="mb-2">
                            <span class="badge bg-primary me-1">${record.category1 || ''}</span>
                            <span class="badge bg-info me-1">${record.category2 || ''}</span>
                            <span class="badge bg-success">${record.category3 || ''}</span>
                        </div>
                        <div class="small text-muted mb-2">
                            作成日: ${formattedDate} | バージョン: ${record.version}
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-info" onclick="viewRecord(${record.id})">
                                <i class="fas fa-eye me-1"></i> 詳細
                            </button>
                            <button class="btn btn-warning" onclick="editRecord(${record.id})">
                                <i class="fas fa-edit me-1"></i> 編集
                            </button>
                            <button class="btn btn-danger" onclick="deleteRecord(${record.id})">
                                <i class="fas fa-trash-alt me-1"></i> 削除
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
}

// 追加：フィルタされたレコードをJSON形式で出力する関数
function exportFilteredJson() {
    if (filteredRecords.length === 0) {
        showMessage('出力するレコードがありません。まずフィルタを実行してください。', 'warning');
        return;
    }
    
    // JSONデータを整形
    const jsonData = JSON.stringify(filteredRecords, null, 2);
    
    // ダウンロード用のBlob作成
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // ダウンロードリンクを作成して実行
    const a = document.createElement('a');
    a.href = url;
    
    // ファイル名を生成（選択されたカテゴリ2と現在の日時）
    const selectedCategory2 = document.getElementById('category2-filter').value;
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    a.download = `filtered_records_${selectedCategory2}_${timestamp}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // URLを解放
    URL.revokeObjectURL(url);
    
    showMessage(`${filteredRecords.length}件のレコードをJSON形式で出力しました`, 'success');
}

// レコード操作関数
function fetchAllRecordsAndBuildTree() {
    fetch('/api/records/all')
        .then(response => response.json())
        .then(records => {
            allRecords = records;
            buildCategoryTree(records);
        })
        .catch(error => {
            console.error('Error fetching records:', error);
            showMessage('レコードの取得中にエラーが発生しました', 'danger');
        });
}

// 修正: 日記リスト構築関数のデバッグ情報を追加
function buildDiaryList() {
    console.log('日記リスト構築開始');
    
    fetch('/api/records/all')
        .then(response => response.json())
        .then(records => {
            // 取得したレコードを確認
            console.log(`取得したレコード数: ${records.length}`);
            
            // 「日常」かつ「日記」カテゴリのレコードをフィルタリング
            const diaries = records.filter(record => 
                record.category1 === '日常' && record.category2 === '日記'
            );
            
            // フィルタリング結果を確認
            console.log(`日記レコード数: ${diaries.length}`);
            
            // 日付順（最新順）でソート
            diaries.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at);
            });
            
            // 日記リストを構築
            const container = document.getElementById('diary-list-container');
            if (!container) {
                console.error('日記一覧コンテナが見つかりません');
                return;
            }
            
            container.innerHTML = ''; // コンテナをクリア
            
            if (diaries.length === 0) {
                container.innerHTML = '<div class="alert alert-info">日記はまだありません。新規作成ボタンから日記を追加してください。</div>';
                return;
            }
            
            diaries.forEach((diary, index) => {
                console.log(`日記 ${index + 1} を処理中: ${diary.title}`);
                
                const item = document.createElement('div');
                item.className = 'card mb-3 diary-list-item';
                
                // 日付をフォーマット
                const date = new Date(diary.created_at);
                const formattedDate = date.toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                let imageHtml = '';
                if (diary.img_path) {
                    const imagePaths = diary.img_path.split(',');
                    if (imagePaths.length > 0 && imagePaths[0].trim() !== '') {
                        imageHtml = `
                            <div class="col-md-3">
                                <div class="diary-thumbnail" style="cursor:pointer;" onclick="viewRecord(${diary.id})">
                                    <img src="/${imagePaths[0].trim()}" class="img-fluid rounded" alt="${diary.title}">
                                </div>
                            </div>
                            <div class="col-md-9">
                        `;
                    }
                }
                
                // 説明文の省略表示（150文字まで）
                const description = diary.description || '';
                const shortDescription = description.length > 150 
                    ? description.substring(0, 150) + '...' 
                    : description;
                
                item.innerHTML = `
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">${diary.title}</h5>
                            <small class="text-muted">${formattedDate}</small>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            ${imageHtml ? imageHtml : '<div class="col-md-12">'}
                                <p class="card-text">${shortDescription}</p>
                            </div>
                            ${imageHtml ? '</div>' : ''}
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="btn-group">
                            <button class="btn btn-info btn-sm" onclick="viewRecord(${diary.id})">
                                <i class="fas fa-eye me-1"></i> 詳細
                            </button>
                            <button class="btn btn-warning btn-sm" onclick="editRecord(${diary.id})">
                                <i class="fas fa-edit me-1"></i> 編集
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="deleteRecord(${diary.id})">
                                <i class="fas fa-trash-alt me-1"></i> 削除
                            </button>
                        </div>
                    </div>
                `;
                
                container.appendChild(item);
            });
            
            console.log('日記リスト構築完了');
        })
        .catch(error => {
            console.error('Error fetching diaries:', error);
            showMessage('日記の取得中にエラーが発生しました', 'danger');
        });
}

function extractExistingCategories() {
    const rows = document.querySelectorAll('#records-table tr.record-item');
    
    // APIでレコードを取得してカテゴリ抽出
    fetch('/api/records/all')
        .then(response => response.json())
        .then(records => {
            records.forEach(record => {
                // カテゴリを順次抽出
                ['category1', 'category2', 'category3'].forEach(catField => {
                    if (record[catField] && record[catField].trim() !== '') {
                        existingCategories[catField].add(record[catField]);
                        addCategoryToDropdown(catField, record[catField]);
                    }
                });
            });
        })
        .catch(error => {
            console.error('Error fetching all records:', error);
            
            // APIが利用できない場合は、画面上のテーブルからカテゴリを取得（カテゴリ1のみ）
            rows.forEach(row => {
                const categoryCell = row.cells[2]; // カテゴリ1のセル
                if (categoryCell && categoryCell.textContent.trim() !== '') {
                    const category = categoryCell.textContent.trim();
                    existingCategories.category1.add(category);
                    addCategoryToDropdown('category1', category);
                }
            });
        });
}

function addCategoryToDropdown(fieldName, value) {
    if (!value || value.trim() === '') return;
    
    const datalist = document.getElementById(`${fieldName}-options`);
    
    // 重複チェック
    const existingOption = Array.from(datalist.options).find(option => 
        option.value === value
    );
    
    if (!existingOption) {
        const option = document.createElement('option');
        option.value = value;
        datalist.appendChild(option);
    }
}

function showAddForm() {
    // フォームをリセット
    document.getElementById('data-form').reset();
    document.getElementById('diary-data-form').reset();
    document.getElementById('record-id').value = '';
    document.getElementById('diary-record-id').value = '';
    document.getElementById('form-title').textContent = '新規レコード作成';
    document.getElementById('edit-metadata').classList.add('hidden');
    
    // フォームタイプをリセット（通常レコードをデフォルトに）
    document.getElementById('normal-tab').click();
    
    // 画像プレビューをクリア
    clearImagePreviews();
    
    // フォームを表示
    hideAllSections();
    
    const recordForm = document.getElementById('record-form');
    recordForm.classList.remove('hidden');
    // アニメーションのためにクラスを追加して削除
    recordForm.classList.add('slide-in');
    setTimeout(() => {
        recordForm.classList.remove('slide-in');
    }, 300);
    
    currentRecordId = null;
}

function clearImagePreviews() {
    document.getElementById('image-preview-container').innerHTML = '';
    document.getElementById('diary-image-preview-container').innerHTML = '';
    uploadedImagePaths = [];
    diaryUploadedImagePaths = [];
    document.getElementById('img_path').value = '';
    document.getElementById('diary-img-path').value = '';
}

function viewRecord(id) {
    // AJAXでレコード詳細を取得
    fetch(`/api/record/${id}`)
        .then(response => response.json())
        .then(record => {
            // データを詳細ビューに設定
            document.getElementById('view-id').textContent = record.id;
            document.getElementById('view-title').textContent = record.title;
            document.getElementById('view-description').textContent = record.description || '';
            document.getElementById('view-category1').textContent = record.category1 || '';
            document.getElementById('view-category2').textContent = record.category2 || '';
            document.getElementById('view-category3').textContent = record.category3 || '';
            document.getElementById('view-created').textContent = record.created_at;
            document.getElementById('view-updated').textContent = record.updated_at;
            document.getElementById('view-version').textContent = record.version;
            
            // 画像ギャラリーを設定
            setupViewImages(record);
            
            // 詳細ビューを表示
            hideAllSections();
            
            const viewRecord = document.getElementById('view-record');
            viewRecord.classList.remove('hidden');
            // アニメーションのためにクラスを追加して削除
            viewRecord.classList.add('slide-in');
            setTimeout(() => {
                viewRecord.classList.remove('slide-in');
            }, 300);
            
            currentRecordId = id;
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('レコードの取得中にエラーが発生しました', 'danger');
        });
}

function setupViewImages(record) {
    const viewImages = document.getElementById('view-images');
    viewImages.innerHTML = '';
    
    if (record.img_path) {
        const imagePaths = record.img_path.split(',');
        imagePaths.forEach((path, index) => {
            if (path && path.trim() !== '') {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                galleryItem.setAttribute('data-index', index);
                
                const img = document.createElement('img');
                img.src = `/${path.trim()}`;
                img.alt = `${record.title} - 画像 ${index + 1}`;
                
                galleryItem.appendChild(img);
                viewImages.appendChild(galleryItem);
                
                // クリックで画像拡大
                galleryItem.addEventListener('click', () => {
                    openImageModal(imagePaths, index);
                });
            }
        });
        document.getElementById('view-images-container').style.display = 'block';
    } else {
        document.getElementById('view-images-container').style.display = 'none';
    }
}

function editRecord(id) {
    // AJAXでレコード詳細を取得
    fetch(`/api/record/${id}`)
        .then(response => response.json())
        .then(record => {
            // 日記レコードか通常レコードかを判定
            const isDiary = (record.category1 === '日常' && record.category2 === '日記');
            
            // 適切なタブを選択
            if (isDiary) {
                document.getElementById('diary-tab').click();
                
                // 日記フォームにデータを設定
                document.getElementById('diary-record-id').value = record.id;
                document.getElementById('diary-title').value = record.title;
                document.getElementById('diary-description').value = record.description || '';
                
                // 画像パスを設定
                if (record.img_path) {
                    loadExistingDiaryImages(record.img_path);
                } else {
                    clearDiaryImages();
                }
            } else {
                document.getElementById('normal-tab').click();
                
                // 通常レコードフォームにデータを設定
                document.getElementById('record-id').value = record.id;
                document.getElementById('title').value = record.title;
                document.getElementById('description').value = record.description || '';
                document.getElementById('category1').value = record.category1 || '';
                document.getElementById('category2').value = record.category2 || '';
                document.getElementById('category3').value = record.category3 || '';
                
                // 画像パスを設定
                if (record.img_path) {
                    loadExistingImages(record.img_path);
                } else {
                    clearNormalImages();
                }
            }
            
            // メタデータを表示
            document.getElementById('created-at').textContent = `作成日時: ${record.created_at}`;
            document.getElementById('updated-at').textContent = `更新日時: ${record.updated_at}`;
            document.getElementById('version-info').textContent = `バージョン: ${record.version}`;
            document.getElementById('edit-metadata').classList.remove('hidden');
            
            // フォームタイトルを変更
            document.getElementById('form-title').textContent = 'レコード編集';
            
            // フォームを表示
            hideAllSections();
            
            const recordForm = document.getElementById('record-form');
            recordForm.classList.remove('hidden');
            recordForm.classList.add('slide-in');
            setTimeout(() => {
                recordForm.classList.remove('slide-in');
            }, 300);
            
            currentRecordId = id;
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('レコードの取得中にエラーが発生しました', 'danger');
        });
}

function clearDiaryImages() {
    document.getElementById('diary-image-preview-container').innerHTML = '';
    diaryUploadedImagePaths = [];
    document.getElementById('diary-img-path').value = '';
}

function clearNormalImages() {
    document.getElementById('image-preview-container').innerHTML = '';
    uploadedImagePaths = [];
    document.getElementById('img_path').value = '';
}

function saveRecord() {
    // アクティブなタブを判定
    const isDiaryTab = document.getElementById('diary-tab').classList.contains('active');
    
    // タブに応じてフォームデータ取得
    let formData = new FormData();
    let id, title, description, category1, category2, category3, img_path;
    
    if (isDiaryTab) {
        // 日記フォームからデータ取得
        id = document.getElementById('diary-record-id').value;
        title = document.getElementById('diary-title').value;
        description = document.getElementById('diary-description').value;
        category1 = '日常';  // 固定値
        category2 = '日記';  // 固定値
        category3 = '';
        img_path = document.getElementById('diary-img-path').value;
        
        if (!title) {
            showMessage('タイトルを入力してください', 'warning');
            return;
        }
    } else {
        // 通常レコードフォームからデータ取得
        id = document.getElementById('record-id').value;
        title = document.getElementById('title').value;
        description = document.getElementById('description').value;
        category1 = document.getElementById('category1').value;
        category2 = document.getElementById('category2').value;
        category3 = document.getElementById('category3').value;
        img_path = document.getElementById('img_path').value;
    }
    
    // フォームデータに値を設定
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category1', category1);
    formData.append('category2', category2);
    formData.append('category3', category3);
    formData.append('img_path', img_path);
    
    // 新しいカテゴリ値を既存のリストに追加（通常レコードのみ）
    if (!isDiaryTab) {
        updateCategoryLists(category1, category2, category3);
    }
    
    // 新規作成か更新かを判断
    const url = id ? `/edit/${id}` : '/create';
    
    // AJAXでデータを送信
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        // 成功したらページをリロード
        showMessage(id ? 'レコードが更新されました' : 'レコードが作成されました');
        
        // 成功後、編集モードに応じて異なる処理
        setTimeout(() => {
            if (isDiaryTab) {
                // 日記フォームから保存した場合、日記一覧タブをアクティブにする
                hideForm();
                document.getElementById('diaries-tab').click();
                buildDiaryList();
            } else {
                // それ以外の場合はページをリロード
                window.location.reload();
            }
        }, 1500);
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('レコードの保存中にエラーが発生しました', 'danger');
    });
}

function updateCategoryLists(category1, category2, category3) {
    // カテゴリ1の処理
    if (category1 && !existingCategories.category1.has(category1)) {
        existingCategories.category1.add(category1);
        addCategoryToDropdown('category1', category1);
    }
    
    // カテゴリ2の処理
    if (category2 && !existingCategories.category2.has(category2)) {
        existingCategories.category2.add(category2);
        addCategoryToDropdown('category2', category2);
    }
    
    // カテゴリ3の処理
    if (category3 && !existingCategories.category3.has(category3)) {
        existingCategories.category3.add(category3);
        addCategoryToDropdown('category3', category3);
    }
}

function deleteRecord(id) {
    if (!confirm('このレコードを削除してもよろしいですか？')) {
        return;
    }
    
    // AJAXでレコードを削除
    const formData = new FormData();
    
    fetch(`/delete/${id}`, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        // 成功したらページをリロード
        showMessage('レコードが削除されました');
        
        // 削除後、現在のタブに応じて異なる処理
        setTimeout(() => {
            // 日記一覧タブがアクティブなら日記リストを更新
            if (document.getElementById('diaries-tab').classList.contains('active')) {
                hideDetails();
                buildDiaryList();
            } else {
                window.location.reload();
            }
        }, 1500);
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('レコードの削除中にエラーが発生しました', 'danger');
    });
}

// カテゴリツリー関連
function buildCategoryTree(records) {
    const treeContainer = document.getElementById('category-tree');
    treeContainer.innerHTML = ''; // コンテナをクリア
    
    // 「日常」と「日記」カテゴリのレコードを除外
    const filteredRecords = records.filter(record => 
        !(record.category1 === '日常' && record.category2 === '日記')
    );
    
    // カテゴリごとにレコードをグループ化
    const categoryStructure = {};
    
    // レコードをカテゴリごとに分類
    organizeRecordsByCategory(filteredRecords, categoryStructure);
    
    // カテゴリ構造をHTMLに変換
    renderCategoryTree(categoryStructure, treeContainer);
    
    // トグルイベントリスナーを追加
    addToggleListeners();
}

function organizeRecordsByCategory(records, categoryStructure) {
    records.forEach(record => {
        const cat1 = record.category1 ? record.category1.trim() : '';
        const cat2 = record.category2 ? record.category2.trim() : '';
        const cat3 = record.category3 ? record.category3.trim() : '';
        
        // カテゴリ1処理
        if (cat1) {
            if (!categoryStructure[cat1]) {
                categoryStructure[cat1] = { 
                    subCategories: {}, 
                    records: [] 
                };
            }
            
            // カテゴリ2処理
            if (cat2) {
                if (!categoryStructure[cat1].subCategories[cat2]) {
                    categoryStructure[cat1].subCategories[cat2] = {
                        subCategories: {},
                        records: []
                    };
                }
                
                // カテゴリ3処理
                if (cat3) {
                    if (!categoryStructure[cat1].subCategories[cat2].subCategories[cat3]) {
                        categoryStructure[cat1].subCategories[cat2].subCategories[cat3] = {
                            records: []
                        };
                    }
                    // レコードをカテゴリ3に追加
                    categoryStructure[cat1].subCategories[cat2].subCategories[cat3].records.push(record);
                } else {
                    // カテゴリ3が空の場合、レコードをカテゴリ2に追加
                    categoryStructure[cat1].subCategories[cat2].records.push(record);
                }
            } else if (cat3) {
                // カテゴリ2が空でカテゴリ3が空でない場合
                if (!categoryStructure[cat1].subCategories[cat3]) {
                    categoryStructure[cat1].subCategories[cat3] = {
                        records: []
                    };
                }
                categoryStructure[cat1].subCategories[cat3].records.push(record);
            } else {
                // カテゴリ2とカテゴリ3が空の場合、レコードをカテゴリ1に追加
                categoryStructure[cat1].records.push(record);
            }
        } else {
            // すべてのカテゴリが空の場合は、「未分類」カテゴリを作成
            if (!categoryStructure['未分類']) {
                categoryStructure['未分類'] = { 
                    subCategories: {}, 
                    records: [] 
                };
            }
            categoryStructure['未分類'].records.push(record);
        }
    });
}

function renderCategoryTree(categoryStructure, treeContainer) {
    for (const cat1 in categoryStructure) {
        const cat1Node = createCategoryNode(cat1, 1);
        const cat1Content = document.createElement('div');
        cat1Content.className = 'category-content collapsed';
        
        // カテゴリ1の直下のレコードを追加
        if (categoryStructure[cat1].records.length > 0) {
            cat1Content.appendChild(createRecordList(categoryStructure[cat1].records));
        }
        
        // カテゴリ2を処理
        const cat1SubList = document.createElement('ul');
        for (const cat2 in categoryStructure[cat1].subCategories) {
            const cat2Node = createCategoryNode(cat2, 2);
            const cat2Content = document.createElement('div');
            cat2Content.className = 'category-content collapsed';
            
            // カテゴリ2の直下のレコードを追加
            if (categoryStructure[cat1].subCategories[cat2].records.length > 0) {
                cat2Content.appendChild(createRecordList(categoryStructure[cat1].subCategories[cat2].records));
            }
            
            // カテゴリ3を処理
            const cat2SubList = document.createElement('ul');
            for (const cat3 in categoryStructure[cat1].subCategories[cat2].subCategories) {
                const cat3Node = createCategoryNode(cat3, 3);
                const cat3Content = document.createElement('div');
                cat3Content.className = 'category-content collapsed';
                
                // カテゴリ3の直下のレコードを追加
                cat3Content.appendChild(
                    createRecordList(categoryStructure[cat1].subCategories[cat2].subCategories[cat3].records)
                );
                
                cat3Node.appendChild(cat3Content);
                const cat3ListItem = document.createElement('li');
                cat3ListItem.className = 'category-item category-level-3';
                cat3ListItem.appendChild(cat3Node);
                cat2SubList.appendChild(cat3ListItem);
            }
            
            if (cat2SubList.children.length > 0) {
                cat2Content.appendChild(cat2SubList);
            }
            
            cat2Node.appendChild(cat2Content);
            const cat2ListItem = document.createElement('li');
            cat2ListItem.className = 'category-item category-level-2';
            cat2ListItem.appendChild(cat2Node);
            cat1SubList.appendChild(cat2ListItem);
        }
        
        if (cat1SubList.children.length > 0) {
            cat1Content.appendChild(cat1SubList);
        }
        
        cat1Node.appendChild(cat1Content);
        const cat1ListItem = document.createElement('li');
        cat1ListItem.className = 'category-item category-level-1';
        cat1ListItem.appendChild(cat1Node);
        treeContainer.appendChild(cat1ListItem);
    }
}

function createCategoryNode(categoryName, level) {
    const node = document.createElement('div');
    
    const toggle = document.createElement('span');
    toggle.className = 'category-toggle collapsed';
    toggle.innerHTML = `<i class="fas fa-caret-down"></i> ${categoryName}`;
    
    node.appendChild(toggle);
    
    return node;
}

function createRecordList(records) {
    const list = document.createElement('div');
    list.className = 'record-list';
    
    records.forEach(record => {
        const item = document.createElement('div');
        item.className = 'record-list-item';
        item.setAttribute('data-id', record.id);
        
        const title = document.createElement('div');
        title.className = 'record-title';
        title.textContent = record.title;
        
        const meta = document.createElement('div');
        meta.className = 'record-meta';
        meta.textContent = `ID: ${record.id} | バージョン: ${record.version}`;
        
        const actions = document.createElement('div');
        actions.className = 'record-actions';
        actions.innerHTML = `
            <button class="btn btn-info btn-sm me-1" onclick="viewRecord('${record.id}')">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-warning btn-sm me-1" onclick="editRecord('${record.id}')">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteRecord('${record.id}')">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        
        item.appendChild(title);
        item.appendChild(meta);
        item.appendChild(actions);
        
        list.appendChild(item);
    });
    
    return list;
}

function addToggleListeners() {
    const toggles = document.querySelectorAll('.category-toggle');
    
    toggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            // この要素の次の兄弟要素を取得（カテゴリコンテンツ）
            const content = this.parentNode.querySelector('.category-content');
            
            // トグル状態を切り替え
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                this.classList.remove('collapsed');
            } else {
                content.classList.add('collapsed');
                this.classList.add('collapsed');
            }
        });
    });
}

// 画像処理関連
function setupImageUpload() {
    setupImageDropArea('image-drop-area', 'image-upload', 'image-preview-container', 'img_path', uploadedImagePaths, 'loadExistingImages');
}

function setupDiaryImageUpload() {
    setupImageDropArea('diary-image-drop-area', 'diary-image-upload', 'diary-image-preview-container', 'diary-img-path', diaryUploadedImagePaths, 'loadExistingDiaryImages');
}

function setupImageDropArea(dropAreaId, fileInputId, previewContainerId, imgPathInputId, imagePathsArray, loadExistingFunc) {
    const dropArea = document.getElementById(dropAreaId);
    const fileInput = document.getElementById(fileInputId);
    const previewContainer = document.getElementById(previewContainerId);
    const imgPathInput = document.getElementById(imgPathInputId);
    
    // ドラッグ操作のイベントリスナー
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // ドラッグエリアの視覚的フィードバック
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('active');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('active');
        });
    });
    
    // ドロップ時のファイル処理
    dropArea.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        handleFiles(files);
    });
    
    // クリックしてファイル選択
    dropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
    });
    
    // ファイル処理関数
    function handleFiles(files) {
        for (const file of files) {
            if (!file.type.match('image.*')) continue;
            uploadFile(file);
        }
    }
    
    // ファイルのアップロード処理
    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/upload_image', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                addImagePreview(data.path);
                updateImagePathInput();
            } else {
                showMessage('画像のアップロードに失敗しました', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showMessage('画像のアップロード中にエラーが発生しました', 'danger');
        });
    }
    
    // プレビュー画像の追加
    function addImagePreview(path) {
        imagePathsArray.push(path);
        
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        
        const img = document.createElement('img');
        img.src = `/${path}`;
        img.alt = 'アップロード画像';
        
        const removeButton = document.createElement('span');
        removeButton.className = 'image-preview-remove';
        removeButton.innerHTML = '<i class="fas fa-times"></i>';
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // 配列から削除
            const index = imagePathsArray.indexOf(path);
            if (index !== -1) {
                imagePathsArray.splice(index, 1);
            }
            
            // プレビューから削除
            previewItem.remove();
            
            // 隠しフィールドを更新
            updateImagePathInput();
        });
        
        previewItem.appendChild(img);
        previewItem.appendChild(removeButton);
        previewContainer.appendChild(previewItem);
    }
    
    // 隠しフィールドのパス更新
    function updateImagePathInput() {
        imgPathInput.value = imagePathsArray.join(',');
    }
    
    // 既存の画像パスを読み込む関数をグローバルにエクスポート
    window[loadExistingFunc] = function(pathsString) {
        if (!pathsString) return;
        
        // プレビューコンテナをクリア
        previewContainer.innerHTML = '';
        imagePathsArray.length = 0; // 配列を空にする
        
        // カンマ区切りのパスを処理
        const paths = pathsString.split(',');
        paths.forEach(path => {
            if (path && path.trim() !== '') {
                addImagePreview(path.trim());
            }
        });
        
        updateImagePathInput();
    };
}

// 画像モーダル
function setupImageModal() {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const closeBtn = document.getElementById('modal-close');
    const prevBtn = document.getElementById('prev-button');
    const nextBtn = document.getElementById('next-button');
    
    // 現在の画像インデックスとパス配列
    let currentImageIndex = 0;
    let currentImagePaths = [];
    
    // 画像モーダルを開く関数をグローバルに公開
    window.openImageModal = function(paths, index) {
        currentImagePaths = paths.filter(path => path && path.trim() !== '');
        currentImageIndex = index;
        
        if (currentImagePaths.length > 0) {
            updateModalImage();
            modal.classList.add('show');
        }
    };
    
    // モーダル内の画像を更新する関数
    function updateModalImage() {
        modalImage.src = `/${currentImagePaths[currentImageIndex].trim()}`;
        
        // ナビゲーションボタンの表示/非表示
        prevBtn.style.visibility = currentImageIndex > 0 ? 'visible' : 'hidden';
        nextBtn.style.visibility = currentImageIndex < currentImagePaths.length - 1 ? 'visible' : 'hidden';
    }
    
    // 閉じるボタンのイベントリスナー
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });
    
    // ESCキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            modal.classList.remove('show');
        }
    });
    
    // 前の画像に移動
    prevBtn.addEventListener('click', () => {
        if (currentImageIndex > 0) {
            currentImageIndex--;
            updateModalImage();
        }
    });
    
    // 次の画像に移動
    nextBtn.addEventListener('click', () => {
        if (currentImageIndex < currentImagePaths.length - 1) {
            currentImageIndex++;
            updateModalImage();
        }
    });
    
    // キーボードナビゲーション
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('show')) return;
        
        if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
            currentImageIndex--;
            updateModalImage();
        } else if (e.key === 'ArrowRight' && currentImageIndex < currentImagePaths.length - 1) {
            currentImageIndex++;
            updateModalImage();
        }
    });
}