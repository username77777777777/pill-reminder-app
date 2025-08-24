// Uvoz potrebnih Firebase modula
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, deleteDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Uvoz Firebase konfiguracije
import { firebaseConfig } from './firebase-config.js';

// Inicijalizacija Firebase-a
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Definiranje tipova za lijekove
const medicineTypes = {
    'tableta': '💊',
    'sirup': '🧴',
    'sprej': '👃',
    'injekcija': '💉'
};

// DOM elementi
const medicineList = document.getElementById('medicine-list');
const noMedicinesMessage = document.getElementById('no-medicines');
const addButton = document.getElementById('add-button');
const addModal = document.getElementById('add-modal');
const saveButton = document.getElementById('save-button');
const cancelButton = document.getElementById('cancel-button');
const medicineNameInput = document.getElementById('medicine-name');
const medicineTimeInput = document.getElementById('medicine-time');
const typeSelector = document.getElementById('type-selector');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authTitle = document.getElementById('auth-title');
const authToggleButton = document.getElementById('auth-toggle');
const logoutButton = document.getElementById('logout-button');
const customModal = document.getElementById('custom-modal');
const customModalMessage = document.getElementById('custom-modal-message');
const customModalOK = document.getElementById('custom-modal-ok');
const customModalCancel = document.getElementById('custom-modal-cancel');

let selectedType = 'tableta';
let isLogin = true;
// Pomoćni objekt za praćenje poslanih obavijesti kako se ne bi ponavljale
let notifiedTimes = {};

// Custom modal funkcije
function showCustomModal(message, isConfirm = false) {
    return new Promise((resolve) => {
        customModalMessage.textContent = message;
        if (isConfirm) {
            customModalOK.style.display = 'inline-block';
            customModalCancel.style.display = 'inline-block';
            customModalOK.onclick = () => {
                customModal.style.display = 'none';
                resolve(true);
            };
            customModalCancel.onclick = () => {
                customModal.style.display = 'none';
                resolve(false);
            };
        } else {
            customModalOK.style.display = 'inline-block';
            customModalCancel.style.display = 'none';
            customModalOK.onclick = () => {
                customModal.style.display = 'none';
                resolve(true);
            };
        }
        customModal.style.display = 'flex';
    });
}

/**
 * Traži dopuštenje za prikaz obavijesti.
 */
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Dopuštenje za obavijesti odobreno.');
            } else {
                showCustomModal('Obavijesti su potrebne za rad podsjetnika. Molimo omogućite obavijesti u postavkama preglednika.');
                console.log('Dopuštenje za obavijesti odbijeno.');
            }
        });
    }
}

/**
 * Prikazuje obavijest korisniku.
 * @param {string} title Naslov obavijesti.
 * @param {string} body Tekst obavijesti.
 */
function showNotification(title, body) {
    if (Notification.permission === 'granted') {
        const options = {
            body: body,
            icon: '/images/icons/icon-192x192.png', // Koristi ikonu aplikacije
        };
        new Notification(title, options);
    }
}

/**
 * Provjerava treba li poslati obavijest za određeni lijek.
 * @param {Array} medicines Lista lijekova iz baze.
 */
function checkForNotifications(medicines) {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const today = now.toDateString();

    // Resetiraj listu poslanih obavijesti na početku svakog novog dana
    if (!notifiedTimes[today]) {
        notifiedTimes = { [today]: {} };
    }

    medicines.forEach(medicine => {
        // Provjeri je li vrijeme za lijek
        if (medicine.time === currentTime) {
            // Provjeri je li obavijest već poslana za ovaj lijek danas
            if (!notifiedTimes[today][medicine.id]) {
                showNotification(
                    'Vrijeme za lijek!',
                    `Vrijeme je za uzimanje ${medicine.name} (${medicine.time}).`
                );
                // Označi obavijest kao poslanu za danas
                notifiedTimes[today][medicine.id] = true;
            }
        }
    });
}

// Postavi provjeru obavijesti da se pokreće svaku minutu
setInterval(() => {
    // Samo pokreni provjeru ako je korisnik prijavljen i lista lijekova nije prazna
    if (auth.currentUser && medicineList.children.length > 0) {
        // Dohvati najnoviju listu lijekova iz DOM-a za provjeru
        const currentMedicines = Array.from(medicineList.children).map(card => ({
            id: card.dataset.id,
            name: card.querySelector('h3').textContent,
            time: card.querySelector('p').textContent
        }));
        checkForNotifications(currentMedicines);
    }
}, 60000); // 60000 milisekundi = 1 minuta

