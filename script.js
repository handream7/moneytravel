import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 설정
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

// ★ 필터 상태 관리 변수
let currentFilter = {
    month: 'all', // 'all', '2', '3', 'custom'
    category: 'all', // 'all', 'me', 'hyung', 'settlement'
    startDate: '',
    endDate: ''
};

// 데이터 감시
const q = query(collection(db, "expenses"));
onSnapshot(q, (snapshot) => {
    expenseList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    // 날짜 기준 최신순 정렬
    expenseList.sort((a, b) => {
        const dateA = a.realDate ? new Date(a.realDate) : new Date(a.timestamp);
        const dateB = b.realDate ? new Date(b.realDate) : new Date(b.timestamp);
        return dateB - dateA;
    });

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
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const realDateIso = now.toISOString();

    try {
        await addDoc(collection(db, "expenses"), {
            timestamp: Date.now(),
            realDate: realDateIso,
            date: dateStr,
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

// 수정 모드
window.editExpense = function(id) {
    const item = expenseList.find(i => i.id === id);
    if (!item) return;

    const currentType = item.type || 'shared'; 

    let isoDateValue = "";
    if (item.realDate) {
        const d = new Date(item.realDate);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        isoDateValue = d.toISOString().slice(0, 16);
    } else {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        isoDateValue = now.toISOString().slice(0, 16);
    }

    const li = document.getElementById(`li-${id}`);
    li.innerHTML = `
        <div class="edit-box">
            <div style="margin-bottom:8px;">
                <label style="font-size:12px; color:#888;">날짜/시간</label>
                <input type="datetime-local" id="edit-date-${id}" value="${isoDateValue}" style="width:100%;">
            </div>

            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <select id="edit-payer-${id}" style="width:50%;">
                    <option value="me" ${item.payer === 'me' ? 'selected' : ''}>나</option>
                    <option value="hyung" ${item.payer === 'hyung' ? 'selected' : ''}>형</option>
                </select>
                <select id="edit-type-${id}" style="width:50%;">
                    <option value="shared" ${currentType === 'shared' ? 'selected' : ''}>🤝 N빵</option>
                    <option value="personal" ${currentType === 'personal' ? 'selected' : ''}>👤 개인</option>
                    <option value="settlement" ${currentType === 'settlement' ? 'selected' : ''}>💸 중간 정산</option>
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
    const originalItem = expenseList.find(i => i.id === id);
    const rawDate = document.getElementById(`edit-date-${id}`).value;
    const newDesc = document.getElementById(`edit-desc-${id}`).value;
    const newPrice = parseInt(document.getElementById(`edit-price-${id}`).value);
    const newPayer = document.getElementById(`edit-payer-${id}`).value;
    const newType = document.getElementById(`edit-type-${id}`).value;

    let newDateStr = originalItem.date; 
    let newRealDate = originalItem.realDate || originalItem.timestamp;

    if(rawDate) {
        const d = new Date(rawDate);
        newDateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        newRealDate = d.toISOString();
    }

    const isDateSame = rawDate ? (newRealDate === originalItem.realDate) : true;
    const isDescSame = newDesc === originalItem.desc;
    const isPriceSame = newPrice === originalItem.price;
    const isPayerSame = newPayer === originalItem.payer;
    const isTypeSame = (newType === (originalItem.type || 'shared'));

    if (originalItem.realDate && newRealDate === originalItem.realDate && isDescSame && isPriceSame && isPayerSame && isTypeSame) {
         alert("수정된 내역이 없습니다.");
         renderList(); 
         return;
    }

    try {
        await updateDoc(doc(db, "expenses", id), {
            date: newDateStr,
            realDate: newRealDate,
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

// ★ 필터 변경 함수들
window.setMonthFilter = function(month) {
    currentFilter.month = month;
    // 버튼 스타일 업데이트
    document.querySelectorAll('.filter-btn.month').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-month-${month}`).classList.add('active');

    // 직접 설정 입력창 토글
    const customBox = document.getElementById('custom-date-box');
    if (month === 'custom') customBox.style.display = 'flex';
    else customBox.style.display = 'none';

    renderList();
}

window.setCategoryFilter = function(cat) {
    currentFilter.category = cat;
    // 버튼 스타일 업데이트
    document.querySelectorAll('.filter-btn.cat').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-cat-${cat}`).classList.add('active');

    renderList();
}

// 직접 설정 날짜 변경 시 바로 반영
window.setCustomDate = function() {
    currentFilter.startDate = document.getElementById('start-date').value;
    currentFilter.endDate = document.getElementById('end-date').value;
    renderList();
}


function renderList() {
    const list = document.getElementById('expense-list');
    
    // 1. 전체 데이터 기준으로 정산 계산 (필터 무관하게!)
    let totalShared = 0;      
    let sharedMe = 0;         
    let sharedHyung = 0;      
    let personalMe = 0;       
    let personalHyung = 0;    
    let settledToMe = 0;   
    let settledToHyung = 0; 

    expenseList.forEach(item => {
        const type = item.type || 'shared'; 
        const price = Number(item.price) || 0;
        const payer = item.payer;

        if (type === 'shared') {
            totalShared += price;
            if (payer === 'me') sharedMe += price;
            else sharedHyung += price;
        } else if (type === 'personal') {
            if (payer === 'me') personalMe += price;
            else personalHyung += price;
        } else if (type === 'settlement') {
            if (payer === 'hyung') settledToMe += price;
            else settledToHyung += price;
        }
    });

    // 2. 화면에 표시할 리스트 필터링
    let filteredList = expenseList.filter(item => {
        const d = item.realDate ? new Date(item.realDate) : new Date(item.timestamp);
        
        // (1) 월 필터
        if (currentFilter.month === '2' && d.getMonth() !== 1) return false;
        if (currentFilter.month === '3' && d.getMonth() !== 2) return false;
        if (currentFilter.month === 'custom') {
            const start = currentFilter.startDate ? new Date(currentFilter.startDate) : null;
            const end = currentFilter.endDate ? new Date(currentFilter.endDate) : null;
            // 끝나는 날짜는 그날 23:59:59까지 포함하도록 보정
            if (end) end.setHours(23, 59, 59);

            if (start && d < start) return false;
            if (end && d > end) return false;
        }

        // (2) 카테고리 필터 (내가냄, 형이냄, 정산)
        if (currentFilter.category === 'me' && item.payer !== 'me') return false;
        if (currentFilter.category === 'hyung' && item.payer !== 'hyung') return false;
        if (currentFilter.category === 'settlement' && item.type !== 'settlement') return false;

        return true;
    });


    // 3. 필터링된 리스트 그리기
    list.innerHTML = '';
    
    if (filteredList.length === 0) {
        list.innerHTML = `<li style="justify-content:center; color:#999; box-shadow:none; background:transparent;">내역이 없습니다.</li>`;
    }

    filteredList.forEach(item => {
        const type = item.type || 'shared'; 
        const price = Number(item.price) || 0;
        const payer = item.payer;

        const li = document.createElement('li');
        li.id = `li-${item.id}`;
        
        const payerText = payer === 'me' ? '나' : '형';
        const payerClass = payer === 'me' ? 'text-me' : 'text-hyung';
        
        let badgeHtml = '';
        if (type === 'shared') badgeHtml = `<span class="badge shared">N빵</span>`;
        else if (type === 'personal') badgeHtml = `<span class="badge personal">개인</span>`;
        else badgeHtml = `<span class="badge settlement">💸 정산</span>`;

        if (type === 'settlement') li.style.background = "#fff8e1";

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

    // 4. 상단 요약 업데이트 (전체 기준)
    document.getElementById('total-shared').innerText = totalShared.toLocaleString();
    document.getElementById('personal-me').innerText = personalMe.toLocaleString();
    document.getElementById('personal-hyung').innerText = personalHyung.toLocaleString();

    const baseDiff = sharedMe - sharedHyung;
    let netOwedToMe = baseDiff / 2; 
    netOwedToMe = netOwedToMe - settledToMe + settledToHyung;

    const settlementDiv = document.getElementById('settlement-result');

    if (totalShared === 0 && settledToMe === 0 && settledToHyung === 0) {
        settlementDiv.innerHTML = `<span style="color:#aaa;">지출 내역 없음</span>`;
    } else if (netOwedToMe === 0) {
        settlementDiv.innerHTML = `<span style="color:#4caf50;">정산 완료! (깔끔함 ✨)</span>`;
    } else if (netOwedToMe > 0) {
        settlementDiv.innerHTML = `👉 <span style="color:#e91e63;">형이</span> 나에게 <b>${Math.floor(netOwedToMe).toLocaleString()} THB</b> 줘야 함`;
    } else {
        const toGive = Math.abs(netOwedToMe);
        settlementDiv.innerHTML = `👉 <span style="color:#2196f3;">내가</span> 형에게 <b>${Math.floor(toGive).toLocaleString()} THB</b> 줘야 함`;
    }
}

window.renderList = renderList;