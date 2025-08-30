// Uvoz potrebnih Firebase modula
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
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

// Objekti za prijevod
const translations = {
    hr: {
        mainTitle: 'Moji lijekovi',
        noMedicinesText: 'Još nema dodanih lijekova. Dodaj novi podsjetnik!',
        authTitleLogin: 'Prijava',
        authTitleRegister: 'Registracija',
        authToggleLogin: 'Nemate račun? Registrirajte se',
        authToggleRegister: 'Već imate račun? Prijavite se',
        authSubmitLogin: 'Prijavi se',
        authSubmitRegister: 'Registriraj se',
        modalTitle: 'Dodaj novi lijek',
        labelName: 'Ime lijeka',
        labelTimes: 'Vrijeme (razdvojeno zarezom)',
        labelStartDate: 'Datum početka',
        labelEndDate: 'Datum kraja',
        labelType: 'Vrsta lijeka',
        buttonCancel: 'Odustani',
        buttonSave: 'Spremi',
        pillTaken: 'Lijek uzet',
        pillMissed: 'Lijek preskočen',
        errorAuth: 'Greška kod autentifikacije:',
        errorSave: 'Greška prilikom spremanja lijeka:',
        errorDelete: 'Greška prilikom brisanja lijeka:',
        errorUpdate: 'Greška prilikom ažuriranja lijeka:',
        errorFetch: 'Greška prilikom dohvaćanja lijekova:',
        successLogin: 'Uspješno ste se prijavili!',
        successLogout: 'Uspješno ste se odjavili!',
        confirmDelete: 'Jeste li sigurni da želite obrisati ovaj lijek?',
        buttonYes: 'Da',
        buttonNo: 'Ne'
    },
    en: {
        mainTitle: 'My Medicines',
        noMedicinesText: 'No medicines added yet. Add a new reminder!',
        authTitleLogin: 'Login',
        authTitleRegister: 'Register',
        authToggleLogin: 'Don\'t have an account? Register',
        authToggleRegister: 'Already have an account? Login',
        authSubmitLogin: 'Login',
        authSubmitRegister: 'Register',
        modalTitle: 'Add New Medicine',
        labelName: 'Medicine Name',
        labelTimes: 'Times (comma separated)',
        labelStartDate: 'Start Date',
        labelEndDate: 'End Date',
        labelType: 'Medicine Type',
        buttonCancel: 'Cancel',
        buttonSave: 'Save',
        pillTaken: 'Pill taken',
        pillMissed: 'Pill missed',
        errorAuth: 'Authentication error:',
        errorSave: 'Error saving medicine:',
        errorDelete: 'Error deleting medicine:',
        errorUpdate: 'Error updating medicine:',
        errorFetch: 'Error fetching medicines:',
        successLogin: 'Successfully logged in!',
        successLogout: 'Successfully logged out!',
        confirmDelete: 'Are you sure you want to delete this medicine?',
        buttonYes: 'Yes',
        buttonNo: 'No'
    }
};

let currentLanguage = localStorage.getItem('language') || 'hr';
let lang = translations[currentLanguage];

// HTML elementi
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authToggle = document.getElementById('auth-toggle');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authSubmitBtn = document.getElementById('auth-submit');
const logoutButton = document.getElementById('logout-button');
const mainTitle = document.getElementById('main-title');
const medicinesContainer = document.getElementById('medicines-container');
const noMedicinesText = document.getElementById('no-medicines-text');
const addModal = document.getElementById('add-modal');
const addForm = document.getElementById('add-form');
const addModalTitle = document.getElementById('modal-title');
const medicineNameInput = document.getElementById('medicine-name');
const medicineTimesInput = document.getElementById('medicine-times');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const medicineTypeInput = document.getElementById('medicine-type');
const saveButton = document.getElementById('save-button');
const cancelButton = document.getElementById('cancel-button');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const languageSelector = document.getElementById('language-selector');

const customModal = document.getElementById('custom-modal');
const customModalMessage = document.getElementById('custom-modal-message');
const customModalOk = document.getElementById('custom-modal-ok');
const customModalCancel = document.getElementById('custom-modal-cancel');

let isRegistering = false;

// Funkcije za modale
const showCustomModal = (message, showCancel = false) => {
    customModalMessage.textContent = message;
    customModalCancel.style.display = showCancel ? 'inline-block' : 'none';
    customModalOk.style.display = 'inline-block'; // Uvijek prikaži OK gumb
    customModal.classList.add('open');
};

const hideCustomModal = () => {
    customModal.classList.remove('open');
};

const openAddModal = () => {
    addModal.classList.add('open');
};

const closeAddModal = () => {
    addModal.classList.remove('open');
};

// Ažuriranje UI-a na temelju jezika
const updateUIStrings = () => {
    lang = translations[currentLanguage];
    mainTitle.textContent = lang.mainTitle;
    noMedicinesText.textContent = lang.noMedicinesText;
    authTitle.textContent = isRegistering ? lang.authTitleRegister : lang.authTitleLogin;
    authToggle.textContent = isRegistering ? lang.authToggleRegister : lang.authToggleLogin;
    authSubmitBtn.textContent = isRegistering ? lang.authSubmitRegister : lang.authSubmitLogin;
    addModalTitle.textContent = lang.modalTitle;
    document.querySelector('label[for="medicine-name"]').textContent = lang.labelName;
    document.querySelector('label[for="medicine-times"]').textContent = lang.labelTimes;
    document.querySelector('label[for="start-date"]').textContent = lang.labelStartDate;
    document.querySelector('label[for="end-date"]').textContent = lang.labelEndDate;
    document.querySelector('label[for="medicine-type"]').textContent = lang.labelType;
    cancelButton.textContent = lang.buttonCancel;
    saveButton.textContent = lang.buttonSave;
};

