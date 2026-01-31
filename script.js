import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 설정 (그대로)
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

// 실시간 감시
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
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
        await addDoc(collection(db, "expenses"), {
            timestamp: Date.now(),
            date: dateStr,
            desc: desc,
            price: price,
            payer: payer,
            type: type 
        });

        document.getElementById('desc').value = '';
        document.getElementById('price').value = '';
        document.getElementById('desc').focus();
    } catch (e) {
        alert("저장 실패!");
    }
}

// 수정/삭제 기능들
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

window.editExpense = function(id) {
    const item = expenseList.find(i => i.id === id);
    if (!item) return;

    // 데이터가 없는 경우(옛날 데이터) 기본값 처리
    const currentType = item.type || 'shared'; 

    const li = document.getElementById(`li-${id}`);
    li.innerHTML = `
        <div class="edit-box">
            <div style="display:flex; gap:5px; margin-bottom:5px;">
                <select id="edit-payer-${id}" style="width:30%;">
                    <option value="me" ${item.payer === 'me' ? 'selected' : ''}>나</option>
                    <option value="hyung" ${item.payer === 'hyung' ? 'selected' : ''}>형</option>
                </select>
                <select id="edit-type-${id}" style="width:30%;">
                    <option value="shared" ${currentType === 'shared' ? 'selected' : ''}>N빵</option>
                    <option value="personal" ${currentType === 'personal' ? 'selected' : ''}>개인</option>
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

window.saveEdit = async function(id) {
    const newDate = document.getElementById(`edit-date-${id}`).value;
    const newDesc = document.getElementById(`edit-desc-${id}`).value;
    const newPrice = parseInt(document.getElementById(`edit-price-${id}`).value);
    const newPayer = document.getElementById(`edit-payer-${id}`).value;
    const newType = document.getElementById(`edit-type-${id}`).value;

    try {
        await updateDoc(doc(db, "expenses", id), {
            date: newDate, desc: newDesc, price: newPrice, payer: newPayer, type: newType
        });
    } catch (e) { alert("수정 실패!"); }
}

window.deleteExpense = async function(id) {
    if(!confirm('삭제하시겠습니까?')) return;
    try { await deleteDoc(doc(db, "expenses", id)); } catch(e){}
}

// 화면 그리기 및 계산 (핵심 수정 부분)
function renderList() {
    const list = document.getElementById('expense-list');
    let totalShared = 0;
    let personalMe = 0;
    let personalHyung = 0;

    list.innerHTML = '';

    expenseList.forEach(item => {
        // ★ 중요: 옛날 데이터는 type이 없으므로 'shared'로 간주
        const type = item.type || 'shared'; 
        const price = Number(item.price) || 0;

        // 계산 로직
        if (type === 'shared') {
            totalShared += price;
        } else {
            if (item.payer === 'me') personalMe += price;
            else personalHyung += price;
        }

        const li = document.createElement('li');
        li.id = `li-${item.id}`;
        
        const payerText = item.payer === 'me' ? '나' : '형';
        const payerClass = item.payer === 'me' ? 'text-blue' : 'text-purple';
        
        // 배지 디자인
        let badgeHtml = '';
        if (type === 'shared') {
            badgeHtml = `<span class="badge shared">N빵</span>`;
        } else {
            badgeHtml = `<span class="badge personal">개인</span>`;
        }

        // THB 표시 강제 적용
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

    // 합계 업데이트
    document.getElementById('total-shared').innerText = totalShared.toLocaleString();
    document.getElementById('personal-me').innerText = personalMe.toLocaleString();
    document.getElementById('personal-hyung').innerText = personalHyung.toLocaleString();
}