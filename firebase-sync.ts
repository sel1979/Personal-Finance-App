import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs, updateDoc, query } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './firebase';

export function useFirebaseSync(
    localSignedUser: any,
    setSignedUser: any,
    setTransactions: any,
    setInvestments: any,
    setInvestmentHistory: any,
    setAccounts: any,
    setSettings: any
) {
    const [isSynchronizing, setIsSynchronizing] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setSignedUser({ email: user.email, name: user.displayName || user.email?.split('@')[0] });
                setIsSynchronizing(true);
                
                // Initial Sync downward
                try {
                  const uid = user.uid;
                  onSnapshot(query(collection(db, 'users', uid, 'transactions')), (snap) => {
                      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                      if (data.length > 0) setTransactions(data);
                  });
                  onSnapshot(query(collection(db, 'users', uid, 'investments')), (snap) => {
                      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                      if (data.length > 0) setInvestments(data);
                  });
                  onSnapshot(query(collection(db, 'users', uid, 'investmentTransactions')), (snap) => {
                      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                      if (data.length > 0) setInvestmentHistory(data);
                  });
                  onSnapshot(query(collection(db, 'users', uid, 'accounts')), (snap) => {
                      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                      if (data.length > 0) setAccounts(data);
                  });
                  onSnapshot(doc(db, 'users', uid), (snap) => {
                      if (snap.exists()) {
                          const data = snap.data();
                          if (data.currency) setSettings((prev: any) => ({...prev, ...data}));
                      }
                  });
                  setIsSynchronizing(false);
                } catch (e) {
                  console.error('Firebase Sync Error', e);
                  setIsSynchronizing(false);
                }
            } else {
                setSignedUser(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const performSignIn = async (email: string, pass: string) => {
        setIsSynchronizing(true);
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (e: any) {
             console.error(e);
             throw e; // throw error so the UI can show it
        } finally {
            setIsSynchronizing(false);
        }
    };

    const performSignUp = async (email: string, pass: string, name: string) => {
        setIsSynchronizing(true);
        try {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, 'users', res.user.uid), {
                email, name, currency: 'USD', darkMode: false, passcodeEnabled: false, createdAt: new Date().toISOString()
            });
        } catch (e: any) {
            console.error(e);
            throw e;
        } finally {
            setIsSynchronizing(false);
        }
    };

    const performGoogleLogin = async () => {
        setIsSynchronizing(true);
        try {
            const provider = new GoogleAuthProvider();
            const res = await signInWithPopup(auth, provider);
            
            // Check if user doc exists, create if not
            const userDoc = await getDocs(query(collection(db, 'users')));
            let exists = false;
            userDoc.forEach(d => { if (d.id === res.user.uid) exists = true; });
            
            if (!exists) {
                await setDoc(doc(db, 'users', res.user.uid), {
                    email: res.user.email, name: res.user.displayName, currency: 'USD', darkMode: false, passcodeEnabled: false, createdAt: new Date().toISOString()
                });
            }
        } catch (e: any) {
             console.error(e);
             throw e;
        } finally {
             setIsSynchronizing(false);
        }
    };

    const performLogout = async () => {
        try {
          await signOut(auth);
        } catch(e) {}
    };

    const fbSaveTransaction = async (tx: any) => {
        if (!auth.currentUser) return;
        try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', tx.id), tx);
        } catch (e) {
            console.error('Error saving transaction to Firebase', e);
        }
    };
    
    const fbDeleteTransaction = async (id: string) => {
        if (!auth.currentUser) return;
        try {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', id));
        } catch (e) {}
    };

    const fbSaveInvestment = async (inv: any) => {
        if (!auth.currentUser) return;
        try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'investments', inv.id), inv);
        } catch (e) {}
    };

    const fbDeleteInvestment = async (id: string) => {
        if (!auth.currentUser) return;
        try {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'investments', id));
        } catch (e) {}
    };

    const fbSaveHistory = async (hist: any) => {
        if (!auth.currentUser) return;
        try {
             await setDoc(doc(db, 'users', auth.currentUser.uid, 'investmentTransactions', hist.id), hist);
        } catch (e) {}
    };

    const fbSaveAccount = async (acc: any) => {
        if (!auth.currentUser) return;
        try {
             await setDoc(doc(db, 'users', auth.currentUser.uid, 'accounts', acc.id), acc);
        } catch (e) {}
    };

    const fbUpdateSettings = async (settings: any) => {
        if (!auth.currentUser) return;
        try {
             await updateDoc(doc(db, 'users', auth.currentUser.uid), settings);
        } catch (e) {}
    };

    return {
        isSynchronizing,
        performSignIn,
        performSignUp,
        performGoogleLogin,
        performLogout,
        fbSaveTransaction,
        fbDeleteTransaction,
        fbSaveInvestment,
        fbDeleteInvestment,
        fbSaveHistory,
        fbSaveAccount,
        fbUpdateSettings
    };
}
