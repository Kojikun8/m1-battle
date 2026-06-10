// ==========================================
// 【設定】下の "" の中にGoogleのURLを貼る
const GAS_URL = "https://script.google.com/macros/s/AKfycbwJdlC2GlVPLrjKnAcNQyBRLE8DcBDYhUUBOcA5EKvnOe14oJ8x88bFDlw58c3a4lSH/exec"; 
const NAME_A = "あかねちゃん";  // 1人目の名前
const NAME_B = "凛太郎";  // 2人目の名前
// ==========================================

const PERFORMERS = [
    "あなたとネ", "うただ", "うちまつげ", "蛙亭",
    "カベポスター", "かもめんたる", "からし蓮根", "コットン",
    "今夜も星が綺麗", "ザ・プラン9", "スタミナパン", "ゼロカラン",
    "セルライトスパ", "滝音", "男性ブランコ", "ダンビラムーチョ",
    "TCクラクション", "ドンデコルテ", "ナチョス", "ななまがり",
    "ビスケットブラザーズ", "フランスピアノ", "マイスイートメモリーズ", "見取り図",
    "隣人"
];

let appState = {
    playerA: { main: [], reserve: [] }, playerB: { main: [], reserve: [] },
    submittedA: false, submittedB: false, locked: false
};
let currentPlayer = ''; 
let tempSelection = { main: [], reserve: [] };
let pollingInterval = null;

window.onload = () => {
    if(GAS_URL.includes("ここに")) alert("M1_script.jsの1行目のURLを設定してください！");
    applyNames(); fetchData(); startPolling();
};

function applyNames() {
    document.getElementById('btn-player-a').innerText = NAME_A;
    document.getElementById('btn-player-b').innerText = NAME_B;
    document.getElementById('label-score-a').innerText = NAME_A;
    document.getElementById('label-score-b').innerText = NAME_B;
    document.getElementById('label-list-a').innerText = NAME_A + "の予想";
    document.getElementById('label-list-b').innerText = NAME_B + "の予想";
}

async function fetchData() {
    updateStatusIndicator("通信中...");
    try {
        const res = await fetch(GAS_URL);
        const data = await res.json();
        if (JSON.stringify(data) !== JSON.stringify(appState)) {
            appState = data; renderScreens();
        }
        updateStatusIndicator("同期完了 ✅");
    } catch (e) {
        console.error(e); 
        updateStatusIndicator("通信エラー ⚠️");
    }
}
async function saveData() {
    updateStatusIndicator("保存中...📡");
    try {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(appState) });
        await fetchData();
    } catch (e) { alert("保存失敗"); }
}
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchData, 3000); 
}
function updateStatusIndicator(msg) { 
    const el = document.getElementById('connection-status');
    if(el) el.innerText = msg; 
}

function renderScreens() {
    const statusBox = document.getElementById('status-display');
    statusBox.innerHTML = `<strong>現在の状況:</strong><br>👤 ${NAME_A}: ${appState.submittedA ? '✅完了' : 'waiting...'} <br>👤 ${NAME_B}: ${appState.submittedB ? '✅完了' : 'waiting...'}`;
    if (appState.submittedA) document.getElementById('btn-player-a').innerText = `${NAME_A}\n(完了)`;
    if (appState.submittedB) document.getElementById('btn-player-b').innerText = `${NAME_B}\n(完了)`;
    
    const commonArea = document.getElementById('common-area');
    if (appState.submittedA && appState.submittedB && !appState.locked) commonArea.style.display = 'block';
    else commonArea.style.display = 'none';

    if (appState.locked) {
        if (!document.getElementById('screen-result').classList.contains('active')) {
            setupResultScreen(); switchScreen('screen-result');
        }
    }
}

function selectPlayer(player) {
    if (appState.locked) return;
    const isSubmitted = player === 'A' ? appState.submittedA : appState.submittedB;
    if (isSubmitted && !confirm("既に完了しています。修正しますか？")) return;
    
    currentPlayer = player;
    tempSelection = JSON.parse(JSON.stringify(player === 'A' ? appState.playerA : appState.playerB));
    setupPredictionScreen(); switchScreen('screen-prediction');
}

function setupPredictionScreen() {
    document.getElementById('current-player-name').innerText = `${currentPlayer === 'A' ? NAME_A : NAME_B} の予想`;
    const list = document.getElementById('performer-list');
    list.innerHTML = '';
    PERFORMERS.forEach(name => {
        const div = document.createElement('div');
        div.className = 'performer-card';
        div.innerText = name;
        div.onclick = () => toggleSelection(name, div);
        if (tempSelection.main.includes(name)) div.classList.add('selected-main');
        else if (tempSelection.reserve.includes(name)) div.classList.add('selected-reserve');
        list.appendChild(div);
    });
    updateCountDisplay();
}

function toggleSelection(name, el) {
    if (tempSelection.main.includes(name)) {
        tempSelection.main = tempSelection.main.filter(n => n !== name);
        el.classList.remove('selected-main');
    } else if (tempSelection.reserve.includes(name)) {
        tempSelection.reserve = tempSelection.reserve.filter(n => n !== name);
        el.classList.remove('selected-reserve');
    } else {
        if (tempSelection.main.length < 7) {
            tempSelection.main.push(name); el.classList.add('selected-main');
        } else if (tempSelection.reserve.length < 3) {
            if(tempSelection.main.length < 7) return alert("先に本命7組を選んで！");
            tempSelection.reserve.push(name); el.classList.add('selected-reserve');
        }
    }
    updateCountDisplay();
}
function updateCountDisplay() {
    document.getElementById('main-count').innerText = tempSelection.main.length;
    document.getElementById('reserve-count').innerText = tempSelection.reserve.length;
    const btn = document.getElementById('submit-prediction');
    if (tempSelection.main.length === 7 && tempSelection.reserve.length === 3) {
        btn.disabled = false; btn.innerText = "これで確定する！";
    } else {
        btn.disabled = true; btn.innerText = "選択中...";
    }
}

