// ------------ Config Firebase ------------
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

// ------------ Auth anonyme (nécessite d'activer Anonymous Auth dans Firebase) ------------
firebase.auth().signInAnonymously().then(startApp).catch(err=>{
  alert("Erreur d'auth Firebase : "+err.message);
});

// ------------ Variables globales ------------
let currentStream = null;

// ------------ Start main listeners ------------
function startApp(){
  console.log("Connecté à Firebase, UID:", firebase.auth().currentUser.uid);
  // Ecoute en temps réel
  collection.onSnapshot(buildTable);
}

// ------------ Construction du tableau ------------
function buildTable(snapshot){
  const tbody=document.getElementById("tbody");
  tbody.innerHTML="";
  const today=new Date();
  const filter=document.getElementById("search").value.toLowerCase();

  snapshot.forEach(doc=>{
    const d=doc.data();
    const haystack=[doc.id,d.designation,d.reference,d.emplacement].join(" ").toLowerCase();
    if(!haystack.includes(filter)) return;

    const tr=document.createElement("tr");
    const exp=d.expiration?new Date(d.expiration):null;
    const alert=(d.seuil&&d.quantite<=d.seuil)||(exp&&exp<today);
    if(alert) tr.classList.add("alert");
    tr.innerHTML=`
      <td>${doc.id}</td>
      <td>${d.designation||""}</td>
      <td>${d.quantite||0}</td>
      <td>${d.expiration||""}</td>
      <td>${alert?"⚠️":""}</td>
      <td>
        <button onclick="afficherQR('${doc.id}','${d.designation||""}')">📷</button>
        <button onclick="supprimerArticle('${doc.id}')">🗑</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ------------ Ajouter un article ------------
document.getElementById("addForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const obj={
    designation:designation.value,
    reference:reference.value,
    quantite:parseInt(quantite.value),
    seuil:parseInt(seuil.value)||0,
    expiration:expiration.value,
    emplacement:emplacement.value,
    observations:observations.value,
    createdAt:new Date()
  };
  try{
    const docRef=await collection.add(obj);
    genererQRCode(docRef.id,"qrCodeContainer");
    addForm.reset();
  }catch(err){
    alert("Erreur ajout : "+err.message);
  }
});

// ------------ Recherche live ------------
document.getElementById("search").addEventListener("input",()=>collection.get().then(()=>{}));

// ------------ Vider stock ------------
function viderStock(){
  if(!confirm("Tout effacer ?")) return;
  collection.get().then(snap=>{
    const batch=db.batch();
    snap.forEach(doc=>batch.delete(doc.ref));
    batch.commit().then(()=>alert("Inventaire vidé."));
  });
}

// ------------ Voir tous les QR ------------
function afficherTousQR(){
  collection.get().then(snap=>{
    const c=document.getElementById("qrCodeContainer");
    c.innerHTML="<h3>Tous les QR codes</h3>";
    snap.forEach(doc=>{
      const d=doc.data();
      const div=document.createElement("div");
      div.style.margin="1em 0";
      div.innerHTML=`<strong>${d.designation} (${doc.id})</strong><br>`;
      const canv=document.createElement("canvas");
      new QRious({element:canv,value:doc.id,size:120});
      div.appendChild(canv);
      c.appendChild(div);
    });
  });
}

// ------------ Afficher QR d'un article ------------
function afficherQR(id,designation){
  genererQRCode(id,"qrCodeContainer",designation);
}

function genererQRCode(id,targetId,label){
  const cont=document.getElementById(targetId);
  cont.innerHTML=`<h3>QR : ${label?label+" ":""}(${id})</h3>`;
  const canvas=document.createElement("canvas");
  new QRious({element:canvas,value:id,size:150});
  cont.appendChild(canvas);
}

// ------------ Supprimer un article ------------
function supprimerArticle(id){
  if(!confirm("Supprimer "+id+" ?")) return;
  collection.doc(id).delete().then(()=>alert("Article supprimé."));
}

// ------------ Scan QR pour modifier ------------
async function demarrerScan(){
  const video=document.getElementById("video");
  const cancelBtn=document.getElementById("cancelScanBtn");
  const reader=new ZXing.BrowserQRCodeReader();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}});
    currentStream=stream;
    video.srcObject=stream;
    video.setAttribute("playsinline",true);
    await video.play();
    video.style.display="block";
    cancelBtn.style.display="inline-block";

    const res=await reader.decodeOnce(video);
    const id=res.text;
    annulerScan();
    modifierArticleParID(id);
  }catch(err){
    console.error(err);
    annulerScan();
    alert("Erreur scan / annulation");
  }
}

function annulerScan(){
  const video=document.getElementById("video");
  const cancelBtn=document.getElementById("cancelScanBtn");
  if(currentStream){
    currentStream.getTracks().forEach(t=>t.stop());
    currentStream=null;
  }
  video.srcObject=null;
  video.style.display="none";
  cancelBtn.style.display="none";
}

// ------------ Modifier article après scan ------------
function modifierArticleParID(id){
  collection.doc(id).get().then(doc=>{
    if(!doc.exists){alert("Inconnu : "+id);return;}
    const d=doc.data();
    const c=document.getElementById("qrCodeContainer");
    c.innerHTML=`
      <h3>Modifier ${id}</h3>
      <label>Référence : <input id="modRef" value="${d.reference||""}"/></label><br>
      <label>Quantité : <input type="number" id="modQte" value="${d.quantite||0}"/></label><br>
      <label>Péremption : <input type="date" id="modExp" value="${d.expiration||""}"/></label><br>
      <button onclick="sauverModifs('${id}')">✅ Mettre à jour</button>`;
  });
}

function sauverModifs(id){
  const ref=document.getElementById("modRef").value;
  const qt=parseInt(document.getElementById("modQte").value);
  const exp=document.getElementById("modExp").value;
  collection.doc(id).update({reference:ref,quantite:qt,expiration:exp}).then(()=>{
    alert("Article mis à jour");
    document.getElementById("qrCodeContainer").innerHTML="";
  });
}