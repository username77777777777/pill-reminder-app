import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, deleteDoc, setDoc, onSnapshot, collection, query, where, addDoc } from 'firebase/firestore';

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
        modalPillTitle: 'Vrijeme za lijek!',
        modalPillMessage: 'Vrijeme je za uzimanje ',
        modalPillButton: 'Uzeo sam lijek',
        errorNameTimes: 'Molimo unesite ime i vrijeme lijeka!',
        errorTimes: 'Molimo unesite barem jedno vrijeme lijeka!',
        errorAuth: 'Greška: ',
        errorDelete: 'Greška prilikom brisanja lijeka: ',
        errorTake: 'Greška prilikom označavanja lijeka kao uzetog: ',
        errorSave: 'Greška prilikom spremanja lijeka: ',
        errorLogout: 'Greška prilikom odjave: ',
        confirmDelete: 'Jeste li sigurni da želite obrisati ovaj lijek?',
        ok: 'OK',
        cancel: 'Odustani',
        userIdLabel: 'ID korisnika'
    },
    en: {
        mainTitle: 'My Medicines',
        noMedicinesText: 'No medicines added yet. Add a new reminder!',
        authTitleLogin: 'Login',
        authTitleRegister: 'Register',
        authToggleLogin: 'Don\'t have an account? Register',
        authToggleRegister: 'Already have an account? Login',
        authSubmitLogin: 'Log In',
        authSubmitRegister: 'Register',
        modalTitle: 'Add New Medicine',
        labelName: 'Medicine Name',
        labelTimes: 'Times (comma-separated)',
        labelStartDate: 'Start Date',
        labelEndDate: 'End Date',
        labelType: 'Medicine Type',
        buttonCancel: 'Cancel',
        buttonSave: 'Save',
        modalPillTitle: 'Time for medicine!',
        modalPillMessage: 'It\'s time to take ',
        modalPillButton: 'I have taken the medicine',
        errorNameTimes: 'Please enter the medicine name and times!',
        errorTimes: 'Please enter at least one time!',
        errorAuth: 'Error: ',
        errorDelete: 'Error deleting medicine: ',
        errorTake: 'Error marking medicine as taken: ',
        errorSave: 'Error saving medicine: ',
        errorLogout: 'Error logging out: ',
        confirmDelete: 'Are you sure you want to delete this medicine?',
        ok: 'OK',
        cancel: 'Cancel',
        userIdLabel: 'User ID'
    }
};

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// React App
function App() {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [medicines, setMedicines] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [customModalMessage, setCustomModalMessage] = useState('');
    const [isConfirmModal, setIsConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState(() => {});
    const [isPillReminderModalOpen, setIsPillReminderModalOpen] = useState(false);
    const [currentPillReminder, setCurrentPillReminder] = useState(null);
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedType, setSelectedType] = useState('tableta');
    const [currentLanguage, setCurrentLanguage] = useState(localStorage.getItem('language') || 'hr');

    // State za formu
    const [name, setName] = useState('');
    const [times, setTimes] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const lang = translations[currentLanguage];

    // Funkcija za prikaz prilagođenog modala
    const showCustomModal = (message, isConfirm = false, onConfirm = () => {}, onCancel = () => {}) => {
        setCustomModalMessage(message);
        setIsConfirmModal(isConfirm);
        setIsCustomModalOpen(true);
        setConfirmAction(() => (result) => {
            if (result) {
                onConfirm();
            } else {
                onCancel();
            }
            setIsCustomModalOpen(false);
        });
    };

    // Inicijalizacija Firebasea i provjera autentikacije
    useEffect(() => {
        const init = async () => {
            try {
                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);
                setAuth(authInstance);
                setDb(dbInstance);

                onAuthStateChanged(authInstance, async (authUser) => {
                    if (authUser) {
                        setUser(authUser);
                    } else {
                        try {
                            // Prijavljivanje s anonimnim računom ako nema tokena
                            await signInAnonymously(authInstance);
                        } catch (anonError) {
                            console.error("Greška pri anonimnoj prijavi:", anonError);
                        }
                    }
                    setIsAuthReady(true);
                });

            } catch (error) {
                console.error("Greška pri inicijalizaciji Firebasea:", error);
                setIsAuthReady(true); // U slučaju greške, svejedno označi kao spremno
            }
        };

        init();
    }, []);

    // Praćenje promjena u bazi podataka
    useEffect(() => {
        if (!isAuthReady || !db || !user) {
            return;
        }

        const q = query(collection(db, `artifacts/${appId}/users/${user.uid}/medicines`));

        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            const fetchedMedicines = [];
            for (const docSnapshot of querySnapshot.docs) {
                const medicineData = { ...docSnapshot.data(), id: docSnapshot.id };
                const todayDate = new Date().toISOString().split('T')[0];
                const takenDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/medicines/${medicineData.id}/taken_dates/${todayDate}`);
                
                try {
                    const takenDocSnap = await new Promise(resolve => {
                        const unsubscribeTaken = onSnapshot(takenDocRef, (snap) => {
                            unsubscribeTaken();
                            resolve(snap);
                        }, (error) => {
                            console.error("Greška pri preuzimanju 'taken_dates':", error);
                            resolve({ exists: () => false }); // Pretpostavi da ne postoji u slučaju greške
                        });
                    });
                    medicineData.isTaken = takenDocSnap.exists();
                } catch (e) {
                    console.error("Greška pri provjeri uzeo/la:", e);
                    medicineData.isTaken = false;
                }
                
                fetchedMedicines.push(medicineData);
            }
            setMedicines(fetchedMedicines);
        });

        // Cleanup funkcija za odjavu
        return () => unsubscribe();
    }, [isAuthReady, db, user]);

    // Provjera podsjetnika
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const currentHour = now.getHours().toString().padStart(2, '0');
            const currentMinute = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${currentHour}:${currentMinute}`;
            const today = now.toISOString().split('T')[0];

            medicines.forEach(medicine => {
                const startDateObj = medicine.startDate ? new Date(medicine.startDate) : null;
                const endDateObj = medicine.endDate ? new Date(medicine.endDate) : null;

                if ((!startDateObj || now >= startDateObj) && (!endDateObj || now <= endDateObj)) {
                    if (medicine.times.includes(currentTime) && !medicine.isTaken) {
                        setCurrentPillReminder(medicine);
                        setIsPillReminderModalOpen(true);
                    }
                }
            });
        }, 60000); // Provjera svake minute

        return () => clearInterval(interval);
    }, [medicines]);

    // Funkcija za brisanje lijeka
    const handleDelete = async (id) => {
        showCustomModal(lang.confirmDelete, true, async () => {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/medicines`, id));
            } catch (e) {
                showCustomModal(lang.errorDelete + e.message);
            }
        });
    };

    // Funkcija za označavanje lijeka kao uzetog
    const handleTake = async (medicineId) => {
        try {
            const todayDate = new Date().toISOString().split('T')[0];
            await setDoc(doc(db, `artifacts/${appId}/users/${user.uid}/medicines/${medicineId}/taken_dates/${todayDate}`), { timestamp: new Date() });
            setIsPillReminderModalOpen(false);
        } catch (e) {
            showCustomModal(lang.errorTake + e.message);
        }
    };

    // Funkcija za spremanje novog lijeka
    const handleSave = async () => {
        const timesArray = times.split(',').map(t => t.trim()).filter(t => t !== '');
        if (!name || timesArray.length === 0) {
            showCustomModal(lang.errorNameTimes);
            return;
        }

        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/medicines`), {
                name,
                type: selectedType,
                times: timesArray,
                startDate: startDate || null,
                endDate: endDate || null,
                userId: user.uid,
            });
            // Reset forme i zatvaranje modala
            setName('');
            setTimes('');
            setStartDate('');
            setEndDate('');
            setIsAddModalOpen(false);
        } catch (e) {
            showCustomModal(lang.errorSave + e.message);
        }
    };

    const toggleDarkMode = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.theme = isDark ? 'dark' : 'light';
    };

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setCurrentLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (e) {
            showCustomModal(lang.errorLogout + e.message);
        }
    };

    // Loading state
    if (!isAuthReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-500">
                <div className="text-gray-900 dark:text-white">Učitavanje...</div>
            </div>
        );
    }
    
    // UI za prijavu/registraciju
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 transition-colors duration-500">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm transform transition duration-500 hover:scale-105">
                    <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white">{isLogin ? lang.authTitleLogin : lang.authTitleRegister}</h2>
                    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); /* implementacija prijave/registracije */ }}>
                        <div>
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">E-mail</label>
                            <input
                                type="email"
                                className="w-full mt-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="primjer@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Lozinka</label>
                            <input
                                type="password"
                                className="w-full mt-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                placeholder="●●●●●●"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors duration-200"
                        >
                            {isLogin ? lang.authSubmitLogin : lang.authSubmitRegister}
                        </button>
                    </form>
                    <button
                        className="w-full mt-4 py-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? lang.authToggleLogin : lang.authToggleRegister}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-500 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Zaglavlje */}
                <header className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white" id="main-title">{lang.mainTitle}</h1>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <span className="text-gray-600 dark:text-gray-400 text-sm">{lang.userIdLabel}: {user.uid}</span>
                        <select className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl py-2 px-3 border border-gray-300 dark:border-gray-600" onChange={handleLanguageChange} value={currentLanguage}>
                            <option value="hr">HR</option>
                            <option value="en">EN</option>
                        </select>
                        <button onClick={toggleDarkMode} className="text-gray-600 dark:text-gray-400 focus:outline-none">
                            <i className="fas fa-sun text-2xl dark:hidden"></i>
                            <i className="fas fa-moon text-2xl hidden dark:inline"></i>
                        </button>
                        <button onClick={logout} className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">
                            {currentLanguage === 'hr' ? 'Odjava' : 'Log Out'}
                        </button>
                    </div>
                </header>

                {/* Gumb za dodavanje */}
                <div className="text-center mb-8">
                    <button id="add-button" className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors duration-200" onClick={() => setIsAddModalOpen(true)}>
                        <i className="fas fa-plus mr-2"></i>
                        {currentLanguage === 'hr' ? 'Dodaj novi lijek' : 'Add New Medicine'}
                    </button>
                </div>

                {/* Lista lijekova */}
                <div id="medicine-list" className="space-y-4">
                    {medicines.length === 0 ? (
                        <p id="no-medicines" className="text-center text-gray-500 dark:text-gray-400 mt-12">{lang.noMedicinesText}</p>
                    ) : (
                        medicines.map((medicine, index) => (
                            <div key={index} className={`card-container bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center justify-between space-x-4 transition-transform duration-200 hover:scale-[1.01] ${medicine.isTaken ? 'bg-gray-200 dark:bg-gray-700 opacity-60' : ''}`}>
                                <div className="flex items-center space-x-4">
                                    <span className="text-4xl select-none">{medicineTypes[medicine.type] || '❓'}</span>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{medicine.name}</h3>
                                        <p className="text-gray-500 text-sm mt-1">{medicine.times.join(', ')}</p>
                                    </div>
                                </div>
                                <div className="flex space-x-2 items-center">
                                    <button className="text-green-500 focus:outline-none" onClick={() => handleTake(medicine.id)} aria-label="Uzeo sam lijek">
                                        <i className="fas fa-check-circle text-2xl"></i>
                                    </button>
                                    <button className="text-gray-400 hover:text-red-500 focus:outline-none" onClick={() => handleDelete(medicine.id)} aria-label="Obriši lijek">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal za dodavanje lijeka */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{lang.modalTitle}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="medicine-name">{lang.labelName}</label>
                                <input id="medicine-name" type="text" className="w-full mt-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={name} onChange={(e) => setName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="medicine-times">{lang.labelTimes}</label>
                                <input id="medicine-times" type="text" className="w-full mt-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="09:00, 14:30" value={times} onChange={(e) => setTimes(e.target.value)} />
                            </div>
                            <div className="flex space-x-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="start-date">{lang.labelStartDate}</label>
                                    <input id="start-date" type="date" className="w-full mt-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300" htmlFor="end-date">{lang.labelEndDate}</label>
                                    <input id="end-date" type="date" className="w-full mt-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{lang.labelType}</label>
                                <div className="flex justify-center space-x-2">
                                    {Object.entries(medicineTypes).map(([type, icon]) => (
                                        <button
                                            key={type}
                                            className={`type-button flex flex-col items-center justify-center p-2 rounded-xl border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${selectedType === type ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white'}`}
                                            onClick={() => setSelectedType(type)}
                                            data-type={type}
                                        >
                                            <span className="text-2xl">{icon}</span>
                                            <span className="text-xs mt-1 capitalize">{type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2 mt-6">
                            <button className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors" onClick={() => setIsAddModalOpen(false)}>{lang.buttonCancel}</button>
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors" onClick={handleSave}>{lang.buttonSave}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prilagođeni modal za poruke */}
            {isCustomModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
                        <p className="text-gray-800 dark:text-gray-200 mb-4">{customModalMessage}</p>
                        <div className="flex justify-center space-x-4">
                            {isConfirmModal && (
                                <button className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors" onClick={() => confirmAction(false)}>{lang.cancel}</button>
                            )}
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors" onClick={() => confirmAction(true)}>{lang.ok}</button>
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
                            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors" onClick={() => handleTake(currentPillReminder.id)}>
                                {lang.modalPillButton}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
