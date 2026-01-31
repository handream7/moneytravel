// 1. Firebase 라이브러리 (updateDoc 추가됨)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. 사용자 설정 (그대로 유지)
const firebaseConfig = {
    apiKey: "AIzaSyDuwvZELALWOyPuJWrQfBpklq-_o-RyGog",
    authDomain: "moneytravel-6c093.firebaseapp.com",
    projectId: "moneytravel-6c093",
    storageBucket: "moneytravel-6c093.firebasestorage.app",
    messagingSenderId: "493861903799",
    appId: "1:493861903799:web:00a3f1c8d76d281dcc5c32",
    measurementId: "G-1JPBFMERM5"
};

// 3. 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

let expenseList = [];

// 데이터 실시간 감시 (최신순 정렬)
const q = query(collection(db, "expenses"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    expenseList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    renderList();
});

// 기록하기 함수
window.addExpense = async function() {
    const desc = document.getElementById('desc').value;
    const priceStr = document.getElementById('price').value;
    const price = parseInt(priceStr);
    const payerEl = document.querySelector('input[name="payer"]:checked');
    const payer = payerEl ? payerEl.value : 'me'; 

    if (!desc || isNaN(price)) {
        alert("내용과 금액을 정확히 입력해주세요!");
        return;
    }

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
        await addDoc(collection(db, "expenses"), {
            timestamp: Date.now(),
            date: dateStr,
            desc: desc,
            price: price,
            payer: payer
        });

        document.getElementById('desc').value = '';
        document.getElementById('price').value = '';
        document.getElementById('desc').focus();
    } catch (e) {
        console.error("Error: ", e);
        alert("저장 실패! (인터넷 확인)");
    }
}

// 잠금 토글 (수정/삭제 버튼 보이기)
window.toggleLock = function(id) {
    const lockBtn = document.getElementById(`lock-btn-${id}`);
    const actionGroup = document.getElementById(`action-group-${id}`);

    if (actionGroup.style.display === "none") {
        actionGroup.style.display = "flex"; // 버튼들 보이기
        lockBtn.innerText = "🔓";
    } else {
        actionGroup.style.display = "none"; // 다시 숨기기
        lockBtn.innerText = "🔒";
    }
}

// 수정 모드로 변경
window.editExpense = function(id) {
    const item = expenseList.find(i => i.id === id);
    if (!item) return;

    const li = document.getElementById(`li-${id}`);
    
    // 기존 내용을 인풋창으로 변환
    li.innerHTML = `
        <div class="edit-box">
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <input type="text" id="edit-date-${id}" value="${item.date}" style="width:30%; font-size:12px;">
                <select id="edit-payer-${id}" style="width:30%;">
                    <option value="me" ${item.payer === 'me' ? 'selected' : ''}>나</option>
                    <option value="hyung" ${item.payer === 'hyung' ? 'selected' : ''}>형</option>
                </select>
                <button class="save-edit-btn" onclick="saveEdit('${id}')">저장</button>
                <button class="cancel-edit-btn" onclick="renderList()">취소</button>
            </div>
            <div style="display:flex; gap:5px;">
                <input type="text" id="edit-desc-${id}" value="${item.desc}" style="flex:1;" placeholder="내용">
                <input type="number" id="edit-price-${id}" value="${item.price}" style="width:30%;" placeholder="금액">
            </div>
        </div>
    `;
}

// 수정 사항 저장
window.saveEdit = async function(id) {
    const newDate = document.getElementById(`edit-date-${id}`).value;
    const newDesc = document.getElementById(`edit-desc-${id}`).value;
    const newPrice = parseInt(document.getElementById(`edit-price-${id}`).value);
    const newPayer = document.getElementById(`edit-payer-${id}`).value;

    if (!newDesc || isNaN(newPrice)) {
        alert("내용을 확인해주세요.");
        return;
    }

    try {
        // Firebase 업데이트
        await updateDoc(doc(db, "expenses", id), {
            date: newDate,
            desc: newDesc,
            price: newPrice,
            payer: newPayer
        });
        // 성공하면 onSnapshot이 감지해서 알아서 목록 갱신함
    } catch (e) {
        alert("수정 실패!");
    }
}

window.deleteExpense = async function(id) {
    if(!confirm('정말 삭제할까요?')) return;
    try {
        await deleteDoc(doc(db, "expenses", id));
    } catch (e) {
        alert("삭제 실패!");
    }
}

function renderList() {
    const list = document.getElementById('expense-list');
    let totalMe = 0;
    let totalHyung = 0;

    list.innerHTML = '';

    expenseList.forEach(item => {
        const li = document.createElement('li');
        li.id = `li-${item.id}`; // 수정할 때 찾기 위해 ID 부여
        
        const payerText = item.payer === 'me' ? '나' : '형';
        const payerClass = item.payer === 'me' ? 'item-payer' : 'item-payer hyung';
        
        if (item.payer === 'me') totalMe += item.price;
        else totalHyung += item.price;

        li.innerHTML = `
            <div class="item-info">
                <span class="${payerClass}">[${payerText}]</span>
                <b>${item.desc}</b> <br>
                <span class="item-date">${item.date}</span>
            </div>
            <div class="action-box">
                <b style="margin-right:8px;">${item.price.toLocaleString()}원</b>
                
                <button id="lock-btn-${item.id}" class="lock-btn" onclick="toggleLock('${item.id}')">🔒</button>
                
                <div id="action-group-${item.id}" style="display:none; gap:5px;">
                    <button class="edit-btn" onclick="editExpense('${item.id}')">수정</button>
                    <button class="delete-btn" onclick="deleteExpense('${item.id}')">삭제</button>
                </div>
            </div>
        `;
        list.appendChild(li);
    });

    updateSummary(totalMe, totalHyung);
}

function updateSummary(me, hyung) {
    document.getElementById('total-me').innerText = me.toLocaleString();
    document.getElementById('total-hyung').innerText = hyung.toLocaleString();

    const diff = me - hyung;
    const halfDiff = Math.abs(diff) / 2;
    const resultBox = document.getElementById('final-result');

    if (diff === 0) {
        resultBox.innerText = "정산 완료! (지출액 같음)";
    } else if (diff > 0) {
        resultBox.innerText = `형이 나에게 ${Math.floor(halfDiff).toLocaleString()}원 줘야 함`;
    } else {
        resultBox.innerText = `내가 형에게 ${Math.floor(halfDiff).toLocaleString()}원 줘야 함`;
    }
}