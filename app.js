import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, deleteDoc, setDoc, onSnapshot, collection, query } from 'firebase/firestore';
import { AlertCircle, PlusCircle, Trash2, Edit, LogOut, Sun, Moon, Calendar, Clock, Pill, Globe } from 'lucide-react';

// Ažurirani kod koristi standardne HTML elemente s Tailwind CSS-om umjesto shadcn komponenti
// kako bi se izbjegle pogreške pri kompilaciji uzrokovane nedostajućim modulima.

// Ugrađena Tailwind CSS skripta za stiliziranje
// Iako je ovo React komponenta, Tailwind skripta je dodana radi lakšeg prikaza u Canvas okruženju.
<script src="https://cdn.tailwindcss.com"></script>

// Firebase konfiguracija (preuzeto iz firebase-config.js)
const firebaseConfig = {
    apiKey: "AIzaSyATA5Nzgo7cWQrpuUmVb3dKtpuax0I8u78",
    authDomain: "pillreminderapp-5001d.firebaseapp.com",
    projectId: "pillreminderapp-5001d",
    storageBucket: "pillreminderapp-5001d.firebasestorage.app",
    messagingSenderId: "284598567632",
    appId: "1:284598567632:web:93c30c46f208293e6dd4d5"
};

// Jezično neovisni ključevi za vrste lijekova
const medicineTypeKeys = {
    'tableta': 'tablet',
    'sirup': 'syrup',
    'sprej': 'spray',
    'injekcija': 'injection'
};

// Mapa emojija koristeći jezično neovisne ključeve
const medicineTypes = {
    'tablet': '💊',
    'syrup': '�',
    'spray': '👃',
    'injection': '💉'
};

// Objekti za prijevod, sada s prijevodima za vrste lijekova
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
        modalTitleAdd: 'Dodaj novi lijek',
        modalTitleEdit: 'Uredi lijek',
        labelName: 'Ime lijeka',
        labelTimes: 'Vrijeme (razdvojeno zarezom)',
        labelStartDate: 'Datum početka',
        labelEndDate: 'Datum kraja',
        labelType: 'Vrsta lijeka',
        buttonCancel: 'Odustani',
        buttonSave: 'Spremi',
        deleteConfirmation: 'Jeste li sigurni da želite obrisati ovaj podsjetnik?',
        yes: 'Da',
        no: 'Ne',
        ok: 'OK',
        errorSave: 'Greška pri spremanju podsjetnika: ',
        errorDelete: 'Greška pri brisanju podsjetnika: ',
        modalPillTitle: 'Podsjetnik!',
        modalPillMessage: 'Vrijeme je za uzimanje:',
        modalPillButton: 'Uzeo/la sam',
        language: 'Jezik',
        theme: 'Tema',
        user: 'Korisnik',
        logout: 'Odjavi se',
        // Novi prijevodi za vrste lijekova
        medicineTypeTablet: 'tableta',
        medicineTypeSyrup: 'sirup',
        medicineTypeSpray: 'sprej',
        medicineTypeInjection: 'injekcija',
    },
    en: {
        mainTitle: 'My Medicines',
        noMedicinesText: 'No medicines added yet. Add a new reminder!',
        authTitleLogin: 'Log In',
        authTitleRegister: 'Register',
        authToggleLogin: 'Don\'t have an account? Register',
        authToggleRegister: 'Already have an account? Log In',
        authSubmitLogin: 'Log In',
        authSubmitRegister: 'Register',
        modalTitleAdd: 'Add New Medicine',
        modalTitleEdit: 'Edit Medicine',
        labelName: 'Medicine Name',
        labelTimes: 'Time (comma-separated)',
        labelStartDate: 'Start Date',
        labelEndDate: 'End Date',
        labelType: 'Medicine Type',
        buttonCancel: 'Cancel',
        buttonSave: 'Save',
        deleteConfirmation: 'Are you sure you want to delete this reminder?',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        errorSave: 'Error saving reminder: ',
        errorDelete: 'Error deleting reminder: ',
        modalPillTitle: 'Reminder!',
        modalPillMessage: 'It\'s time to take:',
        modalPillButton: 'I have taken it',
        language: 'Language',
        theme: 'Theme',
        user: 'User',
        logout: 'Log out',
        // Novi prijevodi za vrste lijekova
        medicineTypeTablet: 'tablet',
        medicineTypeSyrup: 'syrup',
        medicineTypeSpray: 'spray',
        medicineTypeInjection: 'injection',
    }
};

