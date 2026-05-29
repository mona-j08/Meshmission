import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const { login, user, loading, error, setError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in as admin, send to dashboard
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isRegister) {
      if (!email || !password || !name || !phone) {
        setError('Please fill in all fields.');
        return;
      }
      setRegisterLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const uid = cred.user.uid;
        await setDoc(doc(db, 'users', uid), {
          userId: uid,
          role: 'admin',
          name: name.trim(),
          email: email.trim(),
          phoneNumber: phone.trim(),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        // Firebase automatically logs in the newly registered user
        navigate('/');
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          try {
            // Self-repair: User exists in Auth but not Firestore (due to DB wipe)
            // Log them in and recreate their admin document
            import('firebase/auth').then(async ({ signInWithEmailAndPassword }) => {
              const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
              const uid = cred.user.uid;
              await setDoc(doc(db, 'users', uid), {
                userId: uid,
                role: 'admin',
                name: name.trim(),
                email: email.trim(),
                phoneNumber: phone.trim(),
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
              navigate('/');
            });
            return;
          } catch (repairErr) {
            console.error('Repair error:', repairErr);
            setError(repairErr?.message || 'Failed to repair administrator account.');
          }
        }
        console.error('Registration error:', err);
        setError(err?.message || 'Failed to create administrator account.');
      } finally {
        setRegisterLoading(false);
      }
    } else {
      if (!email || !password) {
        setError('Please fill in all fields.');
        return;
      }
      try {
        await login(email, password);
        navigate('/');
      } catch (err) {
        // Error is set in hook, we just catch to prevent crashes
      }
    }
  };

  const isBusy = loading || registerLoading;

  return (
    <div className="login-page-wrapper">
      <div className="login-card-container">
        <div className="login-card-header">
          <span className="brand-logo">🕸️</span>
          <h2>MeshMission</h2>
          <p>{isRegister ? 'Register Administrator Account' : 'Admin Operations Portal'}</p>
        </div>

        {error && <div className="login-error-toast">{error}</div>}

        <div className="login-tabs-container">
          <button 
            type="button"
            className={`login-tab-btn ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); setError(null); }}
            disabled={isBusy}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`login-tab-btn ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); setError(null); }}
            disabled={isBusy}
          >
            Register Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  placeholder="e.g. Alex Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isBusy}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Contact Number</label>
                <input
                  type="tel"
                  id="phone"
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isBusy}
                  required
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Administrator Email</label>
            <input
              type="email"
              id="email"
              placeholder="admin@meshmission.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isBusy}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Security Password</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isBusy}
              required
            />
          </div>

          <button 
            type="submit" 
            className="login-btn-primary" 
            disabled={isBusy}
          >
            {isBusy 
              ? (isRegister ? 'Creating Secure Account...' : 'Authenticating Secure Session...') 
              : (isRegister ? 'Register Admin Account' : 'Sign In to Dashboard')
            }
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#0F766E', 
              fontWeight: '700', 
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '13px'
            }}
            disabled={isBusy}
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an admin account? Register one"}
          </button>
        </div>

        <div className="login-footer-info">
          <p>MeshMission Security Protocol Active.</p>
          <span>Unauthorized access attempts are logged.</span>
        </div>
      </div>
    </div>
  );
}
