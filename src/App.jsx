import { useState, useCallback, useMemo, useEffect, useRef } from "react";

// ─── Piece definitions ───
const PIECE_DATA = {
  K:  { name: "玉", promoted: null },
  k:  { name: "王", promoted: null },
  R:  { name: "飛", promoted: "PR" },
  B:  { name: "角", promoted: "PB" },
  G:  { name: "金", promoted: null },
  S:  { name: "銀", promoted: "PS" },
  N:  { name: "桂", promoted: "PN" },
  L:  { name: "香", promoted: "PL" },
  P:  { name: "歩", promoted: "PP" },
  PR: { name: "龍", promoted: null, base: "R" },
  PB: { name: "馬", promoted: null, base: "B" },
  PS: { name: "全", promoted: null, base: "S" },
  PN: { name: "圭", promoted: null, base: "N" },
  PL: { name: "杏", promoted: null, base: "L" },
  PP: { name: "と", promoted: null, base: "P" },
};

const PROMOTED = { PR:1, PB:1, PS:1, PN:1, PL:1, PP:1 };
const DROP_TYPES = ["R","B","G","S","N","L","P"];

const PIECE_VALUE = {
  P:100, L:300, N:350, S:500, G:550, B:800, R:1000,
  PP:500, PL:500, PN:500, PS:550, PB:1050, PR:1250, K:0, k:0,
};
const HAND_VALUE = { P:120, L:350, N:400, S:550, G:600, B:900, R:1100 };

// ─── Initial board setup ───
function initBoard() {
  const b = Array.from({length:9}, () => Array(9).fill(null));
  b[8][0]={type:"L",owner:0}; b[8][1]={type:"N",owner:0}; b[8][2]={type:"S",owner:0};
  b[8][3]={type:"G",owner:0}; b[8][4]={type:"K",owner:0}; b[8][5]={type:"G",owner:0};
  b[8][6]={type:"S",owner:0}; b[8][7]={type:"N",owner:0}; b[8][8]={type:"L",owner:0};
  b[7][1]={type:"B",owner:0}; b[7][7]={type:"R",owner:0};
  for(let c=0;c<9;c++) b[6][c]={type:"P",owner:0};
  b[0][0]={type:"L",owner:1}; b[0][1]={type:"N",owner:1}; b[0][2]={type:"S",owner:1};
  b[0][3]={type:"G",owner:1}; b[0][4]={type:"k",owner:1}; b[0][5]={type:"G",owner:1};
  b[0][6]={type:"S",owner:1}; b[0][7]={type:"N",owner:1}; b[0][8]={type:"L",owner:1};
  b[1][1]={type:"R",owner:1}; b[1][7]={type:"B",owner:1};
  for(let c=0;c<9;c++) b[2][c]={type:"P",owner:1};
  return b;
}

function cloneBoard(b) { return b.map(r => r.map(c => c ? {...c} : null)); }
function cloneHands(h) { return [{...h[0]}, {...h[1]}]; }

// ─── Movement logic ───
function getMoves(board, r, c, piece) {
  const {type, owner} = piece;
  const dir = owner === 0 ? -1 : 1;
  const moves = [];
  const add = (nr, nc) => {
    if(nr<0||nr>8||nc<0||nc>8) return false;
    const target = board[nr][nc];
    if(target && target.owner === owner) return false;
    moves.push([nr,nc]);
    return !target;
  };
  const slide = (dr, dc) => {
    for(let i=1;i<9;i++) { if(!add(r+dr*i, c+dc*i)) break; }
  };
  switch(type) {
    case "K": case "k":
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) { if(dr||dc) add(r+dr,c+dc); } break;
    case "R": slide(-1,0); slide(1,0); slide(0,-1); slide(0,1); break;
    case "B": slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1); break;
    case "G":
      add(r+dir,c-1); add(r+dir,c); add(r+dir,c+1);
      add(r,c-1); add(r,c+1); add(r-dir,c); break;
    case "S":
      add(r+dir,c-1); add(r+dir,c); add(r+dir,c+1);
      add(r-dir,c-1); add(r-dir,c+1); break;
    case "N": add(r+dir*2,c-1); add(r+dir*2,c+1); break;
    case "L": slide(dir,0); break;
    case "P": add(r+dir,c); break;
    case "PR":
      slide(-1,0); slide(1,0); slide(0,-1); slide(0,1);
      add(r-1,c-1); add(r-1,c+1); add(r+1,c-1); add(r+1,c+1); break;
    case "PB":
      slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1);
      add(r-1,c); add(r+1,c); add(r,c-1); add(r,c+1); break;
    case "PS": case "PN": case "PL": case "PP":
      add(r+dir,c-1); add(r+dir,c); add(r+dir,c+1);
      add(r,c-1); add(r,c+1); add(r-dir,c); break;
  }
  return moves;
}

function isInCheck(board, owner) {
  let kr=-1, kc=-1;
  const kingType = owner===0 ? "K" : "k";
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(p && p.owner===owner && p.type===kingType) { kr=r; kc=c; }
  }
  if(kr<0) return true;
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(p && p.owner !== owner) {
      if(getMoves(board, r, c, p).some(([mr,mc])=> mr===kr && mc===kc)) return true;
    }
  }
  return false;
}

function getLegalMoves(board, r, c, piece) {
  return getMoves(board, r, c, piece).filter(([nr,nc]) => {
    const nb = cloneBoard(board);
    nb[nr][nc] = {...piece};
    nb[r][c] = null;
    return !isInCheck(nb, piece.owner);
  });
}

function canDrop(board, type, owner, r, c) {
  if(board[r][c]) return false;
  if(type==="P"||type==="L") {
    if(owner===0 && r===0) return false;
    if(owner===1 && r===8) return false;
  }
  if(type==="N") {
    if(owner===0 && r<=1) return false;
    if(owner===1 && r>=7) return false;
  }
  if(type==="P") {
    for(let row=0;row<9;row++) {
      const p = board[row][c];
      if(p && p.owner===owner && p.type==="P") return false;
    }
    const nb = cloneBoard(board);
    nb[r][c] = {type:"P", owner};
    const opp = 1-owner;
    if(isInCheck(nb, opp)) {
      let hasLegal = false;
      for(let rr=0;rr<9&&!hasLegal;rr++) for(let cc=0;cc<9&&!hasLegal;cc++) {
        const p = nb[rr][cc];
        if(p && p.owner===opp) {
          if(getLegalMoves(nb,rr,cc,p).length>0) hasLegal=true;
        }
      }
      if(!hasLegal) return false;
    }
  }
  const nb = cloneBoard(board);
  nb[r][c] = {type, owner};
  if(isInCheck(nb, owner)) return false;
  return true;
}

