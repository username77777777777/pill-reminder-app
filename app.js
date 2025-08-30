import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, deleteDoc, setDoc, onSnapshot, collection, query, where, addDoc } from 'firebase/firestore';
import { AlertCircle, PlusCircle, Trash2, Edit, LogOut, Sun, Moon, Calendar, Clock, Pill, Globe } from 'lucide-react';

// Ugrađena Tailwind CSS skripta za stiliziranje
// Iako je ovo React komponenta, Tailwind skripta je dodana radi lakšeg prikaza u Canvas okruženju.
<script src="https://cdn.tailwindcss.com"></script>

// Firebase konfiguracija
// Koristi globalne varijable koje osigurava Canvas okruženje
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

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
        buttonEdit: 'Uredi',
        buttonAdd: 'Dodaj lijek',
        buttonLogout: 'Odjava',
        buttonToggleTheme: 'Promijeni temu',
        modalPillTitle: 'Vrijeme je za lijek!',
        modalPillMessage: 'Vrijeme je za uzimanje lijeka:',
        modalPillButton: 'Uzeo/la sam',
        deleteConfirmTitle: 'Potvrdi brisanje',
        deleteConfirmMessage: 'Jeste li sigurni da želite obrisati ovaj lijek?',
        buttonDelete: 'Obriši',
        errorAuth: 'Greška pri autentifikaciji:',
        errorData: 'Greška pri dohvaćanju podataka:',
        errorGeneric: 'Došlo je do greške:',
        successSave: 'Lijek uspješno dodan!',
        successDelete: 'Lijek uspješno obrisan!',
        successUpdate: 'Lijek uspješno ažuriran!',
        loading: 'Učitavanje...',
        language: 'Jezik',
        languageHR: 'Hrvatski',
        userIdLabel: 'ID korisnika:'
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
        buttonAdd: 'Add Medicine',
        buttonLogout: 'Logout',
        buttonToggleTheme: 'Toggle Theme',
        modalPillTitle: 'Time for medicine!',
        modalPillMessage: 'It\'s time to take your medicine:',
        modalPillButton: 'I\'ve taken it',
        deleteConfirmTitle: 'Confirm Deletion',
        deleteConfirmMessage: 'Are you sure you want to delete this medicine?',
        buttonDelete: 'Delete',
        errorAuth: 'Authentication Error:',
        errorData: 'Data Fetching Error:',
        errorGeneric: 'An error occurred:',
        successSave: 'Medicine successfully added!',
        successDelete: 'Medicine successfully deleted!',
        successUpdate: 'Medicine successfully updated!',
        loading: 'Loading...',
        language: 'Language',
        languageHR: 'Croatian',
        userIdLabel: 'User ID:'
    }
};

// Definiranje tipova za lijekove
const medicineTypes = {
    'tableta': '💊',
    'sirup': '🧴',
    'sprej': '👃',
    'injekcija': '💉'
};

// Lokalno pohranjivanje teme
const setInitialTheme = () => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

