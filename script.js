/* =========================
   Tic Tac Toe – 1P / 2P / Online (Firestore-ready)
   ========================= */

// ---------- AdMob placeholders ----------
// When you wrap this web app as an Android app (e.g., Capacitor + AdMob plugin),
// replace the two functions below with the actual AdMob calls.
// Sample AdMob IDs to use in native wrapper (Google’s test IDs):
//  Banner:       ca-app-pub-3940256099942544/6300978111
//  Interstitial: ca-app-pub-3940256099942544/1033173712
function showBannerAdPlaceholder() {
  const el = document.getElementById('adBanner');
  if (el) el.textContent = 'Banner Ad Placeholder (replace with AdMob banner in app build)';
}
function showInterstitialAdPlaceholder() {
  const dlg = document.getElementById('interstitial');
  dlg?.showModal();
}

// ---------- UI Elements ----------
const tabs = [...document.querySelectorAll('.tab')];
const panels = {
  local1: document.getElementById('panel-local1'),
  local2: document.getElementById('panel-local2'),
  online: document.getElementById('panel-online'),
};
const board = document.getElementById('board');
const cells = [...document.querySelectorAll('.cell')];

const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const scoreTEl = document.getElementById('scoreT');
const modeLabel = document.getElementById('modeLabel');
const turnLabel = document.getElementById('turnLabel');

const btnNew = document.getElementById('btnNew');
const btnReset = document.getElementById('btnReset');
const themeToggle = document.getElementById('themeToggle');
const soundToggle = document.getElementById('soundToggle');
const aiLevelSel = document.getElementById('aiLevel');
const humanPlaysSel = document.getElementById('humanPlays');

const interClose = document.getElementById('closeInterstitial');
interClose?.addEventListener('click', () => document.getElementById('interstitial').close());

showBannerAdPlaceholder();

// ---------- Sounds ----------
const SFX = {
  place: new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA...'), // tiny silent placeholder
  win:   new Audio('data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAA...'),
};
let soundOn = true;
soundToggle.addEventListener('click', () => {
  soundOn = !soundOn;
  soundToggle.setAttribute('aria-pressed', String(soundOn));
  soundToggle.textContent = soundOn ? '🔊' : '🔈';
});
function beep(aud){ if(soundOn){ aud.currentTime = 0; aud.play().catch(()=>{}); }}

// ---------- Game State ----------
const WINS = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6]          // diagonals
];
let boardArr = Array(9).fill(null);
let current = 'X';
let locked = false;
let scores = { X:0, O:0, T:0 };
let mode = 'local1'; // 'local1' | 'local2' | 'online'
let online = {
  enabled: false,
  db: null,
  roomId: null,
  myMark: null,   // 'X' or 'O'
  myTurn: false,
  unsub: null,
};

// ---------- Init ----------
updateStatus();
cells.forEach(c => c.addEventListener('click', onCell));
btnNew.addEventListener('click', newGame);
btnReset.addEventListener('click', resetScores);
themeToggle.addEventListener('click', toggleTheme);

// Tabs
tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

function switchTab(tab){
  tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab===tab));
  Object.entries(panels).forEach(([k,el]) => el.classList.toggle('active', k===tab));
  mode = tab;
  newGame(true);
  if(mode==='local1'){
    modeLabel.textContent = `Mode: 1 Player (You = ${humanPlaysSel.value})`;
  }else if(mode==='local2'){
    modeLabel.textContent = 'Mode: 2 Players (same device)';
  }else{
    modeLabel.textContent = 'Mode: Online';
  }
  updateStatus();
}

// Options listeners
aiLevelSel.addEventListener('change', ()=> newGame(true));
humanPlaysSel.addEventListener('change', ()=> newGame(true));