function canPromote(type, owner, fromR, toR) {
  if(!PIECE_DATA[type].promoted) return false;
  if(PROMOTED[type]) return false;
  const zone = owner===0 ? [0,1,2] : [6,7,8];
  return zone.includes(toR) || zone.includes(fromR);
}

function mustPromote(type, owner, toR) {
  if(type==="P"||type==="L") return (owner===0 && toR===0)||(owner===1 && toR===8);
  if(type==="N") return (owner===0 && toR<=1)||(owner===1 && toR>=7);
  return false;
}

function isCheckmate(board, hands, owner) {
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(p && p.owner===owner && getLegalMoves(board,r,c,p).length > 0) return false;
  }
  for(const t of DROP_TYPES) {
    if((hands[owner][t]||0) > 0) {
      for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
        if(canDrop(board,t,owner,r,c)) return false;
      }
    }
  }
  return true;
}

const getBaseType = (type) => PIECE_DATA[type].base || type;

// ─── Apply move (pure) ───
function applyMove(board, hands, move, turnOwner) {
  const nb = cloneBoard(board);
  const nh = cloneHands(hands);
  if(move.drop) {
    nb[move.toR][move.toC] = { type: move.drop, owner: turnOwner };
    nh[turnOwner][move.drop] -= 1;
    if(nh[turnOwner][move.drop] <= 0) delete nh[turnOwner][move.drop];
  } else {
    const piece = { ...nb[move.fromR][move.fromC] };
    const captured = nb[move.toR][move.toC];
    if(captured) {
      const capBase = getBaseType(captured.type);
      const handType = (capBase==="k"||capBase==="K") ? null : capBase;
      if(handType) nh[turnOwner][handType] = (nh[turnOwner][handType]||0) + 1;
    }
    if(move.promote) piece.type = PIECE_DATA[piece.type].promoted;
    nb[move.toR][move.toC] = piece;
    nb[move.fromR][move.fromC] = null;
  }
  return { board: nb, hands: nh };
}

function makeMoveDesc(move, board, turnOwner) {
  const rowK = ["一","二","三","四","五","六","七","八","九"];
  const sym = turnOwner===0 ? "☗" : "☖";
  const coord = `${9-move.toC}${rowK[move.toR]}`;
  if(move.drop) return `${sym}${coord}${PIECE_DATA[move.drop].name}打`;
  const piece = board[move.fromR][move.fromC];
  let pt = piece.type;
  if(move.promote) pt = PIECE_DATA[pt].promoted;
  return `${sym}${coord}${PIECE_DATA[pt].name}${move.promote?"成":""}`;
}

// ─── Generate all legal moves ───
function generateAllMoves(board, hands, owner) {
  const moves = [];
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(!p || p.owner!==owner) continue;
    const legal = getLegalMoves(board, r, c, p);
    for(const [tr,tc] of legal) {
      const mp = mustPromote(p.type, owner, tr);
      const cp = canPromote(p.type, owner, r, tr);
      if(mp) {
        moves.push({ fromR:r, fromC:c, toR:tr, toC:tc, promote:true });
      } else if(cp) {
        moves.push({ fromR:r, fromC:c, toR:tr, toC:tc, promote:true });
        moves.push({ fromR:r, fromC:c, toR:tr, toC:tc, promote:false });
      } else {
        moves.push({ fromR:r, fromC:c, toR:tr, toC:tc, promote:false });
      }
    }
  }
  for(const t of DROP_TYPES) {
    if((hands[owner][t]||0) <= 0) continue;
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
      if(canDrop(board, t, owner, r, c)) moves.push({ drop: t, toR: r, toC: c });
    }
  }
  return moves;
}

// ─── Zobrist Hashing for Transposition Table ───
const ZOBRIST = (() => {
  const rng = (s) => { s^=s<<13; s^=s>>17; s^=s<<5; return s>>>0; };
  let seed = 123456789;
  const rand = () => { seed=rng(seed); const a=seed; seed=rng(seed); return a*4294967296+seed; };
  const table = {};
  const types = ["K","k","R","B","G","S","N","L","P","PR","PB","PS","PN","PL","PP"];
  for(const t of types) for(let o=0;o<2;o++) for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    table[`${t}_${o}_${r}_${c}`] = rand();
  }
  for(const t of DROP_TYPES) for(let o=0;o<2;o++) for(let n=0;n<18;n++) {
    table[`H_${t}_${o}_${n}`] = rand();
  }
  table.SIDE = rand();
  return table;
})();

function hashPosition(board, hands, turn) {
  let h = turn === 1 ? ZOBRIST.SIDE : 0;
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(p) h ^= ZOBRIST[`${p.type}_${p.owner}_${r}_${c}`] || 0;
  }
  for(const t of DROP_TYPES) for(let o=0;o<2;o++) {
    const n = hands[o][t]||0;
    if(n>0) h ^= ZOBRIST[`H_${t}_${o}_${n}`] || 0;
  }
  return h;
}

// Transposition table (Map with size limit)
const TT_SIZE = 100000;
let ttable = new Map();
function ttGet(hash) { return ttable.get(hash); }
function ttSet(hash, depth, score, flag, move) {
  if(ttable.size > TT_SIZE) ttable = new Map(); // simple eviction
  ttable.set(hash, {depth, score, flag, move});
}
const TT_EXACT=0, TT_ALPHA=1, TT_BETA=2;

