import { Route, Routes } from "react-router-dom";

import Header from "@/components/Header";
import Admin from "@/pages/Admin";
import Faq from "@/pages/Faq";
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
                <Route path="/faq" element={<Faq />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<Admin />} />
            </Routes>
        </>
    );
}

export default App;
