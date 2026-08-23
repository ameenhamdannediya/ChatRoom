import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { signInAnonymously } from "firebase/auth";

import {
  ref,
  runTransaction,
  onValue,
  get,
  set,
} from "firebase/database";

import { auth, db } from "../firebase";

import "./Home.css";


// =========================================
// GENERATE 4 CHARACTER ROOM ID
// =========================================

function generateRoomId() {

  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let id = "";

  for (let i = 0; i < 4; i++) {

    id += characters.charAt(
      Math.floor(
        Math.random() * characters.length
      )
    );

  }

  return id;
}


// =========================================
// TRY TO CREATE ROOM
// =========================================

async function createUniqueSession(
  roomId,
  sessionData
) {

  const roomRef = ref(
    db,
    `sessions/${roomId}`
  );

  const result = await runTransaction(
    roomRef,
    (currentData) => {

      // Room already exists
      if (currentData !== null) {
        return;
      }

      // Room doesn't exist
      return sessionData;

    }
  );

  return result.committed;
}


// =========================================
// HOME
// =========================================

export default function Home() {

  const navigate = useNavigate();


  // =========================================
  // STATE
  // =========================================

  const [showUsername, setShowUsername] =
    useState(false);

  const [mode, setMode] =
    useState("create");

  const [username, setUsername] =
    useState("");

  const [chatName, setChatName] =
    useState("");

  const [sessionId, setSessionId] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [publicChats, setPublicChats] =
    useState([]);


  // =========================================
  // INPUT REFS
  // =========================================

  const chatNameRef =
    useRef(null);

  const sessionIdRef =
    useRef(null);


  // =========================================
  // LISTEN FOR PUBLIC CHATS
  // =========================================

  useEffect(() => {

    const publicChatsRef =
      ref(db, "publicChats");


    const unsubscribe =
      onValue(
        publicChatsRef,
        (snapshot) => {

          if (!snapshot.exists()) {

            setPublicChats([]);

            return;
          }


          const data =
            snapshot.val();


          const chats =
            Object.entries(data)
              .map(([roomId, chat]) => ({

                roomId,

                ...chat,

              }));


          setPublicChats(chats);

        },

        (error) => {

          console.error(
            "Public chats error:",
            error
          );

        }
      );


    return () => {

      unsubscribe();

    };

  }, []);


  // =========================================
  // CREATE SESSION BUTTON
  // =========================================

  function createSession() {

    setError("");

    setUsername("");

    setChatName("");

    setSessionId("");

    setMode("create");

    setShowUsername(true);

  }


  // =========================================
  // JOIN SESSION BUTTON
  // =========================================

  function joinSession() {

    setError("");

    setUsername("");

    setChatName("");

    setSessionId("");

    setMode("join");

    setShowUsername(true);

  }


  // =========================================
  // CREATE SESSION
  // =========================================

  async function confirmCreateSession() {

    const name =
      username.trim();

    const roomName =
      chatName.trim();


    // =====================================
    // VALIDATE USERNAME
    // =====================================

    if (!name) {

      setError(
        "Please enter a username."
      );

      return;
    }


    if (name.length > 30) {

      setError(
        "Username must be 30 characters or less."
      );

      return;
    }


    // =====================================
    // VALIDATE CHAT NAME
    // =====================================

    if (!roomName) {

      setError(
        "Please enter a chat name."
      );

      return;
    }


    if (roomName.length > 50) {

      setError(
        "Chat name must be 50 characters or less."
      );

      return;
    }


    try {

      setLoading(true);

      setError("");


      // =====================================
      // FIREBASE ANONYMOUS LOGIN
      // =====================================

      const userCredential =
        await signInAnonymously(auth);


      const user =
        userCredential.user;


      // =====================================
      // FIND UNIQUE ROOM ID
      // =====================================

      let roomId;

      let created = false;


      while (!created) {

        roomId =
          generateRoomId();


        // ===================================
        // SESSION DATA
        // ===================================

        const sessionData = {

          adminUid:
            user.uid,

          active:
            true,

          chatName:
            roomName,

          createdAt:
            Date.now(),

          users: {

            [user.uid]: {

              username:
                name,

              joinedAt:
                Date.now(),

            },

          },

        };


        // ===================================
        // TRY CREATING ROOM
        // ===================================

        created =
          await createUniqueSession(
            roomId,
            sessionData
          );

      }


      // =====================================
      // SAVE LOCAL SESSION
      // =====================================

      sessionStorage.setItem(

        `chatroom_${roomId}`,

        JSON.stringify({

          uid:
            user.uid,

          username:
            name,

          isAdmin:
            true,

        })

      );


      // =====================================
      // GO TO CHAT ROOM
      // =====================================

      navigate(
        `/room/${roomId}`
      );


    } catch (error) {

      console.error(
        "Create session error:",
        error
      );


      setError(

        error.message ||
        "Could not create session."

      );


    } finally {

      setLoading(false);

    }

  }


  // =========================================
  // JOIN SESSION
  // =========================================

  async function confirmJoinSession() {

    const name =
      username.trim();

    const roomId =
      sessionId.trim().toUpperCase();


    // =====================================
    // VALIDATE USERNAME
    // =====================================

    if (!name) {

      setError(
        "Please enter a username."
      );

      return;
    }


    if (name.length > 30) {

      setError(
        "Username must be 30 characters or less."
      );

      return;
    }


    // =====================================
    // VALIDATE SESSION ID
    // =====================================

    if (!roomId) {

      setError(
        "Please enter a session ID."
      );

      return;
    }


    if (!/^[A-Z0-9]{4}$/.test(roomId)) {

      setError(
        "Session ID must be 4 letters/numbers."
      );

      return;
    }


    try {

      setLoading(true);

      setError("");


      // =====================================
      // FIREBASE ANONYMOUS LOGIN
      // =====================================

      const userCredential =
        await signInAnonymously(auth);


      const user =
        userCredential.user;


      // =====================================
      // CHECK IF ROOM EXISTS
      // =====================================

      const roomRef =
        ref(
          db,
          `sessions/${roomId}`
        );


      const snapshot =
        await get(roomRef);


      if (!snapshot.exists()) {

        setError(
          "SESSION NOT FOUND."
        );

        return;
      }


      const room =
        snapshot.val();


      // =====================================
      // CHECK IF ROOM IS ACTIVE
      // =====================================

      if (room.active === false) {

        setError(
          "THIS SESSION HAS BEEN TERMINATED."
        );

        return;
      }


      // =====================================
      // ADD USER TO ROOM
      // =====================================

      const userRef =
        ref(
          db,
          `sessions/${roomId}/users/${user.uid}`
        );


      await set(
        userRef,
        {

          username:
            name,

          joinedAt:
            Date.now(),

        }
      );


      // =====================================
      // SAVE LOCAL SESSION
      // =====================================

      sessionStorage.setItem(

        `chatroom_${roomId}`,

        JSON.stringify({

          uid:
            user.uid,

          username:
            name,

          isAdmin:
            false,

        })

      );


      // =====================================
      // GO TO CHAT ROOM
      // =====================================

      navigate(
        `/room/${roomId}`
      );


    } catch (error) {

      console.error(
        "Join session error:",
        error
      );


      setError(

        error.message ||
        "Could not join session."

      );


    } finally {

      setLoading(false);

    }

  }


  // =========================================
  // JOIN PUBLIC CHAT
  // =========================================

  async function joinPublicChat(roomId) {

    // Put the ID into the form and
    // use the same join process.

    setSessionId(roomId);

    setMode("join");

    setShowUsername(true);

    setError("");

  }


  // =========================================
  // UI
  // =========================================

  return (

    <div className="matrix-home">


      {/* =====================================
          LEFT SIDE
      ===================================== */}

      <div className="home-left">

        <div className="matrix-content">


          <h1 className="matrix-title">

            CHATROOM

          </h1>


          <div className="matrix-line" />


          {!showUsername ? (

            <>


              {/* =============================
                  CREATE
              ============================= */}

              <div className="button-section">

                <button
                  className="matrix-button"
                  onClick={createSession}
                >

                  CREATE A SESSION

                </button>


                <p className="button-description">

                  Create a new chat session and
                  receive a unique room code to
                  share with others.

                </p>

              </div>


              {/* =============================
                  JOIN
              ============================= */}

              <div className="button-section">

                <button
                  className="matrix-button"
                  onClick={joinSession}
                >

                  JOIN A SESSION

                </button>


                <p className="button-description">

                  Enter a room code to join an
                  existing chat session.

                </p>

              </div>


            </>


          ) : (


            /* ===============================
               FORM
            =============================== */

            <div className="username-section">


              <h2>

                {mode === "create"
                  ? "CREATE SESSION"
                  : "JOIN SESSION"}

              </h2>


              <p className="button-description">

                {mode === "create"

                  ? "Choose a username and chat name for this session."

                  : "Enter your username and the session ID."}

              </p>


              {/* ===========================
                  USERNAME
              =========================== */}

              <input

                className="matrix-input"

                type="text"

                placeholder="USERNAME"

                value={username}

                maxLength={30}

                onChange={(e) =>
                  setUsername(e.target.value)
                }

                onKeyDown={(e) => {

                  if (e.key === "Enter") {

                    e.preventDefault();

                    if (mode === "create") {

                      chatNameRef.current?.focus();

                    } else {

                      sessionIdRef.current?.focus();

                    }

                  }

                }}

                autoFocus

                disabled={loading}

              />


              {/* ===========================
                  CREATE CHAT NAME
              =========================== */}

              {mode === "create" && (

                <input

                  ref={chatNameRef}

                  className="matrix-input"

                  type="text"

                  placeholder="CHAT NAME"

                  value={chatName}

                  maxLength={50}

                  onChange={(e) =>
                    setChatName(e.target.value)
                  }

                  onKeyDown={(e) => {

                    if (e.key === "Enter") {

                      e.preventDefault();

                      confirmCreateSession();

                    }

                  }}

                  disabled={loading}

                />

              )}


              {/* ===========================
                  JOIN SESSION ID
              =========================== */}

              {mode === "join" && (

                <input

                  ref={sessionIdRef}

                  className="matrix-input"

                  type="text"

                  placeholder="SESSION ID"

                  value={sessionId}

                  maxLength={4}

                  onChange={(e) =>
                    setSessionId(
                      e.target.value.toUpperCase()
                    )
                  }

                  onKeyDown={(e) => {

                    if (e.key === "Enter") {

                      e.preventDefault();

                      confirmJoinSession();

                    }

                  }}

                  disabled={loading}

                />

              )}


              {/* ===========================
                  ERROR
              =========================== */}

              {error && (

                <p className="error-message">

                  {error}

                </p>

              )}


              {/* ===========================
                  ENTER
              =========================== */}

              <button

                className="matrix-button"

                onClick={

                  mode === "create"

                    ? confirmCreateSession

                    : confirmJoinSession

                }

                disabled={loading}

              >

                {loading

                  ? mode === "create"
                    ? "CREATING..."
                    : "JOINING..."

                  : "ENTER CHAT"}

              </button>


              {/* ===========================
                  BACK
              =========================== */}

              <button

                className="back-button"

                onClick={() => {

                  setShowUsername(false);

                  setUsername("");

                  setChatName("");

                  setSessionId("");

                  setError("");

                }}

                disabled={loading}

              >

                ← BACK

              </button>


            </div>

          )}

        </div>

      </div>


      {/* =====================================
          RIGHT SIDE - PUBLIC CHATS
      ===================================== */}

      <aside className="public-chats">


        <div className="public-title">

          PUBLIC CHATS

        </div>


        <div className="public-line" />


        {publicChats.length === 0 ? (

          <div className="no-public-chats">

            &gt; NO PUBLIC CHATS

            <br />

            &gt; WAITING...

          </div>

        ) : (


          <div className="public-chat-list">

            {publicChats.map((chat) => (

              <button

                key={chat.roomId}

                className="public-chat"

                onClick={() =>
                  joinPublicChat(
                    chat.roomId
                  )
                }

              >


                <div className="public-chat-name">

                  &gt; {chat.chatName}

                </div>


                <div className="public-chat-id">

                  SESSION:{chat.roomId}

                </div>


              </button>

            ))}

          </div>

        )}

      </aside>


    </div>

  );

}