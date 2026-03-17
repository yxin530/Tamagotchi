# Retro Virtual Pet (Tamagotchi Web)

A browser-based, retro-style virtual pet game inspired by classic 90s Tamagotchis. Built with React, TypeScript, and Tailwind CSS, featuring a custom CSS pixel art engine, offline progress tracking, and an AI-powered chat system!

## 🚀 Live Demo

https://tamagotchipet.netlify.app/

---

## ✨ Features

* **Real-time Game Loop:** Your pet's stats (Fullness, Happiness, Energy) decay over time. Neglecting them leads to care mistakes and health loss!
* **Evolution System:** Watch your pet grow from an Egg to a Baby, Teen, and finally an Adult. The Adult form branches into a "Good" or "Bad" variant depending on how well you cared for it.
* **Offline Progress:** The game saves your progress to `localStorage`. If you close the tab and come back later, the game calculates the time you were gone and updates your pet's stats accordingly.
* **Custom Pixel Art Engine:** All sprites are drawn using a custom 16x16 CSS grid system, complete with blinking animations.
* **AI Chat (Powered by Gemini):** Talk to your pet! Using the Google Gemini AI, your pet will respond to your messages in character based on its current mood and stats.
* **Retro Sound Engine:** Custom 8-bit sound effects generated using the Web Audio API for feeding, playing, errors, and UI interactions.
* **Event Logging:** The "PET_LOG.EXE" window keeps track of everything that happens to your pet, including timestamps.

## 🛠️ Tech Stack

* **Framework:** React 19 + TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS
* **Animations:** Motion (Framer Motion)
* **Icons:** Lucide React
* **Chat API:** @google/genai (Gemini)

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine. You will also need a free Google Gemini API key for the chat feature.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/virtual-pet.git
   cd virtual-pet
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   * Copy the `.env.example` file and rename it to `.env`.
   * Add your Gemini API key to the `.env` file:
     ```env
     VITE_GEMINI_API_KEY="your_actual_api_key_here"
     ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000` (or the port provided in your terminal) to start playing!

## 🎮 How to Play

* **Feed:** Restores Fullness. Don't let your pet starve!
* **Play:** Restores Happiness but costs Energy.
* **Clean:** If your pet makes a mess (💩), clean it up quickly! Leaving messes lowers health and counts as a care mistake.
* **Sleep:** Toggle sleep mode to restore Energy. Your pet's fullness will still decay while sleeping, but much slower.
* **Chat:** Type a message in the PET_LOG.EXE window to talk to your pet.

## 📝 License

This project is open-source and available under the MIT License. Feel free to fork, modify, and make your own virtual pets!