// Upravljanje autentikacijom i prikazom UI-ja
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Korisnik je prijavljen
        authContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        logoutButton.style.display = 'block';
        requestNotificationPermission(); // Traži dopuštenje za obavijesti
        // Postavljanje listener-a na Firestore kolekciju
        const q = query(collection(db, "medicines"), where("userId", "==", user.uid));
        onSnapshot(q, (querySnapshot) => {
            const medicines = [];
            querySnapshot.forEach((doc) => {
                medicines.push({ ...doc.data(), id: doc.id });
            });
            renderMedicines(medicines);
        });
    } else {
        // Korisnik nije prijavljen
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        logoutButton.style.display = 'none';
    }
});

// Upravljanje obrascem za prijavu/registraciju
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        showCustomModal(`Greška: ${error.message}`);
    }
});

authToggleButton.addEventListener('click', () => {
    isLogin = !isLogin;
    authTitle.textContent = isLogin ? 'Prijava' : 'Registracija';
    authToggleButton.textContent = isLogin ? 'Nemate račun? Registrirajte se' : 'Već imate račun? Prijavite se';
    document.getElementById('auth-submit').textContent = isLogin ? 'Prijavi se' : 'Registriraj se';
});

// Prikaz modala
addButton.addEventListener('click', () => {
    addModal.style.display = 'flex';
    document.querySelector('.type-button.selected')?.classList.remove('selected');
    document.querySelector('[data-type="tableta"]').classList.add('selected');
    selectedType = 'tableta';
});

// Zatvaranje modala
cancelButton.addEventListener('click', () => {
    addModal.style.display = 'none';
    medicineNameInput.value = '';
    medicineTimeInput.value = '';
});

// Odabir vrste lijeka
typeSelector.addEventListener('click', (event) => {
    const button = event.target.closest('.type-button');
    if (button) {
        document.querySelector('.type-button.selected')?.classList.remove('selected');
        button.classList.add('selected');
        selectedType = button.dataset.type;
    }
});

// Funkcija za kreiranje kartice lijeka
function createMedicineCard(id, name, type, time) {
    const card = document.createElement('div');
    card.className = 'card-container bg-white rounded-xl shadow-md p-4 flex items-center justify-between space-x-4 cursor-pointer';
    card.dataset.id = id;

    const icon = medicineTypes[type] || '❓';
    
    card.innerHTML = `
        <div class="flex items-center space-x-4">
            <span class="text-4xl select-none">${icon}</span>
            <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900">${name}</h3>
                <p class="text-gray-500">${time}</p>
            </div>
        </div>
        <button class="delete-button text-gray-400 focus:outline-none" data-id="${id}">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    `;
    return card;
}

// Prikaz svih lijekova
function renderMedicines(medicines) {
    medicineList.innerHTML = '';
    if (medicines.length === 0) {
        noMedicinesMessage.style.display = 'block';
        medicineList.appendChild(noMedicinesMessage);
    } else {
        noMedicinesMessage.style.display = 'none';
        medicines.forEach(medicine => {
            const card = createMedicineCard(medicine.id, medicine.name, medicine.type, medicine.time);
            medicineList.appendChild(card);
        });
    }
}

// Funkcija za brisanje lijeka
async function deleteMedicine(id) {
    try {
        const confirmed = await showCustomModal('Jeste li sigurni da želite obrisati ovaj lijek?', true);
        if (confirmed) {
            await deleteDoc(doc(db, "medicines", id));
        }
    } catch (e) {
        showCustomModal("Greška prilikom brisanja lijeka: " + e.message);
    }
}

// Slušanje klikova na gumb za brisanje
medicineList.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.delete-button');
    if (deleteButton) {
        const medicineId = deleteButton.dataset.id;
        deleteMedicine(medicineId);
    }
});

// Slušanje klikova na gumb za odjavu
logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        showCustomModal("Greška prilikom odjave: " + error.message);
    }
});

// Spremanje novog lijeka
saveButton.addEventListener('click', async () => {
    const name = medicineNameInput.value.trim();
    const time = medicineTimeInput.value.trim();
    
    if (name === '' || time === '') {
        showCustomModal('Molimo unesite ime i vrijeme lijeka!');
        return;
    }

    try {
        await addDoc(collection(db, "medicines"), {
            name,
            type: selectedType,
            time,
            userId: auth.currentUser.uid,
        });
        
        // Resetiraj formu i zatvori modal
        medicineNameInput.value = '';
        medicineTimeInput.value = '';
        addModal.style.display = 'none';
    } catch (e) {
        showCustomModal("Greška prilikom spremanja lijeka: " + e.message);
    }
});

// Registracija Service Worker-a
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').then(registration => {
            console.log('Service Worker registriran sa opsegom:', registration.scope);
        }).catch(error => {
            console.error('Registracija Service Worker-a nije uspjela:', error);
        });
    });
}
