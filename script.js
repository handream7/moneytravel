import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 설정 (사용하시던 것 그대로)
const firebaseConfig = {
    apiKey: "AIzaSyDuwvZELALWOyPuJWrQfBpklq-_o-RyGog",
    authDomain: "moneytravel-6c093.firebaseapp.com",
    projectId: "moneytravel-6c093",
    storageBucket: "moneytravel-6c093.firebasestorage.app",
    messagingSenderId: "493861903799",
    appId: "1:493861903799:web:00a3f1c8d76d281dcc5c32",
    measurementId: "G-1JPBFMERM5"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

let expenseList = [];

// 데이터 실시간 감시
const q = query(collection(db, "expenses"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    expenseList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    renderList();
});

// 기록하기
window.addExpense = async function() {
    const desc = document.getElementById('desc').value;
    const price = parseInt(document.getElementById('price').value);
    const payer = document.querySelector('input[name="payer"]:checked').value;
    const type = document.querySelector('input[name="type"]:checked').value;

    if (!desc || isNaN(price)) {
        alert("내용과 금액을 정확히 입력해주세요!");
        return;
    }

    const now = new Date();
    // 저장할 때는 보기 좋게 "2/1 14:30" 형식으로 저장
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
        await addDoc(collection(db, "expenses"), {
            timestamp: Date.now(), // 정렬용
            date: dateStr,         // 표시용 문자열
            desc: desc,
            price: price,
            payer: payer,
            type: type 
        });

        document.getElementById('desc').value = '';
        document.getElementById('price').value = '';
        document.getElementById('desc').focus();
    } catch (e) { alert("저장 실패!"); }
}

window.toggleLock = function(id) {
    const actionGroup = document.getElementById(`action-group-${id}`);
    const lockBtn = document.getElementById(`lock-btn-${id}`);
    if (actionGroup.style.display === "none") {
        actionGroup.style.display = "flex";
        lockBtn.innerText = "🔓";
    } else {
        actionGroup.style.display = "none";
        lockBtn.innerText = "🔒";
    }
}

// 수정 모드 진입 (달력/시계 추가)
window.editExpense = function(id) {
    const item = expenseList.find(i => i.id === id);
    if (!item) return;

    const currentType = item.type || 'shared'; 

    // 기존 날짜 문자열("2/1 14:30")을 datetime-local 입력값("2026-02-01T14:30")으로 변환
    let isoDate = "";
    try {
        const now = new Date();
        const [dPart, tPart] = item.date.split(' ');
        const [month, day] = dPart.split('/');
        // 연도는 현재 연도 사용, 월/일/시간은 두 자리 숫자로 맞춤
        const yyyy = now.getFullYear();
        const mm = month.padStart(2, '0');
        const dd = day.padStart(2, '0');
        isoDate = `${yyyy}-${mm}-${dd}T${tPart}`;
    } catch (e) {
        // 변환 실패 시 현재 시간으로
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        isoDate = now.toISOString().slice(0, 16);
    }

    const li = document.getElementById(`li-${id}`);
    li.innerHTML = `
        <div class="edit-box">
            <div style="margin-bottom:8px;">
                <label style="font-size:12px; color:#888;">날짜 및 시간 수정</label>
                <input type="datetime-local" id="edit-date-${id}" value="${isoDate}" style="width:100%;">
            </div>

            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <select id="edit-payer-${id}" style="width:50%;">
                    <option value="me" ${item.payer === 'me' ? 'selected' : ''}>나</option>
                    <option value="hyung" ${item.payer === 'hyung' ? 'selected' : ''}>형</option>
                </select>
                <select id="edit-type-${id}" style="width:50%;">
                    <option value="shared" ${currentType === 'shared' ? 'selected' : ''}>N빵</option>
                    <option value="personal" ${currentType === 'personal' ? 'selected' : ''}>개인</option>
                </select>
            </div>

            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <input type="text" id="edit-desc-${id}" value="${item.desc}" style="flex:1;" placeholder="내용">
                <input type="number" id="edit-price-${id}" value="${item.price}" style="width:30%;" placeholder="THB">
            </div>
            
            <div style="text-align:right;">
                <button class="cancel-edit-btn" onclick="renderList()">취소</button>
                <button class="save-edit-btn" onclick="saveEdit('${id}')">저장</button>
            </div>
        </div>
    `;
}

