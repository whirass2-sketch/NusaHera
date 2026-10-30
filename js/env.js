// Konfigurasi runtime untuk browser.
//
// Situs ini statis (tanpa server/bundler), sehingga browser TIDAK bisa membaca file .env
// secara langsung. Nilai di bawah mencerminkan isi .env dan menjadi sumber token di sisi klien.
// Jika kelak memakai build tool / server, generate file ini dari .env saat build/deploy.
//
// Sumber: .env -> MAPBOX_ACCESS_TOKEN, GEMINI_API_KEY, GEMINI_MODEL
//
// PERINGATAN: GEMINI_API_KEY bersifat rahasia dan di situs statis ini akan terlihat
// di browser. Batasi/rotasi key, atau pindahkan pemanggilan Gemini ke server (proxy).
window.ENV = {
    MAPBOX_ACCESS_TOKEN: "pk.eyJ1IjoiZmF0dGFodHV0YWgiLCJhIjoiY212cGw2dHdlMDJqaTM1cHRkcHIzN3B6OCJ9.2H8gW8PbA9RGmTaaVzqeEA",
    GEMINI_API_KEY: "AQ.Ab8RN6Lmn3elygAgppWrwMJ7QSr18U9YsYoOdqbL-q0ffzwMcg",
    GEMINI_MODEL: "gemini-flash-lite-latest"
};