// ─── Opening Book (定跡) ───
// Moves as [fromR,fromC,toR,toC] for gote (owner=1)
// Covers common responses: 居飛車 (static rook) and 矢倉 (yagura) style
const OPENING_BOOK = [
  // Move 1 responses depending on sente's opening
  {
    // Default: advance center pawn (3四歩)
    condition: (board, hands, moveNum) => moveNum === 0,
    moves: [
      { fromR:2, fromC:2, toR:3, toC:2, promote:false }, // 3四歩 (7六歩に対する定跡応手)
      { fromR:2, fromC:6, toR:3, toC:6, promote:false }, // 7四歩
      { fromR:2, fromC:4, toR:3, toC:4, promote:false }, // 5四歩
    ]
  },
  {
    // Move 2: develop pieces
    condition: (board, hands, moveNum) => moveNum === 1,
    moves: [
      { fromR:0, fromC:6, toR:1, toC:6, promote:false }, // 右銀上がり 7二銀
      { fromR:0, fromC:2, toR:1, toC:2, promote:false }, // 左銀上がり 3二銀
      { fromR:0, fromC:3, toR:1, toC:3, promote:false }, // 左金上がり 4二金
    ]
  },
  {
    // Move 3: continue development
    condition: (board, hands, moveNum) => moveNum === 2,
    moves: [
      { fromR:0, fromC:5, toR:1, toC:5, promote:false }, // 6二金
      { fromR:0, fromC:4, toR:1, toC:4, promote:false }, // 5二玉 (居玉回避)
      { fromR:1, fromC:1, toR:3, toC:3, promote:false }, // 4四角 (角交換拒否)
    ]
  },
  {
    // Move 4: castle or keep developing
    condition: (board, hands, moveNum) => moveNum === 3,
    moves: [
      { fromR:2, fromC:6, toR:3, toC:6, promote:false }, // 7四歩
      { fromR:2, fromC:2, toR:3, toC:2, promote:false }, // 3四歩
      { fromR:0, fromC:4, toR:1, toC:4, promote:false }, // 5二玉
    ]
  },
  {
    // Move 5
    condition: (board, hands, moveNum) => moveNum === 4,
    moves: [
      { fromR:1, fromC:4, toR:2, toC:3, promote:false }, // 4三玉 → 囲いへ
      { fromR:1, fromC:6, toR:2, toC:5, promote:false }, // 6三銀
      { fromR:2, fromC:0, toR:3, toC:0, promote:false }, // 1四歩 (端歩)
    ]
  },
];

function getBookMove(board, hands, moveNum) {
  for(const entry of OPENING_BOOK) {
    if(entry.condition(board, hands, moveNum)) {
      // Try each candidate, pick first legal one
      for(const m of entry.moves) {
        const piece = board[m.fromR]?.[m.fromC];
        if(piece && piece.owner === 1) {
          const legal = getLegalMoves(board, m.fromR, m.fromC, piece);
          if(legal.some(([r,c]) => r===m.toR && c===m.toC)) return m;
        }
      }
    }
  }
  return null;
}

// ─── Enhanced Evaluation ───
// Piece-Square Tables (from gote's perspective, flip for sente)
const PST = {
  P: [
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [20,20,20,25,30,25,20,20,20],
    [10,10,15,20,25,20,15,10,10],
    [ 5, 5,10,15,20,15,10, 5, 5],
    [ 0, 0, 5,10,15,10, 5, 0, 0],
    [ 0, 0, 0, 5, 5, 5, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  S: [
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 5,10,15,15,15,15,15,10, 5],
    [ 5,10,20,25,25,25,20,10, 5],
    [ 0, 5,15,20,25,20,15, 5, 0],
    [ 0, 0,10,15,20,15,10, 0, 0],
    [ 0, 0, 5,10,10,10, 5, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  G: [
    [ 0, 5, 5,10,10,10, 5, 5, 0],
    [ 0, 5,10,15,15,15,10, 5, 0],
    [ 0, 5,10,15,20,15,10, 5, 0],
    [ 0, 0, 5,10,15,10, 5, 0, 0],
    [ 0, 0, 0, 5, 5, 5, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
};

// King safety: count defenders and attackers around king
function kingSafety(board, owner) {
  let kr=-1, kc=-1;
  const kingType = owner===0 ? "K" : "k";
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(p && p.owner===owner && p.type===kingType) { kr=r; kc=c; break; }
    if(kr>=0) break;
  }
  if(kr<0) return -9999;

  let safety = 0;
  const opp = 1-owner;

  // Count friendly pieces around king (defenders)
  let defenders = 0;
  for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) {
    if(!dr&&!dc) continue;
    const nr=kr+dr, nc=kc+dc;
    if(nr<0||nr>8||nc<0||nc>8) { defenders += 0.3; continue; } // edge = partial defense
    const p = board[nr][nc];
    if(p && p.owner===owner) {
      defenders++;
      // Gold/promoted pieces near king are great defenders
      if(p.type==="G"||PROMOTED[p.type]) defenders += 0.5;
    }
  }
  safety += defenders * 25;

  // Penalty for enemy pieces nearby
  let attackers = 0;
  for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++) {
    if(!dr&&!dc) continue;
    const nr=kr+dr, nc=kc+dc;
    if(nr<0||nr>8||nc<0||nc>8) continue;
    const p = board[nr][nc];
    if(p && p.owner===opp) {
      const dist = Math.abs(dr)+Math.abs(dc);
      const threat = (PIECE_VALUE[p.type]||100) / 200;
      attackers += threat / dist;
    }
  }
  safety -= attackers * 30;

  // Bonus for being in a castle (near back rank, corner)
  const backRank = owner===0 ? 8 : 0;
  const distFromBack = Math.abs(kr - backRank);
  if(distFromBack <= 1) safety += 30;
  if(distFromBack <= 2 && (kc<=2||kc>=6)) safety += 20; // corner castle bonus

  // Penalty for exposed king (center of board)
  if(distFromBack >= 4) safety -= 40;
  if(kc>=3 && kc<=5 && distFromBack>=3) safety -= 30; // center is dangerous

  return safety;
}

// Mobility: number of legal moves (approximated with raw moves for speed)
function mobilityScore(board, owner) {
  let mobility = 0;
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(!p || p.owner!==owner) continue;
    const moves = getMoves(board, r, c, p);
    // Weight by piece type: rook/bishop mobility matters more
    if(p.type==="R"||p.type==="PR") mobility += moves.length * 3;
    else if(p.type==="B"||p.type==="PB") mobility += moves.length * 3;
    else if(p.type==="G"||p.type==="S") mobility += moves.length * 1.5;
    else mobility += moves.length;
  }
  return mobility;
}

// Rook on open file bonus
function rookFileBonus(board, owner) {
  let bonus = 0;
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(!p || p.owner!==owner) continue;
    if(p.type!=="R"&&p.type!=="PR") continue;
    // Check if column has own pawns
    let ownPawn = false, oppPawn = false;
    for(let rr=0;rr<9;rr++) {
      const pp = board[rr][c];
      if(pp && pp.type==="P") {
        if(pp.owner===owner) ownPawn=true;
        else oppPawn=true;
      }
    }
    if(!ownPawn && !oppPawn) bonus += 40; // open file
    else if(!ownPawn) bonus += 25; // semi-open file
    // Bonus for rook penetration into enemy territory
    const inEnemyZone = owner===0 ? r<=2 : r>=6;
    if(inEnemyZone) bonus += 50;
  }
  return bonus;
}