window.saveEdit = async function(id) {
    // datetime-local 값("2026-02-01T14:30")을 다시 "2/1 14:30" 형식으로 변환
    const rawDate = document.getElementById(`edit-date-${id}`).value;
    let newDateStr = "";
    if(rawDate) {
        const d = new Date(rawDate);
        newDateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    } else {
        // 날짜 선택 안 했으면 기존 값 유지해야 하는데, 여기선 그냥 현재시간 넣어줌
        const now = new Date();
        newDateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    const newDesc = document.getElementById(`edit-desc-${id}`).value;
    const newPrice = parseInt(document.getElementById(`edit-price-${id}`).value);
    const newPayer = document.getElementById(`edit-payer-${id}`).value;
    const newType = document.getElementById(`edit-type-${id}`).value;

    try {
        await updateDoc(doc(db, "expenses", id), {
            date: newDateStr, // 변환된 문자열 저장
            desc: newDesc,
            price: newPrice,
            payer: newPayer,
            type: newType
        });
    } catch (e) { alert("수정 실패!"); }
}

window.deleteExpense = async function(id) {
    if(!confirm('삭제하시겠습니까?')) return;
    try { await deleteDoc(doc(db, "expenses", id)); } catch(e){}
}

function renderList() {
    const list = document.getElementById('expense-list');
    
    let totalShared = 0;      
    let sharedMe = 0;         // 공동 비용 중 내가 낸 돈
    let sharedHyung = 0;      // 공동 비용 중 형이 낸 돈
    
    let personalMe = 0;       
    let personalHyung = 0;    

    list.innerHTML = '';

    expenseList.forEach(item => {
        const type = item.type || 'shared'; 
        const price = Number(item.price) || 0;
        const payer = item.payer;

        // ★ 정산 계산 핵심 로직 ★
        if (type === 'shared') {
            totalShared += price;
            if (payer === 'me') sharedMe += price;
            else sharedHyung += price;
        } else {
            if (payer === 'me') personalMe += price;
            else personalHyung += price;
        }

        const li = document.createElement('li');
        li.id = `li-${item.id}`;
        
        const payerText = payer === 'me' ? '나' : '형';
        const payerClass = payer === 'me' ? 'text-me' : 'text-hyung';
        
        let badgeHtml = type === 'shared' ? `<span class="badge shared">N빵</span>` : `<span class="badge personal">개인</span>`;

        li.innerHTML = `
            <div class="item-info">
                <div>
                    <span class="payer-mark ${payerClass}">${payerText}</span>
                    ${badgeHtml}
                    <span style="font-weight:bold; font-size:15px;">${item.desc}</span>
                </div>
                <div class="item-date">${item.date}</div>
            </div>
            <div class="action-box">
                <b class="price-text">${price.toLocaleString()} THB</b>
                <button id="lock-btn-${item.id}" class="lock-btn" onclick="toggleLock('${item.id}')">🔒</button>
                <div id="action-group-${item.id}" style="display:none; gap:5px;">
                    <button class="edit-btn" onclick="editExpense('${item.id}')">수정</button>
                    <button class="delete-btn" onclick="deleteExpense('${item.id}')">삭제</button>
                </div>
            </div>
        `;
        list.appendChild(li);
    });

    // 1. 단순 합계 표시
    document.getElementById('total-shared').innerText = totalShared.toLocaleString();
    document.getElementById('personal-me').innerText = personalMe.toLocaleString();
    document.getElementById('personal-hyung').innerText = personalHyung.toLocaleString();

    // 2. N빵 정산 결과 계산 (공동 지출만 계산)
    // 내가 낸 공동비용 vs 형이 낸 공동비용의 차이를 2로 나눔
    const diff = sharedMe - sharedHyung;
    const toSend = Math.abs(diff) / 2;
    const settlementDiv = document.getElementById('settlement-result');

    if (totalShared === 0) {
        settlementDiv.innerHTML = `<span style="color:#aaa;">지출 내역 없음</span>`;
    } else if (diff === 0) {
        settlementDiv.innerHTML = `<span style="color:#4caf50;">정산 완료! (낸 돈이 똑같음)</span>`;
    } else if (diff > 0) {
        // 내가 더 많이 냈음 -> 형이 나에게 줘야 함
        settlementDiv.innerHTML = `👉 <span style="color:#e91e63;">형이</span> 나에게 <b>${Math.floor(toSend).toLocaleString()} THB</b> 줘야 함`;
    } else {
        // 형이 더 많이 냈음 -> 내가 형에게 줘야 함
        settlementDiv.innerHTML = `👉 <span style="color:#2196f3;">내가</span> 형에게 <b>${Math.floor(toSend).toLocaleString()} THB</b> 줘야 함`;
    }
}