async function submitPrediction() {
    if (currentPlayer === 'A') { appState.playerA = tempSelection; appState.submittedA = true; }
    else { appState.playerB = tempSelection; appState.submittedB = true; }
    await saveData(); backToTop();
}

// === 新：予想公開ロジック ===
function goToReveal() {
    const container = document.getElementById('reveal-container');
    const mainA = appState.playerA.main || [];
    const mainB = appState.playerB.main || [];
    
    // 1. 本命で一致しているものを抽出
    const matches = mainA.filter(name => mainB.includes(name));
    // 2. 一致していないものを抽出
    const uniqueA = mainA.filter(name => !matches.includes(name));
    const uniqueB = mainB.filter(name => !matches.includes(name));

    let html = `<div class="comp-table">`;
    // ヘッダー
    html += `<div class="comp-row comp-header"><div class="comp-col">${NAME_A}</div><div class="comp-col">${NAME_B}</div></div>`;
    
    // 一致リスト（青背景）
    matches.forEach(name => {
        html += `<div class="comp-row match-row">
            <div class="comp-col"><span class="match-icon">●</span>${name}</div>
            <div class="comp-col"><span class="match-icon">●</span>${name}</div>
        </div>`;
    });

    // 不一致リスト（左右並べる）
    // 数は同じはずだが念のため多い方に合わせる
    const maxLen = Math.max(uniqueA.length, uniqueB.length);
    for(let i=0; i<maxLen; i++) {
        html += `<div class="comp-row">
            <div class="comp-col">${uniqueA[i] || '-'}</div>
            <div class="comp-col">${uniqueB[i] || '-'}</div>
        </div>`;
    }

    // 予備リスト（区切り線）
    html += `<div class="comp-row comp-sep"><div class="comp-col" style="text-align:center;">--- 予備予想 ---</div></div>`;
    
    for(let i=0; i<3; i++) {
        const resA = appState.playerA.reserve[i] || "-";
        const resB = appState.playerB.reserve[i] || "-";
        html += `<div class="comp-row" style="color:#666;">
            <div class="comp-col">${resA}</div>
            <div class="comp-col">${resB}</div>
        </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
    switchScreen('screen-reveal');
}
// ==========================

async function goToResultEntry() { appState.locked = true; await saveData(); setupResultScreen(); switchScreen('screen-result'); }

function setupResultScreen() {
    const list = document.getElementById('official-list');
    list.innerHTML = '';
    PERFORMERS.forEach(name => {
        const div = document.createElement('div');
        div.className = 'performer-card'; div.innerText = name;
        div.onclick = function() { this.classList.toggle('selected-main'); };
        list.appendChild(div);
    });
}
function calculateResult() {
    const officialResults = Array.from(document.querySelectorAll('#official-list .selected-main')).map(el => el.innerText);
    if (officialResults.length !== 7) return alert("7組選んでください");

    const scoreA = countHits(appState.playerA.main, officialResults);
    const scoreB = countHits(appState.playerB.main, officialResults);
    const subA = countHits(appState.playerA.reserve, officialResults);
    const subB = countHits(appState.playerB.reserve, officialResults);

    document.getElementById('score-a').innerText = scoreA; document.getElementById('sub-a').innerText = subA;
    document.getElementById('score-b').innerText = scoreB; document.getElementById('sub-b').innerText = subB;
    renderDetailList('list-a', appState.playerA, officialResults);
    renderDetailList('list-b', appState.playerB, officialResults);

    let msg = "";
    if(scoreA > scoreB) msg = `👑 ${NAME_A} の勝利!`;
    else if(scoreB > scoreA) msg = `👑 ${NAME_B} の勝利!`;
    else msg = subA > subB ? `${NAME_A} の勝利! (予備差)` : subB > subA ? `${NAME_B} の勝利! (予備差)` : "🤝 完全引き分け!!";
    
    document.getElementById('winner-announce').innerText = msg;
    document.getElementById('battle-result').style.display = 'block';
}
function countHits(picks, official) { return picks ? picks.filter(p => official.includes(p)).length : 0; }
function renderDetailList(id, data, official) {
    const ul = document.getElementById(id); ul.innerHTML = "";
    if(!data.main) return;
    data.main.forEach(p => ul.innerHTML += `<li>${p} ${official.includes(p) ? '<span class="hit">🎯</span>' : ''}</li>`);
    data.reserve.forEach(p => ul.innerHTML += `<li style="color:#666">(予) ${p} ${official.includes(p) ? '<span class="hit">🎯</span>' : ''}</li>`);
}
function switchScreen(id) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(id).classList.add('active'); window.scrollTo(0,0); }
function backToTop() { switchScreen('screen-select-player'); }
async function resetApp() { if(confirm("リセットしますか？")) { appState = { playerA: {main:[],reserve:[]}, playerB: {main:[],reserve:[]}, submittedA: false, submittedB: false, locked: false }; await saveData(); location.reload(); } }