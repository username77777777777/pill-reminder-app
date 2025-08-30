import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, deleteDoc, setDoc, onSnapshot, collection, query, getDoc } from 'firebase/firestore';
import { PlusCircle, Trash2, Edit, LogOut, Sun, Moon, Calendar, Clock, Pill } from 'lucide-react';

// Ova je React komponenta cjelokupna aplikacija, integrirajući svu logiku i UI.
// Koristi Firebase za autentifikaciju i pohranu podataka u Firestore.
// Prilagođena je da se pokrene u Canvas okruženju, koristeći globalne varijable za Firebase konfiguraciju.

// Ugrađena Tailwind CSS skripta za stiliziranje
// Iako je ovo React komponenta, Tailwind skripta je dodana radi lakšeg prikaza u Canvas okruženju.
// Stilizacija je inline unutar JSX-a ili u 'style' tagu.
// PWA manifest i service-worker su preuzeti iz izvornog koda i pretpostavlja se da su već ugrađeni.
// Sav CSS iz 'style.css' je prebačen u 'style' tag unutar JSX-a.

// Globalne varijable iz Canvas okruženja
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Objekti za prijevod (izvorno iz 'app.js')
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
        buttonEdit: 'Uredi',
        buttonAdd: 'Dodaj novi lijek',
        logout: 'Odjavi se',
        successLogout: 'Uspješno ste se odjavili.',
        successSave: 'Lijek je uspješno spremljen.',
        successDelete: 'Lijek je uspješno obrisan.',
        errorAuth: 'Greška pri autentifikaciji:',
        errorSave: 'Greška pri spremanju lijeka:',
        errorDelete: 'Greška pri brisanju lijeka:',
        errorGeneric: 'Došlo je do greške:',
        modalConfirmDeleteTitle: 'Potvrdi brisanje',
        modalConfirmDeleteMessage: 'Jeste li sigurni da želite obrisati ovaj lijek?',
        yes: 'Da',
        no: 'Ne',
        modalPillTitle: 'Podsjetnik!',
        modalPillMessage: 'Vrijeme je za uzimanje lijeka:',
        modalPillButton: 'Uzeo sam',
        theme: 'Tema',
        language: 'Jezik',
        anonymousLogin: 'Anonimna prijava',
        anonymousLoginNote: 'Aplikacija je povezana s internom bazom podataka i ne traži lozinku.'
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
        buttonEdit: 'Edit',
        buttonAdd: 'Add New Medicine',
        logout: 'Logout',
        successLogout: 'Successfully logged out.',
        successSave: 'Medicine successfully saved.',
        successDelete: 'Medicine successfully deleted.',
        errorAuth: 'Authentication error:',
        errorSave: 'Error saving medicine:',
        errorDelete: 'Error deleting medicine:',
        errorGeneric: 'An error occurred:',
        modalConfirmDeleteTitle: 'Confirm Deletion',
        modalConfirmDeleteMessage: 'Are you sure you want to delete this medicine?',
        yes: 'Yes',
        no: 'No',
        modalPillTitle: 'Reminder!',
        modalPillMessage: 'It\'s time to take your medicine:',
        modalPillButton: 'I took it',
        theme: 'Theme',
        language: 'Language',
        anonymousLogin: 'Anonymous Login',
        anonymousLoginNote: 'The application is connected to an internal database and does not require a password.'
    }
};

const medicineTypes = {
    'tableta': '💊',
    'sirup': '🧴',
    'sprej': '👃',
    'injekcija': '💉'
};