const App = () => {
    const [medicines, setMedicines] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPillReminderModalOpen, setIsPillReminderModalOpen] = useState(false);
    const [currentPillReminder, setCurrentPillReminder] = useState(null);
    const [editMedicine, setEditMedicine] = useState(null);
    const [newMedicine, setNewMedicine] = useState({ name: '', times: '', startDate: '', endDate: '', type: 'tableta' });
    const [customModalMessage, setCustomModalMessage] = useState('');
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);
    const [confirmAction, setConfirmAction] = useState(() => () => {});
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [lang, setLang] = useState(translations.hr);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        setInitialTheme();
        setDarkMode(document.documentElement.classList.contains('dark'));
    }, []);

    // Firebase inicijalizacija
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            setDb(getFirestore(app));
            setAuth(getAuth(app));
            console.log("Firebase initialized");
        } catch (e) {
            console.error("Firebase initialization failed:", e);
        }
    }, []);
    
    // Autentifikacija
    useEffect(() => {
        if (!auth) return;

        const handleAuth = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
        });

        handleAuth();

        return () => unsubscribe();
    }, [auth]);

    // Učitavanje podataka
    useEffect(() => {
        if (!db || !user) return;

        const medicinesCollectionRef = collection(db, `artifacts/${appId}/users/${user.uid}/medicines`);
        const q = query(medicinesCollectionRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const medicinesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                times: doc.data().times.split(',').map(t => t.trim()) // Parsiranje vremena
            }));
            setMedicines(medicinesData);
        }, (error) => {
            console.error("Error fetching medicines:", error);
        });

        return () => unsubscribe();
    }, [db, user]);

    // Funkcija za prikaz poruke u modalnom prozoru
    const showCustomModal = (message, showConfirm = false, action = () => {}) => {
        setCustomModalMessage(message);
        setShowConfirmCancel(showConfirm);
        setConfirmAction(() => action);
    };

    // Zatvaranje modala
    const closeCustomModal = () => {
        setCustomModalMessage('');
        setShowConfirmCancel(false);
        setConfirmAction(() => () => {});
    };

    // Funkcija za dodavanje/uređivanje lijeka
    const handleSaveMedicine = async () => {
        if (!newMedicine.name || !newMedicine.times) {
            showCustomModal("Ime lijeka i vrijeme su obavezni!");
            return;
        }
        
        const medicineData = {
            ...newMedicine,
            times: newMedicine.times.split(',').map(t => t.trim()).join(',')
        };

        try {
            if (editMedicine) {
                const medicineDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/medicines`, editMedicine.id);
                await updateDoc(medicineDocRef, medicineData);
                showCustomModal(lang.successUpdate);
            } else {
                await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/medicines`), medicineData);
                showCustomModal(lang.successSave);
            }
            setIsModalOpen(false);
            setEditMedicine(null);
            setNewMedicine({ name: '', times: '', startDate: '', endDate: '', type: 'tableta' });
        } catch (e) {
            console.error("Error saving medicine: ", e);
            showCustomModal(lang.errorGeneric + e.message);
        }
    };

    // Funkcija za brisanje lijeka
    const handleDeleteMedicine = (id) => {
        showCustomModal(lang.deleteConfirmMessage, true, async (confirmed) => {
            if (confirmed) {
                try {
                    await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/medicines`, id));
                    showCustomModal(lang.successDelete);
                } catch (e) {
                    console.error("Error deleting medicine: ", e);
                    showCustomModal(lang.errorGeneric + e.message);
                }
            }
        });
    };

    // Funkcija za uređivanje lijeka
    const handleEditMedicine = (medicine) => {
        setEditMedicine(medicine);
        setNewMedicine({
            name: medicine.name,
            times: medicine.times.join(', '),
            startDate: medicine.startDate,
            endDate: medicine.endDate,
            type: medicine.type
        });
        setIsModalOpen(true);
    };

    // Funkcija za promjenu jezika
    const changeLanguage = (e) => {
        const selectedLang = e.target.value;
        setLang(translations[selectedLang]);
    };

    // Funkcija za promjenu teme
    const toggleTheme = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        setDarkMode(isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    // Funkcija za uzimanje lijeka
    const handleTake = async (id, time) => {
        const medicineDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/medicines`, id);
        try {
            const docSnap = await getDoc(medicineDocRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                const takenTimes = data.takenTimes || {};
                const today = new Date().toISOString().slice(0, 10);
                
                // Provjera je li lijek već uzet danas u to vrijeme
                const alreadyTaken = takenTimes[today] && takenTimes[today].includes(time);
                
                if (!alreadyTaken) {
                    const newTakenTimes = {
                        ...takenTimes,
                        [today]: [...(takenTimes[today] || []), time]
                    };
                    await updateDoc(medicineDocRef, { takenTimes: newTakenTimes });
                    showCustomModal(`Uspješno uzet lijek ${data.name} u ${time}!`);
                } else {
                    showCustomModal(`Već ste uzeli lijek ${data.name} u ${time} danas.`);
                }
            }
        } catch (e) {
            console.error("Error taking medicine: ", e);
            showCustomModal(lang.errorGeneric + e.message);
        }
    };
    
    // Funkcija za provjeru podsjetnika
    useEffect(() => {
        if (!medicines.length) return;

        const interval = setInterval(() => {
            const now = new Date();
            const currentTime = now.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });

            medicines.forEach(medicine => {
                const isWithinDateRange = (!medicine.startDate || new Date(medicine.startDate) <= now) &&
                                          (!medicine.endDate || new Date(medicine.endDate) >= now);

                if (isWithinDateRange && medicine.times.includes(currentTime)) {
                    const today = now.toISOString().slice(0, 10);
                    const takenTimesForToday = medicine.takenTimes && medicine.takenTimes[today] || [];
                    
                    if (!takenTimesForToday.includes(currentTime)) {
                        setCurrentPillReminder(medicine);
                        setIsPillReminderModalOpen(true);
                    }
                }
            });
        }, 60000); // Provjerava svakih 60 sekundi

        return () => clearInterval(interval);
    }, [medicines]);

    // UI renderiranje
    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen dark:bg-gray-900 bg-gray-100">
                <div className="text-gray-900 dark:text-white text-lg font-semibold">{lang.loading}</div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-500 font-sans p-4`}>
            {user ? (
                // Glavna aplikacija
                <div className="w-full max-w-4xl flex flex-col items-center">
                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-2">
                            <h1 className="text-3xl font-bold rounded-xl text-indigo-600 dark:text-indigo-400">{lang.mainTitle}</h1>
                            <select onChange={changeLanguage} className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-2">
                                <option value="hr">HR</option>
                                <option value="en">EN</option>
                            </select>
                            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                {darkMode ? <Sun className="w-6 h-6 text-yellow-400" /> : <Moon className="w-6 h-6 text-gray-600" />}
                            </button>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline-block">ID: {user.uid.substring(0, 8)}...</span>
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors shadow-lg">
                                <PlusCircle size={20} />
                                <span className="hidden sm:inline-block">{lang.buttonAdd}</span>
                            </button>
                            <button onClick={() => signOut(auth)} className="flex items-center space-x-2 px-4 py-2 bg-gray-300 text-gray-800 rounded-full font-semibold hover:bg-gray-400 transition-colors shadow-lg">
                                <LogOut size={20} />
                                <span className="hidden sm:inline-block">{lang.buttonLogout}</span>
                            </button>
                        </div>
                    </div>
                    
                    {medicines.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl mt-8">
                            <Pill size={48} className="text-gray-400 dark:text-gray-500 mb-4" />
                            <p className="text-lg text-gray-600 dark:text-gray-400">{lang.noMedicinesText}</p>
                        </div>
                    ) : (
                        <div className="w-full grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {medicines.map((medicine, index) => {
                                // Provjera je li lijek uzet danas
                                const today = new Date().toISOString().slice(0, 10);
                                const isTakenToday = medicine.takenTimes && medicine.takenTimes[today] && medicine.takenTimes[today].length > 0;
                                
                                return (
                                    <div key={medicine.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg transform transition-transform duration-300 hover:scale-105 ${isTakenToday ? 'opacity-70' : ''}`}>
                                        <div className="flex items-center mb-2">
                                            <span className="text-3xl mr-3">{medicineTypes[medicine.type] || '💊'}</span>
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{medicine.name}</h2>
                                        </div>
                                        <div className="text-gray-600 dark:text-gray-400">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <Clock size={16} />
                                                <p>{lang.labelTimes}: {medicine.times.join(', ')}</p>
                                            </div>
                                            <div className="flex items-center space-x-2 mb-1">
                                                <Calendar size={16} />
                                                <p>{lang.labelStartDate}: {medicine.startDate || '-'}</p>
                                            </div>
                                            <div className="flex items-center space-x-2 mb-4">
                                                <Calendar size={16} />
                                                <p>{lang.labelEndDate}: {medicine.endDate || '-'}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                            <button onClick={() => handleEditMedicine(medicine)} className="p-2 rounded-full text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
                                                <Edit size={20} />
                                            </button>
                                            <button onClick={() => handleDeleteMedicine(medicine.id)} className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900 transition-colors">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                // Prikaz forme za prijavu
                <div className="flex items-center justify-center min-h-screen dark:bg-gray-900 bg-gray-100">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
                        <div className="text-center pb-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{lang.authTitleLogin}</h2>
                        </div>
                        <div className="pt-0 grid gap-4">
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                                Aplikacija je povezana s internom bazom podataka i ne traži lozinku.
                            </p>
                            <button onClick={() => {
                                // Prijavljivanje anonimnog korisnika za demonstraciju
                                signInAnonymously(auth);
                            }} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                                Anonimna prijava
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal za dodavanje/uređivanje */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">
                            {editMedicine ? lang.buttonEdit : lang.modalTitle}
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300">{lang.labelName}</label>
                                <input
                                    type="text"
                                    value={newMedicine.name}
                                    onChange={(e) => setNewMedicine({ ...newMedicine, name: e.target.value })}
                                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300">{lang.labelTimes}</label>
                                <input
                                    type="text"
                                    value={newMedicine.times}
                                    onChange={(e) => setNewMedicine({ ...newMedicine, times: e.target.value })}
                                    placeholder="npr. 08:00, 14:30, 20:00"
                                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex space-x-4">
                                <div className="flex-1">
                                    <label className="block text-gray-700 dark:text-gray-300">{lang.labelStartDate}</label>
                                    <input
                                        type="date"
                                        value={newMedicine.startDate}
                                        onChange={(e) => setNewMedicine({ ...newMedicine, startDate: e.target.value })}
                                        className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-gray-700 dark:text-gray-300">{lang.labelEndDate}</label>
                                    <input
                                        type="date"
                                        value={newMedicine.endDate}
                                        onChange={(e) => setNewMedicine({ ...newMedicine, endDate: e.target.value })}
                                        className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-700 dark:text-gray-300">{lang.labelType}</label>
                                <select
                                    value={newMedicine.type}
                                    onChange={(e) => setNewMedicine({ ...newMedicine, type: e.target.value })}
                                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {Object.keys(medicineTypes).map(type => (
                                        <option key={type} value={type}>
                                            {medicineTypes[type]} {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-4 mt-6">
                            <button onClick={() => { setIsModalOpen(false); setEditMedicine(null); setNewMedicine({ name: '', times: '', startDate: '', endDate: '', type: 'tableta' }); }} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-full font-semibold hover:bg-gray-400 transition-colors">
                                {lang.buttonCancel}
                            </button>
                            <button onClick={handleSaveMedicine} className="px-4 py-2 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition-colors">
                                {editMedicine ? lang.buttonSave : lang.buttonAdd}
                            </button>
                        </div>
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
                                handleTake(currentPillReminder.id, new Date().toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' }));
                                setIsPillReminderModalOpen(false);
                            }}>
                                {lang.modalPillButton}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Custom Modal za poruke */}
            {customModalMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
                        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Obavijest</h2>
                        <p className="text-gray-800 dark:text-gray-200 mb-4">{customModalMessage}</p>
                        <div className="flex justify-center space-x-4">
                            {showConfirmCancel && (
                                <button className="px-4 py-2 bg-gray-300 text-gray-800 rounded-xl font-semibold hover:bg-gray-400 transition-colors" onClick={() => { closeCustomModal(); confirmAction(false); }}>{lang.buttonCancel}</button>
                            )}
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors" onClick={() => { closeCustomModal(); if (showConfirmCancel) { confirmAction(true); } }}>OK</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
