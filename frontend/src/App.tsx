import { Route, Routes } from "react-router-dom";

import Header from "@/components/Header";
import Home from "@/pages/Home";
import Impressum from "@/pages/Impressum";
import Login from "@/pages/Login";

function App() {
    return (
        <>
            <Header />

            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/impressum" element={<Impressum />} />
                <Route path="/login" element={<Login />} />
            </Routes>
        </>
    );
}

export default App;
