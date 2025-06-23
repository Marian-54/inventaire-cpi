const firebaseConfig = {
  apiKey: "AIzaSyBPu6XTloIwdb0K24FamK10-OHuI4fLOh8",
  authDomain: "inventaire-pharmacie.firebaseapp.com",
  projectId: "inventaire-pharmacie"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const collection = db.collection("inventaire_oxygene");

firebase.auth().signInAnonymously().then(() => {
  collection.onSnapshot(snapshot => {
    const tbody = document.getElementById("tbody");
    tbody.innerHTML = "";
    snapshot.forEach(doc => {
      const d = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${doc.id}</td>
        <td>${d.designation||""}</td>
        <td>${d.quantite||0}</td>
        <td>${d.expiration||""}</td>
        <td>
          <button onclick="showQR('${doc.id}','${d.designation||""}')">📷</button>
          <button onclick="deleteItem('${doc.id}')">🗑</button>
          <select onchange="transferItem('${doc.id}', this.value)">
            <option disabled selected>🔁 Transférer</option>
            <option value="pharmacie">Inventaire Pharmacie</option>
<option value="secours">Inventaire Sac de Secours</option>
          </select>
        </td>
      `;
      tbody.appendChild(tr);
    });
  });
}).catch(err => alert("Erreur auth : " + err.message));

document.getElementById("addForm").addEventListener("submit", async e => {
  e.preventDefault();
  const obj = {
    designation: designation.value,
    quantite: parseInt(quantite.value),
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
  if (confirm("Supprimer l'article ?")) {
    collection.doc(id).delete();
  }
}

function showQR(id, name) {
  const div = document.getElementById("qrCodeContainer");
  div.innerHTML = `<h3>${name} (${id})</h3>`;
  const canvas = document.createElement("canvas");
  new QRious({ element: canvas, value: id, size: 150 });
  div.appendChild(canvas);
}

function transferItem(id, target) {
  if (!target) return;
  if (!confirm("Transférer vers " + target + " ?")) return;
  collection.doc(id).get().then(doc => {
    if (!doc.exists) return alert("Introuvable");
    db.collection("inventaire_" + target).add(doc.data()).then(() => {
      collection.doc(id).delete();
      alert("Transféré !");
    });
  });
}