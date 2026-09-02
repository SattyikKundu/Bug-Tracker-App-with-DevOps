# MERN-Bug-Tracker-App-with-DevOps

This is a **Full-stack MERN portfolio project** that recreates the core
workflow of a project/issue tracking application similar to ***Jira***.
The app, named ***BugTrack Workspace***, allows registered users to
create projects, organize project members, create and assign issues,
move issues through a workflow board, hold threaded discussions, and
receive notifications about important project activity.

The application was built using the **MERN** (*MongoDB*, *Express*,
*React*, *Node*) stack, with additional emphasis on authentication,
role-based permissions, application state management, responsive UI
design, and a backend REST API that can be explored/tested using
***Swagger***.

**Read more to learn about the technology behind the app, its main
features, and how the application works through a typical
project-management workflow!**

------------------------------------------------------------------------

## I. Project Overview

-   **What is this app?**\
    It's a full-stack bug/issue tracking application where users can
    create project workspaces and collaborate with other registered
    users. Each project contains its own members and issues, whilst an
    Issue Board organizes those issues into a four-stage workflow from
    **Open** to **Closed**.

-   **What does it do?**\
    It lets users register/login, create and manage projects, add other
    registered users as project members, create and assign
    bugs/tasks/stories, move issues through workflow statuses, write
    threaded comments/replies, watch issue activity, and receive in-app
    notifications when relevant project activity occurs.

-   **Who is it for?**\
    Mainly development/project teams that need a centralized place to
    keep track of bugs, tasks, stories, assignments, discussions, and
    project progress. For this portfolio project, the application is
    designed as a smaller and more focused version of a professional
    issue-tracking platform.

- <ins>**KEY Features<ins>:**
    -   **User authentication**
        -   Register a new BugTrack account.
        -   Login using a username/password.
        -   Login through **Google OAuth 2.0**.
        -   JWT authentication stored through cookies for protected
            application routes.
    -   **Personal Dashboard**
        -   Overview of active/archived projects.
        -   Preview of the user's recently updated projects.
        -   **My Work** summary showing active issues assigned to the
            logged-in user.
        -   **Recent Activity** preview using the user's latest
            notifications.
    -   **Project Management**
        -   Create projects with a unique project key.
        -   Browse **Active** and **Archived** projects.
        -   Add/remove registered BugTrack users as project members.
        -   Transfer project leadership to another existing member.
        -   Archive/restore projects while preserving their issues,
            comments, members, and history.
    -   **Issue Tracking**
        -   Create **Bug**, **Task**, and **Story** issues.
        -   Assign issue *priority*, *severity*, *labels*, reporter, and
            assignee information.
        -   Four-stage workflow: **Open → In Progress → Ready for Review
            → Closed**.
        -   Search/filter issues from the project Issue Board.
        -   Drag-and-drop issue cards between valid workflow columns.
        -   View an issue's status history and other metadata.
    -   **Comments & Threaded Replies**
        -   Add comments to issues.
        -   Reply directly to comments/replies.
        -   Expand/collapse nested conversation threads.
        -   Edit/delete comments based on user permissions.
        -   Automatically refresh visible discussions approximately
            every 30 seconds.
    -   **Notifications**
        -   Header notification bell with unread count.
        -   Quick notification drawer for recent activity.
        -   Full notification inbox with **All/Unread** filters and
            pagination.
        -   Mark notifications as read, mark all as read, or delete
            individual notifications.
        -   User-selectable notification preferences from the Profile
            page.
    -   **Role/Permission Handling**
        -   Project members can access the projects they belong to and
            collaborate on issues/comments.
        -   Project leads have additional project-management
            permissions.
        -   Global application administrators have elevated management
            permissions.
        -   Archived projects remain viewable but become **read-only**
            until restored.

------------------------------------------------------------------------

## II. Tech Stack

-   **Vite** --- Main frontend development/build tool used to run and
    build the React client.
-   **React** --- Frontend library used to build the application's pages
    and reusable UI components.
-   **Redux Toolkit** --- Used for centralized client-side application
    state, including authentication, projects, issues, comments, and
    notifications.
-   **Node.js** --- JavaScript runtime used to run the application's
    backend/server-side code.
