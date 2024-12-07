import React from 'react';
import {BrowserRouter, Routes, Route} from 'react-router'
import logo from './logo.svg';
import './App.css';
import Button from '@mui/material/Button';
import SignIn from './Pages/Signin.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route path='/' element={<SignIn/>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
