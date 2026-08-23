# ChatRoom

A lightweight, real-time chatroom application built with React and Firebase.

ChatRoom allows users to create temporary chat sessions, invite others using a short session ID, communicate in real time, and optionally publish rooms so they can be discovered directly from the home page.

The project is designed around a simple terminal-inspired interface with a focus on minimalism, real-time communication, and easy session management.

---

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

```text
username -> message