// Prikaz prilagođenog modala za poruke i potvrde
const CustomModal = ({ message, onConfirm, onCancel, showConfirmCancel }) => {
    if (!message) {
        return null;
    }
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
                <p id="custom-modal-message" className="text-gray-800 dark:text-gray-200 mb-4">{message}</p>
                <div className="flex justify-center space-x-4">
                    {showConfirmCancel ? (
                        <>
                            <button onClick={onCancel} className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors">{translations.hr.no}</button>
                            <button onClick={onConfirm} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">{translations.hr.yes}</button>
                        </>
                    ) : (
                        <button onClick={onConfirm} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">OK</button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Glavna React komponenta aplikacije
const App = () => {
    // Definiranje stateova
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [currentMedicine, setCurrentMedicine] = useState(null);
    const [language, setLanguage] = useState(localStorage.getItem('language') || 'hr');
    const [customModalMessage, setCustomModalMessage] = useState('');
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);
    const [confirmAction, setConfirmAction] = useState(() => () => {});
    const [isPillReminderModalOpen, setIsPillReminderModalOpen] = useState(false);
    const [currentPillReminder, setCurrentPillReminder] = useState(null);

    // Korištenje trenutnog jezika
    const lang = translations[language];

    // Inicijalizacija Firebasea i praćenje autentifikacije
    useEffect(() => {
        // Provjera i postavljanje tamnog moda na početku
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        setDb(dbInstance);
        setAuth(authInstance);

        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
                setMedicines([]);
            }
        });

        // Anonimna prijava ako token nije dostupan
        if (initialAuthToken) {
            signInWithCustomToken(authInstance, initialAuthToken).catch(e => {
                console.error("Custom token login failed:", e);
                signInAnonymously(authInstance);
            });
        } else {
            signInAnonymously(authInstance);
        }

        // Čišćenje listenera
        return () => unsubscribe();
    }, []);

    // Praćenje promjena u kolekciji 'medicines' u stvarnom vremenu
    useEffect(() => {
        if (!userId || !db) return;

        const collectionPath = `/artifacts/${appId}/users/${userId}/medicines`;
        const q = query(collection(db, collectionPath));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const medicinesArray = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMedicines(medicinesArray);

            // Provjera podsjetnika
            const now = new Date();
            const nowHour = now.getHours();
            const nowMinute = now.getMinutes();
            medicinesArray.forEach(medicine => {
                const times = medicine.times.split(',').map(t => t.trim());
                times.forEach(time => {
                    const [hour, minute] = time.split(':').map(Number);
                    if (hour === nowHour && minute === nowMinute) {
                        setCurrentPillReminder({ id: medicine.id, name: medicine.name, time: time });
                        setIsPillReminderModalOpen(true);
                    }
                });
            });
        }, (error) => {
            console.error("Greška pri dohvaćanju lijekova:", error);
            showCustomModal(`${lang.errorGeneric} ${error.message}`);
        });

        // Čišćenje listenera
        return () => unsubscribe();
    }, [userId, db, language, lang.errorGeneric]);

    // Funkcija za prikaz prilagođenog modala
    const showCustomModal = (message, showConfirm = false, onConfirm, onCancel) => {
        setCustomModalMessage(message);
        setShowConfirmCancel(showConfirm);
        setConfirmAction(() => (isConfirmed) => {
            if (isConfirmed) {
                onConfirm();
            } else if (onCancel) {
                onCancel();
            }
            setCustomModalMessage('');
        });
    };

    // Funkcija za odjavu
    const handleLogout = async () => {
        try {
            await signOut(auth);
            showCustomModal(lang.successLogout);
        } catch (error) {
            showCustomModal(`${lang.errorAuth} ${error.message}`);
        }
    };

    // Funkcija za spremanje ili ažuriranje lijeka
    const handleSave = async (event) => {
        event.preventDefault();
        const form = event.target;
        const medicineData = {
            name: form.medicineName.value,
            times: form.medicineTimes.value,
            startDate: form.startDate.value,
            endDate: form.endDate.value,
            type: form.medicineType.value
        };
        if (!medicineData.name || !medicineData.times || !medicineData.startDate || !medicineData.endDate || !medicineData.type) {
            showCustomModal('Sva polja moraju biti popunjena.');
            return;
        }
        try {
            const collectionPath = `/artifacts/${appId}/users/${userId}/medicines`;
            if (currentMedicine) {
                await setDoc(doc(db, collectionPath, currentMedicine.id), medicineData);
            } else {
                await addDoc(collection(db, collectionPath), medicineData);
            }
            showCustomModal(lang.successSave);
            setIsAddModalOpen(false);
            setCurrentMedicine(null);
        } catch (e) {
            showCustomModal(`${lang.errorSave} ${e.message}`);
        }
    };

    // Funkcija za brisanje lijeka
    const handleDelete = (id) => {
        showCustomModal(lang.modalConfirmDeleteMessage, true, async () => {
            try {
                const docPath = `/artifacts/${appId}/users/${userId}/medicines/${id}`;
                await deleteDoc(doc(db, docPath));
                showCustomModal(lang.successDelete);
            } catch (e) {
                showCustomModal(`${lang.errorDelete} ${e.message}`);
            }
        });
    };

    // Funkcija za uređivanje lijeka
    const handleEdit = (medicine) => {
        setCurrentMedicine(medicine);
        setIsAddModalOpen(true);
    };

    // Funkcija za bilježenje uzimanja lijeka
    const handleTake = async (id, time) => {
        try {
            const docRef = doc(db, `/artifacts/${appId}/users/${userId}/medicines/${id}`);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const medicineData = docSnap.data();
                const takenLog = medicineData.taken || {};
                const today = new Date().toISOString().slice(0, 10);
                const logEntry = takenLog[today] || [];
                if (!logEntry.includes(time)) {
                    logEntry.push(time);
                    await setDoc(docRef, { ...medicineData, taken: { ...takenLog, [today]: logEntry } });
                    showCustomModal('Uspješno zabilježeno!');
                } else {
                    showCustomModal('Već ste uzeli ovaj lijek u ovom terminu.');
                }
            }
        } catch (e) {
            showCustomModal(`Greška pri bilježenju uzimanja lijeka: ${e.message}`);
        }
    };

    // Funkcija za provjeru je li lijek uzet danas
    const isTaken = (medicine) => {
        const today = new Date().toISOString().slice(0, 10);
        return medicine.taken && medicine.taken[today] && medicine.taken[today].length > 0;
    };

    // Funkcija za prebacivanje tamnog moda
    const handleDarkModeToggle = () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    };

    // Ako korisnik nije prijavljen, prikaži ekran za prijavu
    if (!userId) {
        return (
            <div className="flex items-center justify-center min-h-screen dark:bg-gray-900 bg-gray-100">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
                    <div className="text-center pb-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{lang.authTitleLogin}</h2>
                    </div>
                    <div className="pt-0 grid gap-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{lang.anonymousLoginNote}</p>
                        <button onClick={() => setUserId(crypto.randomUUID())} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                            {lang.anonymousLogin}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Glavni prikaz aplikacije nakon prijave
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-500 font-sans p-4">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                
                .card-container {
                    opacity: 0;
                    transform: translateY(20px);
                    animation: fade-in 0.5s forwards;
                    transition: all 0.3s;
                }
                
                .card-container:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                }
                
                @keyframes fade-in {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .card-container.taken {
                    background-color: #d1d5db;
                    opacity: 0.6;
                }
                
                .dark .card-container.taken {
                    background-color: #374151;
                }
                `}
            </style>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />

            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-center py-4 px-2 sm:px-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-center sm:text-left mb-4 sm:mb-0">
                    {lang.mainTitle}
                </h1>
                <div className="flex items-center space-x-4">
                    <button onClick={handleDarkModeToggle} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <Sun className="h-6 w-6 hidden dark:block text-yellow-500" />
                        <Moon className="h-6 w-6 block dark:hidden text-indigo-600" />
                    </button>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white transition-colors cursor-pointer">
                        <option value="hr">HR</option>
                        <option value="en">EN</option>
                    </select>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                        <PlusCircle size={20} />
                        <span className="hidden sm:inline">{lang.buttonAdd}</span>
                    </button>
                    <button onClick={handleLogout} className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors">
                        <LogOut size={20} />
                        <span className="hidden sm:inline">{lang.logout}</span>
                    </button>
                </div>
            </header>

            {/* Glavni sadržaj */}
            <main className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {medicines.length === 0 ? (
                    <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                        <Pill size={48} className="mx-auto text-indigo-600 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 font-semibold">{lang.noMedicinesText}</p>
                    </div>
                ) : (
                    medicines.map((medicine, index) => (
                        <div key={medicine.id} className={`card-container bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col justify-between ${isTaken(medicine) ? 'taken' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className="flex items-center space-x-4 mb-4">
                                <span className="text-4xl">{medicineTypes[medicine.type] || '💊'}</span>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{medicine.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">ID: {medicine.id.substring(0, 8)}</p>
                                </div>
                                <button onClick={() => handleEdit(medicine)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                    <Edit size={20} />
                                </button>
                                <button onClick={() => handleDelete(medicine.id)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center space-x-2">
                                    <Calendar size={16} />
                                    <span>{medicine.startDate} do {medicine.endDate}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Clock size={16} />
                                    <span>{medicine.times}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* Modal za dodavanje/uređivanje */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
                        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">{currentMedicine ? lang.buttonEdit : lang.modalTitle}</h2>
                        <form onSubmit={handleSave}>
                            <div className="grid gap-4">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {lang.labelName}
                                    <input type="text" name="medicineName" defaultValue={currentMedicine?.name || ''} className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500" required />
                                </label>
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {lang.labelTimes}
                                    <input type="text" name="medicineTimes" defaultValue={currentMedicine?.times || ''} className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500" placeholder="e.g. 08:00, 14:30, 20:00" required />
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        {lang.labelStartDate}
                                        <input type="date" name="startDate" defaultValue={currentMedicine?.startDate || ''} className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500" required />
                                    </label>
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        {lang.labelEndDate}
                                        <input type="date" name="endDate" defaultValue={currentMedicine?.endDate || ''} className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500" required />
                                    </label>
                                </div>
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {lang.labelType}
                                    <select name="medicineType" defaultValue={currentMedicine?.type || 'tableta'} className="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm p-2 focus:border-indigo-500 focus:ring-indigo-500" required>
                                        {Object.keys(medicineTypes).map(type => (
                                            <option key={type} value={type}>{medicineTypes[type]} {type}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div className="flex justify-end space-x-2 mt-6">
                                <button type="button" onClick={() => {
                                    setIsAddModalOpen(false);
                                    setCurrentMedicine(null);
                                }} className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors">
                                    {lang.buttonCancel}
                                </button>
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                                    {lang.buttonSave}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal za podsjetnik na lijek */}
            {isPillReminderModalOpen && currentPillReminder && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
                        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{lang.modalPillTitle}</h2>
                        <p className="text-gray-800 dark:text-gray-200 mb-4">{lang.modalPillMessage} <span className="font-semibold text-indigo-600">{currentPillReminder.name}</span></p>
                        <div className="flex justify-center">
                            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors" onClick={() => {
                                handleTake(currentPillReminder.id, currentPillReminder.time);
                                setIsPillReminderModalOpen(false);
                            }}>
                                {lang.modalPillButton}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <CustomModal
                message={customModalMessage}
                onConfirm={() => confirmAction(true)}
                onCancel={() => confirmAction(false)}
                showConfirmCancel={showConfirmCancel}
            />
        </div>
    );
};

export default App;