// Piece-square table lookup
function pstScore(type, owner, r, c) {
  const table = PST[type];
  if(!table) return 0;
  // For sente (owner=0), flip the table vertically
  const row = owner===0 ? (8-r) : r;
  return table[row]?.[c] || 0;
}

// Connected pieces bonus (pieces defending each other)
function connectionBonus(board, owner) {
  let bonus = 0;
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(!p || p.owner!==owner) continue;
    // Check if this piece is defended by a friendly piece
    const defended = isDefended(board, r, c, owner);
    if(defended) bonus += 8;
    // Hanging piece penalty (undefended and attacked)
    if(!defended && isAttackedBy(board, r, c, 1-owner)) {
      bonus -= (PIECE_VALUE[p.type]||100) * 0.15;
    }
  }
  return bonus;
}

function isDefended(board, r, c, owner) {
  for(let rr=0;rr<9;rr++) for(let cc=0;cc<9;cc++) {
    const p = board[rr][cc];
    if(!p || p.owner!==owner || (rr===r && cc===c)) continue;
    if(getMoves(board, rr, cc, p).some(([mr,mc])=>mr===r&&mc===c)) return true;
  }
  return false;
}

function isAttackedBy(board, r, c, attacker) {
  for(let rr=0;rr<9;rr++) for(let cc=0;cc<9;cc++) {
    const p = board[rr][cc];
    if(!p || p.owner!==attacker) continue;
    if(getMoves(board, rr, cc, p).some(([mr,mc])=>mr===r&&mc===c)) return true;
  }
  return false;
}

function evaluate(board, hands) {
  let score = 0;

  // Material + PST
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(!p) continue;
    const mat = PIECE_VALUE[p.type]||0;
    const pst = pstScore(p.type, p.owner, r, c);
    score += (p.owner===0 ? 1 : -1) * (mat + pst);
  }

  // Hand pieces
  for(const t of DROP_TYPES) {
    score += (hands[0][t]||0) * (HAND_VALUE[t]||0);
    score -= (hands[1][t]||0) * (HAND_VALUE[t]||0);
  }

  // King safety
  score += kingSafety(board, 0) - kingSafety(board, 1);

  // Mobility (scaled down for speed)
  score += (mobilityScore(board, 0) - mobilityScore(board, 1)) * 2;

  // Rook activity
  score += rookFileBonus(board, 0) - rookFileBonus(board, 1);

  // Piece connections
  score += connectionBonus(board, 0) - connectionBonus(board, 1);

  // Check bonus
  if(isInCheck(board,1)) score += 80;
  if(isInCheck(board,0)) score -= 80;

  return score;
}

// ─── Move Ordering (MVV-LVA + killers + history) ───
let killerMoves = Array.from({length:20}, () => [null, null]); // 2 killers per ply
let historyTable = {}; // history heuristic scores

function moveKey(m) {
  if(m.drop) return `D${m.drop}${m.toR}${m.toC}`;
  return `${m.fromR}${m.fromC}${m.toR}${m.toC}${m.promote?1:0}`;
}

function scoreMove(m, board, ply, ttMove) {
  // TT move gets highest priority
  if(ttMove && moveKey(m) === moveKey(ttMove)) return 100000;

  let s = 0;
  // Captures: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
  if(!m.drop) {
    const victim = board[m.toR][m.toC];
    if(victim) {
      s += 10000 + (PIECE_VALUE[victim.type]||0) * 10 - (PIECE_VALUE[board[m.fromR][m.fromC].type]||0);
    }
  }
  // Promotions
  if(m.promote) s += 5000;
  // Killer moves
  const km = killerMoves[ply];
  if(km) {
    if(km[0] && moveKey(m)===moveKey(km[0])) s += 3000;
    else if(km[1] && moveKey(m)===moveKey(km[1])) s += 2500;
  }
  // History heuristic
  s += (historyTable[moveKey(m)]||0);
  // Drops towards center
  if(m.drop) {
    s += (4 - Math.abs(m.toC - 4)) * 5;
    if(m.drop==="R"||m.drop==="B") s += 500; // dropping major pieces is often good
  }
  return s;
}

function orderMoves(moves, board, ply, ttMove) {
  const scored = moves.map(m => ({ m, s: scoreMove(m, board, ply, ttMove) }));
  scored.sort((a,b) => b.s - a.s);
  return scored.map(x => x.m);
}

function storeKiller(ply, move) {
  if(ply >= killerMoves.length) return;
  const km = killerMoves[ply];
  if(!km[0] || moveKey(km[0]) !== moveKey(move)) {
    km[1] = km[0];
    km[0] = move;
  }
}