-   **Express** --- Backend web framework used to create the REST API
    and handle HTTP requests/responses.
-   **MongoDB** --- NoSQL database used to store users, projects,
    issues, comments, and notifications.
-   **Mongoose** --- ODM used by the Express backend to define MongoDB
    schemas/models and perform database operations.
-   **Swagger** --- Used to document, browse, and manually test the
    backend API endpoints through Swagger UI.
-   **CSS** --- Used throughout the client-side for responsive layouts
    and application styling.
-   **React/Node packages** --- imported packages for both
    frontend/client-side (**React**) and backend/server-side
    (**Node/Express**):


<details>
<summary><ins>Main <strong>'/Client'</strong> packages for frontend/client-side <em>package.json</em> file:</ins></summary>

  | Package | Description |
| --- | --- |
|`vite`                    |Frontend development/build tool used to run the React client with a fast development server and create  production builds.          |
|`@vitejs/plugin-react`    |Adds React/JSX support and React Fast Refresh functionality to the Vite development environment.                                    |
|`react`                   |Main frontend library used to build BugTrack's pages and reusable user-interface components.                                        |
|`react-dom`               |Renders the React application/components into the browser's Document Object Model (**DOM**).                                        |
|`react-router`            |Handles client-side URL routing/navigation between public pages, protected pages, projects, boards, and issue routes.               |
|`@reduxjs/toolkit`        |Simplifies centralized Redux state logic through features such as `configureStore()`, `createSlice()`, and `createAsyncThunk()`.    |
|`react-redux`             |Connects React components to the Redux store using hooks such as `useSelector()` and `useDispatch()`.                               |
|`axios`                   |Handles HTTP requests between the React client and Express backend API.                                                             |
|`@dnd-kit/react`          |Provides React drag-and-drop functionality used by the project's Issue Board.                                                       |
|`@dnd-kit/dom`            |Provides pointer sensors and DOM-level drag/drop utilities used to control mouse, pen, and touch interactions on Issue Board cards. |
|`@react-hook/window-size` |Provides browser window-size hooks used by responsive client-side UI behavior.                                                      |
|`@tanstack/react-table`   |Table-building library available to the client for customizable table-based data displays.                                          |
|`lodash`                  |JavaScript utility library used for common data/object manipulation helpers.                                                        |
|`react-hot-toast`         |Displays reusable success, error, and neutral toast messages after application actions.                                             |
|`react-markdown`          |Converts Markdown-formatted content into renderable React content where Markdown support is needed.                                 |
|`dotenv`                  |Provides environment-variable support for client-side development configuration.                                                    |
</details>


<details>
<summary><ins>Main <strong>'/Server'</strong> packages for backend/server-side <em>package.json</em> file:</ins></summary>

| Package | Description |
| --- | --- |
|`express`| Main backend framework used to create the REST API and handle application HTTP requests/responses.|
|`mongoose`|Interfaces with MongoDB and defines the schemas/models for users, projects, issues, comments, and notifications.|
|`bcryptjs`|Securely hashes and compares user passwords for local username/password authentication.|
|`jsonwebtoken`|Creates and verifies JWTs used to authenticate protected backend requests.|
|`cookie-parser`|Parses cookies sent with client requests, including the authentication cookie used by the app.|
|`passport`|Authentication middleware used to support BugTrack's local and Google authentication strategies.|
|`passport-local`|Passport strategy used for username/password login.|
|`passport-google-oauth20`|Passport strategy used to authenticate users through **Google OAuth 2.0**.|
|`express-session`|Provides temporary server-side session support required during the Google OAuth authentication flow.|
|`cors`|Enables Cross-Origin Resource Sharing so the frontend and backend can communicate when running from different origins/ports.|
|`helmet`|Adds security-related HTTP headers to help protect the Express application.|
|`morgan`|Logs incoming backend HTTP requests during development/debugging.|
|`dotenv`|Loads backend environment variables from the `.env` file into `process.env`.|
|`swagger-jsdoc`|Generates the backend's Swagger/OpenAPI specification from route documentation.|
|`swagger-ui-express`|Serves the interactive Swagger UI used to browse and manually test API endpoints.|
|`nodemon`|Development dependency that automatically restarts the backend server after source-code changes.|
</details>

