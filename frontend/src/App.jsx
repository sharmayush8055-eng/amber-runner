import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Layout/Navbar.jsx';
import Home from './pages/Home.jsx';
import Login from './components/Auth/Login.jsx';
import Register from './components/Auth/Register.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
      <footer className="text-center text-bone/30 text-xs py-6">
          Amber Runner — built with the MERN stack
                    <br/>  by- Ayush sharma <br/>
      contact -sharmayush8055@gmail.com                
      </footer>
    </div>
  );
}