// ─── Quiescence Search ───
function quiescence(board, hands, alpha, beta, maximizing, startTime, timeLimit, depth) {
  if(Date.now()-startTime > timeLimit || depth <= -4) return evaluate(board, hands);

  const standPat = evaluate(board, hands);
  const owner = maximizing ? 0 : 1;

  if(maximizing) {
    if(standPat >= beta) return beta;
    if(standPat > alpha) alpha = standPat;
  } else {
    if(standPat <= alpha) return alpha;
    if(standPat < beta) beta = standPat;
  }

  // Generate only capture moves
  const moves = [];
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    const p = board[r][c];
    if(!p || p.owner!==owner) continue;
    const legal = getLegalMoves(board, r, c, p);
    for(const [tr,tc] of legal) {
      if(!board[tr][tc]) continue; // only captures
      const mp = mustPromote(p.type, owner, tr);
      const cp = canPromote(p.type, owner, r, tr);
      if(mp || cp) {
        moves.push({ fromR:r, fromC:c, toR:tr, toC:tc, promote:true });
      }
      if(!mp) {
        moves.push({ fromR:r, fromC:c, toR:tr, toC:tc, promote:false });
      }
    }
  }

  // Sort captures by MVV-LVA
  moves.sort((a,b) => {
    const va = PIECE_VALUE[board[a.toR][a.toC]?.type]||0;
    const vb = PIECE_VALUE[board[b.toR][b.toC]?.type]||0;
    return vb - va;
  });

  if(maximizing) {
    for(const m of moves) {
      if(Date.now()-startTime>timeLimit) break;
      const {board:nb,hands:nh} = applyMove(board,hands,m,owner);
      const score = quiescence(nb,nh,alpha,beta,false,startTime,timeLimit,depth-1);
      if(score > alpha) alpha = score;
      if(alpha >= beta) break;
    }
    return alpha;
  } else {
    for(const m of moves) {
      if(Date.now()-startTime>timeLimit) break;
      const {board:nb,hands:nh} = applyMove(board,hands,m,owner);
      const score = quiescence(nb,nh,alpha,beta,true,startTime,timeLimit,depth-1);
      if(score < beta) beta = score;
      if(alpha >= beta) break;
    }
    return beta;
  }
}

// ─── Negamax with Alpha-Beta + TT + Killers ───
function negamax(board, hands, depth, alpha, beta, color, ply, startTime, timeLimit) {
  if(Date.now()-startTime > timeLimit) return { score: color * evaluate(board, hands) };

  const owner = color === 1 ? 0 : 1;
  const hash = hashPosition(board, hands, owner);

  // TT lookup
  const ttEntry = ttGet(hash);
  let ttMove = null;
  if(ttEntry && ttEntry.depth >= depth) {
    if(ttEntry.flag === TT_EXACT) return { score: ttEntry.score, move: ttEntry.move };
    if(ttEntry.flag === TT_ALPHA && ttEntry.score <= alpha) return { score: alpha, move: ttEntry.move };
    if(ttEntry.flag === TT_BETA && ttEntry.score >= beta) return { score: beta, move: ttEntry.move };
    ttMove = ttEntry.move;
  } else if(ttEntry) {
    ttMove = ttEntry.move;
  }

  if(depth <= 0) {
    const qs = quiescence(board, hands, alpha, beta, color===1, startTime, timeLimit, 0);
    return { score: color === 1 ? qs : -qs };
  }

  const moves = generateAllMoves(board, hands, owner);
  if(moves.length === 0) return { score: -99999 + ply }; // checkmate (prefer shorter mates)

  const ordered = orderMoves(moves, board, ply, ttMove);

  let bestMove = ordered[0];
  let bestScore = -Infinity;
  let flag = TT_ALPHA;

  for(const m of ordered) {
    if(Date.now()-startTime>timeLimit) break;
    const {board:nb,hands:nh} = applyMove(board,hands,m,owner);
    const {score: childScore} = negamax(nb,nh,depth-1,-beta,-alpha,-color,ply+1,startTime,timeLimit);
    const score = -childScore;

    if(score > bestScore) { bestScore = score; bestMove = m; }
    if(score > alpha) {
      alpha = score;
      flag = TT_EXACT;
    }
    if(alpha >= beta) {
      // Store killer & history for non-captures
      if(!m.drop && !board[m.toR]?.[m.toC]) {
        storeKiller(ply, m);
        const key = moveKey(m);
        historyTable[key] = (historyTable[key]||0) + depth*depth;
      }
      flag = TT_BETA;
      break;
    }
  }

  ttSet(hash, depth, bestScore, flag, bestMove);
  return { score: bestScore, move: bestMove };
}

// ─── Iterative Deepening ───
function cpuChooseMove(board, hands, cpuMoveNum) {
  // Try opening book first
  const bookMove = getBookMove(board, hands, cpuMoveNum);
  if(bookMove) return bookMove;

  // Clear history for fresh search (keep TT)
  killerMoves = Array.from({length:20}, () => [null, null]);
  historyTable = {};

  const startTime = Date.now();
  const timeLimit = 3000; // 3 seconds
  let bestMove = null;

  // Iterative deepening: depth 1 → 2 → 3 → 4 → ...
  for(let depth = 1; depth <= 6; depth++) {
    if(Date.now()-startTime > timeLimit * 0.7) break; // don't start new depth if >70% time used
    const result = negamax(board, hands, depth, -Infinity, Infinity, -1, 0, startTime, timeLimit);
    if(result.move) bestMove = result.move;
    if(Date.now()-startTime > timeLimit * 0.85) break;
  }

  if(bestMove) return bestMove;
  const moves = generateAllMoves(board, hands, 1);
  return moves.length > 0 ? moves[Math.floor(Math.random()*moves.length)] : null;
}

