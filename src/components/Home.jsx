import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  signInAnonymously,
} from "firebase/auth";

import {
  ref,
  runTransaction,
  onValue,
  get,
  set,
  remove,
} from "firebase/database";

import {
  auth,
  db,
} from "../firebase";

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
        Math.random() *
        characters.length
      )
    );

  }

  return id;
}


// =========================================
// GENERATE 4 CHARACTER CREATOR KEY
// =========================================

function generateCreatorKey() {

  const characters =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let key = "";

  for (let i = 0; i < 4; i++) {

    key += characters.charAt(
      Math.floor(
        Math.random() *
        characters.length
      )
    );

  }

  return key;
}


// =========================================
// CREATE UNIQUE ROOM
// =========================================

async function createUniqueSession(
  roomId,
  sessionData
) {

  const roomRef =
    ref(
      db,
      `sessions/${roomId}`
    );

  const result =
    await runTransaction(
      roomRef,
      (currentData) => {

        if (currentData !== null) {
          return;
        }

        return sessionData;

      }
    );

  return result.committed;
}


// =========================================
// HOME
// =========================================

export default function Home() {

  const navigate =
    useNavigate();


  // =========================================
  // STATE
  // =========================================

  const [
    showUsername,
    setShowUsername,
  ] = useState(false);


  const [
    mode,
    setMode,
  ] = useState("create");


  const [
    username,
    setUsername,
  ] = useState("");


  const [
    chatName,
    setChatName,
  ] = useState("");


  const [
    sessionId,
    setSessionId,
  ] = useState("");


  const [
    creatorKey,
    setCreatorKey,
  ] = useState("");


  const [
    joinAsAdmin,
    setJoinAsAdmin,
  ] = useState(false);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    publicChats,
    setPublicChats,
  ] = useState([]);


  // =========================================
  // INPUT REFS
  // =========================================

  const chatNameRef =
    useRef(null);

  const sessionIdRef =
    useRef(null);

  const creatorKeyRef =
    useRef(null);


  // =========================================
  // PUBLIC CHATS
  // =========================================

  useEffect(() => {

    const publicChatsRef =
      ref(
        db,
        "publicChats"
      );


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
              .map(
                ([roomId, chat]) => ({
                  roomId,
                  ...chat,
                })
              );


          setPublicChats(
            chats
          );

        },

        (firebaseError) => {

          console.error(
            "Public chats error:",
            firebaseError
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
    setCreatorKey("");

    setJoinAsAdmin(false);
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
    setCreatorKey("");

    setJoinAsAdmin(false);
    setMode("join");
    setShowUsername(true);

  }


  // =========================================
  // TOGGLE ADMIN JOIN
  // =========================================

  function toggleAdminJoin() {

    setError("");

    setJoinAsAdmin(
      (current) => !current
    );

    setCreatorKey("");

  }


  // =========================================
  // CREATE SESSION
  // =========================================

  async function confirmCreateSession() {

    const name =
      username.trim();

    const roomName =
      chatName.trim();


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
      // LOGIN
      // =====================================

      const userCredential =
        await signInAnonymously(auth);

      const user =
        userCredential.user;


      // =====================================
      // CREATOR KEY
      // =====================================

      const newCreatorKey =
        generateCreatorKey();


      // =====================================
      // CREATE UNIQUE ROOM
      // =====================================

      let roomId;
      let created = false;


      while (!created) {

        roomId =
          generateRoomId();


        const now =
          Date.now();


        const sessionData = {

          adminUid:
            user.uid,

          adminUsername:
            name,

          active:
            true,

          chatName:
            roomName,

          createdAt:
            now,

          users: {

            [user.uid]: {

              username:
                name,

              joinedAt:
                now,

            },

          },

        };


        created =
          await createUniqueSession(
            roomId,
            sessionData
          );

      }


      // =====================================
      // SAVE CREATOR SECRET
      // =====================================

      await set(

        ref(
          db,
          `adminSecrets/${roomId}`
        ),

        {
          username:
            name,

          creatorKey:
            newCreatorKey,
        }

      );


      // =====================================
      // LOCAL SESSION
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

          creatorKey:
            newCreatorKey,

        })

      );


      navigate(
        `/room/${roomId}`
      );

    }


    catch (error) {

      console.error(
        "Create session error:",
        error
      );


      setError(
        error.message ||
        "Could not create session."
      );

    }


    finally {

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

    const enteredCreatorKey =
      creatorKey.trim().toUpperCase();


    // =====================================
    // USERNAME
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
    // ROOM ID
    // =====================================

    if (!roomId) {

      setError(
        "Please enter a session ID."
      );

      return;

    }


    if (
      !/^[A-Z0-9]{4}$/.test(
        roomId
      )
    ) {

      setError(
        "Session ID must be 4 letters/numbers."
      );

      return;

    }


    // =====================================
    // CREATOR KEY
    // =====================================

    if (joinAsAdmin) {

      if (!enteredCreatorKey) {

        setError(
          "Please enter the creator key."
        );

        return;

      }


      if (
        !/^[A-Z0-9]{4}$/.test(
          enteredCreatorKey
        )
      ) {

        setError(
          "Creator key must be 4 letters/numbers."
        );

        return;

      }

    }


    try {

      setLoading(true);
      setError("");


      // =====================================
      // LOGIN
      // =====================================

      const userCredential =
        await signInAnonymously(auth);

      const user =
        userCredential.user;


      // =====================================
      // GET ROOM
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
      // ACTIVE
      // =====================================

      if (
        room.active === false
      ) {

        setError(
          "THIS SESSION HAS BEEN TERMINATED."
        );

        return;

      }


      // =====================================
      // DEFAULT MEMBER
      // =====================================

      let isAdmin = false;
      let verifiedCreatorKey = "";


      // =====================================
      // ADMIN RECOVERY
      // =====================================

      if (joinAsAdmin) {

        console.log(
          "Submitting admin recovery claim..."
        );


        const claimRef =
          ref(
            db,
            `adminClaims/${roomId}/${user.uid}`
          );


        // ===================================
        // SUBMIT EXACT CREDENTIALS
        // ===================================

        try {

          await set(

            claimRef,

            {
              username:
                name,

              creatorKey:
                enteredCreatorKey,

              verified:
                true,
            }

          );

        }

        catch (claimError) {

          console.error(
            "ADMIN CLAIM REJECTED:",
            claimError
          );


          setError(
            "INCORRECT CREATOR USERNAME OR KEY."
          );

          return;

        }


        // ===================================
        // TAKE ADMIN ROLE
        // ===================================

        try {

          await set(

            ref(
              db,
              `sessions/${roomId}/adminUid`
            ),

            user.uid

          );

        }

        catch (adminError) {

          console.error(
            "ADMIN UID UPDATE FAILED:",
            adminError
          );


          try {

            await remove(
              claimRef
            );

          } catch {}

          setError(
            "COULD NOT TAKE ADMIN CONTROL."
          );

          return;

        }


        // ===================================
        // ADMIN VERIFIED
        // ===================================

        isAdmin = true;

        verifiedCreatorKey =
          enteredCreatorKey;


        // ===================================
        // CLEANUP CLAIM
        // ===================================

        try {

          await remove(
            claimRef
          );

        } catch (cleanupError) {

          console.error(
            "Claim cleanup error:",
            cleanupError
          );

        }

      }


      // =====================================
      // ADD USER
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
      // LOCAL SESSION
      // =====================================

      sessionStorage.setItem(

        `chatroom_${roomId}`,

        JSON.stringify({

          uid:
            user.uid,

          username:
            name,

          isAdmin:
            isAdmin,

          creatorKey:
            isAdmin
              ? verifiedCreatorKey
              : "",

        })

      );


      navigate(
        `/room/${roomId}`
      );

    }


    catch (error) {

      console.error(
        "Join session error:",
        error
      );


      setError(
        error.message ||
        "Could not join session."
      );

    }


    finally {

      setLoading(false);

    }

  }


  // =========================================
  // JOIN PUBLIC CHAT
  // =========================================

  function joinPublicChat(roomId) {

    setSessionId(roomId);

    setUsername("");
    setCreatorKey("");

    setJoinAsAdmin(false);
    setMode("join");
    setShowUsername(true);
    setError("");

  }


  // =========================================
  // UI
  // =========================================

  return (

    <div className="matrix-home">


      <div className="home-left">

        <div className="matrix-content">


          <h1 className="matrix-title">
            CHATROOM
          </h1>


          <div className="matrix-line" />


          {!showUsername ? (

            <>

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

            <div className="username-section">


              <h2>

                {mode === "create"
                  ? "CREATE SESSION"
                  : "JOIN SESSION"}

              </h2>


              <p className="button-description">

                {mode === "create"

                  ? "Choose a username and chat name for this session."

                  : (

                    <>

                      Enter your username and
                      the session ID.

                      <br />

                      or{" "}

                      <button
                        type="button"
                        className="back-button"
                        onClick={toggleAdminJoin}
                        disabled={loading}
                        style={{
                          marginTop: 0
                        }}
                      >

                        {joinAsAdmin
                          ? "JOIN AS MEMBER"
                          : "JOIN AS ADMIN"}

                      </button>

                    </>

                  )}

              </p>


              <input
                className="matrix-input"
                type="text"
                placeholder="USERNAME"
                value={username}
                maxLength={30}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {

                  if (e.key === "Enter") {

                    e.preventDefault();

                    if (
                      mode === "create"
                    ) {

                      chatNameRef.current?.focus();

                    } else {

                      sessionIdRef.current?.focus();

                    }

                  }

                }}
                autoFocus
                disabled={loading}
              />


              {mode === "create" && (

                <input
                  ref={chatNameRef}
                  className="matrix-input"
                  type="text"
                  placeholder="CHAT NAME"
                  value={chatName}
                  maxLength={50}
                  onChange={(e) =>
                    setChatName(
                      e.target.value
                    )
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

                      if (joinAsAdmin) {

                        creatorKeyRef.current?.focus();

                      } else {

                        confirmJoinSession();

                      }

                    }

                  }}
                  disabled={loading}
                />

              )}


              {mode === "join" &&
                joinAsAdmin && (

                  <input
                    ref={creatorKeyRef}
                    className="matrix-input"
                    type="text"
                    placeholder="CREATOR KEY"
                    value={creatorKey}
                    maxLength={4}
                    onChange={(e) =>
                      setCreatorKey(
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


              {error && (

                <p className="error-message">
                  {error}
                </p>

              )}


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
                  ? "PLEASE WAIT..."
                  : "ENTER CHAT"}

              </button>


              <button
                className="back-button"
                onClick={() => {

                  setShowUsername(false);
                  setUsername("");
                  setChatName("");
                  setSessionId("");
                  setCreatorKey("");
                  setJoinAsAdmin(false);
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