// ---------- Core Gameplay ----------
function onCell(e){
  const idx = Number(e.currentTarget.dataset.idx);
  if (locked || boardArr[idx]) return;

  if(mode==='local1'){
    // Local vs AI
    const human = humanPlaysSel.value; // 'X' or 'O'
    if(current !== human) return; // not your turn yet
    place(idx, human);
    if (checkEnd()) return;
    setTimeout(aiMove, 250);
  }else if(mode==='local2'){
    // Hot-seat 2 players
    place(idx, current);
    checkEnd();
  }else if(mode==='online'){
    // Online: only play if it's your turn
    if(!online.enabled || !online.myTurn) return;
    place(idx, online.myMark);
    syncOnlineMove(idx);
    checkEnd();
  }
}

function place(idx, mark){
  boardArr[idx] = mark;
  const cell = cells[idx];
  cell.textContent = mark;
  cell.classList.add(mark);
  cell.disabled = true;
  beep(SFX.place);
  current = (mark==='X') ? 'O' : 'X';
  updateStatus();
}

function checkWinner(b=boardArr){
  for(const [a,b1,c] of WINS){
    if(b[a] && b[a]===b[b1] && b[a]===b[c]) return {winner:b[a], line:[a,b1,c]};
  }
  if(b.every(v=>v)) return {winner:'T', line:[]};
  return null;
}

function checkEnd(){
  const res = checkWinner();
  if(!res) return false;

  locked = true;
  if(res.winner==='T'){
    scores.T++;
    scoreTEl.textContent = String(scores.T);
  }else{
    scores[res.winner]++;
    (res.winner==='X'?scoreXEl:scoreOEl).textContent = String(scores[res.winner]);
    res.line.forEach(i => cells[i].classList.add('win'));
    beep(SFX.win);
  }
  turnLabel.textContent = res.winner==='T' ? 'Tie game!' : `${res.winner} wins!`;
  // Show interstitial (placeholder) after each game
  setTimeout(showInterstitialAdPlaceholder, 400);
  return true;
}

function updateStatus(){
  if(mode==='online'){
    const who = online.myMark ? `You = ${online.myMark}` : '';
    turnLabel.textContent = `${who} ${online.myTurn?'(Your turn)':''}`.trim() || 'Connecting…';
  } else {
    turnLabel.textContent = `Turn: ${current}`;
  }
}

function newGame(hardReset=false){
  locked = false;
  boardArr = Array(9).fill(null);
  current = 'X';
  cells.forEach(c=>{
    c.textContent = '';
    c.disabled = false;
    c.classList.remove('X','O','win');
  });
  updateStatus();

  if(hardReset && mode==='local1'){
    // If human chose O, AI (X) starts
    const human = humanPlaysSel.value;
    if(human==='O'){
      setTimeout(aiMove, 350);
    }
  }
}

function resetScores(){
  scores = {X:0,O:0,T:0};
  scoreXEl.textContent='0'; scoreOEl.textContent='0'; scoreTEl.textContent='0';
  newGame(true);
}

function emptyIndices(b=boardArr){ return b.map((v,i)=> v?null:i).filter(v=>v!==null); }

// ---------- AI (minimax + difficulty tweaks) ----------
function aiMove(){
  const level = aiLevelSel.value; // 'hard' | 'medium' | 'easy'
  const ai = humanPlaysSel.value === 'X' ? 'O' : 'X';

  let move;
  if(level==='easy'){
    // 70% random, 30% smart
    move = (Math.random()<0.7) ? randomMove() : bestMove(ai);
  }else if(level==='medium'){
    // 30% random, 70% smart
    move = (Math.random()<0.3) ? randomMove() : bestMove(ai);
  }else{
    move = bestMove(ai); // unbeatable
  }
  place(move, ai);
  checkEnd();
}

function randomMove(){
  const empties = emptyIndices();
  return empties[Math.floor(Math.random()*empties.length)];
}

