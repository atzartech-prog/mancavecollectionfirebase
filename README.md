# Koleksi Mancaveku - Personal Mancave Registry 🎮🤖💻

A modern, highly polished Single Page Web Application (SPA) to showcase, organize, and manage your ultimate mancave collection (toys, gadgets, gaming setup, PC components, books, diecasts, etc.). 

Built with **HTML5, Custom Vanilla CSS3, Javascript (ES6)**, and integrated with **Firebase (Authentication & Cloud Firestore)** for real-time synchronization.

---

## ✨ Features

- 🔐 **Secure Firebase Authentication**: Email & Password registration and sign-in. Data is isolated based on the authenticated user.
- 📊 **Dynamic Dashboard**:
  - Real-time key metrics (Total categories, total items, total financial valuation, and wishlist count).
  - High-performance, clean breakdown chart of category distributions (rendered via Chart.js).
  - "Recently Added" table showcasing latest collections.
- 🏷️ **Categories CRUD**: Create, view, update, and delete custom categories (e.g., Action Figures, PC Gear, Diecast) with custom emojis.
- 📦 **Collection Items CRUD**: Register item specifics including brand, purchase price (formatted beautifully in Indonesian Rupiah - IDR), acquired date, condition status, custom rating scale, notes, and custom image.
- 🔍 **Advanced Filtering, Sorting & Search**:
  - Instant text search across name, brand, and notes.
  - Quick filters by categories and acquisition statuses (*Displayed*, *Mint in Box*, *In Use*, *Wishlist*).
  - Multi-criteria sorting (Price, rating, name, newest/oldest added).
- 🖼️ **Auto Image Generator**: Automatically applies relevant high-quality placeholder cover images based on matching category keywords using clean Unsplash stock references.
- 🎨 **Premium Modern Design**: Built with a sleek dark neon theme, fluid glassmorphism backdrops, smooth scale transitions, custom custom-styled scrollbars, custom modal triggers, and toast notifications.

---

## 🚀 Tech Stack

1. **Frontend Core**: HTML5, Vanilla JavaScript (ES6)
2. **Styling**: Vanilla CSS3 (Custom properties, grid layout, glassmorphic styles, responsive desktop/mobile media queries)
3. **Icons**: FontAwesome 6.4.0 (CDN)
4. **Backend/Database**: Firebase SDK v10 (Compat version)
   - **Firebase Authentication**
   - **Cloud Firestore Database** (NoSQL real-time document store)
5. **Charts**: Chart.js v4 (CDN)
6. **Popups/Dialogs**: SweetAlert2 (CDN)

---

## 📁 Database Schema (Cloud Firestore)

The application handles two primary user-scoped collections:

### 1. `categories` Collection
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Title of category (e.g. "Action Figures") |
| `icon` | String | Emoji representation (e.g. "🤖") |
| `description`| String | Summary description |
| `userId` | String | Owner UID (matches `request.auth.uid`) |
| `createdAt` | Timestamp | Server-generated timestamp |

### 2. `items` Collection
| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Collection item name (e.g. "PS5 Pro") |
| `brand` | String | Manufacturer or brand (e.g. "Sony") |
| `categoryId` | String | Document ID references a `category` document |
| `status` | String | Display state: `Displayed`, `Boxed`, `Used`, `Wishlist` |
| `price` | Number | Purchase valuation in IDR |
| `purchaseDate` | String | Acquired calendar date |
| `rating` | Number | Star rating from 1 to 5 |
| `imageUrl` | String | Picture link URL |
| `notes` | String | Product details, specification, or custom notes |
| `userId` | String | Owner UID (matches `request.auth.uid`) |
| `createdAt` | Timestamp | Server-generated timestamp |

---

## 🔒 Recommended Firestore Security Rules

Copy and paste the rules below to your **Firebase Console > Firestore Database > Rules** tab to ensure data is isolated, protected, and accessible only to their owners:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User-scoped category access
    match /categories/{categoryId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // User-scoped items access
    match /items/{itemId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🛠️ Getting Started & Local Run

1. Clone this repository:
   ```bash
   git clone https://github.com/atzartech-prog/mancavecollectionfirebase.git
   cd mancavecollectionfirebase
   ```
2. Simply launch a local server to view the app. E.g. using Python:
   ```bash
   python3 -m http.server 8080
   ```
3. Open `http://localhost:8080` in your web browser.
4. **Firebase Configuration** is already embedded in `js/app.js` using your specific app keys. Make sure **Email/Password Provider** is enabled under the Firebase Authentication console.