// Komponenta za modalne poruke
const CustomModal = ({ message, onConfirm, onCancel, showConfirmCancel }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-xs text-center">
                <p className="text-gray-800 dark:text-gray-200 mb-4">{message}</p>
                <div className="flex justify-center space-x-4">
                    {showConfirmCancel ? (
                        <>
                            <button className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors" onClick={onCancel}>{translations.hr.no}</button>
                            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors" onClick={onConfirm}>{translations.hr.yes}</button>
                        </>
                    ) : (
                        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors" onClick={onConfirm}>{translations.hr.ok}</button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Glavna App komponenta
const App = () => {
    // --- State varijable ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [medicines, setMedicines] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editMedicine, setEditMedicine] = useState(null);
    const [currentLanguage, setCurrentLanguage] = useState(localStorage.getItem('language') || 'hr');
    const [isDarkMode, setIsDarkMode] = useState(localStorage.theme === 'dark');
    const [showCustomModal, setShowCustomModal] = useState(false);
    const [customModalMessage, setCustomModalMessage] = useState('');
    const [customModalAction, setCustomModalAction] = useState(null);
    const [showConfirmCancel, setShowConfirmCancel] = useState(false);
    const lang = translations[currentLanguage] || translations.hr;

    // --- Inicijalizacija Firebasea i autentifikacija ---
    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);
        setDb(dbInstance);
        setAuth(authInstance);

        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                try {
                    // Ako token nije definiran, prijavite se anonimno
                    if (typeof __initial_auth_token !== 'undefined') {
                        await signInWithCustomToken(authInstance, __initial_auth_token);
                    } else {
                        await signInAnonymously(authInstance);
                    }
                } catch (error) {
                    console.error("Greška pri autentifikaciji:", error);
                }
            }
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    // --- Dohvaćanje podataka iz Firestorea ---
    useEffect(() => {
        if (!isAuthReady || !userId || !db) return;

        const collectionPath = `/artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/medicines`;
        const q = query(collection(db, collectionPath));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const medicinesData = [];
            snapshot.forEach((doc) => {
                medicinesData.push({ id: doc.id, ...doc.data() });
            });
            setMedicines(medicinesData);
        }, (error) => {
            console.error("Greška pri dohvaćanju podataka: ", error);
        });

        return () => unsubscribe();
    }, [isAuthReady, userId, db]);

    // --- Funkcije za rukovanje podacima i UI-jem ---
    const showMessage = (message, isError = false, confirmAction = null, showConfirmCancel = false) => {
        setCustomModalMessage(message);
        setCustomModalAction(() => confirmAction);
        setShowConfirmCancel(showConfirmCancel);
        setShowCustomModal(true);
    };

    const confirmAction = (result) => {
        if (customModalAction) {
            customModalAction(result);
        }
        setShowCustomModal(false);
        setCustomModalMessage('');
        setCustomModalAction(null);
        setShowConfirmCancel(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const form = e.target;
            const medicineName = form.medicineName.value;
            const medicineTimes = form.medicineTimes.value.split(',').map(t => t.trim());
            const startDate = form.startDate.value;
            const endDate = form.endDate.value;
            const medicineType = form.medicineType.value;
            
            // Konvertiramo tip u jezično neovisan ključ
            const languageIndependentType = medicineTypeKeys[medicineType] || medicineType;
            
            const newMedicine = {
                name: medicineName,
                times: medicineTimes,
                startDate: startDate,
                endDate: endDate,
                type: languageIndependentType,
                userId: userId,
            };

            const collectionPath = `/artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/medicines`;
            if (editMedicine) {
                const medicineDocRef = doc(db, collectionPath, editMedicine.id);
                await setDoc(medicineDocRef, newMedicine, { merge: true });
            } else {
                await addDoc(collection(db, collectionPath), newMedicine);
            }

            setIsAddModalOpen(false);
            setEditMedicine(null);
        } catch (error) {
            showMessage(lang.errorSave + error.message, true);
        }
    };

    const handleDelete = (id) => {
        showMessage(
            lang.deleteConfirmation,
            false,
            async (result) => {
                if (result) {
                    try {
                        const collectionPath = `/artifacts/${typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'}/users/${userId}/medicines`;
                        await deleteDoc(doc(db, collectionPath, id));
                    } catch (error) {
                        showMessage(lang.errorDelete + error.message, true);
                    }
                }
            },
            true
        );
    };

    const handleEdit = (medicine) => {
        setEditMedicine(medicine);
        setIsAddModalOpen(true);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserId(null);
        } catch (error) {
            console.error("Greška pri odjavi:", error);
        }
    };

    const handleLanguageChange = (e) => {
        const value = e.target.value;
        setCurrentLanguage(value);
        localStorage.setItem('language', value);
    };

    const handleDarkModeChange = (e) => {
        const checked = e.target.checked;
        setIsDarkMode(checked);
        if (checked) {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }
    };

    // --- Rendering ---
    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen dark:bg-gray-900 bg-gray-100">
                <div className="text-xl font-semibold dark:text-white">Učitavanje...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-500 font-sans p-4 md:p-8">
            {userId ? (
                // Glavna aplikacija
                <div className="max-w-4xl mx-auto">
                    {/* Zaglavlje i kontrole */}
                    <header className="flex justify-between items-center mb-6 flex-wrap gap-4">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{lang.mainTitle}</h1>
                        <div className="flex items-center space-x-4">
                            {/* Prekidač za jezik */}
                            <div className="relative">
                                <button className="p-2 text-gray-700 dark:text-gray-300" onClick={() => setShowCustomModal(true)}>
                                    <Globe className="h-6 w-6" />
                                </button>
                                {/* Ovdje se koristi modal za odabir jezika */}
                            </div>
                            
                            {/* Prekidač za tamni/svjetli mod */}
                            <div className="flex items-center space-x-2">
                                <Sun className="h-5 w-5 text-yellow-500" />
                                <label className="relative inline-block w-12 h-6 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="hidden peer"
                                        checked={isDarkMode}
                                        onChange={handleDarkModeChange}
                                    />
                                    <span className="absolute inset-0 bg-gray-300 rounded-full transition peer-checked:bg-indigo-600"></span>
                                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition transform peer-checked:translate-x-6"></span>
                                </label>
                                <Moon className="h-5 w-5 text-purple-500" />
                            </div>

                            {/* Gumb za dodavanje lijeka */}
                            <button className="p-2 text-indigo-600 hover:text-indigo-800 transition-colors" onClick={() => setIsAddModalOpen(true)}>
                                <PlusCircle className="h-6 w-6" />
                            </button>
                            
                            {/* Prikaz korisničkog ID-a i odjava */}
                            <div className="relative">
                                <div className="p-2 text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                                    <span className="truncate max-w-[80px]">{lang.user}</span>
                                    <LogOut className="h-6 w-6 cursor-pointer" onClick={handleLogout} />
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Prikaz liste lijekova */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {medicines.length > 0 ? (
                            medicines.map((medicine, index) => (
                                <div key={medicine.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-transform duration-200 transform hover:-translate-y-1 hover:shadow-2xl">
                                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{medicine.name}</h3>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleEdit(medicine); }} className="p-2 text-indigo-500 hover:text-indigo-700">
                                                <Edit className="h-5 w-5" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(medicine.id); }} className="p-2 text-red-500 hover:text-red-700">
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="pt-0">
                                        <p className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                                            <Pill className="mr-2 h-4 w-4" /> {lang[`medicineType${medicine.type.charAt(0).toUpperCase() + medicine.type.slice(1)}`]}
                                        </p>
                                        <p className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-2">
                                            <Clock className="mr-2 h-4 w-4" /> {medicine.times.join(', ')}
                                        </p>
                                        <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                            <Calendar className="mr-2 h-4 w-4" /> {medicine.startDate} - {medicine.endDate}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
                                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                                <p>{lang.noMedicinesText}</p>
                            </div>
                        )}
                    </div>

                    {/* Modal za dodavanje/uređivanje */}
                    {isAddModalOpen && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
                                <div className="pb-2">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editMedicine ? lang.modalTitleEdit : lang.modalTitleAdd}</h2>
                                </div>
                                <div className="pt-0">
                                    <form onSubmit={handleSave} className="grid gap-4">
                                        <div>
                                            <label htmlFor="medicineName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{lang.labelName}</label>
                                            <input id="medicineName" name="medicineName" defaultValue={editMedicine?.name || ''} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                        </div>
                                        <div>
                                            <label htmlFor="medicineTimes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{lang.labelTimes}</label>
                                            <input id="medicineTimes" name="medicineTimes" defaultValue={editMedicine?.times.join(', ') || ''} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                        </div>
                                        <div>
                                            <label htmlFor="startDate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{lang.labelStartDate}</label>
                                            <input id="startDate" name="startDate" type="date" defaultValue={editMedicine?.startDate || ''} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                        </div>
                                        <div>
                                            <label htmlFor="endDate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{lang.labelEndDate}</label>
                                            <input id="endDate" name="endDate" type="date" defaultValue={editMedicine?.endDate || ''} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                                        </div>
                                        <div>
                                            <label htmlFor="medicineType" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{lang.labelType}</label>
                                            <select name="medicineType" defaultValue={editMedicine?.type || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                                <option value="" disabled>{lang.labelType}</option>
                                                {Object.keys(medicineTypeKeys).map(key => (
                                                    <option key={key} value={key}>{translations[currentLanguage][`medicineType${medicineTypeKeys[key].charAt(0).toUpperCase() + medicineTypeKeys[key].slice(1)}`]}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex justify-end space-x-2 mt-4">
                                            <button type="button" className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors" onClick={() => { setIsAddModalOpen(false); setEditMedicine(null); }}>
                                                {lang.buttonCancel}
                                            </button>
                                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">{lang.buttonSave}</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
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
                            <button onClick={() => setUserId(crypto.randomUUID())} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                                Anonimna prijava
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