function bestMove(ai){
  const human = ai==='X' ? 'O' : 'X';
  let bestScore = -Infinity, move = null;
  const b = boardArr.slice();

  for(const i of emptyIndices(b)){
    b[i] = ai;
    const score = minimax(b, 0, false, ai, human, -Infinity, Infinity);
    b[i] = null;
    if(score > bestScore){ bestScore = score; move = i; }
  }
  return move;
}

function minimax(b, depth, isMax, ai, human, alpha, beta){
  const res = checkWinner(b);
  if(res){
    if(res.winner===ai) return 10 - depth;
    if(res.winner===human) return depth - 10;
    return 0;
  }
  if(isMax){
    let best = -Infinity;
    for(const i of emptyIndices(b)){
      b[i] = ai;
      best = Math.max(best, minimax(b, depth+1, false, ai, human, alpha, beta));
      b[i] = null; alpha = Math.max(alpha, best); if(beta<=alpha) break;
    }
    return best;
  }else{
    let best = Infinity;
    for(const i of emptyIndices(b)){
      b[i] = human;
      best = Math.min(best, minimax(b, depth+1, true, ai, human, alpha, beta));
      b[i] = null; beta = Math.min(beta, best); if(beta<=alpha) break;
    }
    return best;
  }
}

// ---------- Theme ----------
function toggleTheme(){
  document.body.classList.toggle('light');
  themeToggle.textContent = document.body.classList.contains('light') ? '🌤️' : '🌙';
}

// ---------- Online (Firestore) ----------
const onlineWarn = document.getElementById('onlineSetupWarning');
const onlineStatus = document.getElementById('onlineStatus');
const roomIdInput = document.getElementById('roomId');
const btnCreate = document.getElementById('btnCreateRoom');
const btnJoin = document.getElementById('btnJoinRoom');
const btnLeave = document.getElementById('btnLeaveRoom');

btnCreate.addEventListener('click', createRoom);
btnJoin.addEventListener('click', joinRoom);
btnLeave.addEventListener('click', leaveRoom);

// 1) Add your Firebase config here to enable Online mode:
const firebaseConfig = {
   apiKey: "AIzaSyB6mrERMiwCypCmgkQhnuNSS4rv0EYkirU",
  authDomain: "tic-tac-toe-62244.firebaseapp.com",
  projectId: "tic-tac-toe-62244",
  storageBucket: "tic-tac-toe-62244.firebasestorage.app",
  messagingSenderId: "442757783202",
  appId: "1:442757783202:web:f5c5f6e5ac6e7ce0b0c1fb",
  measurementId: "G-TZQZNYMGK7"

};

let app, db;
try{
  if(Object.keys(firebaseConfig).length){
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    online.enabled = true;
    onlineWarn.classList.add('hidden');
  }else{
    onlineWarn.classList.remove('hidden');
  }
}catch(e){
  console.warn('Firebase init error', e);
  onlineWarn.classList.remove('hidden');
}

async function createRoom(){
  ensureOnline();
  const roomId = (roomIdInput.value || makeRoomId()).toUpperCase();
  roomIdInput.value = roomId;
  // X creates the room and plays first
  const docRef = db.collection('tttRooms').doc(roomId);
  await docRef.set({
    board: Array(9).fill(null),
    current: 'X',
    createdAt: Date.now(),
    players: { X: true, O: false }
  });
  connectToRoom(roomId, 'X');
}

async function joinRoom(){
  ensureOnline();
  const roomId = (roomIdInput.value || '').toUpperCase();
  if(!roomId) return alert('Enter a Room ID');
  const docRef = db.collection('tttRooms').doc(roomId);
  const snap = await docRef.get();
  if(!snap.exists) return alert('Room not found');
  const data = snap.data();
  if(data.players.O) return alert('Room already full');
  await docRef.update({ ['players.O']: true });
  connectToRoom(roomId, 'O');
}

