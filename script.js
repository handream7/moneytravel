// 1. Firebase 라이브러리
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

// 데이터 실시간 감시
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
    const price = parseInt(document.getElementById('price').value);
    
    // 누가 냈는지
    const payer = document.querySelector('input[name="payer"]:checked').value;
    // 어떤 지출인지 (공동 vs 개인)
    const type = document.querySelector('input[name="type"]:checked').value;

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
            payer: payer,
            type: type // 'shared' or 'personal'
        });

        // 입력창 초기화
        document.getElementById('desc').value = '';
        document.getElementById('price').value = '';
        document.getElementById('desc').focus();
    } catch (e) {
        console.error("Error: ", e);
        alert("저장 실패! (인터넷 확인)");
    }
}

// 잠금 토글
window.toggleLock = function(id) {
    const lockBtn = document.getElementById(`lock-btn-${id}`);
    const actionGroup = document.getElementById(`action-group-${id}`);

    if (actionGroup.style.display === "none") {
        actionGroup.style.display = "flex";
        lockBtn.innerText = "🔓";
    } else {
        actionGroup.style.display = "none";
        lockBtn.innerText = "🔒";
    }
}

// 수정 모드 진입
window.editExpense = function(id) {
    const item = expenseList.find(i => i.id === id);
    if (!item) return;

    const li = document.getElementById(`li-${id}`);
    
    // 수정 폼 렌더링
    li.innerHTML = `
        <div class="edit-box">
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <select id="edit-payer-${id}" style="width:30%;">
                    <option value="me" ${item.payer === 'me' ? 'selected' : ''}>나</option>
                    <option value="hyung" ${item.payer === 'hyung' ? 'selected' : ''}>형</option>
                </select>
                <select id="edit-type-${id}" style="width:30%;">
                    <option value="shared" ${item.type === 'shared' ? 'selected' : ''}>N빵</option>
                    <option value="personal" ${item.type === 'personal' ? 'selected' : ''}>개인</option>
                </select>
                 <input type="text" id="edit-date-${id}" value="${item.date}" style="width:35%; font-size:12px;">
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

// 수정 저장
window.saveEdit = async function(id) {
    const newDate = document.getElementById(`edit-date-${id}`).value;
    const newDesc = document.getElementById(`edit-desc-${id}`).value;
    const newPrice = parseInt(document.getElementById(`edit-price-${id}`).value);
    const newPayer = document.getElementById(`edit-payer-${id}`).value;
    const newType = document.getElementById(`edit-type-${id}`).value;

    if (!newDesc || isNaN(newPrice)) {
        alert("내용을 확인해주세요.");
        return;
    }

    try {
        await updateDoc(doc(db, "expenses", id), {
            date: newDate,
            desc: newDesc,
            price: newPrice,
            payer: newPayer,
            type: newType
        });
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
    
    // 집계 변수
    let totalShared = 0;
    let personalMe = 0;
    let personalHyung = 0;

    list.innerHTML = '';

    expenseList.forEach(item => {
        const li = document.createElement('li');
        li.id = `li-${item.id}`;
        
        // 지출 타입에 따른 계산
        if (item.type === 'shared') {
            totalShared += item.price;
        } else {
            if (item.payer === 'me') personalMe += item.price;
            else personalHyung += item.price;
        }

        const payerText = item.payer === 'me' ? '나' : '형';
        const typeBadge = item.type === 'shared' ? '<span class="badge shared">공동</span>' : '<span class="badge personal">개인</span>';
        const payerClass = item.payer === 'me' ? 'text-blue' : 'text-purple';

        li.innerHTML = `
            <div class="item-info">
                <div>
                    <span class="payer-mark ${payerClass}">${payerText}</span>
                    ${typeBadge}
                    <span style="font-weight:bold;">${item.desc}</span>
                </div>
                <div class="item-date">${item.date}</div>
            </div>
            <div class="action-box">
                <b class="price-text">${item.price.toLocaleString()} THB</b>
                
                <button id="lock-btn-${item.id}" class="lock-btn" onclick="toggleLock('${item.id}')">🔒</button>
                
                <div id="action-group-${item.id}" style="display:none; gap:5px;">
                    <button class="edit-btn" onclick="editExpense('${item.id}')">수정</button>
                    <button class="delete-btn" onclick="deleteExpense('${item.id}')">삭제</button>
                </div>
            </div>
        `;
        list.appendChild(li);
    });

    updateSummary(totalShared, personalMe, personalHyung);
}

function updateSummary(shared, me, hyung) {
    document.getElementById('total-shared').innerText = shared.toLocaleString();
    document.getElementById('personal-me').innerText = me.toLocaleString();
    document.getElementById('personal-hyung').innerText = hyung.toLocaleString();
}