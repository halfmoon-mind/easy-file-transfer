// src/components/Home.js
import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
    return (
        <div>
            <h1>Home</h1>
            <Link to="/file-transfer">Go to File Transfer</Link>
        </div>
    );
};

export default Home;