async function leaveRoom(){
  if(!online.roomId){ onlineStatus.textContent='Not connected.'; return; }
  await cleanupRoom();
  onlineStatus.textContent = 'Left room.';
  online.roomId = null; online.myMark = null; online.myTurn = false;
  if(online.unsub){ online.unsub(); online.unsub = null; }
  newGame(true);
}

function ensureOnline(){
  if(!online.enabled) throw new Error('Online not enabled (add Firebase config).');
}

function makeRoomId(){
  return [...crypto.getRandomValues(new Uint8Array(3))]
    .map(b => ('0' + b.toString(16)).slice(-2)).join('').slice(0,6).toUpperCase();
}

async function connectToRoom(roomId, myMark){
  const docRef = db.collection('tttRooms').doc(roomId);
  if(online.unsub){ online.unsub(); online.unsub = null; }
  online.roomId = roomId; online.myMark = myMark;

  online.unsub = docRef.onSnapshot(snap=>{
    const d = snap.data(); if(!d) return;
    boardArr = d.board;
    current = d.current;
    for(let i=0;i<9;i++){
      const v = boardArr[i];
      const cell = cells[i];
      cell.textContent = v || '';
      cell.classList.toggle('X', v==='X');
      cell.classList.toggle('O', v==='O');
      cell.disabled = Boolean(v);
      cell.classList.remove('win');
    }
    online.myTurn = (current === myMark);
    updateStatus();
    // show winner if ended
    const r = checkWinner(boardArr);
    if(r){
      locked = true;
      if(r.winner==='T'){
        scores.T++; scoreTEl.textContent=String(scores.T);
      }else{
        scores[r.winner]++; (r.winner==='X'?scoreXEl:scoreOEl).textContent = String(scores[r.winner]);
        r.line.forEach(i=> cells[i].classList.add('win'));
      }
      turnLabel.textContent = r.winner==='T' ? 'Tie game!' : `${r.winner} wins!`;
      setTimeout(showInterstitialAdPlaceholder, 400);
    }else{
      locked = false;
    }
  });

  onlineStatus.textContent = `Connected to ${roomId} as ${myMark}.`;
  modeLabel.textContent = `Mode: Online (You = ${myMark})`;
}

async function syncOnlineMove(idx){
  const roomId = online.roomId; if(!roomId) return;
  const docRef = db.collection('tttRooms').doc(roomId);
  const d = (await docRef.get()).data();
  if(!d) return;

  if(d.board[idx]) return; // already filled
  d.board[idx] = online.myMark;
  d.current = online.myMark==='X' ? 'O' : 'X';

  await docRef.update({ board: d.board, current: d.current });
  // After a game ends, auto new game after short delay
  const r = checkWinner(d.board);
  if(r){
    setTimeout(async ()=>{
      await docRef.update({ board: Array(9).fill(null), current: 'X' });
    }, 1200);
  }
}

async function cleanupRoom(){
  if(!online.enabled || !online.roomId) return;
  const docRef = db.collection('tttRooms').doc(online.roomId);
  try{
    await docRef.update({ ['players.'+online.myMark]: false });
    const snap = await docRef.get();
    const d = snap.data();
    if(d && !d.players.X && !d.players.O){
      await docRef.delete();
    }
  }catch(e){ /* ignore */ }
}

// ---------- Accessibility helpers ----------
board.addEventListener('keydown', (e)=>{
  const focused = document.activeElement;
  if(!focused.classList.contains('cell')) return;
  const idx = Number(focused.dataset.idx);
  const row = Math.floor(idx/3), col = idx%3;
  let target = idx;
  if(e.key==='ArrowRight' && col<2) target = idx+1;
  if(e.key==='ArrowLeft' && col>0) target = idx-1;
  if(e.key==='ArrowDown' && row<2) target = idx+3;
  if(e.key==='ArrowUp' && row>0) target = idx-3;
  if(target!==idx) { e.preventDefault(); cells[target].focus(); }
});

// Start focused for keyboard play
cells[0].focus();
