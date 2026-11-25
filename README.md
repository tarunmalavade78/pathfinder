# PathFinder — Youth Opportunity Hub

A beginner-friendly website project that helps young people explore practical skills and sample internship opportunities. It uses plain HTML, CSS, and JavaScript in the browser, with a Node.js and Express backend. Course and internship data and form submissions are stored in local JSON files, so you do not need to set up a database.

## What is included

- Responsive home page with navigation and learning-path cards
- Internship listings with text search and category filter
- “I’m interested” buttons that fill in the application form
- Public account sign-up and login, plus a separate admin login
- Admin dashboard for managing courses and internships and reviewing applications
- Express API endpoints for courses, internships, and applications
- Local JSON storage in `data/`, including password-hashed user accounts
- Basic server-side validation and friendly loading/error states

## Requirements

- macOS
- Node.js 18 or newer (LTS recommended)
- VS Code

Check Node.js and npm in the VS Code terminal:

```bash
node --version
npm --version
```

If either command is missing, install the current Node.js LTS release from [nodejs.org](https://nodejs.org/), then quit and reopen VS Code.

## Run it in VS Code on macOS

1. Download and unzip `youth-opportunity-hub.zip`.
2. In VS Code, choose **File → Open Folder…** and select the unzipped `youth-opportunity-hub` folder.
3. Choose **Terminal → New Terminal**.
4. Install the project dependency:

   ```bash
   npm install
   ```

5. Configure an admin login by copying `.env.example` to `.env`, then replacing the example values:

   ```bash
   cp .env.example .env
   ```

   `.env` is local and is excluded from Git. Choose a strong password and do not share this file.

6. Start the website:

   ```bash
   npm start
   ```

6. Open [http://localhost:3000](http://localhost:3000) in a browser.
7. To stop the server, click the terminal and press **Control+C**.

The optional auto-reload development command is `npm run dev` (Node.js 18.11 or newer).

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Check that the API is running |
| GET | `/api/auth/me` | Get the current login |
| POST | `/api/auth/signup` | Create a public account |
| POST | `/api/auth/login` | Log in as a public user or admin |
| POST | `/api/auth/logout` | End the current login |
| GET | `/api/courses` | Get the sample courses |
| GET | `/api/internships` | Get sample internships |
| GET | `/api/internships?q=design&category=Design` | Search/filter internships (either query is optional) |
| POST | `/api/applications` | Save an application (requires public user login) |
| GET | `/api/admin/applications` | View applications (admin only) |
| GET/POST/DELETE | `/api/admin/courses` | Manage courses (admin only) |
| GET/POST/DELETE | `/api/admin/internships` | Manage internships (admin only) |

Example request body for `POST /api/applications` (the signed-in account supplies the name and email):

```json
{
  "opportunity": "Junior Web Design Intern",
  "message": "I am excited to learn more."
}
```

Create a public account or log in before submitting an expression of interest. Saved demo submissions appear in `data/submissions.json`. The form data stays in this local project folder; it is not sent to a real employer. Reset the file to `[]` to clear the demo submissions.

## Logins

- **Public users:** Choose **Log in** on the website, then create an account with your name, email, and a password of at least 8 characters.
- **Admin:** Choose **Admin** or visit [http://localhost:3000/login?role=admin](http://localhost:3000/login?role=admin).
  - Use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values in your local `.env` file.

Admin credentials are never stored in the source code. User passwords are stored as salted scrypt hashes in `data/users.json`; login sessions are held in memory and end when the server restarts. Do not commit `.env` or deploy with weak credentials.

The admin dashboard is available at [http://localhost:3000/admin](http://localhost:3000/admin). Admins can add/remove courses and internships and review saved applications.

## Folder structure

```text
youth-opportunity-hub/
├── data/
│   ├── courses.json
│   ├── internships.json
│   ├── submissions.json
│   └── users.json
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .gitignore
├── package.json
├── README.md
└── server.js
```

## Editing the sample content

- Add or change courses in `data/courses.json`.
- Add or change internships in `data/internships.json`. The category filter is generated from this file.
- Adjust the look in `public/styles.css` and page content in `public/index.html`.
- Frontend API calls and form behavior are in `public/app.js`; server routes are in `server.js`.

## Troubleshooting

- **“Cannot find module 'express'”**: run `npm install` from the project folder.
- **Port 3000 is already in use**: stop the other server, or run `PORT=3001 npm start` and visit `http://localhost:3001`.
- **The page cannot load the API**: keep the terminal server running and open the page through `http://localhost:3000`, not by double-clicking `index.html`.
- **The application file does not save**: make sure the project folder is writable. The server creates the file if it is missing.

## Notes

This is a learning/demo project. Listings are fictional sample data, and the form is not a real application service. Before deploying publicly, add appropriate privacy, security, and moderation practices and review any real opportunity for age requirements and safety.
