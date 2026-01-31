// 1. Firebase 라이브러리 (안정적인 10.7.1 버전으로 변경)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
        alert("저장 실패! (새로고침 후 다시 시도해보세요)");
    }
}

// 잠금 토글 함수 (자물쇠 누르면 실행)
window.toggleLock = function(id) {
    const lockBtn = document.getElementById(`lock-btn-${id}`);
    const delBtn = document.getElementById(`del-btn-${id}`);

    if (delBtn.style.display === "none") {
        // 잠금 해제
        delBtn.style.display = "inline-block";
        lockBtn.innerText = "🔓";
    } else {
        // 다시 잠금
        delBtn.style.display = "none";
        lockBtn.innerText = "🔒";
    }
}

// 삭제 함수
window.deleteExpense = async function(id) {
    if(!confirm('정말 삭제할까요?')) return;
    
    try {
        await deleteDoc(doc(db, "expenses", id));
    } catch (e) {
        alert("삭제 실패!");
    }
}

window.resetData = async function() {
    if(!confirm('정말 모든 기록을 초기화하시겠습니까?')) return;
    expenseList.forEach(async (item) => {
        await deleteDoc(doc(db, "expenses", item.id));
    });
}

function renderList() {
    const list = document.getElementById('expense-list');
    let totalMe = 0;
    let totalHyung = 0;

    list.innerHTML = '';

    expenseList.forEach(item => {
        const li = document.createElement('li');
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
                <b style="margin-right:10px;">${item.price.toLocaleString()}원</b>
                
                <button id="lock-btn-${item.id}" class="lock-btn" onclick="toggleLock('${item.id}')">🔒</button>
                
                <button id="del-btn-${item.id}" class="delete-btn" style="display:none;" onclick="deleteExpense('${item.id}')">삭제</button>
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