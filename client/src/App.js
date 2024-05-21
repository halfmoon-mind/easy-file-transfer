import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import adapter from "webrtc-adapter";
import MainPage from "./pages/MainPage";
import FileSharePage from "./pages/FileSharePage";

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/file/:id" element={<FileSharePage />} />
            </Routes>
        </Router>
    );
};
export default App;
