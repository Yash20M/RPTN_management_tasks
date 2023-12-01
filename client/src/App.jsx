// App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Task from "./Pages/Task";

import LoginPage from "./Pages/Login";
import Register from "./Pages/Register";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/task" element={<Task />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
