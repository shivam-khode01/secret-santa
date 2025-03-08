# Secret Santa

## Overview

The **Secret Santa** application is a fun and interactive way to organize gift exchanges among friends, family, or colleagues during the holiday season. This application allows users to create groups, manage participants, and randomly assign gift givers (Santas) to recipients.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [File Structure](#file-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- User authentication with email and password.
- Create and manage groups for Secret Santa events.
- Randomly assign Santas to recipients within a group.
- User wishlist management.
- Anonymous messaging between users.
- Responsive design for a seamless user experience.

## Technologies Used

- **Node.js**: Backend server.
- **Express.js**: Web framework for Node.js.
- **MongoDB**: NoSQL database for storing user and group data.
- **Mongoose**: ODM for MongoDB and Node.js.
- **Passport.js**: Authentication middleware for Node.js.
- **EJS**: Templating engine for rendering HTML views.
- **CSS**: Styling for the application, including responsive design.
- - **Nodemailer.js**: Automatic email service for Node.js.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/shivam-khode01/secret-santa.git
   cd secret-santa
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a `.env` file** in the root directory and add the following configuration:
   ```plaintext
   MONGO_URI=mongodb://localhost:27017/secret_santa
   PORT=5000
   EMAIL_USER=your_email@example.com
   EMAIL_PASS=your_email_password
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

## Configuration

- Ensure that MongoDB is running on your local machine or update the `MONGO_URI` in the `.env` file to point to your MongoDB instance.
- Set up your email credentials in the `.env` file for sending notifications.

## Usage

- Navigate to `http://localhost:5000` in your web browser.
- Sign up or log in to your account.
- Create a new group or join an existing one.
- Add participants and generate Secret Santa pairs.
- View and manage your wishlist.

## File Structure

```plaintext
secret-santa/
├── .env
├── .gitattributes
├── .gitignore
├── README.md
├── config/
│   └── passport.js
├── controllers/
│   └── secretSantaController.js
├── middleware/
│   └── authentication.js
├── models/
│   ├── User.js
│   ├── anonymous.js
│   └── group.js
├── public/
│   ├── css/
│   │   └── styles.css
│   └── images/
│       └── logo-white.png
├── routes/
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── login.js
│   └── userRoutes.js
├── views/
│   ├── admin.ejs
│   ├── admin/
│   │   └── dashboard.ejs
│   ├── home.ejs
│   ├── index.ejs
│   ├── layouts/
│   │   └── main.ejs
│   ├── login.ejs
│   └── register.ejs
└── server.js
```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.


