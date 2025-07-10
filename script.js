document.addEventListener('DOMContentLoaded', () => {
    // === DOM要素の取得 ===
    const nicoTickerContainer = document.getElementById('nico-ticker-container');
    const memoGrid = document.getElementById('memo-grid');
    const addMemoBtn = document.getElementById('add-memo-btn');
    const modal = document.getElementById('memo-modal');
    const modalTitle = document.querySelector('.modal-content h2');
    const titleInput = document.getElementById('memo-title-input');
    const contentInput = document.getElementById('memo-content-input');
    const labelsInput = document.getElementById('memo-labels-input');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const labelFilterContainer = document.getElementById('label-filter-container');

    // === グローバル変数 ===
    const PALETTE = [
        '#F28B82', '#FBBC04', '#FFF475', '#CCFF90', '#A7FFEB',
        '#CBF0F8', '#AECBFA', '#D7AEFB', '#FDCFE8', '#E6C9A8', '#E8EAED'
    ];
    let memos = [];
    let currentFilter = 'all';

    // === ニコニコ風コメント機能の管理オブジェクト ===
    const nicoNicoCommentFlow = {
        container: nicoTickerContainer,
        commentPool: [],
        nextCommentTime: 0,

        refreshPool(memosData) {
            this.commentPool = memosData
                .map(memo => memo.content.trim())
                .filter(content => content.length > 0);
            if (this.commentPool.length === 0) {
                this.commentPool.push("新しいメモを作成しよう！");
            }
        },

        createAndFlowComment() {
            if (this.commentPool.length === 0) return;
            const commentText = this.commentPool[Math.floor(Math.random() * this.commentPool.length)];
            const commentElement = document.createElement('span');
            commentElement.classList.add('ticker-comment');
            commentElement.textContent = commentText;
            const screenWidth = window.innerWidth;
            commentElement.style.transform = `translateX(${screenWidth}px)`;
            this.container.appendChild(commentElement);
            const commentWidth = commentElement.offsetWidth;
            const duration = (screenWidth + commentWidth) / 100;
            commentElement.style.transition = `transform ${duration}s linear`;
            commentElement.style.transform = `translateX(-${commentWidth}px)`;
            setTimeout(() => {
                commentElement.remove();
            }, duration * 1000);
        },
        
        tick(timestamp) {
            if (timestamp > this.nextCommentTime) {
                this.createAndFlowComment();
                this.nextCommentTime = timestamp + 2000 + Math.random() * 3000;
            }
            requestAnimationFrame((t) => this.tick(t));
        },

        start() {
            this.refreshPool(memos);
            requestAnimationFrame((t) => this.tick(t));
        }
    };

    // === データ処理 & 描画関数 ===

    const loadMemos = () => {
        const memosJSON = localStorage.getItem('memos');
        memos = memosJSON ? JSON.parse(memosJSON) : [];
    };

    const saveMemos = () => {
        localStorage.setItem('memos', JSON.stringify(memos));
        nicoNicoCommentFlow.refreshPool(memos);
    };

    const renderMemos = (memosToRender) => {
        memoGrid.innerHTML = '';
        memosToRender.forEach(memo => {
            const card = document.createElement('div');
            card.classList.add('memo-card');
            card.style.backgroundColor = memo.color;
            card.dataset.id = memo.id;
            const title = document.createElement('h3');
            title.textContent = memo.title;
            const content = document.createElement('p');
            content.textContent = memo.content;
            const labelsContainer = document.createElement('div');
            labelsContainer.classList.add('card-labels');
            if (memo.labels && memo.labels.length > 0) {
                memo.labels.forEach(labelText => {
                    const labelSpan = document.createElement('span');
                    labelSpan.classList.add('card-label');
                    labelSpan.textContent = labelText;
                    labelsContainer.appendChild(labelSpan);
                });
            }
            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-card-btn');
            deleteBtn.innerHTML = '×';
            card.appendChild(title);
            card.appendChild(content);
            card.appendChild(labelsContainer);
            card.appendChild(deleteBtn);
            memoGrid.appendChild(card);
        });
    };

    const renderLabelFilters = () => {
        const allLabels = new Set();
        memos.forEach(memo => {
            if (memo.labels) {
                memo.labels.forEach(label => allLabels.add(label));
            }
        });
        labelFilterContainer.innerHTML = '';
        const allBtn = document.createElement('button');
        allBtn.classList.add('label-filter-btn');
        allBtn.textContent = 'すべて';
        allBtn.dataset.label = 'all';
        if (currentFilter === 'all') allBtn.classList.add('active');
        labelFilterContainer.appendChild(allBtn);
        Array.from(allLabels).sort().forEach(label => {
            const btn = document.createElement('button');
            btn.classList.add('label-filter-btn');
            btn.textContent = label;
            btn.dataset.label = label;
            if (currentFilter === label) btn.classList.add('active');
            labelFilterContainer.appendChild(btn);
        });
    };
    
    const applyFilter = () => {
        let filteredMemos;
        if (currentFilter === 'all') {
            filteredMemos = memos;
        } else {
            filteredMemos = memos.filter(memo => memo.labels && memo.labels.includes(currentFilter));
        }
        renderMemos(filteredMemos);
        renderLabelFilters();
    };

    // === モーダル制御 ===

    const openModalForNew = () => {
        modal.removeAttribute('data-editing-id');
        modalTitle.textContent = '新しいメモ';
        titleInput.value = '';
        contentInput.value = '';
        labelsInput.value = '';
        modal.classList.remove('hidden');
    };

    const openModalForEdit = (id) => {
        const memoToEdit = memos.find(memo => memo.id === id);
        if (!memoToEdit) return;
        modal.dataset.editingId = id;
        modalTitle.textContent = 'メモの編集';
        titleInput.value = memoToEdit.title;
        contentInput.value = memoToEdit.content;
        labelsInput.value = memoToEdit.labels ? memoToEdit.labels.join(', ') : '';
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    // === イベントリスナー ===

    addMemoBtn.addEventListener('click', openModalForNew);
    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', () => {
        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const labels = labelsInput.value.split(',').map(l => l.trim()).filter(l => l !== '');
        const editingId = modal.dataset.editingId;

        if (editingId) {
            const memoToUpdate = memos.find(memo => memo.id === editingId);
            if (memoToUpdate) {
                memoToUpdate.title = title || '無題のメモ';
                memoToUpdate.content = content;
                memoToUpdate.labels = labels;
            }
        } else {
            if (title || content || labels.length > 0) {
                const newMemo = {
                    id: Date.now().toString(),
                    title: title || '無題のメモ',
                    content: content,
                    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
                    labels: labels
                };
                memos.unshift(newMemo);
            }
        }
        saveMemos();
        applyFilter();
        closeModal();
    });

    labelFilterContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('label-filter-btn')) {
            currentFilter = event.target.dataset.label;
            applyFilter();
        }
    });

    memoGrid.addEventListener('click', (event) => {
        const clickedCard = event.target.closest('.memo-card');
        if (!clickedCard) return;

        const clickedDeleteBtn = event.target.closest('.delete-card-btn');
        const id = clickedCard.dataset.id;
        
        if (clickedDeleteBtn) {
            if (confirm('このメモを削除しますか？')) {
                memos = memos.filter(memo => memo.id !== id);
                saveMemos();
                applyFilter();
            }
        } else {
            openModalForEdit(id);
        }
    });

    // === 初期化処理 ===
    const initializeApp = () => {
        loadMemos();
        applyFilter();
        nicoNicoCommentFlow.start();
    };

    initializeApp();
});