------------------------------------------------------------------------

## III. App Walkthrough & Screenshots

🔗 **Live Site:** [store.livedemoapp.com](https://store.livedemoapp.com) *(Right-click to open in new tab for best experience)*

<ins>**NOTE**</ins>: The screenshots in this section are intentionally arranged in roughly the same order a normal user would encounter/use the application's pages and features.

### 1. Login and Account Registration Pages

The first page visitors normally see is the ***Login*** page. Existing users can enter their **username** and **password** to access theirBugTrack workspace. 
There's also a **Continue with Google** button for users who want to authenticate using their Google account instead of a locally stored BugTrack password.

Users who don't have an account yet can click the **Register** link near the bottom of the login card. After successfully logging in, protected
pages such as the Dashboard, Projects, Issue Board, Notifications, and Profile become available.

\["image of Login page"\]

The ***Register*** page is where new users can create an account before accessing the protected workspace. Registration collects the account information needed by BugTrack, 
after which the user can return to the Login page and sign into the application.

\["image of Register page"\]

------------------------------------------------------------------------

### 2. Dashboard Page

After logging in, the user is taken to the ***Dashboard***. I designed this page to work as a quick "workspace overview" rather than forcing the user to immediately 
search through every project/issue.

At the top, the Dashboard gives the logged-in user a welcome message and summarizes the projects currently available to their account. It also shows up 
to **three recently updated active projects**, making it easier to jump back into work that was recently changed.

\["image of full Dashboard page"\]

#### 2.1 My Work

Near the bottom-left of the Dashboard is the **My Work** widget. This is a personal issue summary for the logged-in user rather than a summary for one specific project.

The counters show the user's total currently-active assigned issues separated into **Open**, **In Progress**, and **Ready for Review** statuses. Under the counters, 
BugTrack lists up to the **five most recently updated active issues assigned to the user**. Clicking one of these issues takes the user directly to that issue's details page.

\["image of Dashboard My Work widget"\]

#### 2.2 Recent Activity

On the bottom-right is the **Recent Activity** widget. Instead of creating a completely separate activity system just for the Dashboard, this widget reuses BugTrack's 
notification system and shows up to the **five latest notification items**.

This makes the Dashboard useful for quickly seeing recent assignments, project changes, comment activity, and other relevant updates. The **View All** link takes the user 
to the full Notifications inbox if they need to browse further back.

\["image of Dashboard Recent Activity widget"\]

------------------------------------------------------------------------

### 3. Main Navigation Sidebar and Notification Header

After login, BugTrack's protected pages share a common header/sidebar layout. The left sidebar provides quick links to **Dashboard**, **Profile**, **Notifications**, 
**Your Projects**, and **Create Project**.

When a user opens a specific project, the sidebar also shows that project's own contextual navigation with **Overview** and **Issue Board** links. 
This helps the user stay oriented inside the selected project without having to return to the main project list every time.

The **Notifications** sidebar link also displays the same unread-count badge used by the notification system, making unread activity visible even when the notification drawer is closed.

\["image of expanded application sidebar with selected project"\]

The top header also contains a notification bell. Clicking the bell opens a smaller notification drawer containing up to the **10 most recent notifications** for 
a quick activity check without leaving the current page.

\["image of header notification bell and opened notification drawer"\]

------------------------------------------------------------------------

### 4. Your Projects Page

The ***Your Projects*** page is the main place for browsing all projects available to the logged-in account. Projects are separated into **Active** and **Archived** tabs, 
and each tab displays the number of projects inside it.

Users can also sort the project cards to make larger project collections easier to browse. Selecting a project card opens that project's Overview page.

Archived projects are intentionally kept separate rather than permanently disappearing. This allows project history to remain available even after active work on the project has ended.

\["image of Your Projects page with Active projects tab"\]

\["image of Your Projects page with Archived projects tab"\]

------------------------------------------------------------------------

### 5. Create Project Page

A user can create a new project through the ***Create Project*** page. Each project requires a **Project Key** and **Project Name**, whilst a longer description is optional.

The Project Key is a globally unique **2-10 character** identifier that begins with a letter and is later used to create readable issue keys.
For example, a project with the key `BT` can create issues such as `BT-1`, `BT-2`, etc.

Once the project is successfully created, the creator becomes the project's initial **Project Lead** and member, 
and BugTrack automatically takes the user to the new project's Overview page.

\["image of Create Project page/form"\]

------------------------------------------------------------------------

### 6. Project Overview & Project Management

Opening a project takes the user to its ***Overview*** page. This is where users can view the project's name, description, project lead, and member list. 
From here, the **Overview / Issue Board** navigation can be used to switch between project administration/details and the actual issue workflow.

\["image of Project Overview page"\]

#### 6.1 Project Members and User Search

Project leads (and users with the appropriate administrative permissions) can manage the project's member list. Instead of manually entering MongoDB IDs, 
the **Add Members** section lets the project manager search BugTrack's registered users by information such as name, username, or email and add matching users directly to the project.

Existing members are visibly marked in the search results so they aren't accidentally added twice. Project members can also be removed, although BugTrack prevents actions 
that would violate the project's leadership/member rules.

\["image of Add Members user search results"\]

#### 6.2 Project Leadership

Every project has a single **Project Lead**. The lead receives additional project-management permissions, but leadership isn't permanently tied to the person 
who originally created the project.

If a project contains multiple members, leadership can be transferred to another **existing project member**. The current lead can't simply remove themselves first; 
leadership must be transferred so the project never ends up without a valid lead.

\["image of Transfer Leadership section"\]

#### 6.3 Project Archive / Restore

When active work is finished, the Project Lead can **Archive** the project instead of deleting all of its history. Archived projects keep their members, issues, comments, 
and existing activity, but become **read-only**.

This means users can still revisit an old project's information without accidentally modifying it. The project can later be restored from the Archived projects list 
if work needs to continue.

\["image of archived Project Overview/read-only banner"\]

For an additional administrative safeguard, permanent project deletion is reserved for the application's global administrator role rather than being 
the normal way project leads finish a project.

------------------------------------------------------------------------

### 7. Project Issue Board

The ***Issue Board*** is one of the app's main features. Each project's issues are divided into four workflow columns:

1.  **Open**
2.  **In Progress**
3.  **Ready for Review**
4.  **Closed**

This gives the user a visual overview of where each bug, task, or story currently sits in the project's workflow.

\["image of full four-column Issue Board"\]

#### 7.1 Issue Board Search & Filters

As a project's issue count grows, users can narrow down the board without repeatedly requesting a new issue collection from the server.

The board includes a search field that can match issue **keys**, **titles**, and **labels**, together with quick filters for **Priority**, **Issue Type**, and **Assignee**. 
For assignment filtering, users can quickly switch to issues assigned to themselves or currently unassigned issues.

\["image of Issue Board with search and filters applied"\]

#### 7.2 Drag-and-Drop Workflow

Issue cards can be moved through the workflow using **drag-and-drop**. The app uses `dnd-kit` to support mouse, pen, and touch interactions whilst 
still keeping explicit workflow controls available.

Not every column is a valid destination from every status. BugTrack checks the requested workflow transition on the client for faster feedback and then checks 
it again on the backend before saving the change.

For a smoother UI, valid-looking drag operations are displayed optimistically. If the backend rejects a move---for example, because the user doesn't 
have permission---the issue is restored to its original status and visually returns to its original column.

\["image of Issue Board while dragging an issue card"\]

------------------------------------------------------------------------

### 8. Creating an Issue

Project members can create new issues from inside a selected project. BugTrack supports three issue types: **Bug**, **Task**, and **Story**.

The issue form stores the main information needed to track the work, including the issue's **title**, **description**, **type**, **priority**, **severity**, **assignee**, 
and **labels**. The user who creates the issue becomes its reporter, whilst assignment determines which project member is currently responsible for the work.

Each issue also receives a human-readable key based on its parent project's key---for example `BT-12`.

\["image of Create Issue form"\]

------------------------------------------------------------------------

### 9. Issue Details Page

Clicking an issue card---or one of the assigned issues in **My Work**---opens the ***Issue Details*** page. This page is intended to be the main place for 
reading and discussing one specific issue.

The page shows the issue's title/key, description, status, type, priority, severity, reporter, assignee, labels, and other issue information. 
Users with the required permissions can also access the Edit Issue form.

\["image of Issue Details page"\]

#### 9.1 Issue Status History

Whenever an issue moves between workflow statuses, BugTrack records the transition in its **Status History**. This makes it possible to see how the issue progressed through 
the workflow rather than only seeing its current status.

\["image of Issue Status History"\]

#### 9.2 Watching an Issue

Issues can also have **watchers**. Watching an issue allows a user to follow important activity associated with that issue through the notification system.

BugTrack also automatically connects certain users to issue activity where appropriate---for example, the issue reporter and initial assignee are included 
when the issue is created, and a newly assigned user can be added when assignment changes.

\["image of Issue Details watch/unwatch control"\]

------------------------------------------------------------------------

### 10. Editing an Existing Issue

The same general issue form is reused when editing an existing issue, but the available changes depend on the logged-in user's permissions and project state.

This is important because not every project member should be able to modify every piece of issue data. For example, project leadership/administrative permissions 
are used for assignment-related management, whilst the backend remains the final authority for whether an update is allowed.

Archived projects also prevent issue modifications because their existing data is intentionally read-only.

\["image of Edit Issue form"\]

------------------------------------------------------------------------

### 11. Issue Comments and Threaded Replies

At the bottom of the Issue Details page is the ***Activity*** section. Project members can use this area to post comments such as implementation notes, questions, 
testing results, or general updates related to the issue.

\["image of Issue Activity/comments section"\]

The comment system also supports **nested replies**. A user can reply directly to a specific comment, and the UI visually indents nested replies so it's easier to follow which message belongs to which part of
the conversation.

For larger discussions, users don't have to render every reply at once. Individual branches can be opened with **Show replies**, additional replies can be loaded, 
and an **Expand thread** option can recursively open the conversation below a selected comment. Expanded branches can also be collapsed again.

\["image of expanded nested comment thread"\]

Users can **Edit** their own comments, whilst deletion follows the app's permission rules. When a comment with existing replies is deleted, the conversation underneath isn't destroyed; 
the deleted comment can remain as a placeholder so its replies stay connected to the thread.

\["image of comment Reply/Edit/Delete controls"\]

Finally, open comment discussions refresh automatically about every **30 seconds** while the browser tab is visible. This gives the issue discussion a lightweight collaborative 
feel without requiring WebSockets or a dedicated real-time chat system.

------------------------------------------------------------------------

### 12. Notifications Inbox

As users work across projects, BugTrack generates in-app notifications for relevant activity such as issue assignments, issue status changes,comment replies, project membership changes, project leadership changes,
and watched-issue activity.

The full ***Notifications*** page acts as the user's activity inbox. Notifications can be filtered between **All** and **Unread**, individual notifications can be deleted, 
and the **Mark all as read** button clears the current unread state.

\["image of Notifications inbox"\]

The full inbox uses pagination with up to **20 notifications per page**. Pagination controls allow the user to move between the first, previous, numbered, next, and last pages 
without loading the entire notification history into the interface at once.

\["image of Notifications inbox pagination"\]

------------------------------------------------------------------------

### 13. Profile & Account Settings Page

The ***Profile*** page is where the logged-in user can manage their own account information. Users can update profile fields such as their **first name**, **last name**, 
**username**, and **email**.

\["image of Profile information section"\]

Users with a locally stored BugTrack password can also change their password through the **Password** section. Google-authenticated accounts are handled appropriately 
when no local BugTrack password is stored.

\["image of Profile password section"\]

#### 13.1 Notification Preferences

The bottom portion of the Profile page contains the user's **Notification Preferences**. Rather than forcing every notification category on every user, 
BugTrack allows individual categories to be enabled/disabled.

Current preference categories include:
-   Issue assignments
-   Issue status changes
-   Comment replies
-   Project membership changes
-   Project leadership changes
-   Watched issue activity

This lets each user decide which types of project activity are important enough to appear in their own notification inbox.

\["image of Profile Notification Preferences section"\]

------------------------------------------------------------------------

## IV. Current App Limitations

```{=html}
<details>
```
```{=html}
<summary>
```
`<strong>`{=html}App Limitations (Click to Expand):`</strong>`{=html}
```{=html}
</summary>
```
```{=html}
<ul>
```
```{=html}
<li>
```
This project is intentionally a smaller, portfolio-sized interpretation
of an issue tracker rather than a complete replacement for a large
platform such as `<strong>`{=html}Jira`</strong>`{=html}. Features such
as organizations, multiple project-role tiers, sprints, epics, advanced
reporting, file-storage infrastructure, and enterprise integrations are
outside the current scope.
```{=html}
</li>
```
```{=html}
<li>
```
The application currently uses lightweight `<strong>`{=html}30-second
polling`</strong>`{=html} for visible comment/notification updates
rather than WebSockets. This keeps the architecture simpler for the
current project whilst still allowing open pages to periodically receive
updated activity.
```{=html}
</li>
```
```{=html}
<li>
```
Archived projects are intentionally read-only. Users can continue
viewing their existing issues/comments/history, but project
modifications require the Project Lead to restore the project first.
```{=html}
</li>
```
```{=html}
<li>
```
The current notification system is `<strong>`{=html}in-app
only`</strong>`{=html}. Email, SMS, push notifications, and external
messaging integrations are not part of the current version.
```{=html}
</li>
```
```{=html}
<li>
```
The project currently focuses on the MERN application itself. The larger
DevOps portion of the portfolio project---including automated testing,
CI/CD, containerization, and cloud deployment---is planned as the next
development phase.
```{=html}
</li>
```
```{=html}
</ul>
```
```{=html}
</details>
```

------------------------------------------------------------------------

## V. Steps to Use App Locally

```{=html}
<details>
```
```{=html}
<summary>
```
`<strong>`{=html}Steps to Setup App Locally (Click to
Expand):`</strong>`{=html}
```{=html}
</summary>
```
```{=html}
<ol>
```
```{=html}
<li>
```
`<strong>`{=html}`<ins>`{=html}Ensure these pre-requisites are
installed/setup first`</ins>`{=html}:`</strong>`{=html}
```{=html}
<ul>
```
```{=html}
<li>
```
`<strong>`{=html}Node.js`</strong>`{=html} and
`<strong>`{=html}npm`</strong>`{=html}.
```{=html}
</li>
```
```{=html}
<li>
```
A running `<strong>`{=html}MongoDB`</strong>`{=html} database (local
MongoDB or a compatible hosted MongoDB connection).
```{=html}
</li>
```
```{=html}
<li>
```
```{=html}
<ins>
```
Optional
```{=html}
</ins>
```
: Have an active GitHub account if you want to fork/clone the project
through Git.
```{=html}
</li>
```
```{=html}
<li>
```
```{=html}
<ins>
```
Optional
```{=html}
</ins>
```
: Use an IDE such as `<strong>`{=html}Visual Studio
Code`</strong>`{=html} for editing/running the client and server code.
```{=html}
</li>
```
```{=html}
<li>
```
```{=html}
<ins>
```
Optional
```{=html}
</ins>
```
: A Google Cloud OAuth application if you want to test the
`<strong>`{=html}Continue with Google`</strong>`{=html} login flow.
```{=html}
</li>
```
```{=html}
</ul>
```
```{=html}
</li>
```
```{=html}
<li>
```
`<strong>`{=html}`<ins>`{=html}Clone (or download) the repository
locally`</ins>`{=html}:`</strong>`{=html}
```{=html}
<ul>
```
```{=html}
<li>
```
```{=html}
<ins>
```
Run the Git clone command
```{=html}
</ins>
```
:
```{=html}
<pre><code>git clone [YOUR FINAL GITHUB REPOSITORY URL]</code></pre>
```
      </li>
      <li><ins>Change into the project folder</ins>:
        <pre><code>cd Bug-Tracker-App-with-DevOps</code></pre>
      </li>
    </ul>

```{=html}
</li>
```
```{=html}
<li>
```
`<strong>`{=html}`<ins>`{=html}Install packages for both the Client and
Server`</ins>`{=html}:`</strong>`{=html}
```{=html}
<ul>
```
```{=html}
<li>
```
Both `<code>`{=html}/client`</code>`{=html} and
`<code>`{=html}/server`</code>`{=html} contain their own
`<code>`{=html}package.json`</code>`{=html} files.
```{=html}
</li>
```
```{=html}
<li>
```
```{=html}
<ins>
```
Install the client packages
```{=html}
</ins>
```
:
```{=html}
<pre><code>cd client
npm install</code></pre>
```
      </li>
      <li><ins>Then install the server packages</ins>:
        <pre><code>cd ../server

npm install`</code>`{=html}
```{=html}
</pre>
```
      </li>
    </ul>

```{=html}
</li>
```
```{=html}
<li>
```
`<strong>`{=html}`<ins>`{=html}Setup the environment-variable
files`</ins>`{=html}:`</strong>`{=html}
```{=html}
<ul>
```
```{=html}
<li>
```
The React client uses `<code>`{=html}VITE_API_URL`</code>`{=html} to
identify the backend API URL.
```{=html}
</li>
```
```{=html}
<li>
```
The Express server currently reads configuration values including:
```{=html}
<ul>
```
```{=html}
<li>
```
`<code>`{=html}PORT`</code>`{=html}
```{=html}
</li>
```
```{=html}
<li>
```
`<code>`{=html}MONGO_URI`</code>`{=html}
```{=html}
</li>
```
```{=html}
<li>
```
`<code>`{=html}MONGO_DB_NAME`</code>`{=html}
```{=html}
</li>
```
```{=html}
<li>
```
`<code>`{=html}CLIENT_HOME_URL`</code>`{=html}
```{=html}
</li>
```
```{=html}
<li>
```
`<code>`{=html}JWT_SECRET`</code>`{=html}
```{=html}
</li>
```
```{=html}
<li>
```
`<code>`{=html}SESSION_SECRET`</code>`{=html}
```{=html}
</li>
```
```{=html}
<li>
```
`<code>`{=html}GOOGLE_CLIENT_ID`</code>`{=html}
```{=html}
</li>
```
```{=html}
<li>
```
`<code>`{=html}GOOGLE_CLIENT_SECRET`</code>`{=html}
```{=html}
</li>
```
```{=html}
<li>
```
`<code>`{=html}GOOGLE_CALLBACK_URL`</code>`{=html}
```{=html}
</li>
```
```{=html}
<li>
```
`<code>`{=html}NODE_ENV`</code>`{=html}
```{=html}
</li>
```
```{=html}
</ul>
```
      </li>
      <li><strong>Do NOT commit real secrets/credentials to GitHub.</strong> Keep private values inside local environment files and provide safe example values separately if an <code>.env.example</code> file is added.</li>
    </ul>

```{=html}
</li>
```
```{=html}
<li>
```
`<strong>`{=html}`<ins>`{=html}Ensure the client/server URLs match your
local setup`</ins>`{=html}:`</strong>`{=html}
```{=html}
<ul>
```
```{=html}
<li>
```
The current Vite development configuration uses port
`<code>`{=html}3000`</code>`{=html} for the frontend.
```{=html}
</li>
```
```{=html}
<li>
```
The Express server uses `<code>`{=html}PORT`</code>`{=html} from the
environment, with `<code>`{=html}5000`</code>`{=html} as its fallback.
```{=html}
</li>
```
```{=html}
<li>
```
The server's `<code>`{=html}CLIENT_HOME_URL`</code>`{=html} must match
the frontend origin so credentialed CORS requests can be accepted.
```{=html}
</li>
```
```{=html}
<li>
```
The client's `<code>`{=html}VITE_API_URL`</code>`{=html} must point to
the running Express backend.
```{=html}
</li>
```
```{=html}
</ul>
```
```{=html}
</li>
```
```{=html}
<li>
```
`<strong>`{=html}`<ins>`{=html}Run the app
locally`</ins>`{=html}:`</strong>`{=html}
```{=html}
<ul>
```
```{=html}
<li>
```
Open two terminals (or two terminal tabs inside VS Code).
```{=html}
</li>
```
```{=html}
<li>
```
```{=html}
<ins>
```
Terminal 1 --- React client
```{=html}
</ins>
```
:
```{=html}
<pre><code>cd client
npm start</code></pre>
```
      </li>
      <li><ins>Terminal 2 — Express server</ins>:
        <pre><code>cd server

npm run dev`</code>`{=html}
```{=html}
</pre>
```
      </li>
      <li>Once both are running, the frontend should open in the browser and communicate with the Express/MongoDB backend.</li>
    </ul>

```{=html}
</li>
```
```{=html}
<li>
```
`<strong>`{=html}`<ins>`{=html}Optional: Explore/test the backend API
with Swagger`</ins>`{=html}:`</strong>`{=html}
```{=html}
<ul>
```
```{=html}
<li>
```
Whilst the Express server is running, Swagger UI is mounted at
`<code>`{=html}/api-docs`</code>`{=html} on the backend server.
```{=html}
</li>
```
```{=html}
<li>
```
This provides a convenient way to inspect many of the REST endpoints and
manually test backend behavior during development.
```{=html}
</li>
```
```{=html}
</ul>
```
```{=html}
</li>
```
```{=html}
</ol>
```
```{=html}
</details>
```

------------------------------------------------------------------------

## VI. Features / DevOps Work to be Added Later

```{=html}
<details>
```
```{=html}
<summary>
```
`<strong>`{=html}Future Features/DevOps List (Click to
Expand):`</strong>`{=html}
```{=html}
</summary>
```
```{=html}
<ul>
```
```{=html}
<li>
```
Add automated end-to-end browser testing using
`<strong>`{=html}Selenium`</strong>`{=html} to test important user
workflows such as login, project creation, issue creation, workflow
movement, and comments.
```{=html}
</li>
```
```{=html}
<li>
```
Add a `<strong>`{=html}Jenkins`</strong>`{=html} CI/CD pipeline so
automated checks/build steps can run when application changes are
prepared for deployment.
```{=html}
</li>
```
```{=html}
<li>
```
Containerize the client/server application using
`<strong>`{=html}Docker`</strong>`{=html} so the development/deployment
environment can be reproduced more consistently.
```{=html}
</li>
```
```{=html}
<li>
```
Move the production MongoDB database to `<strong>`{=html}MongoDB
Atlas`</strong>`{=html}.
```{=html}
</li>
```
```{=html}
<li>
```
Deploy the application to `<strong>`{=html}AWS`</strong>`{=html},
beginning with a straightforward deployment approach and later
considering services such as ECR/ECS as the project's DevOps
architecture grows.
```{=html}
</li>
```
```{=html}
<li>
```
Potentially expand the issue-tracking feature set later with more
advanced project-management concepts if they add meaningful portfolio
value without turning this smaller Jira-inspired application into an
unnecessarily large clone.
```{=html}
</li>
```
```{=html}
</ul>
```
```{=html}
</details>
```

------------------------------------------------------------------------

## VII. Additional Development Notes

```{=html}
<details>
```
```{=html}
<summary>
```
`<strong>`{=html}Backend/API & Application Architecture Notes (Click to
Expand):`</strong>`{=html}
```{=html}
</summary>
```
```{=html}
<ul>
```
```{=html}
<li>
```
The frontend and backend are separated into their own
`<code>`{=html}/client`</code>`{=html} and
`<code>`{=html}/server`</code>`{=html} folders, with separate dependency
lists and development commands.
```{=html}
</li>
```
```{=html}
<li>
```
Protected frontend routes rely on the authenticated user state, whilst
protected backend endpoints verify the user's JWT and apply additional
project/issue permission middleware where needed.
```{=html}
</li>
```
```{=html}
<li>
```
The backend separates major features into models, controllers, routes,
middleware, and utility modules for areas such as authentication,
projects, issues, comments, user search, and notifications.
```{=html}
</li>
```
```{=html}
<li>
```
Redux Toolkit is divided into feature slices for authentication,
projects, issues, comments, and notifications so frequently shared
application data can be managed centrally.
```{=html}
</li>
```
```{=html}
<li>
```
Project and issue permissions are enforced on the backend even when the
React UI also hides/disables actions. The client-side permission checks
are mainly for user experience; the backend remains the final
authorization layer.
```{=html}
</li>
```
```{=html}
<li>
```
Swagger/OpenAPI documentation is included so backend endpoints can be
reviewed/tested independently from the React interface during
development.
```{=html}
</li>
```
```{=html}
</ul>
```
```{=html}
</details>
```