// Funkcija za renderiranje lijekova
const renderMedicines = (medicines) => {
    medicinesContainer.innerHTML = '';
    if (medicines.length === 0) {
        noMedicinesText.style.display = 'block';
    } else {
        noMedicinesText.style.display = 'none';
        medicines.forEach(medicine => {
            const card = document.createElement('div');
            card.className = 'card-container bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full transform transition duration-500 hover:scale-105';
            card.innerHTML = `
                <div class="flex items-center space-x-4 mb-4">
                    <span class="text-4xl">${medicineTypes[medicine.type] || '💊'}</span>
                    <div class="flex-grow">
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white">${medicine.name}</h3>
                        <p class="text-gray-500 dark:text-gray-400 text-sm">
                            <i class="fas fa-calendar-alt"></i> ${medicine.startDate} - ${medicine.endDate}
                        </p>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mb-4">
                    ${medicine.times.map(time => `<span class="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded-full font-medium text-xs">${time}</span>`).join('')}
                </div>
                <div class="flex justify-end space-x-2">
                    <button class="take-button px-3 py-1 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors" data-id="${medicine.id}">Uzmi</button>
                    <button class="edit-button px-3 py-1 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors" data-id="${medicine.id}">Uredi</button>
                    <button class="delete-button px-3 py-1 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors" data-id="${medicine.id}">Obriši</button>
                </div>
            `;
            medicinesContainer.appendChild(card);
        });
    }
};

// Dohvaćanje i prikaz podataka u realnom vremenu
const fetchMedicines = (uid) => {
    try {
        const userMedicinesRef = collection(db, 'medicines');
        const userQuery = query(userMedicinesRef, where('userId', '==', uid));

        onSnapshot(userQuery, (snapshot) => {
            const medicines = [];
            snapshot.forEach(doc => {
                medicines.push({ id: doc.id, ...doc.data() });
            });
            renderMedicines(medicines);
        });
    } catch (e) {
        showCustomModal(lang.errorFetch + e.message);
    }
};

// Slušatelji događaja
authToggle.addEventListener('click', () => {
    isRegistering = !isRegistering;
    updateUIStrings();
});

authSubmitBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) {
        showCustomModal('Molimo popunite sva polja.');
        return;
    }

    try {
        if (isRegistering) {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
        showCustomModal(lang.successLogin);
    } catch (e) {
        showCustomModal(lang.errorAuth + e.message);
    }
});

logoutButton.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showCustomModal(lang.successLogout);
    } catch (e) {
        showCustomModal(lang.errorAuth + e.message);
    }
});

// Otvaranje modala za dodavanje/uređivanje
document.getElementById('add-button').addEventListener('click', () => {
    addForm.reset();
    saveButton.dataset.docId = '';
    openAddModal();
});

// Zatvaranje modala
cancelButton.addEventListener('click', () => {
    closeAddModal();
});

// Slanje forme za dodavanje/uređivanje
addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = medicineNameInput.value;
    const times = medicineTimesInput.value.split(',').map(time => time.trim());
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const type = medicineTypeInput.value;
    const userId = auth.currentUser.uid;

    const docId = saveButton.dataset.docId;

    try {
        if (docId) {
            // Ažuriranje postojećeg lijeka
            await setDoc(doc(db, 'medicines', docId), {
                name, times, startDate, endDate, type, userId
            });
        } else {
            // Dodavanje novog lijeka
            await addDoc(collection(db, 'medicines'), {
                name, times, startDate, endDate, type, userId, createdAt: new Date()
            });
        }
        showCustomModal('Lijek uspješno spremljen!');
        closeAddModal();
    } catch (e) {
        showCustomModal(lang.errorSave + e.message);
    }
});

// Ažuriranje lijeka kada se klikne na Uredi
medicinesContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-button')) {
        const docId = e.target.dataset.id;
        try {
            const docRef = doc(db, 'medicines', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                medicineNameInput.value = data.name;
                medicineTimesInput.value = data.times.join(', ');
                startDateInput.value = data.startDate;
                endDateInput.value = data.endDate;
                medicineTypeInput.value = data.type;
                saveButton.dataset.docId = docId;
                openAddModal();
            } else {
                showCustomModal('Lijek nije pronađen.');
            }
        } catch (e) {
            showCustomModal(lang.errorFetch + e.message);
        }
    }
});

// Brisanje lijeka
medicinesContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-button')) {
        const docId = e.target.dataset.id;
        showCustomModal(lang.confirmDelete, true);
        customModalOk.onclick = async () => {
            hideCustomModal();
            try {
                await deleteDoc(doc(db, 'medicines', docId));
                showCustomModal('Lijek uspješno obrisan!');
            } catch (e) {
                showCustomModal(lang.errorDelete + e.message);
            }
        };
        customModalCancel.onclick = () => {
            hideCustomModal();
        };
    }
});

// Slušatelj za tamni mod
darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    if (document.body.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});

// Slušatelj za promjene u stanju autentifikacije
onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        fetchMedicines(user.uid);
    } else {
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        medicinesContainer.innerHTML = '';
        noMedicinesText.style.display = 'block';
    }
});

// PWA registracija service worker-a
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('Service Worker registriran sa opsegom:', registration.scope);
            })
            .catch(error => {
                console.error('Registracija Service Worker-a nije uspjela:', error);
            });
    });
}

// Inicijalna provjera teme pri učitavanju stranice
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
} else {
    document.body.classList.remove('dark');
}

// Inicijalno ažuriranje UI-a
updateUIStrings();
