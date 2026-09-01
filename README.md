# MERN-Bug-Tracker-App-with-DevOps
This **Bug Tracker App** is a full-stack app that's used to track bugs, defects, and issues for software projects. In short, this app is a simpler version of well-known Project Management software like JIRA. Also, importantly, this project has an emphasis on practicing and implementing DevOps concepts and tools, respectively. DevOps tools and framework used throughout project including Jenkins for CI/CD pipline, Selenium for automated testing, AWS for hosting, etc.

**This is just the project description. The project and README is ongoing and will be completed over time.**

Ecommerce store with features common in most real-world Ecommerce stores.

**Read more to learn the technology behind the app, the app's features, and how the app operates via simulated workflow example!**

---

## I. Project Overview

- **What is this app?**
  It's a highly-realistic bug-tracking application where users can: create an issue board for a project, create issues for the issue board,  
   

- **What does it do?**
  It lets users browse products (tank creatures and coral frags), register/login account, purchase products via checkout, view order history and details, etc.

- **Who is this app for?**
  It's for anyone who needs an organized way to track their projects' bugs and issues, their current statuses (open, in-progress, review, closed), 

- <ins>**KEY Features<ins>:**
  - Public Features/Pages (available to all visitors):   
    - **User Login Page**
    - **User Registration Page**
  - Private Feature/Pages (**only** available after registering/logging-in)
    - **Dashboard page** (Main page upon logging-in; Shows user's active projects, current issues, and recent notifications)
    - **Profile page** (Shows user's current identification; Allows user to edit their first/last names, username, password, and even their notification preferences)
    - **Notification page/bell** (Shows latest updates/notifications regarding project issues that user is currently watching)
    - **Your projects page** (Lists and links to all projects (and their issue boards) user is currently part of)
    - **Current project page** (Lists details of current project after selecting an active project from **Your Projects** page. Page also contains link to Issues Board for that project.)
    - **Issues Board page** (Contains a Kanban-style issue board for selected project; User can create issue cards, adjust their completion status, and even filter issue cards by metrics like bug *severity* and *priority*)
    - **Issue Details page** (Each issue card from the project issue board links to an **Issue Details** page for further details about the bug/issue; the details page shows the status history of the Issue as well as all project members' comments when discussing the issue)
---

## II. Tech Stack

- **Vite**            — Main Web app development and build tool. *Vite* enables dividing the code between **React** frontend and **Node**/**Express** backend.
- **React**           — Frontend library used for building user interfaces and their components.
- **Node**            — Provides a JavaScript runtime environment to run server-side scripts on backend.
- **Express**         — Backend framework used to create and define API endpoints that interact with the database. Also used to setup a web server for handling HTTP/HTTPS requests from React frontend/client-side.
- **MongoDB**         — NoSQL Database of choice for app. Used to store login details of users, users' active and archived projects, users' active project issues, users' issue comments history, and notifications/updates from users' recent projects.
~~- **Render.com**      — Cloud platform used to host the **React** frontend/client-side as well as the **Node**/**Express** backend.~~
~~- **Neon.com**        — Cloud platform used to host web app's ***PostgreSQL*** database. Database interfaces with the app hosted on **Render.com**.~~
~~- **Hostinger.com**   — Hosting site used to obtain a domain name since authnetication cookies won't properly be sent from app to browser otherwise.~~
- **CSS**             — used for styling purposes.
- **React packages**  — imported packages for both frontend/client-side (**React**) as well as backend/server-side (**Node**/**Express**):

<details>
<summary><ins>Main <strong>'/Client'</strong> packages for frontend/client-side <em>package.json</em> file:</ins></summary>

| Package | Description |
| --- | --- |
| `vite`                  | Frontend build tool with a faster development server with hot module/code replacement.                      |
| `@vitejs/plugin-react`  | Plugin that adds *React* features and functionality on top of ***Vite***.                                   |
| `@fortawesome/...`      | Set of dependencies for using **Font Awesome** icons in the app.                                            |
| `@reduxjs/toolkit`      | Simplifies Redux logic with built-in methods like `createSlice()`, `configureStore()`, etc.                 |
| `@stripe/...`           | Set of dependencies for enabling ***Stripe*** payment processing during product checkout.                   |
| `@tanstack/react-table` | React library for building customizable tables, with features like sorting and filtering.                   |
| `axios`                 | Handles HTTP requests to fetch subreddit and post data from Reddit’s JSON API.                              |
| `dotenv`                | Loads environment variables from `.env` file to **process.env**, keeping sensitive configuration from code. |
| `react-dom`             | Renders React components into the browser's Document Object Model (DOM).                                    |
| `react-hot-toast`       | Library for creating and renderting success and failure notification messages ("toasts").                   |
| `react-redux`           | Connects React components to the Redux store using `useSelector`, `useDispatch`, etc.                       |
| `react-router-dom`      | Manages navigation and routing in the app using `Routes`, `BrowserRouter`, and `Link`.                      |

</details>


<details>
<summary><ins>Main <strong>'/Server'</strong> packages for backend/server-side <em>package.json</em> file:</ins></summary>

| Package | Description |
| --- | --- |
| `bcrypt`                 | Used to securely hash and compare user passwords for authentication.                                        |
| `cookie-parser`          | Parses cookies attached to client requests, helpful for managing sessions and storing non-sensitive data.   |
| `cors`                   | Enables Cross-Origin Resource Sharing so frontend (on different domain/port) can access backend APIs.       |
| `dotenv`                 | Loads environment variables from `.env` file to **process.env**, keeping sensitive configuration from code. |
| `express`                | Main web framework for building REST APIs and handling HTTP requests/responses.                             | 
| `express-session`        | Manages user sessions on the backend, useful for login state and tracking user activity.                    |
| `jsonwebtoken`           | Implements JWT functionalities, allowing for secure, stateless authentication and authorization.            |
| `passport`               | Provides a modular authentication middleware to support various login strategies (local, OAuth, etc.).      |
| `passport-google-oauth20`| Passport strategy for authenticating users via Google OAuth 2.0, enabling Google login.                     |
| `passport-local`         | Passport strategy for authenticating users with a username and password (local login).                      |
| `pg`                     | Node.js library for interfacing with PostgreSQL, enabling database queries and operations.                  |
| `stripe`                 | Enables backend integration with ***Stripe*** payment gateway for processing payments and transactions.      |
| `swagger-jsdoc`          | Generates Swagger (OpenAPI) documentation from JSDoc comments in your codebase.                             |
| `swagger-ui-express`     | Serves the Swagger UI so user and others can interactively explore and test the API endpoints.              |

</details>

---
