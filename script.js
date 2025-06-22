const firebaseConfig = {
  apiKey: "AIzaSyBPu6XTloIwdb0K24FamK10-OHuI4fLOh8",
  authDomain: "inventaire-pharmacie.firebaseapp.com",
  projectId: "inventaire-pharmacie",
  storageBucket: "inventaire-pharmacie.firebasestorage.app",
  messagingSenderId: "832289923757",
  appId: "1:832289923757:web:b3e0135c3eb57e4e809c24",
  measurementId: "G-KM3LK5KYF9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const collection = db.collection("inventaire");

document.getElementById("addForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const docRef = await collection.add({
    designation: designation.value,
    reference: reference.value,
    quantite: parseInt(quantite.value),
    seuil: parseInt(seuil.value) || 0,
    expiration: expiration.value,
    emplacement: emplacement.value,
    observations: observations.value,
    createdAt: new Date()
  });
  const id = docRef.id;
  genererQRCode(id);
  this.reset();
});

collection.onSnapshot(snapshot => {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";
  const aujourdHui = new Date();
  const filtre = document.getElementById("search").value.toLowerCase();
  snapshot.forEach(doc => {
    const data = doc.data();
    const texte = [doc.id, data.designation, data.reference, data.emplacement].join(" ").toLowerCase();
    if (!texte.includes(filtre)) return;
    const tr = document.createElement("tr");
    const expDate = data.expiration ? new Date(data.expiration) : null;
    const alerte = (data.seuil && data.quantite <= data.seuil) || (expDate && expDate < aujourdHui);
    if (alerte) tr.classList.add("alert");
    tr.innerHTML = `
      <td>${doc.id}</td>
      <td>${data.designation}</td>
      <td>${data.quantite}</td>
      <td>${data.expiration || ""}</td>
      <td>${alerte ? "⚠️" : ""}</td>
    `;
    tbody.appendChild(tr);
  });
});

function genererQRCode(id) {
  const container = document.getElementById("qrCodeContainer");
  container.innerHTML = "<strong>QR Code pour l'article ID : " + id + "</strong><br>";
  const qr = new QRious({ element: document.createElement("canvas"), value: id, size: 150 });
  container.appendChild(qr.element);
}

document.getElementById("search").addEventListener("input", () => {
  collection.get().then(() => {}); 
});


let currentStream = null;

async function demarrerScan() {
  const video = document.getElementById("video");
  const cancelBtn = document.getElementById("cancelScanBtn");
  const codeReader = new ZXing.BrowserQRCodeReader();

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    currentStream = stream;
    video.srcObject = stream;
    video.setAttribute("playsinline", true);
    await video.play();

    video.style.display = "block";
    cancelBtn.style.display = "inline-block";

    const result = await codeReader.decodeOnce(video);
    const id = result.text;

    stream.getTracks().forEach(track => track.stop());
    currentStream = null;
    video.srcObject = null;
    video.style.display = "none";
    cancelBtn.style.display = "none";

    modifierArticleParID(id);

  } catch (err) {
    console.error("Erreur scan :", err);
    annulerScan();
    alert("Scan annulé ou échoué.");
  }
}

function annulerScan() {
  const video = document.getElementById("video");
  const cancelBtn = document.getElementById("cancelScanBtn");
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  video.srcObject = null;
  video.style.display = "none";
  cancelBtn.style.display = "none";
}

function modifierArticleParID(id) {
  collection.doc(id).get().then(doc => {
    if (!doc.exists) {
      alert("Article non trouvé : " + id);
      return;
    }
    const data = doc.data();
    const div = document.getElementById("qrCodeContainer");
    div.innerHTML = `
      <h3>Modifier l'article ${id}</h3>
      <label>Référence : <input id="modRef" value="${data.reference || ''}"></label><br>
      <label>Quantité : <input type="number" id="modQte" value="${data.quantite || 0}"></label><br>
      <label>Date péremption : <input type="date" id="modExp" value="${data.expiration || ''}"></label><br>
      <button onclick="sauvegarderModifs('${id}')">✅ Mettre à jour</button>
    `;
  });
}

function sauvegarderModifs(id) {
  const modRef = document.getElementById("modRef").value;
  const modQte = parseInt(document.getElementById("modQte").value);
  const modExp = document.getElementById("modExp").value;

  collection.doc(id).update({
    reference: modRef,
    quantite: modQte,
    expiration: modExp
  }).then(() => {
    alert("✅ Article mis à jour !");
    document.getElementById("qrCodeContainer").innerHTML = "";
  });
}

function viderStock() {
  if (!confirm("⚠️ Es-tu sûr de vouloir supprimer tout l'inventaire ?")) return;
  collection.get().then(snapshot => {
    const batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    batch.commit().then(() => alert("✅ Inventaire vidé."));
  });
}

function afficherTousQR() {
  collection.get().then(snapshot => {
    const c = document.getElementById("qrCodeContainer");
    c.innerHTML = "<h3>QR Codes de tous les articles</h3>";
    snapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement("div");
      div.style.margin = "1em 0";
      const title = document.createElement("strong");
      title.textContent = data.designation + " (" + doc.id + ")";
      const canvas = document.createElement("canvas");
      new QRious({ element: canvas, value: doc.id, size: 120 });
      div.appendChild(title);
      div.appendChild(document.createElement("br"));
      div.appendChild(canvas);
      c.appendChild(div);
    });
  });
}

function supprimerArticle(id) {
  if (!confirm("Supprimer l'article " + id + " ?")) return;
  collection.doc(id).delete().then(() => alert("✅ Article supprimé."));
}

function afficherQR(id, designation) {
  const c = document.getElementById("qrCodeContainer");
  c.innerHTML = "<h3>QR Code pour : " + designation + " (" + id + ")</h3>";
  const canvas = document.createElement("canvas");
  new QRious({ element: canvas, value: id, size: 150 });
  c.appendChild(canvas);
}