// 1. Firebase 라이브러리 가져오기 (보내주신 12.8.0 버전과 맞췄습니다)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// 2. 찾아내신 Firebase 설정 코드
const firebaseConfig = {
    apiKey: "AIzaSyDuwvZELALWOyPuJWrQfBpklq-_o-RyGog",
    authDomain: "moneytravel-6c093.firebaseapp.com",
    projectId: "moneytravel-6c093",
    storageBucket: "moneytravel-6c093.firebasestorage.app",
    messagingSenderId: "493861903799",
    appId: "1:493861903799:web:00a3f1c8d76d281dcc5c32",
    measurementId: "G-1JPBFMERM5"
};

// 3. Firebase 및 Firestore 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); // 애널리틱스도 연결해둠
const db = getFirestore(app);        // 데이터베이스 연결

// 전역 변수로 리스트 관리
let expenseList = [];

// 앱이 켜지면 Firebase 데이터 실시간으로 감시 (여기가 핵심!)
const q = query(collection(db, "expenses"), orderBy("timestamp", "desc"));
onSnapshot(q, (snapshot) => {
    expenseList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    renderList(); // 데이터가 바뀔 때마다 화면 새로고침
});

// HTML 버튼에서 사용할 함수들을 window 객체에 등록
window.addExpense = async function() {
    const desc = document.getElementById('desc').value;
    const priceStr = document.getElementById('price').value;
    const price = parseInt(priceStr);
    
    // 라디오 버튼 선택값 가져오기
    const payerEl = document.querySelector('input[name="payer"]:checked');
    const payer = payerEl ? payerEl.value : 'me'; // 기본값 'me'

    if (!desc || isNaN(price)) {
        alert("내용과 금액을 정확히 입력해주세요!");
        return;
    }

    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
        // Firebase에 데이터 저장
        await addDoc(collection(db, "expenses"), {
            timestamp: Date.now(), // 정렬용
            date: dateStr,
            desc: desc,
            price: price,
            payer: payer
        });

        // 입력창 비우기
        document.getElementById('desc').value = '';
        document.getElementById('price').value = '';
        document.getElementById('desc').focus();
    } catch (e) {
        console.error("Error adding document: ", e);
        alert("저장 실패! 인터넷 연결을 확인하세요.");
    }
}

window.deleteExpense = async function(id) {
    if(!confirm('정말 삭제할까요?')) return;
    
    try {
        await deleteDoc(doc(db, "expenses", id));
    } catch (e) {
        console.error("Delete Error: ", e);
        alert("삭제 실패!");
    }
}

window.resetData = async function() {
    if(!confirm('모든 기록을 삭제하시겠습니까? (주의: 형 폰에서도 다 지워집니다)')) return;
    
    // 리스트에 있는 모든 항목 삭제
    expenseList.forEach(async (item) => {
        try {
            await deleteDoc(doc(db, "expenses", item.id));
        } catch(e) {
            console.log("삭제 중 오류 발생", e);
        }
    });
}

// 화면 그리기 함수
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
            <div style="display:flex; align-items:center;">
                <b>${item.price.toLocaleString()}원</b>
                <button class="delete-btn" onclick="deleteExpense('${item.id}')">삭제</button>
            </div>
        `;
        list.appendChild(li);
    });

    updateSummary(totalMe, totalHyung);
}

// 정산 결과 계산 함수
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