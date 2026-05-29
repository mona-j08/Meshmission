# MeshMission

MeshMission is a comprehensive platform designed to facilitate and streamline the process of donating items to NGOs. It connects generous donors with available volunteers and verified NGOs to ensure items reach those in need efficiently.

## Features

*   **Donor Mobile App:** Allows donors to easily submit donations, add photos, set pickup locations and preferences, and track the status of their donations in real-time.
*   **Volunteer Mobile App:** Enables volunteers to browse open pickup tasks, accept them, navigate to the donor's location, verify the pickup with a secure OTP, and deliver items to the designated NGOs.
*   **NGO Dashboard (Planned/Mobile):** Allows verified NGOs to list their requirements, manage incoming deliveries, and update their profiles.
*   **Admin Panel (Web):** A powerful dashboard for administrators to oversee the entire platform. Admins can verify NGOs, approve donations, manage users, and monitor overall statistics.
*   **Smart Matching Engine:** Automatically matches approved donations to the most suitable NGO requirements based on category, urgency, and capacity.
*   **Real-time Notifications:** Keeps all parties informed with push notifications for status updates, task assignments, and important alerts.

## Tech Stack

The project is built using a modern, scalable architecture:

*   **Mobile App:** React Native (Expo)
*   **Admin Panel:** React.js (Vite) with Tailwind CSS
*   **Backend / Serverless Functions:** Node.js (Firebase Cloud Functions)
*   **Database:** Firebase Cloud Firestore (NoSQL)
*   **Authentication:** Firebase Auth (Email/Password with Custom Claims for Role-Based Access Control)
*   **Storage:** Firebase Cloud Storage (for images and media)

## Project Structure

The repository is organized into three main directories:

*   `/mobile`: Contains the React Native application for Donors, Volunteers, and NGOs.
*   `/admin-panel`: Contains the React web application for the administrator dashboard.
*   `/functions`: Contains the Firebase Cloud Functions responsible for backend logic, notifications, and the matching engine.

## Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn
*   Expo CLI (for mobile app)
*   Firebase CLI (for deploying functions and rules)

### Setup Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Sundars-git/MeshMission.git
    cd MeshMission
    ```

2.  **Install dependencies for the Mobile App:**
    ```bash
    cd mobile
    npm install
    # To run locally:
    npx expo start
    ```

3.  **Install dependencies for the Admin Panel:**
    ```bash
    cd ../admin-panel
    npm install
    # To run locally:
    npm run dev
    ```

4.  **Install dependencies for Cloud Functions:**
    ```bash
    cd ../functions
    npm install
    ```

5.  **Firebase Configuration:**
    *   Ensure you have a Firebase project set up.
    *   Create `.env` files in both the `/mobile` and `/admin-panel` directories with your Firebase configuration variables (see `.env.example` if available).
    *   Deploy Firestore rules and indexes:
        ```bash
        firebase deploy --only firestore
        ```
    *   Deploy Cloud Functions:
        ```bash
        firebase deploy --only functions
        ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
