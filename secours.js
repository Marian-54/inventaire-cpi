const firebaseConfig = {
  apiKey: "AIzaSyBPu6XTloIwdb0K24FamK10-OHuI4fLOh8",
  authDomain: "inventaire-pharmacie.firebaseapp.com",
  projectId: "inventaire-pharmacie"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const collection = db.collection("inventaire_secours");

firebase.auth().signInAnonymously().then(startApp).catch(err=>{
  alert("Erreur auth : "+err.message);
});

function startApp(){
  collection.onSnapshot(snapshot=>{
    const tbody=document.getElementById("tbody");
    tbody.innerHTML="";
    snapshot.forEach(doc=>{
      const d=doc.data();
      const tr=document.createElement("tr");
      tr.innerHTML=`
        <td>${doc.id}</td>
        <td>${d.designation||""}</td>
        <td>${d.quantite||0}</td>
        <td>${d.expiration||""}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

document.getElementById("addForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const obj={
    designation:designation.value,
    quantite:parseInt(quantite.value),
    expiration:expiration.value
  };
  try{
    await collection.add(obj);
    addForm.reset();
  }catch(err){
    alert("Erreur ajout : "+err.message);
  }
});