// ─── Component ───
export default function Shogi() {
  const [board, setBoard] = useState(initBoard);
  const [turn, setTurn] = useState(0);
  const [hands, setHands] = useState([{}, {}]);
  const [selected, setSelected] = useState(null);
  const [legalDests, setLegalDests] = useState([]);
  const [promotePrompt, setPromotePrompt] = useState(null);
  const [gameOver, setGameOver] = useState(null);
  const [moveLog, setMoveLog] = useState([]);
  const [cpuMode, setCpuMode] = useState(true);
  const [cpuThinking, setCpuThinking] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [lastMove, setLastMove] = useState(null); // {fromR,fromC,toR,toC} or {toR,toC} for drops
  const cpuRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    if(logRef.current) logRef.current.scrollLeft = logRef.current.scrollWidth;
  }, [moveLog]);

  const finishTurn = useCallback((newBoard, newHands, desc, moveInfo) => {
    const next = 1-turn;
    setBoard(newBoard);
    setHands(newHands);
    setMoveLog(prev => [...prev, desc]);
    setLastMove(moveInfo);
    if(isInCheck(newBoard,next) && isCheckmate(newBoard,newHands,next)) {
      setGameOver(turn===0 ? "先手の勝ち！" : "後手の勝ち！");
    }
    setTurn(next);
    setSelected(null);
    setLegalDests([]);
  }, [turn]);

  const executeMove = useCallback((fromR, fromC, toR, toC, promote) => {
    const move = { fromR, fromC, toR, toC, promote };
    const desc = makeMoveDesc(move, board, turn);
    const { board:nb, hands:nh } = applyMove(board, hands, move, turn);
    finishTurn(nb, nh, desc, { fromR, fromC, toR, toC });
  }, [board, hands, turn, finishTurn]);

  // CPU turn
  useEffect(() => {
    if(!cpuMode || turn!==1 || gameOver || promotePrompt || !gameStarted) return;
    setCpuThinking(true);
    cpuRef.current = setTimeout(() => {
      const cpuMoveNum = Math.floor(moveLog.length / 2);
      const move = cpuChooseMove(board, hands, cpuMoveNum);
      if(!move) { setCpuThinking(false); return; }
      const desc = makeMoveDesc(move, board, 1);
      const { board:nb, hands:nh } = applyMove(board, hands, move, 1);
      setBoard(nb); setHands(nh);
      setMoveLog(prev => [...prev, desc]);
      setLastMove(move.drop ? { toR: move.toR, toC: move.toC } : { fromR: move.fromR, fromC: move.fromC, toR: move.toR, toC: move.toC });
      if(isInCheck(nb,0) && isCheckmate(nb,nh,0)) {
        setGameOver("後手（CPU）の勝ち！");
      }
      setTurn(0);
      setSelected(null); setLegalDests([]);
      setCpuThinking(false);
    }, 400);
    return () => clearTimeout(cpuRef.current);
  }, [turn, cpuMode, gameOver, promotePrompt, board, hands, gameStarted]);

  const handleCellClick = useCallback((r, c) => {
    if(gameOver || promotePrompt || cpuThinking) return;
    if(cpuMode && turn===1) return;

    if(selected) {
      if(legalDests.some(([mr,mc])=>mr===r&&mc===c)) {
        if(selected.drop !== undefined) {
          const move = { drop: selected.drop, toR: r, toC: c };
          const desc = makeMoveDesc(move, board, turn);
          const { board:nb, hands:nh } = applyMove(board, hands, move, turn);
          finishTurn(nb, nh, desc, { toR: r, toC: c });
        } else {
          const piece = board[selected.r][selected.c];
          const mp = mustPromote(piece.type, piece.owner, r);
          const cp = canPromote(piece.type, piece.owner, selected.r, r);
          if(mp) executeMove(selected.r, selected.c, r, c, true);
          else if(cp) setPromotePrompt({fromR:selected.r, fromC:selected.c, toR:r, toC:c});
          else executeMove(selected.r, selected.c, r, c, false);
        }
        return;
      }
      setSelected(null); setLegalDests([]);
    }

    const piece = board[r][c];
    if(piece && piece.owner===turn) {
      setSelected({r,c});
      setLegalDests(getLegalMoves(board, r, c, piece));
    }
  }, [board, selected, legalDests, turn, gameOver, promotePrompt, hands, executeMove, finishTurn, cpuMode, cpuThinking]);

  const handleHandClick = useCallback((type) => {
    if(gameOver || promotePrompt || cpuThinking) return;
    if(cpuMode && turn===1) return;
    if((hands[turn][type]||0)<=0) return;
    const dests = [];
    for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
      if(canDrop(board,type,turn,r,c)) dests.push([r,c]);
    }
    setSelected({drop:type});
    setLegalDests(dests);
  }, [board, turn, hands, gameOver, promotePrompt, cpuMode, cpuThinking]);

  const handlePromote = useCallback((doPromote) => {
    if(!promotePrompt) return;
    const {fromR,fromC,toR,toC} = promotePrompt;
    setPromotePrompt(null);
    executeMove(fromR, fromC, toR, toC, doPromote);
  }, [promotePrompt, executeMove]);

  const resetGame = useCallback(() => {
    clearTimeout(cpuRef.current);
    ttable = new Map(); // Clear transposition table
    setBoard(initBoard()); setTurn(0); setHands([{},{}]);
    setSelected(null); setLegalDests([]); setPromotePrompt(null);
    setGameOver(null); setMoveLog([]); setCpuThinking(false);
    setLastMove(null); setGameStarted(false);
  }, []);

  const legalSet = useMemo(() => {
    const s = new Set();
    legalDests.forEach(([r,c]) => s.add(`${r},${c}`));
    return s;
  }, [legalDests]);

  const inCheck = useMemo(() => isInCheck(board, turn), [board, turn]);

  const renderPiece = (piece) => {
    if(!piece) return null;
    return (
      <span style={{
        color: PROMOTED[piece.type] ? "#c0392b" : "#1a1a2e",
        transform: piece.owner===1 ? "rotate(180deg)" : "none",
        display: "inline-block",
        fontSize: "clamp(14px, 3.2vw, 22px)",
        fontWeight: 700, lineHeight: 1, userSelect: "none",
      }}>{PIECE_DATA[piece.type].name}</span>
    );
  };

  const colLabels = [9,8,7,6,5,4,3,2,1];
  const rowLabels = ["一","二","三","四","五","六","七","八","九"];

  // ─── Title Screen ───
  if(!gameStarted) {
    return (
      <div style={{
        minHeight:"100vh",
        background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        fontFamily:"'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',serif",
        color:"#e0d5c1", gap:20, padding:24,
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700;900&display=swap" rel="stylesheet"/>
        <div style={{
          fontSize:"clamp(40px,12vw,72px)", fontWeight:900, letterSpacing:"0.2em",
          background:"linear-gradient(90deg,#f5deb3,#daa520,#f5deb3)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
        }}>将棋</div>
        <div style={{fontSize:"clamp(12px,2.5vw,16px)", color:"#a09080", marginBottom:12, letterSpacing:"0.1em"}}>
          対局モードを選んでください
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:14, width:"100%", maxWidth:280}}>
          <button onClick={() => {setCpuMode(true); setGameStarted(true);}} style={{
            ...menuBtn, background:"linear-gradient(135deg,#daa520,#b8860b)", color:"#1a1a2e",
          }}>
            <span style={{fontSize:"clamp(18px,4vw,24px)"}}>🤖</span>
            <div>
              <div style={{fontWeight:900, fontSize:"clamp(14px,3vw,18px)"}}>CPU対戦</div>
              <div style={{fontSize:"clamp(10px,2vw,12px)", opacity:0.7, marginTop:2}}>先手（あなた） vs 後手（CPU）</div>
            </div>
          </button>
          <button onClick={() => {setCpuMode(false); setGameStarted(true);}} style={{
            ...menuBtn, background:"rgba(212,167,106,0.15)", border:"1px solid #8b7355", color:"#e0d5c1",
          }}>
            <span style={{fontSize:"clamp(18px,4vw,24px)"}}>👥</span>
            <div>
              <div style={{fontWeight:900, fontSize:"clamp(14px,3vw,18px)"}}>二人対戦</div>
              <div style={{fontSize:"clamp(10px,2vw,12px)", opacity:0.7, marginTop:2}}>先手 vs 後手（交互に指す）</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ─── Game Screen ───
  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", padding:"12px 8px",
      fontFamily:"'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',serif", color:"#e0d5c1",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700;900&display=swap" rel="stylesheet"/>

      <h1 style={{
        fontSize:"clamp(20px,5vw,32px)", fontWeight:900, margin:"0 0 4px 0", letterSpacing:"0.15em",
        background:"linear-gradient(90deg,#f5deb3,#daa520,#f5deb3)",
        WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
      }}>将 棋</h1>

      <div style={{
        fontSize:"clamp(10px,2vw,12px)", color:"#706050", marginBottom:5,
        padding:"2px 10px", borderRadius:10,
        background:"rgba(255,255,255,0.05)", border:"1px solid rgba(139,115,85,0.2)",
      }}>{cpuMode ? "🤖 CPU対戦" : "👥 二人対戦"}</div>

      <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:5, fontSize:"clamp(12px,2.5vw,16px)"}}>
        <span style={{
          padding:"3px 14px", borderRadius:6,
          background: turn===0?"rgba(218,165,32,0.3)":"transparent",
          border: turn===0?"1px solid #daa520":"1px solid transparent",
          transition:"all 0.3s",
        }}>☗ 先手{cpuMode?"（あなた）":""}</span>
        <span style={{
          width:8, height:8, borderRadius:"50%",
          background: cpuThinking?"#3498db": inCheck&&!gameOver?"#e74c3c":"#daa520",
          animation: cpuThinking?"pulse 0.8s infinite": inCheck&&!gameOver?"pulse 1s infinite":"none",
        }}/>
        <span style={{
          padding:"3px 14px", borderRadius:6,
          background: turn===1?"rgba(218,165,32,0.3)":"transparent",
          border: turn===1?"1px solid #daa520":"1px solid transparent",
          transition:"all 0.3s",
        }}>☖ 後手{cpuMode?"（CPU）":""}</span>
      </div>

      {cpuThinking && (
        <div style={{color:"#3498db", fontSize:"clamp(10px,2vw,13px)", marginBottom:4, fontWeight:700, display:"flex", alignItems:"center", gap:6}}>
          <span style={{display:"inline-block", animation:"spin 1s linear infinite", fontSize:14}}>⚙</span>
          思考中...
        </div>
      )}
      {inCheck && !gameOver && !cpuThinking && (
        <div style={{color:"#e74c3c", fontSize:"clamp(11px,2.2vw,14px)", marginBottom:4, fontWeight:700}}>王手！</div>
      )}

      <div style={{
        display:"flex", gap:"clamp(4px,1.5vw,12px)", alignItems:"center",
        justifyContent:"center", width:"100%", maxWidth:560,
      }}>
        <HandPanel hand={hands[1]} owner={1}
          isTurn={turn===1&&!cpuMode}
          selected={!cpuMode&&turn===1?selected?.drop:undefined}
          onSelect={!cpuMode&&turn===1?handleHandClick:()=>{}}
          label={cpuMode?"☖CPU":"☖後手"} />

        <div style={{display:"flex", flexDirection:"column", alignItems:"center"}}>
          <div style={{display:"flex", marginLeft:18}}>
            {colLabels.map((n,i) => (
              <div key={i} style={{width:"clamp(28px,7.5vw,48px)", textAlign:"center", fontSize:"clamp(9px,1.8vw,12px)", color:"#a09080", marginBottom:2}}>{n}</div>
            ))}
          </div>
          <div style={{display:"flex"}}>
            <div style={{
              display:"grid",
              gridTemplateRows:"repeat(9,clamp(28px,7.5vw,48px))",
              gridTemplateColumns:"repeat(9,clamp(28px,7.5vw,48px))",
              border:"2px solid #8b7355", background:"#d4a76a",
              boxShadow:"0 4px 24px rgba(0,0,0,0.5),inset 0 0 30px rgba(139,115,85,0.3)",
              borderRadius:2, opacity: cpuThinking?0.85:1, transition:"opacity 0.3s",
            }}>
              {board.map((row,r) => row.map((cell,c) => {
                const isLegal = legalSet.has(`${r},${c}`);
                const isSel = selected && selected.r===r && selected.c===c;
                const hasEnemy = isLegal && cell && cell.owner!==turn;
                const isLastFrom = lastMove && lastMove.fromR===r && lastMove.fromC===c;
                const isLastTo = lastMove && lastMove.toR===r && lastMove.toC===c;
                const isLast = isLastFrom || isLastTo;
                return (
                  <div key={`${r}-${c}`} onClick={() => handleCellClick(r,c)} style={{
                    width:"clamp(28px,7.5vw,48px)", height:"clamp(28px,7.5vw,48px)",
                    border:"0.5px solid #8b7355", display:"flex", alignItems:"center", justifyContent:"center",
                    cursor: cpuThinking?"wait":"pointer", position:"relative",
                    background: isSel?"rgba(218,165,32,0.45)": hasEnemy?"rgba(231,76,60,0.25)": isLegal?"rgba(218,165,32,0.2)": isLastTo?"rgba(100,180,100,0.35)": isLastFrom?"rgba(100,180,100,0.18)":"transparent",
                    transition:"background 0.15s",
                  }}>
                    {isLegal && !cell && <div style={{position:"absolute", width:8, height:8, borderRadius:"50%", background:"rgba(218,165,32,0.5)"}}/>}
                    {hasEnemy && <div style={{position:"absolute", inset:2, border:"2px solid rgba(231,76,60,0.6)", borderRadius:3, pointerEvents:"none"}}/>}
                    {renderPiece(cell)}
                  </div>
                );
              }))}
            </div>
            <div style={{display:"flex", flexDirection:"column", marginLeft:3}}>
              {rowLabels.map((l,i) => (
                <div key={i} style={{height:"clamp(28px,7.5vw,48px)", display:"flex", alignItems:"center", fontSize:"clamp(9px,1.8vw,12px)", color:"#a09080", paddingLeft:2}}>{l}</div>
              ))}
            </div>
          </div>
        </div>

        <HandPanel hand={hands[0]} owner={0}
          isTurn={turn===0}
          selected={turn===0?selected?.drop:undefined}
          onSelect={turn===0?handleHandClick:()=>{}}
          label="☗先手" />
      </div>

      {promotePrompt && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100}}>
          <div style={{background:"linear-gradient(145deg,#2a1f14,#3d2b1f)", border:"2px solid #daa520", borderRadius:12, padding:"24px 32px", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.6)"}}>
            <div style={{fontSize:18, marginBottom:16, fontWeight:700}}>成りますか？</div>
            <div style={{display:"flex", gap:16}}>
              <button onClick={() => handlePromote(true)} style={btn("#daa520","#1a1a2e")}>成る</button>
              <button onClick={() => handlePromote(false)} style={btn("#8b7355","#e0d5c1")}>不成</button>
            </div>
          </div>
        </div>
      )}

      {gameOver && (
        <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100}}>
          <div style={{background:"linear-gradient(145deg,#2a1f14,#3d2b1f)", border:"2px solid #daa520", borderRadius:16, padding:"32px 40px", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.6)"}}>
            <div style={{fontSize:"clamp(20px,4vw,28px)", fontWeight:900, marginBottom:8, color:"#daa520"}}>詰み</div>
            <div style={{fontSize:"clamp(16px,3vw,20px)", marginBottom:20}}>{gameOver}</div>
            <button onClick={resetGame} style={btn("#daa520","#1a1a2e")}>タイトルへ</button>
          </div>
        </div>
      )}

      {moveLog.length > 0 && (
        <div ref={logRef} style={{
          marginTop:10, maxWidth:480, width:"100%",
          background:"rgba(255,255,255,0.05)", borderRadius:8,
          padding:"8px 12px", maxHeight:80, overflowY:"auto",
          fontSize:"clamp(10px,2vw,13px)", color:"#a09080", lineHeight:1.6,
        }}>
          {moveLog.map((m,i) => (
            <span key={i} style={{marginRight:8}}>
              <span style={{color:"#706050", fontSize:"0.85em"}}>{i+1}.</span> {m}
            </span>
          ))}
        </div>
      )}

      <button onClick={resetGame} style={{
        ...btn("transparent","#a09080"),
        marginTop:8, border:"1px solid #a09080",
        fontSize:"clamp(11px,2vw,13px)", padding:"4px 16px",
      }}>タイトルへ戻る</button>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

