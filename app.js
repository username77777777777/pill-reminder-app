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
        buttonAdd: 'Dodaj novi lijek',
        errorSave: 'Greška pri spremanju lijeka:',
        errorDelete: 'Greška pri brisanju lijeka:',
        errorFetch: 'Greška pri dohvaćanju lijekova:',
        errorAuth: 'Greška pri autentifikaciji:',
        successLogin: 'Uspješna prijava!',
        successLogout: 'Uspješno ste odjavljeni!',
        loginPrompt: 'Aplikacija je povezana s internom bazom podataka i ne traži lozinku.',
        anonymousLogin: 'Anonimna prijava',
        logout: 'Odjavi se',
        modalPillTitle: 'Podsjetnik na lijek',
        modalPillMessage: 'Vrijeme je za uzimanje lijeka',
        modalPillButton: 'Uzeo/la sam',
        confirmTitle: 'Potvrda',
        confirmMessage: 'Jeste li sigurni?',
        yes: 'Da',
        no: 'Ne',
        ok: 'OK',
        pillTaken: 'Lijek uzet',
        pillAlreadyTaken: 'Lijek je već uzet',
        editPill: 'Uredi lijek',
        deletePill: 'Izbriši lijek',
        pillType: {
            'tableta': '💊 Tableta',
            'sirup': '🧴 Sirup',
            'sprej': '👃 Sprej',
            'injekcija': '💉 Injekcija'
        }
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
        labelTimes: 'Times (comma-separated)',
        labelStartDate: 'Start Date',
        labelEndDate: 'End Date',
        labelType: 'Medicine Type',
        buttonCancel: 'Cancel',
        buttonSave: 'Save',
        buttonEdit: 'Edit',
        buttonAdd: 'Add New Medicine',
        errorSave: 'Error saving medicine:',
        errorDelete: 'Error deleting medicine:',
        errorFetch: 'Error fetching medicines:',
        errorAuth: 'Authentication error:',
        successLogin: 'Login successful!',
        successLogout: 'You have been successfully logged out!',
        loginPrompt: 'The application is connected to an internal database and does not require a password.',
        anonymousLogin: 'Anonymous Login',
        logout: 'Logout',
        modalPillTitle: 'Pill Reminder',
        modalPillMessage: 'It\'s time to take your medicine',
        modalPillButton: 'I\'ve taken it',
        confirmTitle: 'Confirmation',
        confirmMessage: 'Are you sure?',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        pillTaken: 'Pill taken',
        pillAlreadyTaken: 'Pill already taken',
        editPill: 'Edit Pill',
        deletePill: 'Delete Pill',
        pillType: {
            'tableta': '💊 Tablet',
            'sirup': '🧴 Syrup',
            'sprej': '👃 Spray',
            'injekcija': '💉 Injection'
        }
    }
};

// Funkcija za provjeru i pretvorbu datuma
const isValidDate = (dateString) => {
    const regEx = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateString.match(regEx)) return false;  // Nepravilan format
    const d = new Date(dateString);
    const dNum = d.getTime();
    if (!dNum && dNum !== 0) return false; // Nije validan datum
    return d.toISOString().slice(0, 10) === dateString;
};

