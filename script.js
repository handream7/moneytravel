import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 설정 (그대로 유지)
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
// 기본적으로 timestamp로 가져오지만, 화면 그리기 직전에 '여행 날짜'로 다시 정렬할 겁니다.
const q = query(collection(db, "expenses"));

onSnapshot(q, (snapshot) => {
    expenseList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    // ★ 핵심: 가져온 데이터를 "여행 날짜(realDate)" 기준으로 최신순 정렬
    // realDate가 없으면(옛날 데이터) timestamp를 사용
    expenseList.sort((a, b) => {
        const dateA = a.realDate ? new Date(a.realDate) : new Date(a.timestamp);
        const dateB = b.realDate ? new Date(b.realDate) : new Date(b.timestamp);
        return dateB - dateA; // 내림차순 (최신 날짜가 위로)
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
    // 1. 화면 표시용 날짜 (예: 2/1 14:30)
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    // 2. 정렬용 실제 날짜 (ISO 형식) - 이걸로 정렬합니다!
    const realDateIso = now.toISOString(); // 예: 2026-02-01T14:30:00.000Z

    try {
        await addDoc(collection(db, "expenses"), {
            timestamp: Date.now(), // 입력 순서
            realDate: realDateIso, // ★ 여행 날짜 (정렬 기준)
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

// 수정 모드 진입
window.editExpense = function(id) {
    const item = expenseList.find(i => i.id === id);
    if (!item) return;

    const currentType = item.type || 'shared'; 

    // 날짜 입력창(datetime-local)에 넣기 위해 ISO 형식으로 변환
    let isoDateValue = "";
    if (item.realDate) {
        // 새로 저장한 데이터는 realDate가 있음 (시간대 보정)
        const d = new Date(item.realDate);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        isoDateValue = d.toISOString().slice(0, 16);
    } else {
        // 옛날 데이터 처리
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        isoDateValue = now.toISOString().slice(0, 16);
    }

    const li = document.getElementById(`li-${id}`);
    li.innerHTML = `
        <div class="edit-box">
            <div style="margin-bottom:8px;">
                <label style="font-size:12px; color:#888;">날짜/시간 (바꾸면 순서 변경됨)</label>
                <input type="datetime-local" id="edit-date-${id}" value="${isoDateValue}" style="width:100%;">
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
    const originalItem = expenseList.find(i => i.id === id);
    
    // 1. 입력값 가져오기
    const rawDate = document.getElementById(`edit-date-${id}`).value;
    const newDesc = document.getElementById(`edit-desc-${id}`).value;
    const newPrice = parseInt(document.getElementById(`edit-price-${id}`).value);
    const newPayer = document.getElementById(`edit-payer-${id}`).value;
    const newType = document.getElementById(`edit-type-${id}`).value;

    // 2. 날짜 변환 (화면표시용 & 정렬용)
    let newDateStr = originalItem.date; 
    let newRealDate = originalItem.realDate || originalItem.timestamp; // 없으면 기존 유지

    if(rawDate) {
        const d = new Date(rawDate);
        // 화면 표시용 (예: 2/1 14:00)
        newDateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        // 정렬용 실제 날짜
        newRealDate = d.toISOString();
    }

    // ★ 3. 수정 내역 확인 (변경된 게 없는지 체크)
    // 기존 데이터와 비교
    const isDateSame = rawDate ? (newRealDate === originalItem.realDate) : true;
    const isDescSame = newDesc === originalItem.desc;
    const isPriceSame = newPrice === originalItem.price;
    const isPayerSame = newPayer === originalItem.payer;
    const isTypeSame = (newType === (originalItem.type || 'shared'));

    // 날짜는 포맷 차이 때문에 비교가 까다로울 수 있으니, 다른 게 같으면 날짜도 확인
    if (isDescSame && isPriceSame && isPayerSame && isTypeSame) {
        // 날짜까지 같은지(혹은 건드리지 않았는지) 확인
        // 날짜를 건드려서 값이 달라졌다면 저장을 해야 함. 
        // 여기서는 간단하게 "값이 변경되었는가?"만 봅니다.
        
        // 기존 realDate가 있고, 입력한 realDate와 시/분까지 같다면 변경 없음 처리
        // (단순화를 위해 내용/금액/사람/타입이 같고 날짜도 거의 비슷하면 패스)
        
        // 사용자가 날짜를 변경 안 했으면 rawDate와 기존 데이터 비교가 애매할 수 있으므로
        // 그냥 단순히 저장 요청한 날짜값(ISO)과 기존 날짜값(ISO)이 문자열로 같은지 비교
        if (originalItem.realDate && newRealDate === originalItem.realDate) {
             alert("수정된 내역이 없습니다.");
             renderList(); // 그냥 닫기
             return;
        }
    }

    try {
        await updateDoc(doc(db, "expenses", id), {
            date: newDateStr,    // 화면 표시용
            realDate: newRealDate, // ★ 정렬용 (이게 바뀌면 순서가 바뀜)
            desc: newDesc,
            price: newPrice,
            payer: newPayer,
            type: newType
        });
        // 성공하면 onSnapshot이 감지해서 renderList() 실행 -> 정렬도 자동으로 됨
    } catch (e) { alert("수정 실패!"); }
}

window.deleteExpense = async function(id) {
    if(!confirm('삭제하시겠습니까?')) return;
    try { await deleteDoc(doc(db, "expenses", id)); } catch(e){}
}

function renderList() {
    const list = document.getElementById('expense-list');
    
    let totalShared = 0;      
    let sharedMe = 0;         
    let sharedHyung = 0;      
    let personalMe = 0;       
    let personalHyung = 0;    

    list.innerHTML = '';

    expenseList.forEach(item => {
        const type = item.type || 'shared'; 
        const price = Number(item.price) || 0;
        const payer = item.payer;

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

    document.getElementById('total-shared').innerText = totalShared.toLocaleString();
    document.getElementById('personal-me').innerText = personalMe.toLocaleString();
    document.getElementById('personal-hyung').innerText = personalHyung.toLocaleString();

    const diff = sharedMe - sharedHyung;
    const toSend = Math.abs(diff) / 2;
    const settlementDiv = document.getElementById('settlement-result');

    if (totalShared === 0) {
        settlementDiv.innerHTML = `<span style="color:#aaa;">지출 내역 없음</span>`;
    } else if (diff === 0) {
        settlementDiv.innerHTML = `<span style="color:#4caf50;">정산 완료! (낸 돈이 똑같음)</span>`;
    } else if (diff > 0) {
        settlementDiv.innerHTML = `👉 <span style="color:#e91e63;">형이</span> 나에게 <b>${Math.floor(toSend).toLocaleString()} THB</b> 줘야 함`;
    } else {
        settlementDiv.innerHTML = `👉 <span style="color:#2196f3;">내가</span> 형에게 <b>${Math.floor(toSend).toLocaleString()} THB</b> 줘야 함`;
    }
}