function HandPanel({ hand, owner, isTurn, selected, onSelect, label }) {
  const entries = DROP_TYPES.filter(t => (hand[t]||0) > 0);
  return (
    <div style={{display:"flex", flexDirection:"column", alignItems:"center", minWidth:"clamp(36px,9vw,60px)", gap:2}}>
      <div style={{
        fontSize:"clamp(9px,1.8vw,12px)", color: isTurn?"#daa520":"#706050",
        fontWeight: isTurn?700:400, marginBottom:4, writingMode:"vertical-rl", letterSpacing:"0.1em",
      }}>{label}</div>
      <div style={{
        background:"rgba(212,167,106,0.12)", border:"1px solid rgba(139,115,85,0.3)",
        borderRadius:6, padding:"4px 2px", minHeight:60,
        display:"flex", flexDirection:"column", gap:1, alignItems:"center",
      }}>
        {entries.length===0 && <div style={{fontSize:10, color:"#504030", padding:"4px 2px"}}>—</div>}
        {entries.map(t => (
          <div key={t} onClick={() => onSelect(t)} style={{
            cursor: isTurn?"pointer":"default", padding:"2px 4px", borderRadius:4,
            background: selected===t?"rgba(218,165,32,0.35)":"transparent",
            display:"flex", alignItems:"center", gap:2,
            fontSize:"clamp(12px,2.8vw,18px)", fontWeight:700, color:"#1a1a2e",
            transition:"background 0.15s",
            transform: owner===1?"rotate(180deg)":"none",
          }}>
            <span style={{background:"rgba(212,167,106,0.7)", borderRadius:3, padding:"1px 3px", lineHeight:1.2}}>
              {PIECE_DATA[t].name}
            </span>
            {hand[t]>1 && <span style={{fontSize:"clamp(8px,1.6vw,11px)", color:"#8b7355", transform: owner===1?"rotate(180deg)":"none"}}>×{hand[t]}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

const btn = (bg, color) => ({
  background:bg, color, border:"none", borderRadius:8,
  padding:"8px 24px", fontSize:"clamp(13px,2.5vw,16px)",
  fontWeight:700, cursor:"pointer", fontFamily:"inherit",
  letterSpacing:"0.05em", transition:"transform 0.15s",
});

const menuBtn = {
  display:"flex", alignItems:"center", gap:14,
  padding:"14px 20px", borderRadius:12, border:"none",
  cursor:"pointer", fontFamily:"inherit", textAlign:"left",
  transition:"transform 0.15s,box-shadow 0.15s",
  boxShadow:"0 4px 16px rgba(0,0,0,0.3)",
};