// Funkcija za prikaz prilagođenog moda
const CustomModal = ({ message, onConfirm, onCancel, showConfirmCancel }) => {
    const lang = translations[localStorage.getItem('language') || 'hr'];
    if (!message) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
                <p className="text-gray-800 dark:text-gray-200 mb-4">{message}</p>
                <div className="flex justify-center space-x-4">
                    {showConfirmCancel ? (
                        <>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors" onClick={onCancel}>{lang.no}</button>
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors" onClick={onConfirm}>{lang.yes}</button>
                        </>
                    ) : (
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors" onClick={onConfirm}>{lang.ok}</button>
                    )}
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [medicines, setMedicines] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState(null);
    const [isPillReminderModalOpen, setIsPillReminderModalOpen] = useState(false);
    const [currentPillReminder, setCurrentPillReminder] = useState(null);
    const [customModalMessage, setCustomModalMessage] = useState('');
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);
    const [confirmAction, setConfirmAction] = useState(() => () => {});
    const [currentLanguage, setCurrentLanguage] = useState(localStorage.getItem('language') || 'hr');
    const lang = translations[currentLanguage];

    const medicineTypes = {
        'tableta': '💊',
        'sirup': '🧴',
        'sprej': '👃',
        'injekcija': '💉'
    };
    
    // Inicijalizacija Firebase-a i autentifikacija
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firebaseAuth = getAuth(app);
            const firestore = getFirestore(app);
            setDb(firestore);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    try {
                        // Automatska anonimna prijava ako nema tokena
                        if (initialAuthToken) {
                            await signInWithCustomToken(firebaseAuth, initialAuthToken);
                        } else {
                            await signInAnonymously(firebaseAuth);
                        }
                    } catch (error) {
                        console.error('Anonimna prijava nije uspjela:', error);
                    }
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe();
        } catch (e) {
            setCustomModalMessage(`${lang.errorAuth} ${e.message}`);
        }
    }, [lang.errorAuth]);

    // Praćenje promjena u bazi podataka
    useEffect(() => {
        if (db && userId) {
            const userMedicinesCollection = collection(db, `/artifacts/${appId}/users/${userId}/medicines`);
            const q = query(userMedicinesCollection);
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const fetchedMedicines = [];
                querySnapshot.forEach((doc) => {
                    fetchedMedicines.push({ id: doc.id, ...doc.data() });
                });
                setMedicines(fetchedMedicines);
            }, (error) => {
                console.error("Error fetching medicines: ", error);
                setCustomModalMessage(`${lang.errorFetch} ${error.message}`);
            });
            return () => unsubscribe();
        }
    }, [db, userId, lang.errorFetch]);

    // PWA ikone i manifest, Service Worker
    useEffect(() => {
        const manifest = {
            "name": "Pill Reminder App",
            "short_name": "PillReminder",
            "description": "Jednostavna aplikacija za podsjetnik na lijekove.",
            "start_url": ".",
            "display": "standalone",
            "background_color": "#f3f4e6",
            "theme_color": "#4b5563",
            "icons": [
                {
                    "src": "https://placehold.co/72x72/4f46e5/ffffff?text=Pill",
                    "sizes": "72x72",
                    "type": "image/png"
                },
                {
                    "src": "https://placehold.co/96x96/4f46e5/ffffff?text=Pill",
                    "sizes": "96x96",
                    "type": "image/png"
                },
                {
                    "src": "https://placehold.co/128x128/4f46e5/ffffff?text=Pill",
                    "sizes": "128x128",
                    "type": "image/png"
                },
                {
                    "src": "https://placehold.co/144x144/4f46e5/ffffff?text=Pill",
                    "sizes": "144x144",
                    "type": "image/png"
                },
                {
                    "src": "https://placehold.co/152x152/4f46e5/ffffff?text=Pill",
                    "type": "image/png"
                },
                {
                    "src": "https://placehold.co/192x192/4f46e5/ffffff?text=Pill",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": "https://placehold.co/384x384/4f46e5/ffffff?text=Pill",
                    "sizes": "384x384",
                    "type": "image/png"
                },
                {
                    "src": "https://placehold.co/512x512/4f46e5/ffffff?text=Pill",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ]
        };

        const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(blob);

        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = manifestURL;
        document.head.appendChild(manifestLink);

        // Service worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/'
                }).then(registration => {
                    console.log('Service Worker registriran sa opsegom:', registration.scope);
                }).catch(error => {
                    console.error('Registracija Service Worker-a nije uspjela:', error);
                });
            });
        }
    }, []);

    // PWA ikone i manifest, Service Worker
    useEffect(() => {
        const manifest = {
            "name": "Pill Reminder App",
            "short_name": "PillReminder",
            "description": "Jednostavna aplikacija za podsjetnik na lijekove.",
            "start_url": ".",
            "display": "standalone",
            "background_color": "#f3f4e6",
            "theme_color": "#4b5563",
            "icons": [
                { "src": "https://placehold.co/72x72/4f46e5/ffffff?text=Pill", "sizes": "72x72", "type": "image/png" },
                { "src": "https://placehold.co/96x96/4f46e5/ffffff?text=Pill", "sizes": "96x96", "type": "image/png" },
                { "src": "https://placehold.co/128x128/4f46e5/ffffff?text=Pill", "sizes": "128x128", "type": "image/png" },
                { "src": "https://placehold.co/144x144/4f46e5/ffffff?text=Pill", "sizes": "144x144", "type": "image/png" },
                { "src": "https://placehold.co/152x152/4f46e5/ffffff?text=Pill", "sizes": "152x152", "type": "image/png" },
                { "src": "https://placehold.co/192x192/4f46e5/ffffff?text=Pill", "sizes": "192x192", "type": "image/png" },
                { "src": "https://placehold.co/384x384/4f46e5/ffffff?text=Pill", "sizes": "384x384", "type": "image/png" },
                { "src": "https://placehold.co/512x512/4f46e5/ffffff?text=Pill", "sizes": "512x512", "type": "image/png" }
            ]
        };

        const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
        const manifestURL = URL.createObjectURL(blob);

        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = manifestURL;
        document.head.appendChild(manifestLink);

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/'
                }).then(registration => {
                    console.log('Service Worker registriran sa opsegom:', registration.scope);
                }).catch(error => {
                    console.error('Registracija Service Worker-a nije uspjela:', error);
                });
            });
        }
    }, []);

    const showCustomModal = (message, showConfirm = false, onConfirm = () => {}, onCancel = () => {}) => {
        setCustomModalMessage(message);
        setShowConfirmCancel(showConfirm);
        setConfirmAction(() => (confirmed) => {
            setCustomModalMessage('');
            setShowConfirmCancel(false);
            if (confirmed) {
                onConfirm();
            } else {
                onCancel();
            }
        });
    };

    const handleAddOrEdit = async (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const times = e.target.times.value.split(',').map(t => t.trim());
        const startDate = e.target.startDate.value;
        const endDate = e.target.endDate.value;
        const type = e.target.type.value;

        if (!name || times.length === 0 || !startDate || !endDate || !type) {
            showCustomModal("Sva polja su obavezna!");
            return;
        }

        if (!isValidDate(startDate) || !isValidDate(endDate)) {
            showCustomModal("Datum mora biti u formatu YYYY-MM-DD");
            return;
        }

        const newMedicine = {
            name,
            times,
            startDate,
            endDate,
            type,
            takenDates: [],
        };

        try {
            if (editingMedicine) {
                const medicineDoc = doc(db, `/artifacts/${appId}/users/${userId}/medicines`, editingMedicine.id);
                await setDoc(medicineDoc, newMedicine);
            } else {
                const userMedicinesCollection = collection(db, `/artifacts/${appId}/users/${userId}/medicines`);
                await addDoc(userMedicinesCollection, newMedicine);
            }
            setIsModalOpen(false);
            setEditingMedicine(null);
        } catch (e) {
            showCustomModal(`${lang.errorSave} ${e.message}`);
        }
    };

    const handleDelete = async (id) => {
        showCustomModal(lang.confirmMessage, true, async () => {
            try {
                await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/medicines`, id));
            } catch (e) {
                showCustomModal(`${lang.errorDelete} ${e.message}`);
            }
        }, () => {});
    };

    const handleTake = async (id, time) => {
        try {
            const medicineRef = doc(db, `/artifacts/${appId}/users/${userId}/medicines`, id);
            const today = new Date().toISOString().slice(0, 10);
            const medicine = medicines.find(m => m.id === id);

            if (medicine && medicine.takenDates.includes(`${today} ${time}`)) {
                showCustomModal(`${lang.pillAlreadyTaken} za ${time}`);
                return;
            }

            const newTakenDates = [...(medicine?.takenDates || []), `${today} ${time}`];
            await setDoc(medicineRef, { takenDates: newTakenDates }, { merge: true });
            showCustomModal(`${lang.pillTaken}: ${medicine?.name} u ${time}`);
        } catch (e) {
            showCustomModal(`${lang.errorSave} ${e.message}`);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserId(null);
            setMedicines([]);
            showCustomModal(lang.successLogout);
        } catch (e) {
            showCustomModal(`${lang.errorAuth} ${e.message}`);
        }
    };
    
    // Provjera i notifikacija za lijekove
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const today = now.toISOString().slice(0, 10);

            medicines.forEach(med => {
                const isToday = new Date(med.startDate) <= now && new Date(med.endDate) >= now;
                const isTaken = med.takenDates.some(date => date.startsWith(today));

                if (isToday && med.times.includes(currentTime) && !isTaken) {
                    setIsPillReminderModalOpen(true);
                    setCurrentPillReminder({ ...med, id: med.id, time: currentTime });
                }
            });
        };

        const interval = setInterval(checkReminders, 60000); // Provjeravaj svaku minutu
        return () => clearInterval(interval);
    }, [medicines]);


    const toggleTheme = () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    useEffect(() => {
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, []);

    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen dark:bg-gray-900 bg-gray-100">
                <div className="text-gray-900 dark:text-white">Učitavanje...</div>
            </div>
        );
    }

    if (!userId) {
        return (
            <div className="flex items-center justify-center min-h-screen dark:bg-gray-900 bg-gray-100">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm">
                    <div className="text-center pb-2">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{lang.authTitleLogin}</h2>
                    </div>
                    <div className="pt-0 grid gap-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            {lang.loginPrompt}
                        </p>
                        <button onClick={() => setUserId(crypto.randomUUID())} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                            {lang.anonymousLogin}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen transition-colors duration-500 p-4 font-sans">
            <div className="container mx-auto max-w-2xl">
                <header className="flex justify-between items-center py-6 px-4">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{lang.mainTitle}</h1>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <select
                                className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-2 py-1"
                                value={currentLanguage}
                                onChange={(e) => {
                                    setCurrentLanguage(e.target.value);
                                    localStorage.setItem('language', e.target.value);
                                }}
                            >
                                <option value="hr">HR</option>
                                <option value="en">EN</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <Globe size={16} />
                            </div>
                        </div>
                        <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-300">
                            <Sun className="dark:hidden" size={24} />
                            <Moon className="hidden dark:block" size={24} />
                        </button>
                        <button onClick={handleLogout} className="p-2 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors duration-300">
                            <LogOut size={24} />
                        </button>
                    </div>
                </header>

                <main className="mt-8">
                    <div className="flex justify-end mb-6">
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-full font-bold shadow-lg hover:bg-indigo-700 transition-colors transform hover:scale-105">
                            <PlusCircle size={24} className="mr-2" />
                            {lang.buttonAdd}
                        </button>
                    </div>

                    <div className="grid gap-6">
                        {medicines.length > 0 ? (
                            medicines.map((med, index) => (
                                <div key={med.id} className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col transition-transform hover:scale-[1.02] duration-300">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-4">
                                            <div className="text-4xl">
                                                {medicineTypes[med.type] || '❓'}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{med.name}</h2>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">{lang.pillType[med.type]}</p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <button onClick={() => {
                                                setEditingMedicine(med);
                                                setIsModalOpen(true);
                                            }} className="p-2 rounded-full text-indigo-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                                <Edit size={20} />
                                            </button>
                                            <button onClick={() => handleDelete(med.id)} className="p-2 rounded-full text-red-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-gray-700 dark:text-gray-300 mb-4">
                                        <div className="flex items-center space-x-2">
                                            <Calendar size={16} />
                                            <span>{med.startDate} - {med.endDate}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Clock size={16} />
                                            <span>{med.times.join(', ')}</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex justify-between items-center">
                                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                            {med.takenDates.length > 0 ? (
                                                med.takenDates.join(', ')
                                            ) : (
                                                'Nema zabilježenih unosa'
                                            )}
                                        </p>
                                        <div className="flex space-x-2">
                                            {med.times.map(time => (
                                                <button
                                                    key={time}
                                                    onClick={() => handleTake(med.id, time)}
                                                    className="px-3 py-1 bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-200 rounded-full font-semibold text-xs hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center text-gray-500 dark:text-gray-400">
                                <Pill size={48} className="mb-4 text-gray-400 dark:text-gray-600" />
                                <p className="text-xl font-medium">{lang.noMedicinesText}</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Modal za dodavanje/uređivanje lijeka */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">{editingMedicine ? lang.editPill : lang.modalTitle}</h2>
                        <form onSubmit={handleAddOrEdit} className="grid gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="name">{lang.labelName}</label>
                                <input id="name" name="name" type="text" defaultValue={editingMedicine?.name || ''} className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="times">{lang.labelTimes}</label>
                                <input id="times" name="times" type="text" defaultValue={editingMedicine?.times.join(', ') || ''} placeholder="08:00, 14:30, 20:00" className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="startDate">{lang.labelStartDate}</label>
                                <input id="startDate" name="startDate" type="date" defaultValue={editingMedicine?.startDate || ''} className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="endDate">{lang.labelEndDate}</label>
                                <input id="endDate" name="endDate" type="date" defaultValue={editingMedicine?.endDate || ''} className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="type">{lang.labelType}</label>
                                <select id="type" name="type" defaultValue={editingMedicine?.type || 'tableta'} className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="tableta">{lang.pillType['tableta']}</option>
                                    <option value="sirup">{lang.pillType['sirup']}</option>
                                    <option value="sprej">{lang.pillType['sprej']}</option>
                                    <option value="injekcija">{lang.pillType['injekcija']}</option>
                                </select>
                            </div>
                            <div className="flex justify-end space-x-4 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors">{lang.buttonCancel}</button>
                                <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors">{lang.buttonSave}</button>
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
