import React from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import "./App.css";
import SignIn from "./Pages/Signin.tsx";
import HomePage from "./Pages/HomePage.tsx";
import ChatPage from "./Pages/ChatPage.tsx";
import PrivateRoute from "./Utils/PrivateRoute.tsx";
import { PersistGate } from 'redux-persist/integration/react';
import { Provider } from "react-redux";
import {store, persistor} from "./store/store.ts";

function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<SignIn />} />
          <Route path="/chat" element={<PrivateRoute />}>
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </PersistGate>
      
    </Provider>
  );
}

export default App;
