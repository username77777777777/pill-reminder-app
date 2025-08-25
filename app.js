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

// Glavna React komponenta
export default function App() {
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

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            const errorMessage = lang.errorFirebase[error.code] || lang.errorFirebase['default'];
            showCustomModal(errorMessage);
        }
    };

    // UI za prijavu/registraciju
    if (!isAuthReady || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 transition-colors duration-500 font-sans">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm transform transition duration-500 hover:scale-105">
                    <h2 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">
                        {isLogin ? lang.authTitleLogin : lang.authTitleRegister}
                    </h2>
                    <form onSubmit={handleAuthSubmit}>
                        <div className="mb-4">
                            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">Lozinka</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-colors transform hover:scale-105">
                            {isLogin ? lang.authSubmitLogin : lang.authSubmitRegister}
                        </button>
                    </form>
                    <div className="mt-6 text-center">
                        <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                            {isLogin ? lang.authToggleLogin : lang.authToggleRegister}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Glavni UI aplikacije
    return (
        <div className="bg-gray-100 dark:bg-gray-900 transition-colors duration-500 min-h-screen">
            <header className="flex justify-between items-center p-4 shadow-md bg-white dark:bg-gray-800 rounded-b-2xl">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white" id="main-title">{lang.mainTitle}</h1>
                <div className="flex space-x-2">
                    <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <svg className="w-6 h-6 text-gray-800 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </button>
                    <select value={currentLanguage} onChange={handleLanguageChange} className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg p-2">
                        <option value="hr">HR</option>
                        <option value="en">EN</option>
                    </select>
                    <button onClick={logout} className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M17.982 18.725A7.488 7.488 0 0012 10.5a7.487 7.487 0 00-5.982 2.225M12 12c.966 0 1.902-.253 2.723-.738m2.593-1.554a7.487 7.487 0 00-5.982-2.225A7.488 7.488 0 0012 18.5a7.487 7.487 0 005.982-2.225m-2.593 1.554a7.487 7.487 0 00-5.982-2.225c.966 0 1.902-.253 2.723-.738a7.487 7.487 0 00-5.982-2.225M17.982 18.725A7.488 7.488 0 0012 10.5a7.487 7.487 0 00-5.982 2.225" />
                        </svg>
                    </button>
                </div>
            </header>
            <main className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Podsjetnici</h2>
                    <button onClick={() => setIsAddModalOpen(true)} className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                </div>
                {medicines.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 mt-10" id="no-medicines-text">{lang.noMedicinesText}</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="medicines-list">
                        {medicines.map(medicine => (
                            <div key={medicine.id} className={`card-container bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col justify-between ${medicine.isTaken ? 'opacity-60' : ''}`}>
                                <div>
                                    <div className="flex items-center mb-2">
                                        <span className="text-3xl mr-3">{medicineTypes[medicine.type] || '💊'}</span>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{medicine.name}</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {medicine.times.map((time, index) => (
                                            <span key={index} className="bg-indigo-100 text-indigo-800 text-sm font-semibold px-2.5 py-0.5 rounded-full dark:bg-indigo-900 dark:text-indigo-200">
                                                {time}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {`Od: ${medicine.startDate || 'Nema datuma'}`}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {`Do: ${medicine.endDate || 'Nema datuma'}`}
                                    </p>
                                </div>
                                <div className="flex justify-end space-x-2 mt-4">
                                    <button onClick={() => handleDelete(medicine.id)} className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.035 21H7.965a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    {/* Uzeo/la lijek */}
                                    {!medicine.isTaken && (
                                        <button onClick={() => handleTake(medicine.id)} className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Modal za dodavanje/uređivanje lijeka */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md transform transition-transform duration-300 scale-100">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{lang.modalTitle}</h2>
                        <form id="medicine-form">
                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">{lang.labelName}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Npr. Andol"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">{lang.labelTimes}</label>
                                <input
                                    type="text"
                                    value={times}
                                    onChange={(e) => setTimes(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Npr. 08:00, 14:30, 20:00"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">{lang.labelStartDate}</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">{lang.labelEndDate}</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">{lang.labelType}</label>
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    {Object.keys(medicineTypes).map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors">
                                    {lang.buttonCancel}
                                </button>
                                <button type="button" onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                                    {lang.buttonSave}
                                </button>
                            </div>
                        </form>
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
                                <button onClick={() => confirmAction(false)} className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors">
                                    {lang.cancel}
                                </button>
                            )}
                            <button onClick={() => confirmAction(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                                {lang.ok}
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
                            <button onClick={() => handleTake(currentPillReminder.id)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                                {lang.modalPillButton}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

