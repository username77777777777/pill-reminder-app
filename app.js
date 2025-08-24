// Uvoz potrebnih Firebase modula
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, deleteDoc, setDoc, getDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
const medicineTimesInput = document.getElementById('medicine-times');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
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
const darkModeToggle = document.getElementById('dark-mode-toggle');

let selectedType = 'tableta';
let isLogin = true;
let notifiedTimes = {};

// Provjera i postavljanje tamnog načina rada na početku
function initDarkMode() {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}
initDarkMode();

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
            icon: '/images/icons/icon-192x192.png',
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
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    // Resetiraj listu poslanih obavijesti na početku svakog novog dana
    if (!notifiedTimes[today]) {
        notifiedTimes = { [today]: {} };
    }

    medicines.forEach(medicine => {
        const startDate = medicine.startDate ? new Date(medicine.startDate) : null;
        const endDate = medicine.endDate ? new Date(medicine.endDate) : null;

        // Provjeri je li trenutni datum unutar datuma terapije
        if ((!startDate || now >= startDate) && (!endDate || now <= endDate)) {
            medicine.times.forEach(time => {
                if (time.trim() === currentTime) {
                    if (!notifiedTimes[today][medicine.id]) {
                        showNotification(
                            'Vrijeme za lijek!',
                            `Vrijeme je za uzimanje ${medicine.name} (${time}).`
                        );
                        notifiedTimes[today][medicine.id] = true;
                    }
                }
            });
        }
    });
}

// Postavi provjeru obavijesti da se pokreće svaku minutu
setInterval(() => {
    if (auth.currentUser) {
        // Dohvati najnoviju listu lijekova iz DOM-a za provjeru
        const currentMedicines = Array.from(medicineList.children).map(card => {
            const times = card.querySelector('.medicine-times').textContent.split(',').map(t => t.trim());
            return {
                id: card.dataset.id,
                name: card.querySelector('h3').textContent,
                times: times,
                startDate: card.dataset.startDate,
                endDate: card.dataset.endDate
            };
        });
        checkForNotifications(currentMedicines);
    }
}, 60000);

// Upravljanje autentikacijom i prikazom UI-ja
onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'flex';
        logoutButton.style.display = 'block';
        requestNotificationPermission();
        const q = query(collection(db, "medicines"), where("userId", "==", user.uid));
        onSnapshot(q, async (querySnapshot) => {
            const medicines = [];
            for (const docSnapshot of querySnapshot.docs) {
                const medicineData = { ...docSnapshot.data(), id: docSnapshot.id };
                // Dohvati status "uzetosti" za današnji dan
                const todayDate = new Date().toISOString().split('T')[0];
                const takenDocRef = doc(db, "medicines", medicineData.id, "taken_dates", todayDate);
                const takenDocSnap = await getDoc(takenDocRef);
                medicineData.isTaken = takenDocSnap.exists();
                medicines.push(medicineData);
            }
            renderMedicines(medicines);
        });
    } else {
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
    setTimeout(() => {
        addModal.classList.add('open');
    }, 10);
    document.querySelector('.type-button.selected')?.classList.remove('selected');
    document.querySelector('[data-type="tableta"]').classList.add('selected');
    selectedType = 'tableta';
});

// Zatvaranje modala
cancelButton.addEventListener('click', () => {
    addModal.classList.remove('open');
    setTimeout(() => {
        addModal.style.display = 'none';
    }, 300);
    medicineNameInput.value = '';
    medicineTimesInput.value = '';
    startDateInput.value = '';
    endDateInput.value = '';
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
function createMedicineCard(medicine) {
    const card = document.createElement('div');
    card.className = `card-container bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center justify-between space-x-4 cursor-pointer ${medicine.isTaken ? 'taken' : ''}`;
    card.dataset.id = medicine.id;
    card.dataset.startDate = medicine.startDate || '';
    card.dataset.endDate = medicine.endDate || '';

    const icon = medicineTypes[medicine.type] || '❓';
    const timesHtml = medicine.times.map(time => `<span class="time-pill bg-gray-200 dark:bg-gray-700 text-xs font-semibold px-2 py-1 rounded-full">${time}</span>`).join(' ');
    
    card.innerHTML = `
        <div class="flex items-center space-x-4">
            <span class="text-4xl select-none">${icon}</span>
            <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${medicine.name}</h3>
                <p class="text-gray-500 text-sm mt-1 medicine-times">${medicine.times.join(', ')}</p>
            </div>
        </div>
        <div class="flex space-x-2 items-center">
            <button class="take-button text-green-500 focus:outline-none">
                <i class="fas fa-check-circle text-2xl"></i>
            </button>
            <button class="delete-button text-gray-400 focus:outline-none">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    `;
    return card;
}

// Prikaz svih lijekova
function renderMedicines(medicines) {
    medicineList.innerHTML = '';
    if (medicines.length === 0) {
        noMedicinesMessage.style.display = 'block';
    } else {
        noMedicinesMessage.style.display = 'none';
        medicines.forEach(medicine => {
            const card = createMedicineCard(medicine);
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

// Funkcija za označavanje lijeka kao uzetog
async function takeMedicine(medicineId) {
    try {
        const todayDate = new Date().toISOString().split('T')[0];
        const takenDocRef = doc(db, "medicines", medicineId, "taken_dates", todayDate);
        await setDoc(takenDocRef, { timestamp: new Date() });
    } catch (e) {
        showCustomModal("Greška prilikom označavanja lijeka kao uzetog: " + e.message);
    }
}

// Slušanje klikova na gumbe unutar medicineList
medicineList.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.delete-button');
    const takeButton = event.target.closest('.take-button');
    const card = event.target.closest('.card-container');
    if (!card) return;

    if (deleteButton) {
        deleteMedicine(card.dataset.id);
    } else if (takeButton) {
        takeMedicine(card.dataset.id);
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
    const timesString = medicineTimesInput.value.trim();
    const startDate = startDateInput.value.trim();
    const endDate = endDateInput.value.trim();
    
    if (name === '' || timesString === '') {
        showCustomModal('Molimo unesite ime i vrijeme lijeka!');
        return;
    }

    const times = timesString.split(',').map(t => t.trim()).filter(t => t !== '');
    
    if (times.length === 0) {
         showCustomModal('Molimo unesite barem jedno vrijeme lijeka!');
         return;
    }

    try {
        await addDoc(collection(db, "medicines"), {
            name,
            type: selectedType,
            times,
            startDate: startDate || null,
            endDate: endDate || null,
            userId: auth.currentUser.uid,
        });
        
        // Resetiraj formu i zatvori modal
        medicineNameInput.value = '';
        medicineTimesInput.value = '';
        startDateInput.value = '';
        endDateInput.value = '';
        addModal.classList.remove('open');
        setTimeout(() => {
            addModal.style.display = 'none';
        }, 300);
    } catch (e) {
        showCustomModal("Greška prilikom spremanja lijeka: " + e.message);
    }
});

// Prebacivanje tamnog moda
darkModeToggle.addEventListener('click', () => {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
    } else {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
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
