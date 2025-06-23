const firebaseConfig = {
  apiKey: "AIzaSyBPu6XTloIwdb0K24FamK10-OHuI4fLOh8",
  authDomain: "inventaire-pharmacie.firebaseapp.com",
  projectId: "inventaire-pharmacie"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const collection = db.collection("inventaire_pharmacie");

firebase.auth().signInAnonymously().then(lancerApp).catch(err => alert("Auth error: " + err.message));

function lancerApp() {
  collection.onSnapshot(snapshot => {
    const tbody = document.getElementById("tbody");
    tbody.innerHTML = "";
    snapshot.forEach(doc => {
      const d = doc.data();
      const tr = document.createElement("tr");
      if (d.quantite < d.quantite_min) tr.classList.add("alert");
      tr.innerHTML = `
        <td>${doc.id}</td>
        <td>${d.designation || ""}</td>
        <td>${d.reference || ""}</td>
        <td>${d.quantite || 0}</td>
        <td>${d.quantite_min || 0}</td>
        <td>${d.expiration || ""}</td>
        <td><button onclick="showQR('${doc.id}')">📷</button></td>
        <td>
          <button onclick="deleteItem('${doc.id}')">🗑</button>
          <select onchange="transferer('${doc.id}', this.value)">
            <option disabled selected>➜ Transférer</option>
            <option value="secours">Inventaire Sac de Secours</option>
            <option value="oxygene">Inventaire Rack Oxygénothérapie</option>
          </select>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}

document.getElementById("addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const obj = {
    designation: designation.value.trim(),
    reference: reference.value.trim(),
    quantite: parseInt(quantite.value),
    quantite_min: parseInt(quantite_min.value),
    expiration: expiration.value
  };
  try {
    await collection.add(obj);
    addForm.reset();
  } catch (err) {
    alert("Erreur ajout : " + err.message);
  }
});

function deleteItem(id) {
  if (confirm("Supprimer ?")) collection.doc(id).delete();
}

function viderStock() {
  if (!confirm("Tout effacer ?")) return;
  collection.get().then(snapshot => {
    snapshot.forEach(doc => doc.ref.delete());
  });
}

function showQR(id) {
  const container = document.getElementById("qrContainer");
  container.innerHTML = "";
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  new QRious({ element: canvas, value: id, size: 150 });
}

function afficherTousQR() {
  collection.get().then(snapshot => {
    const container = document.getElementById("qrContainer");
    container.innerHTML = "";
    snapshot.forEach(doc => {
      const canvas = document.createElement("canvas");
      new QRious({ element: canvas, value: doc.id, size: 100 });
      container.appendChild(canvas);
    });
  });
}

let codeReader;
async function demarrerScan() {
  codeReader = new ZXing.BrowserQRCodeReader();
  const videoElement = document.getElementById("video");
  videoElement.style.display = "block";
  document.getElementById("cancelScanBtn").style.display = "inline-block";
  try {
    const result = await codeReader.decodeOnceFromVideoDevice(undefined, "video");
    stopScan();
    modifierArticle(result.text);
  } catch (err) {
    alert("Erreur ou annulé");
    stopScan();
  }
}

function stopScan() {
  const videoElement = document.getElementById("video");
  if (videoElement.srcObject) {
    videoElement.srcObject.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
  }
  videoElement.style.display = "none";
  document.getElementById("cancelScanBtn").style.display = "none";
}

function modifierArticle(id) {
  const nvQte = prompt("Nouvelle quantité ?");
  const nvRef = prompt("Nouvelle référence ?");
  const nvDate = prompt("Nouvelle date de péremption ?");
  const nvQteMin = prompt("Nouvelle quantité minimum ?");
  if (nvQte !== null) {
    collection.doc(id).update({
      quantite: parseInt(nvQte),
      reference: nvRef,
      expiration: nvDate,
      quantite_min: parseInt(nvQteMin)
    });
  }
}

function transferer(id, cible) {
  const combien = prompt("Quantité à transférer ?");
  if (!combien) return;
  collection.doc(id).get().then(doc => {
    const data = doc.data();
    const reste = data.quantite - parseInt(combien);
    if (reste < 0) return alert("Pas assez de stock.");
    db.collection("inventaire_" + cible).add({ ...data, quantite: parseInt(combien) }).then(() => {
      if (reste === 0) collection.doc(id).delete();
      else collection.doc(id).update({ quantite: reste });
    });
  });
}
