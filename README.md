# ChatRoom

A lightweight, real-time chatroom application built with React and Firebase.

ChatRoom allows users to create temporary chat sessions, invite others using a short session ID, communicate in real time, and optionally publish rooms so they can be discovered directly from the home page.

The project is designed around a simple terminal-inspired interface with a focus on minimalism, real-time communication, and easy session management.

---

### Technology Stack
#### Frontend
- React
- React Router
- JavaScript
- CSS
#### Backend / Services
- Firebase Authentication
- Firebase Realtime Database
#### Authentication
- ChatRoom currently uses Firebase Anonymous Authentication.
- Users do not need to create an account before joining a session.


## Features

### Session Management

- Create a new chat session
- Automatically generate a unique 4-character session ID
- Set a custom chat name
- Join existing sessions using a session ID
- Leave a session without terminating it
- Session administrators can terminate their sessions
- Terminated sessions become inaccessible
- Session information is stored in Firebase Realtime Database

### User System

- Anonymous Firebase authentication
- Custom username for each session
- Username validation
- Maximum username length of 30 characters
- Users are identified by their Firebase UID
- Administrators are identified separately from regular users

### Real-Time Messaging

- Real-time message synchronization using Firebase Realtime Database
- Messages appear instantly for all users in the session
- Messages display in the format:

### text
```username -> message```

- Messages are associated with the sender's UID
- Automatic scrolling to the newest message
- Message length limited to 2000 characters
- Empty messages cannot be sent
- Input automatically returns focus after sending

### Public Chats

- Chat sessions can optionally be published.
- Published sessions appear on the home page under public chats
- Each public chat displays:
```
> Chat Name
SESSION: ABCD
```
- Users can select a public chat to join it directly.

### Administrators can:
- Publish a private chat
- Unpublish a public chat
- Switch between public and private states
- If a published session is terminated, it is automatically removed from the public chat list.
- The administrator can leave the chat without terminating the session.
- Only the administrator can terminate the session.
- Terminating a session removes the session and its associated data.
